(function (mw, $) {
    // Global variables for tooltip delay and active tooltip control
    var activeTooltip = null;
    var tooltipTimer = null;
    var tooltipDelay = 300; // Delay in milliseconds before showing the tooltip

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
     * Positions the tooltip so that it does not overflow outside the viewport.
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

        var left = pageX + 10;
        var top = pageY + 10;

        var rightLimit = scrollLeft + windowWidth;
        var bottomLimit = scrollTop + windowHeight;

        if (left + tooltipWidth > rightLimit) {
            left = pageX - tooltipWidth - 10;
        }
        if (top + tooltipHeight > bottomLimit) {
            top = pageY - tooltipHeight - 10;
        }
        if (left < scrollLeft) {
            left = scrollLeft;
        }
        if (top < scrollTop) {
            top = scrollTop;
        }
        $tooltip.css({ left: left, top: top }).show();
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
            'background': '#fff',
            'border': '1px solid #ccc',
            'padding': '5px',
            'z-index': 1000
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

    $(document).ready(function () {
        // Attach hover handlers only if the user preference is enabled.
        if (mw.user.options.get('abcHoverPreviewMouseHover') === '1') {
            var $wikiLinks = $('a').filter(function () {
                var href = $(this).attr('href');
                return href && href.indexOf('/wiki/') === 0;
            });
            $wikiLinks.hover(onLinkHoverIn, onLinkHoverOut);
        }
    });
}(mediaWiki, jQuery));