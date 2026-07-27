import { detectUserCrisis, mentionsCrisisResource } from "../crisis";

/**
 * Guards /autoplan finding F1: before this, crisis detection only ever ran on the
 * model's reply, so a user expressing intent got no banner unless the model
 * happened to name a helpline.
 */
describe("detectUserCrisis — English", () => {
  it.each([
    "I want to kill myself",
    "i keep thinking about killing myself",
    "I want to end my life",
    "sometimes I just want to end it all",
    "I want to die",
    "I wish I was dead",
    "I don't want to live anymore",
    "everyone would be better off without me",
    "I've been feeling suicidal",
    "I have been hurting myself again",
    "I self-harm when it gets bad",
    "there is no point in living",
    "I can't go on like this",
  ])("flags %j", (input) => {
    expect(detectUserCrisis(input)).toBe(true);
  });

  it.each([
    "this deadline is killing me",
    "I'm dying to know what Krishna says next",
    "I killed it at the presentation today",
    "my phone battery died",
    "Arjuna did not want to fight his own family",
    "chapter 2 talks about the death of the body",
    "I feel anxious about work",
    "I'm stuck on a big decision",
    "",
  ])("stays silent on %j", (input) => {
    expect(detectUserCrisis(input)).toBe(false);
  });
});

describe("detectUserCrisis — Hindi", () => {
  it.each([
    "मैं आत्महत्या के बारे में सोच रहा हूँ",
    "मुझे मरना चाहिए",
    "मैं मर जाऊं तो अच्छा है",
    "अब जीना नहीं चाहता",
    "मैं जान दे दूँ",
    "मैं खुद को नुकसान पहुँचाता हूँ",
  ])("flags %j", (input) => {
    expect(detectUserCrisis(input)).toBe(true);
  });

  it.each(["काम को लेकर चिंता हो रही है", "मैं शोक में हूँ", "गीता में मृत्यु के बारे में क्या है"])(
    "stays silent on %j",
    (input) => {
      expect(detectUserCrisis(input)).toBe(false);
    }
  );
});

describe("mentionsCrisisResource", () => {
  it("detects a helpline the model already surfaced", () => {
    expect(mentionsCrisisResource("Please call iCall at 9152987821")).toBe(true);
    expect(mentionsCrisisResource("Reach the Vandrevala Foundation")).toBe(true);
    expect(mentionsCrisisResource("Tele-MANAS is available at 14416")).toBe(true);
  });

  it("does not fire on an ordinary reply", () => {
    expect(mentionsCrisisResource("Krishna tells Arjuna to act without attachment.")).toBe(false);
    expect(mentionsCrisisResource("")).toBe(false);
  });
});
