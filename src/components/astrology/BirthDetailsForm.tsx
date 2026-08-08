import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import {
  dateFromDob,
  dateFromTob,
  dobFromDate,
  formatDobDisplay,
  tobFromDate,
  type BirthDetails,
  type GeoPlace,
} from "@/components/astrology/birthDetails";

const GEOCODE_DEBOUNCE_MS = 380;

type Props = {
  value: BirthDetails;
  onChange: (next: BirthDetails) => void;
};

/**
 * Shared birth-moment form: native date/time pickers (no more raw
 * YYYY-MM-DD typing), a real "time unknown" switch, and debounced
 * auto-geocoding where picking a suggestion IS the confirmation.
 */
export function BirthDetailsForm({ value, onChange }: Props) {
  const { colors, mode } = useTheme();
  const { lang, t } = useLanguage();

  const [placeQuery, setPlaceQuery] = useState(value.place?.label ?? "");
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);
  const [iosPicker, setIosPicker] = useState<"date" | "time" | null>(null);

  // Monotonic request id: a slower older geocode response can never
  // overwrite the results of a newer query.
  const geoRequestRef = useRef(0);

  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 2 || (value.place && q === value.place.label)) {
      geoRequestRef.current += 1;
      setSuggestions([]);
      setGeoBusy(false);
      return;
    }
    const requestId = ++geoRequestRef.current;
    const timer = setTimeout(() => {
      setGeoBusy(true);
      astrologyApi
        .geocode(q)
        .then((res) => {
          if (geoRequestRef.current !== requestId) return;
          setSuggestions((res.results ?? []) as GeoPlace[]);
        })
        .catch(() => {
          if (geoRequestRef.current === requestId) setSuggestions([]);
        })
        .finally(() => {
          if (geoRequestRef.current === requestId) setGeoBusy(false);
        });
    }, GEOCODE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [placeQuery, value.place]);

  function openDatePicker() {
    Keyboard.dismiss();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: dateFromDob(value.dob),
        mode: "date",
        maximumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            onChange({ ...value, dob: dobFromDate(date) });
          }
        },
      });
      return;
    }
    setIosPicker((p) => (p === "date" ? null : "date"));
  }

  function openTimePicker() {
    Keyboard.dismiss();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: dateFromTob(value.tob),
        mode: "time",
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            onChange({ ...value, tob: tobFromDate(date) });
          }
        },
      });
      return;
    }
    setIosPicker((p) => (p === "time" ? null : "time"));
  }

  function pickPlace(s: GeoPlace) {
    onChange({ ...value, place: s });
    setPlaceQuery(s.label);
    setSuggestions([]);
    Keyboard.dismiss();
  }

  function onQueryChange(text: string) {
    setPlaceQuery(text);
    if (value.place && text !== value.place.label) {
      onChange({ ...value, place: null });
    }
  }

  const fieldStyle = [
    styles.field,
    { borderColor: colors.line, backgroundColor: colors.inputBg },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="eyebrow">{t("astroDob")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("astroDob")}
        onPress={openDatePicker}
        style={fieldStyle}
      >
        <Text
          variant="body"
          style={!value.dob ? { color: colors.textMuted } : null}
        >
          {value.dob ? formatDobDisplay(value.dob, lang) : t("astroSelectDate")}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && iosPicker === "date" ? (
        <View
          style={[
            styles.pickerPanel,
            { borderColor: colors.line, backgroundColor: colors.panel },
          ]}
        >
          <DateTimePicker
            key="astro-dob"
            value={dateFromDob(value.dob)}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            themeVariant={mode}
            onChange={(_event, date) => {
              if (date) onChange({ ...value, dob: dobFromDate(date) });
            }}
          />
          <Button
            label={t("astroPickerDone")}
            variant="ghost"
            onPress={() => setIosPicker(null)}
          />
        </View>
      ) : null}

      <Text variant="eyebrow">{t("astroTob")}</Text>
      {!value.tobUnknown ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("astroTob")}
            onPress={openTimePicker}
            style={fieldStyle}
          >
            <Text variant="body">{value.tob || t("astroSelectTime")}</Text>
          </Pressable>
          {Platform.OS === "ios" && iosPicker === "time" ? (
            <View
              style={[
                styles.pickerPanel,
                { borderColor: colors.line, backgroundColor: colors.panel },
              ]}
            >
              <DateTimePicker
                key="astro-tob"
                value={dateFromTob(value.tob)}
                mode="time"
                display="spinner"
                // Explicit range: Fabric recycles the date picker's
                // maximumDate into this view as Unix epoch (5:30 AM IST)
                // when maximumDate is omitted.
                minimumDate={new Date(1800, 0, 1)}
                maximumDate={new Date(2100, 11, 31)}
                themeVariant={mode}
                onChange={(_event, date) => {
                  if (date) onChange({ ...value, tob: tobFromDate(date) });
                }}
              />
              <Button
                label={t("astroPickerDone")}
                variant="ghost"
                onPress={() => setIosPicker(null)}
              />
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.switchRow}>
        <Text variant="soft" style={{ flex: 1 }}>
          {t("astroTobUnknown")}
        </Text>
        <Switch
          accessibilityLabel={t("astroTobUnknown")}
          value={value.tobUnknown}
          onValueChange={(on) => {
            if (on) setIosPicker((p) => (p === "time" ? null : p));
            onChange({ ...value, tobUnknown: on });
          }}
          trackColor={{ true: colors.brass, false: colors.mist }}
          thumbColor={value.tobUnknown ? colors.brassSoft : undefined}
        />
      </View>
      <Text variant="muted">{t("astroTobUnknownHint")}</Text>

      <Text variant="eyebrow" style={{ marginTop: spacing.xs }}>
        {t("astroPlace")}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <TextInput
          value={placeQuery}
          onChangeText={onQueryChange}
          placeholder={t("astroPlacePh")}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          accessibilityLabel={t("astroPlace")}
          style={[
            styles.field,
            styles.input,
            {
              flex: 1,
              color: colors.text,
              borderColor: colors.line,
              backgroundColor: colors.inputBg,
            },
          ]}
        />
        {geoBusy ? <ActivityIndicator color={colors.brass} /> : null}
      </View>
      {suggestions.map((s) => (
        <Pressable
          key={`${s.lat}-${s.lng}-${s.label}`}
          accessibilityRole="button"
          onPress={() => pickPlace(s)}
          style={[styles.suggest, { borderBottomColor: colors.hairline }]}
        >
          <Text variant="soft">{s.label}</Text>
        </Pressable>
      ))}
      {value.place ? (
        <Text variant="muted" style={{ color: colors.brassSoft }}>
          {t("astroPlaceConfirm")}: {value.place.label}
        </Text>
      ) : suggestions.length === 0 ? (
        <Text variant="muted">{t("astroPlaceHint")}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  input: {
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
  pickerPanel: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggest: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
