<?php
/**
 * AbcHoverPreviewHooks.php
 *
 * Hook file for the AbcHoverPreview extension.
 * This extension shows a preview tooltip with an ABC notation excerpt
 * when the mouse hovers over a wiki link.
 */

class AbcHoverPreviewHooks {
    public static function onBeforePageDisplay( $out, $skin ) {
        global $wgAbcJsBasicPath;
        // Load the abcjs-basic script from the configurable path
        if ( isset( $wgAbcJsBasicPath ) && !empty( $wgAbcJsBasicPath ) ) {
            $out->addScriptFile( $wgAbcJsBasicPath );
        }
        // Load the extension's client-side module
        $out->addModules( 'ext.abcHoverPreview' );
        return true;
    }
}