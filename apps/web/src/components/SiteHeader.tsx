import type { ReactElement } from "react";

import { links, sections } from "../data/site";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";

export function SiteHeader(): ReactElement {
  return (
    <header className="site-header flex items-center justify-between">
      <a
        className="brand inline-flex items-center gap-3"
        href="#overview"
        data-panel-link
        aria-label="QuantX home"
      >
        <BrandMark className="brand-mark" />
        <span>QuantX</span>
      </a>
      <nav className="main-nav flex items-center" aria-label="Main navigation">
        {sections.map((section) => (
          <a
            className="nav-link header-action"
            href={`#${section.id}`}
            data-panel-link
            aria-current={section.id === "overview" ? "page" : undefined}
            key={section.id}
          >
            <span className="header-action-label">{section.label}</span>
          </a>
        ))}
      </nav>
      <div className="header-links flex items-center gap-7">
        <a
          href={links.github}
          className="github-link header-action inline-flex items-center gap-2"
          aria-label="QuantX on GitHub"
        >
          <Icon kind="github" />
          <span className="header-action-label">GitHub</span>
        </a>
        <a className="docs-link header-action inline-flex items-center gap-2" href={links.docs}>
          <span className="header-action-label">Docs</span> <Icon />
        </a>
      </div>
    </header>
  );
}
