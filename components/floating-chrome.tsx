"use client";

import { useState } from "react";
import { ContactWidget } from "./contact-widget";
import { InstallAppBanner } from "./install-app-banner";

export function FloatingChrome() {
  // null = ainda não decidimos; o InstallAppBanner reporta no primeiro
  // useEffect dele se vai aparecer ou não. Até lá, escondemos os dois
  // pra não ter flash do widget de contato logo na entrada.
  const [bannerShown, setBannerShown] = useState<boolean | null>(null);

  return (
    <>
      <InstallAppBanner onVisibleChange={setBannerShown} />
      {bannerShown === false && <ContactWidget />}
    </>
  );
}
