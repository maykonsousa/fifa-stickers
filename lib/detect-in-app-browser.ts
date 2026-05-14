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

export function getExternalBrowserIntent(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

export function isAndroidDevice(): boolean {
  return /android/i.test(navigator.userAgent);
}