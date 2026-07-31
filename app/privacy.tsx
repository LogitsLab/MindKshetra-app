import React from "react";
import { ScrollView, Linking, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useLanguage } from "@/context/LanguageContext";
import { spacing } from "@/theme/tokens";

const PRIVACY_URL = "https://mind.logitslab.com/privacy";

export default function PrivacyScreen() {
  const { lang } = useLanguage();
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80, paddingTop: spacing.md }}
      >
        <Text variant="display">
          {lang === "hi" ? "गोपनीयता" : "Privacy"}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.md }}>
          {lang === "hi"
            ? "MindKshetra आपके पठन, पसंदीदा, जर्नल, चैट और ज्योतिष विवरण को सेवा चलाने के लिए संसाधित करता है। हम व्यक्तिगत डेटा नहीं बेचते। वेब और मोबाइल एक ही खाते/बैकएंड का उपयोग करते हैं।"
            : "MindKshetra processes your reading progress, favorites, journal, chat, and astrology details to run the product. We do not sell personal data. Web and mobile share the same account and backend."}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.md }}>
          {lang === "hi"
            ? "हम कुछ सीमित प्रथम-पक्ष उत्पाद इवेंट (जैसे श्लोक पूर्ण, स्ट्रीक दर्ज) भी रिकॉर्ड करते हैं — बिना IP पते या यूज़र एजेंट के — केवल अभ्यास सुविधाओं को समझने और बेहतर बनाने के लिए। कोई तृतीय-पक्ष एनालिटिक्स नहीं, कोई विज्ञापन उपयोग नहीं।"
            : "We also record a small, fixed set of first-party product events (like verse completed or streak recorded) without IP address or user agent, only to understand and improve the practice features. No third-party analytics, no advertising use."}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.md }}>
          {lang === "hi"
            ? "पूर्ण नीति वेब पर उपलब्ध है — स्टोर सूची और कानूनी संदर्भ के लिए वही URL उपयोग करें।"
            : "The full policy lives on the web — use that URL for store listings and legal reference."}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label={lang === "hi" ? "पूर्ण नीति खोलें" : "Open full policy"}
            variant="ghost"
            onPress={() => Linking.openURL(PRIVACY_URL)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
