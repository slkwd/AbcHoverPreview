# AbcHoverPreview

AbcHoverPreview is a MediaWiki extension that displays a preview tooltip for pages containing ABC music notation when the user hovers over a wiki link. The tooltip shows an excerpt ("Incipit")—specifically, the first musical line extracted from the ABC block—allowing users to preview musical notation without leaving the current page.

## Features

- **Mouse Hover Preview:** Displays a tooltip when hovering over a link to a page that contains ABC notation.
- **Incipit Label:** The tooltip includes a header with the label **"Incipit"** to indicate that only the first musical line is shown.
- **Delayed Tooltip:** A small delay (default 300 ms) is applied before the tooltip appears, so that multiple tooltips do not overwhelm the interface.
- **Active Tooltip Control:** While a tooltip is visible, no new tooltip will open.
- **User Preference:** Users can enable or disable the mouse hover preview via their MediaWiki preferences.
- **Configurable abcjs-basic.js Path:** You can specify the path to the ABCJS-Basic library via a configuration parameter in LocalSettings.php.

## Prerequisites

- **MediaWiki:** Version 1.25 or higher (tested on recent versions).
- **ABCJS-Basic Library:** The extension relies on the [ABCJS-Basic](https://github.com/paulrosen/abcjs) library to render ABC notation. Place the `abcjs-basic.js` file (for example in `/w/JavaScript/`) on your server.
- **PHP:** A working PHP installation (as required by MediaWiki).

## Installation

1. **Download or Clone the Extension:**

   Clone the repository or download the archive from GitHub:

   ```bash
   git clone https://github.com/yourusername/AbcHoverPreview.git


# AbcHoverPreview

AbcHoverPreview is a MediaWiki extension that displays a preview tooltip for pages containing ABC music notation when the user hovers over a wiki link. The tooltip shows an excerpt ("Incipit")—specifically, the first musical line extracted from the ABC block—allowing users to preview musical notation without leaving the current page.

## Features

- **Mouse Hover Preview:** Displays a tooltip when hovering over a link to a page that contains ABC notation.
- **Incipit Label:** The tooltip includes a header with the label **"Incipit"** to indicate that only the first musical line is shown.
- **Delayed Tooltip:** A small delay (default 300 ms) is applied before the tooltip appears, so that multiple tooltips do not overwhelm the interface.
- **Active Tooltip Control:** While a tooltip is visible, no new tooltip will open.
- **User Preference:** Users can enable or disable the mouse hover preview via their MediaWiki preferences.
- **Configurable abcjs-basic.js Path:** You can specify the path to the ABCJS-Basic library via a configuration parameter in LocalSettings.php.

## Prerequisites

- **MediaWiki:** Version 1.25 or higher (tested on recent versions).
- **ABCJS-Basic Library:** The extension relies on the [ABCJS-Basic](https://github.com/paulrosen/abcjs) library to render ABC notation. Place the `abcjs-basic.js` file (for example in `/w/JavaScript/`) on your server.
- **PHP:** A working PHP installation (as required by MediaWiki).

## Installation

1. **Download or Clone the Extension:**

   Clone the repository or download the archive from GitHub:

   ```bash
   git clone https://github.com/yourusername/AbcHoverPreview.git

2.	**Copy the Extension Folder:**
Place the entire AbcHoverPreview folder into your MediaWiki extensions directory (commonly /var/www/w/extensions/).

3.	**Load the Extension:**
Add the following lines to your LocalSettings.php file:
	```php
	wfLoadExtension( 'AbcHoverPreview' );
	// Configure the path to abcjs-basic.js
	$wgAbcJsBasicPath = "/w/JavaScript/abcjs-basic.js";

## Configuration

Global Configuration

* abcjs-basic.js Path:
The global variable $wgAbcJsBasicPath specifies the URL path to abcjs-basic.js. Ensure that the path is correct for your installation.

## User Preference

AbcHoverPreview adds a user preference labeled “Show preview on mouse hover” in the Appearance (Rendering) section of Special:Preferences. This option allows users to enable or disable the mouse hover preview feature. The default setting is enabled.

This preference is registered using the MediaWiki hook GetPreferences in the file includes/AbcHoverPreviewPreferences.php. The default value is set in LocalSettings.php:

$wgDefaultUserOptions['abcHoverPreviewMouseHover'] = 1;

## Tooltip Behavior
* Tooltip Delay:
The delay before the tooltip appears is defined in the JavaScript file (tooltipDelay variable, default is 300 ms). You can adjust this value as needed.

* Active Tooltip Control:
The extension prevents new tooltips from opening while one is already active.

## How It Works
	1.	When a user hovers over a wiki link, the extension waits for a short delay.
	2.	It checks if the user preference to enable mouse hover preview is set (using mw.user.options.get('abcHoverPreviewMouseHover')).
	3.	It then retrieves the wikitext of the target page via the MediaWiki API.
	4.	The extension extracts a valid ABC block (starting from the “X:” field and including the first musical line after the “K:” field).
	5.	Unwanted header fields (e.g., B:, D:, F:, H:, N:, S:) are removed from the ABC block.
	6.	The tooltip is generated with a header showing “Incipit” and the rendered ABC notation.
	7.	The tooltip is positioned near the mouse cursor, ensuring it does not overflow the viewport.
	8.	While a tooltip is active, new tooltips are not opened until the current one is closed.

## Usage
* Viewing Previews:
Hover over any wiki link. If the target page contains ABC notation, a tooltip will appear after a short delay, showing the “Incipit” (the first musical line) of the notation.

* Disabling the Preview:
Users can disable the preview functionality via Special:Preferences under the Appearance (Rendering) tab.

## Customization

* Localization:
All labels and messages are defined in the i18n/en.json file. You can add translations by creating additional JSON files for other languages.

* CSS & JavaScript:
The tooltip appearance and behavior can be customized by modifying the styles in the JavaScript file (resources/abcHoverPreview.js) or by adding your own CSS rules in MediaWiki:Common.css.

## Troubleshooting
* Preference Not Taking Effect:
Ensure you have cleared your cache and, if needed, logged out and back in after installing the extension. Verify the preference appears in Special:Preferences under the Rendering section.

* abcjs-basic.js Issues:
Double-check the $wgAbcJsBasicPath setting in LocalSettings.php and ensure the file is accessible via the specified URL.

## Contributing

Contributions and feedback are welcome! If you have any issues or suggestions for improvement, please open an issue or submit a pull request on the GitHub repository.

License

AbcHoverPreview is licensed under the GPL-2.0-or-later license.

⸻

This extension is maintained by Valerio Pelliccioni.
