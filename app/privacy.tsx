import React from "react";
import { ScrollView, Linking, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useLanguage } from "@/context/LanguageContext";
import { spacing } from "@/theme/tokens";

export default function PrivacyScreen() {
  const { lang } = useLanguage();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: spacing.md }}>
        <Text variant="display">
          {lang === "hi" ? "गोपनीयता" : "Privacy"}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.md }}>
          {lang === "hi"
            ? "MindKshetra आपके पठन, पसंदीदा, जर्नल, चैट और ज्योतिष विवरण को सेवा चलाने के लिए संसाधित करता है। हम व्यक्तिगत डेटा नहीं बेचते।"
            : "MindKshetra processes your reading progress, favorites, journal, chat, and astrology details to run the product. We do not sell personal data."}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.md }}>
          {lang === "hi"
            ? "पूर्ण नीति वेब पर उपलब्ध है।"
            : "The full policy is published on the web."}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label={lang === "hi" ? "वेब पर खोलें" : "Open on web"}
            variant="ghost"
            onPress={() => Linking.openURL("https://mindkshetra.app/privacy")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
