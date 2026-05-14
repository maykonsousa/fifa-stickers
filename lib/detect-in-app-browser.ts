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

export function getExternalBrowserUrl(url: string): string {
  const isAndroid = /android/i.test(navigator.userAgent);

  if (isAndroid) {
    return `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
  }

  return url;
}