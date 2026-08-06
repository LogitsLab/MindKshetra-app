import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type CoverImageFocus = "center" | "top";

type Props = {
  source: ImageSourcePropType;
  /** 0–1 opacity on the photo (scrim lives outside). */
  opacity?: number;
  /** Where cover-crop prefers. `top` keeps faces/crowns in tall art. */
  focus?: CoverImageFocus;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-bleed tile/hero photo. RN Web often ignores absoluteFill on bare
 * <Image>, so we fill a View and stretch the image inside it.
 */
export function CoverImage({
  source,
  opacity = 1,
  focus = "center",
  style,
}: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.clip, style, { opacity }]}
    >
      <Image
        source={source}
        style={focus === "top" ? styles.imgTop : styles.img}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  /**
   * Taller than the tile, pinned to the top — cover-crop shows the upper
   * band (crown / face) instead of the vertical center.
   */
  imgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "155%",
  },
});
