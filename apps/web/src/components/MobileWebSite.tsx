import type { ReactElement } from "react";

import { AboutPanel } from "./AboutPanel";
import { HomeIntro } from "./HomeIntro";
import { ProtocolPanel } from "./ProtocolPanel";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Retained exclusively for the existing <=760px website; never initialized on desktop. */
export function MobileWebSite(): ReactElement {
  return (
    <div className="mobile-web-site site-shell" data-site-shell data-theme="light">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main-content"
        className="scroll-deck"
        data-deck
        tabIndex={-1}
        aria-label="Discover QuantX"
      >
        <section
          id="overview"
          className="panel home-panel"
          aria-label="QuantX overview"
          data-panel
          data-theme="light"
        >
          <div className="panel-grid home-grid">
            <HomeIntro />
          </div>
        </section>
        <ProtocolPanel />
        <AboutPanel />
      </main>
      <SiteFooter />
      <output className="sr-only" aria-live="polite" aria-atomic="true" data-section-announcement />
    </div>
  );
}
