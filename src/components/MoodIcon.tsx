import React, { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { moodIconXml } from "@/theme/moodIcons";
import { moodAccent } from "@/theme/assets";

type Props = {
  id: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function MoodIcon({ id, size = 28, color, style }: Props) {
  const fill = color ?? moodAccent[id] ?? "#c9a227";
  const xml = useMemo(() => moodIconXml(id, fill), [id, fill]);

  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
