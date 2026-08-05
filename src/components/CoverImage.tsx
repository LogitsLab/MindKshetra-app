import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  source: ImageSourcePropType;
  /** 0–1 opacity on the photo (scrim lives outside). */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-bleed tile/hero photo. RN Web often ignores absoluteFill on bare
 * <Image>, so we fill a View and stretch the image inside it.
 */
export function CoverImage({ source, opacity = 1, style }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, style, { opacity }]}
    >
      <Image source={source} style={styles.img} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    width: "100%",
    height: "100%",
  },
});
