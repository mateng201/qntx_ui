import type { ReactElement } from "react";

import { sections } from "../data/site";
import { Icon } from "./Icon";

const copyrightYear = new Date().getFullYear();

export function SiteFooter(): ReactElement {
  return (
    <footer className="site-footer flex items-center justify-between">
      <span className="copyright">© {copyrightYear} QuantX</span>
      <nav className="section-progress flex items-center" aria-label="Page sections">
        {sections.map((section) => (
          <a
            href={`#${section.id}`}
            data-panel-link
            className="progress-link"
            aria-label={`${section.number} ${section.label}`}
            aria-current={section.id === "overview" ? "page" : undefined}
            key={section.id}
          >
            <span className="progress-line" />
            <span className="progress-number mono">{section.number}</span>
          </a>
        ))}
      </nav>
      <div className="footer-controls flex items-center">
        <a
          className="footer-back"
          href="#overview"
          data-panel-link
          aria-label="Back to the beginning"
          title="Back to the beginning"
        >
          <span className="footer-back-label">Back to the beginning</span>
          <span aria-hidden="true">↶</span>
        </a>
        <span className="scroll-hint mono">
          SCROLL TO EXPLORE <span aria-hidden="true">→</span>
        </span>
        <span className="panel-counter mono" aria-hidden="true">
          <span data-current-panel>01</span> / {String(sections.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="direction-button previous"
          data-previous
          aria-label="Previous section"
          disabled
        >
          <Icon kind="chevron" />
        </button>
        <button type="button" className="direction-button" data-next aria-label="Next section">
          <Icon kind="chevron" />
        </button>
      </div>
    </footer>
  );
}
