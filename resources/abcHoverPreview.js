(function (mw, $) {
    // Global variables for tooltip delay and active tooltip control
    var activeTooltip = null;
    var tooltipTimer = null;
    var tooltipDelay = 300; // Delay in milliseconds before showing the tooltip

    /**
     * Inject a <style> tag with arrow rules for top/bottom alignment.
     *
     * - .abc-tooltip-below: The tooltip is below the link, arrow at top.
     * - .abc-tooltip-above: The tooltip is above the link, arrow at bottom.
     *
     * NOTE: The background color is #f5e6d3, so the arrow color must match.
     * Adjust as needed.
     */
    function injectArrowCSS() {
        var css = `
            /* Tooltip below the link => arrow on top edge, pointing up */
            .abc-tooltip-below::before {
                content: "";
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                top: -8px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 8px solid #fbfce9; /* match tooltip background */
            }

            /* Tooltip above the link => arrow on bottom edge, pointing down */
            .abc-tooltip-above::before {
                content: "";
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                bottom: -8px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid #fbfce9;
            }
        `;
        $('<style>')
            .prop('type', 'text/css')
            .html(css)
            .appendTo('head');
    }

    /**
     * Parses the wikitext content and extracts a valid ABC block.
     * The block must start with "X:" and include the "K:" field followed by at least one musical line.
     *
     * @param {string} content - The raw wikitext content.
     * @return {string|null} - The extracted ABC block or null if not found.
     */
    function parseABCBlock(content) {
        if (!content) return null;
        var lines = content.split(/\r?\n/);
        var startIndex = -1;
        for (var i = 0; i < lines.length; i++) {
            if (/^X:\s*/.test(lines[i])) {
                startIndex = i;
                break;
            }
        }
        if (startIndex === -1) return null;

        var kIndex = -1;
        for (var j = startIndex; j < lines.length; j++) {
            if (/^K:\s*/.test(lines[j])) {
                kIndex = j;
                break;
            }
        }
        if (kIndex === -1) return null;

        var musicLineIndex = -1;
        for (var k = kIndex + 1; k < lines.length; k++) {
            var line = lines[k].trim();
            if (line === "") continue;
            if (/^[A-Z]:/.test(line)) continue; // Ignore other header fields
            musicLineIndex = k;
            break;
        }
        if (musicLineIndex === -1) return null;

        // Capture from the "X:" field up to and including the first musical line.
        var blockLines = lines.slice(startIndex, musicLineIndex + 1);
        return blockLines.join("\n");
    }

    /**
     * Removes unwanted fields (B:, D:, F:, H:, N:, S:) from the ABC block.
     *
     * @param {string} abcBlock - The original ABC block.
     * @return {string} - The cleaned ABC block.
     */
    function cleanABCBlock(abcBlock) {
        if (!abcBlock) return abcBlock;
        return abcBlock
            .split(/\r?\n/)
            .filter(function (line) {
                return !/^[BDFHNS]:/i.test(line.trim());
            })
            .join("\n");
    }

    /**
     * Fetches the wikitext content of an article via the MediaWiki API.
     *
     * @param {string} title - The title of the article.
     * @param {function} callback - The callback function receiving the content.
     */
    function fetchArticleContent(title, callback) {
        $.getJSON(
            mw.util.wikiScript('api'),
            {
                action: 'query',
                format: 'json',
                prop: 'revisions',
                titles: title,
                rvslots: 'main',
                rvprop: 'content'
            }
        ).done(function (data) {
            var pages = data.query.pages;
            var content = null;
            $.each(pages, function (pageid, page) {
                if (page.revisions && page.revisions[0]) {
                    if (page.revisions[0].slots && page.revisions[0].slots.main) {
                        content = page.revisions[0].slots.main['*'];
                    } else {
                        content = page.revisions[0]['*'];
                    }
                }
            });
            callback(content);
        });
    }

    /**
     * Positions the tooltip above or below the link, depending on space.
     * - We center horizontally on pageX.
     * - By default, we place it below (abc-tooltip-below).
     * - If it doesn't fit, we place it above (abc-tooltip-above).
     *
     * @param {jQuery} $tooltip - The tooltip element.
     * @param {number} pageX - The mouse page X coordinate.
     * @param {number} pageY - The mouse page Y coordinate.
     */
    function positionTooltip($tooltip, pageX, pageY) {
        var scrollLeft = $(window).scrollLeft();
        var scrollTop = $(window).scrollTop();
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();

        var tooltipWidth = $tooltip.outerWidth();
        var tooltipHeight = $tooltip.outerHeight();

        // Center the tooltip horizontally around pageX
        var left = pageX - tooltipWidth / 2;
        // Place below by default
        var top = pageY + 10;

        var rightLimit = scrollLeft + windowWidth;
        var bottomLimit = scrollTop + windowHeight;

        // If the tooltip would overflow to the right, clamp it
        if (left + tooltipWidth > rightLimit) {
            left = rightLimit - tooltipWidth - 1;
        }
        // If the tooltip would overflow to the left, clamp it
        if (left < scrollLeft) {
            left = scrollLeft + 1;
        }

        // We'll assume below first
        var below = true;
        // If placing it below overflows the bottom, place it above
        if (top + tooltipHeight > bottomLimit) {
            below = false;
            top = pageY - tooltipHeight - 10;
        }

        // If placing above goes off the top, clamp it
        if (top < scrollTop) {
            top = scrollTop + 1;
        }

        $tooltip.css({ left: left, top: top }).show();

        // Add the correct class for the arrow
        if (below) {
            $tooltip.removeClass('abc-tooltip-above').addClass('abc-tooltip-below');
            // The tooltip grows downward from the link
            $tooltip.css({ 'transform-origin': 'top center' });
        } else {
            $tooltip.removeClass('abc-tooltip-below').addClass('abc-tooltip-above');
            // The tooltip grows upward from the link
            $tooltip.css({ 'transform-origin': 'bottom center' });
        }
    }

    /**
     * Creates and displays a tooltip for the given ABC block.
     * The tooltip contains a header with the label "Incipit" and a container
     * where the ABC notation is rendered.
     *
     * @param {jQuery} $link - The link that triggered the tooltip.
     * @param {string} abcBlock - The raw ABC block.
     * @param {number} pageX - The mouse page X coordinate.
     * @param {number} pageY - The mouse page Y coordinate.
     * @return {jQuery} - The tooltip element.
     */
    function showTooltip($link, abcBlock, pageX, pageY) {
        var cleanedBlock = cleanABCBlock(abcBlock);
        var $tooltip = $('<div class="abc-tooltip"></div>').hide().css({
            'position': 'absolute',
            // Slightly lighter antique paper color:
            'background': '#fbfce9',
            'border': '1px solid #ccc',
            'border-radius': '4px',
            'box-shadow': '0 2px 5px rgba(0, 0, 0, 0.2)',
            'font-size': '0.9em',
            'padding': '5px',
            'z-index': 1000,
            // Scale to 50% (the user requested scale(0.5))
            'transform': 'scale(0.5)',
            // We'll set transform-origin dynamically in positionTooltip
        });
        $('body').append($tooltip);

        // Create a header for the tooltip with the label "Incipit"
        var $header = $('<div class="abc-tooltip-header" style="font-weight: bold; margin-bottom: 5px;">Incipit</div>');
        // Create a container for rendering the musical notation
        var $musicContainer = $('<div class="abc-tooltip-music"></div>');
        $tooltip.append($header).append($musicContainer);

        // Render the ABC notation using abcjs
        if (window.ABCJS && typeof window.ABCJS.renderAbc === 'function') {
            try {
                ABCJS.renderAbc($musicContainer[0], cleanedBlock);
            } catch (e) {
                $tooltip.text('Error rendering ABC notation.');
            }
        } else {
            $tooltip.text('abcjs is not available.');
        }

        // Position the tooltip (above or below)
        positionTooltip($tooltip, pageX, pageY);

        // Remove the tooltip when the mouse leaves it
        $tooltip.on('mouseleave', function () {
            $tooltip.remove();
            $link.removeData('abc-tooltip');
            activeTooltip = null; // allow a new tooltip to open
        });

        return $tooltip;
    }

    /**
     * Handler for mouse hover in on a link.
     * Implements a delay before showing the tooltip and prevents opening new tooltips
     * while one is already active.
     *
     * @param {Event} event - The mouseenter event.
     */
    function onLinkHoverIn(event) {
        if (activeTooltip) {
            return;
        }
        var $link = $(this);
        var pageX = event.pageX, pageY = event.pageY;
    
        tooltipTimer = setTimeout(function () {
            var href = $link.attr('href');
            var title = decodeURIComponent(href.replace('/wiki/', ''));
            var cachedBlock = $link.data('abc-block');
            if (cachedBlock) {
                var $tooltip = showTooltip($link, cachedBlock, pageX, pageY);
                $link.data('abc-tooltip', $tooltip);
                activeTooltip = $tooltip;
            } else {
                fetchArticleContent(title, function (content) {
                    var abcBlock = parseABCBlock(content);
                    if (abcBlock) {
                        $link.data('abc-block', abcBlock);
                        var $tooltip = showTooltip($link, abcBlock, pageX, pageY);
                        $link.data('abc-tooltip', $tooltip);
                        activeTooltip = $tooltip;
                    }
                });
            }
            tooltipTimer = null;
        }, tooltipDelay);
    }

    /**
     * Handler for mouse hover out on a link.
     * Cancels the tooltip timer if not yet shown, or removes the active tooltip.
     */
    function onLinkHoverOut() {
        var $link = $(this);
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        var $tooltip = $link.data('abc-tooltip');
        if ($tooltip) {
            $tooltip.remove();
            $link.removeData('abc-tooltip');
            activeTooltip = null;
        }
    }

    // ---------------------------------------------------------------------
    // Document ready: inject arrow CSS, check user preference, attach events.
    // ---------------------------------------------------------------------
    $(document).ready(function () {
        // 1) Insert the arrow CSS so we can use pseudo-elements for the arrow
        injectArrowCSS();

        // 2) Attach hover handlers only if the user preference is enabled
        if (mw.user.options.get('abcHoverPreviewMouseHover') === '1') {
            var $wikiLinks = $('a').filter(function () {
                var href = $(this).attr('href');
                return href && href.indexOf('/wiki/') === 0;
            });
            $wikiLinks.hover(onLinkHoverIn, onLinkHoverOut);
        }
    });
}(mediaWiki, jQuery));