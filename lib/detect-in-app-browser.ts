export function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";

  const inAppPatterns = [
    /FBAN|FBAV/i,        // Facebook
    /Instagram/i,        // Instagram
    /LinkedInApp/i,      // LinkedIn
    /Twitter|X/i,        // Twitter / X (in-app)
    /Threads/i,          // Threads
    /TikTok/i,           // TikTok
    /Snapchat/i,         // Snapchat
    /Pinterest/i,        // Pinterest
    /MicroMessenger/i,   // WeChat
    /Line\//i,           // LINE
  ];

  return inAppPatterns.some((pattern) => pattern.test(ua));
}

export function openInExternalBrowser(url: string): { opened: boolean } {
  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);

  if (isAndroid) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
    window.location.href = intentUrl;
    return { opened: true };
  }

  // iOS: no reliable way to force Safari from a WebView.
  // Copy to clipboard and let the user paste in Safari.
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
  }
  return { opened: false };
}