import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type CoverImageFocus = "center" | "top" | "bottom" | "left" | "right";

type Props = {
  source: ImageSourcePropType;
  /** 0–1 opacity on the photo (scrim lives outside). */
  opacity?: number;
  /**
   * Cover-crop preference when the frame and art aspect ratios differ.
   * `top` / `bottom` bias vertical crop; `left` / `right` bias horizontal.
   */
  focus?: CoverImageFocus;
  style?: StyleProp<ViewStyle>;
};

function imageStyleForFocus(focus: CoverImageFocus): StyleProp<ImageStyle> {
  switch (focus) {
    case "top":
      return styles.imgTop;
    case "bottom":
      return styles.imgBottom;
    case "left":
      return styles.imgLeft;
    case "right":
      return styles.imgRight;
    case "center":
    default:
      return styles.img;
  }
}

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
        style={imageStyleForFocus(focus)}
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
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  /** Bias crop toward the upper band (faces / crowns). */
  imgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "145%",
  },
  /** Bias crop toward the lower band. */
  imgBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "145%",
  },
  /** Bias crop toward the left (subjects on the left edge). */
  imgLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    height: "100%",
    width: "145%",
  },
  /** Bias crop toward the right. */
  imgRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    height: "100%",
    width: "145%",
  },
});
