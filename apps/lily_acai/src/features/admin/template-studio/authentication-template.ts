import type { JsonValue, MetaTemplateComponent } from "./template-types";

export type OtpType = "COPY_CODE" | "ONE_TAP" | "ZERO_TAP";

export function createAuthenticationComponents(existing?: MetaTemplateComponent[]): MetaTemplateComponent[] {
  const body = existing?.find((component) => component.type === "BODY");
  const footer = existing?.find((component) => component.type === "FOOTER");
  const buttons = existing?.find((component) => component.type === "BUTTONS");
  const otpButton = Array.isArray(buttons?.buttons)
    ? buttons.buttons.find((button) => button && typeof button === "object" && !Array.isArray(button) && button.type === "OTP")
    : undefined;
  const otpType = otpButton && typeof otpButton === "object" && !Array.isArray(otpButton) &&
    ["COPY_CODE", "ONE_TAP", "ZERO_TAP"].includes(String(otpButton.otp_type))
    ? otpButton.otp_type as OtpType : "COPY_CODE";
  const components: MetaTemplateComponent[] = [body?.add_security_recommendation === true
    ? { type: "BODY", add_security_recommendation: true }
    : { type: "BODY" }];
  const expiration = footer?.code_expiration_minutes;
  if (typeof expiration === "number" && Number.isInteger(expiration) && expiration >= 1 && expiration <= 90) {
    components.push({ type: "FOOTER", code_expiration_minutes: expiration });
  }
  components.push({ type: "BUTTONS", buttons: [{ type: "OTP", otp_type: otpType } as JsonValue] });
  return components;
}

export function setOtpType(components: MetaTemplateComponent[], otpType: OtpType) {
  return components.map((component) => component.type === "BUTTONS"
    ? { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: otpType } as JsonValue] }
    : component);
}

export function setAuthenticationSecurityRecommendation(components: MetaTemplateComponent[], enabled: boolean) {
  return components.map((component) => component.type === "BODY"
    ? enabled ? { ...component, add_security_recommendation: true } : { type: "BODY" }
    : component);
}

export function setAuthenticationExpiration(components: MetaTemplateComponent[], enabled: boolean, minutes: number) {
  const withoutFooter = components.filter((component) => component.type !== "FOOTER");
  if (!enabled) return withoutFooter;
  const buttonIndex = withoutFooter.findIndex((component) => component.type === "BUTTONS");
  const footer = { type: "FOOTER", code_expiration_minutes: minutes };
  return buttonIndex < 0
    ? [...withoutFooter, footer]
    : [...withoutFooter.slice(0, buttonIndex), footer, ...withoutFooter.slice(buttonIndex)];
}
