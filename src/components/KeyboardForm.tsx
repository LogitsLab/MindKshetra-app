import React, { forwardRef } from "react";
import type { ScrollView } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

/**
 * Android 15 edge-to-edge + adjustResize often leaves the focused field under
 * the IME. Keyboard-controller reads IME insets and scrolls the caret into view.
 */
export const KeyboardFormScroll = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardFormScroll(
    {
      children,
      bottomOffset = 24,
      extraKeyboardSpace = 16,
      keyboardShouldPersistTaps = "handled",
      ...rest
    },
    ref
  ) {
    return (
      <KeyboardAwareScrollView
        ref={ref}
        bottomOffset={bottomOffset}
        extraKeyboardSpace={extraKeyboardSpace}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...rest}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }
);

/** Spread onto single-line TextInput so glyphs stay painted while the IME is open. */
export const fieldInputProps = {
  underlineColorAndroid: "transparent" as const,
  textAlignVertical: "center" as const,
};

/** Spread onto multiline TextInput. */
export const multilineInputProps = {
  underlineColorAndroid: "transparent" as const,
  textAlignVertical: "top" as const,
};
