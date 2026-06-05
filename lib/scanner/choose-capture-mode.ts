export type CaptureMode = "live" | "photo";

export interface CaptureEnv {
  inApp: boolean;
  hasGetUserMedia: boolean;
}

export function chooseCaptureMode({ inApp, hasGetUserMedia }: CaptureEnv): CaptureMode {
  if (inApp || !hasGetUserMedia) return "photo";
  return "live";
}

// Lê os sinais do ambiente do browser. Não é chamado em testes (impuro).
export function detectCaptureEnv(): CaptureEnv {
  const hasGetUserMedia =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  // isInAppBrowser importado pelo chamador para manter este módulo testável.
  return { inApp: false, hasGetUserMedia };
}
