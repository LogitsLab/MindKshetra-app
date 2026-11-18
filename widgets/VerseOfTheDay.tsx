import { Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type VerseOfTheDayProps = {
  refLabel: string;
  translation: string;
  nakshatra: string;
};

/**
 * Home + Lock Screen VOTD. Layout-only: no hooks, no module-scope constants.
 * The main app pushes props via updateSnapshot when featured verses load.
 */
function VerseOfTheDayWidget(
  props: VerseOfTheDayProps,
  environment: WidgetEnvironment
) {
  "widget";
  const family = environment.widgetFamily;
  const isAccessory =
    family === "accessoryCircular" ||
    family === "accessoryInline" ||
    family === "accessoryRectangular";
  const refLabel = props.refLabel || "Gita";
  const line =
    props.translation ||
    (isAccessory ? "Today’s verse" : "Open MindKshetra for today’s verse.");
  const chip = props.nakshatra || "";

  if (family === "accessoryCircular") {
    return (
      <VStack modifiers={[padding({ all: 4 })]}>
        <Text
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle("#C9A227"),
          ]}
        >
          {refLabel}
        </Text>
      </VStack>
    );
  }

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[font({ size: 12 }), foregroundStyle("#EEF2F7")]}>
        {`${refLabel}${chip ? ` · ${chip}` : ""}`}
      </Text>
    );
  }

  return (
    <VStack
      modifiers={[
        padding({
          all: isAccessory ? 8 : 14,
        }),
      ]}
      spacing={isAccessory ? 2 : 6}
    >
      <Text
        modifiers={[
          font({ size: isAccessory ? 11 : 13, weight: "semibold" }),
          foregroundStyle("#C9A227"),
        ]}
      >
        {chip ? `${refLabel} · ${chip}` : refLabel}
      </Text>
      <Text
        modifiers={[
          font({ size: isAccessory ? 12 : family === "systemSmall" ? 13 : 15 }),
          foregroundStyle("#EEF2F7"),
        ]}
      >
        {line}
      </Text>
      {isAccessory ? null : (
        <Text
          modifiers={[font({ size: 11 }), foregroundStyle("#9AA8BC")]}
        >
          MindKshetra
        </Text>
      )}
    </VStack>
  );
}

export const VerseOfTheDay = createWidget(
  "VerseOfTheDay",
  VerseOfTheDayWidget
);
