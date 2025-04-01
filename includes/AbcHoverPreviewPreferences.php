<?php
/**
 * AbcHoverPreviewPreferences.php
 *
 * Implements the GetPreferences hook to add a user preference
 * for enabling/disabling the mouse hover preview.
 */

class AbcHoverPreviewPreferences {
    /**
     * Implements the GetPreferences hook.
     *
     * @param User $user The user whose preferences are being modified.
     * @param array &$preferences The preferences array to be used in the HTMLForm.
     * @return bool
     */
    public static function onGetPreferences( $user, array &$preferences ) {
        // Add the preference to the 'rendering' section (Appearance)
        $preferences['abcHoverPreviewMouseHover'] = [
            'type'          => 'toggle',
            'label-message' => 'pref-abc-hover-preview-mousehover',
            'section'       => 'rendering/abchover'
        ];
        return true;
    }
}