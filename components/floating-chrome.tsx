"use client";

import { useState } from "react";
import { InstallAppBanner } from "./install-app-banner";

export function FloatingChrome() {
  // null = ainda não decidimos; o InstallAppBanner reporta no primeiro
  // useEffect dele se vai aparecer ou não.
  const [bannerShown, setBannerShown] = useState<boolean | null>(null);

  return (
    <>
      <InstallAppBanner onVisibleChange={setBannerShown} />
    </>
  );
}
