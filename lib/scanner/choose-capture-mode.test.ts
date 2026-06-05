import { describe, it, expect } from "vitest";
import { chooseCaptureMode } from "./choose-capture-mode";

describe("chooseCaptureMode", () => {
  it("usa vídeo ao vivo quando há getUserMedia e não é in-app", () => {
    expect(chooseCaptureMode({ inApp: false, hasGetUserMedia: true })).toBe("live");
  });

  it("cai para foto em navegador in-app", () => {
    expect(chooseCaptureMode({ inApp: true, hasGetUserMedia: true })).toBe("photo");
  });

  it("cai para foto quando getUserMedia não existe", () => {
    expect(chooseCaptureMode({ inApp: false, hasGetUserMedia: false })).toBe("photo");
  });
});
