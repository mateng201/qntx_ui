import { hero, standards } from "@qntx-ui/content";
import type { ReactElement } from "react";

import { links } from "../data/site";
import { Icon } from "./Icon";

export function HomeIntro(): ReactElement {
  return (
    <div className="home-intro panel-intro">
      <h1>
        {hero.titleLines[0]}
        <br />
        {hero.titleLines[1]}
      </h1>
      <p className="intro-copy">{hero.description}</p>
      <div className="hero-actions flex items-center gap-6">
        <a
          className="button button-primary inline-flex items-center gap-5"
          href="#protocols"
          data-panel-link
        >
          {hero.primaryAction} <Icon />
        </a>
        <a className="text-link" href={links.github}>
          {hero.secondaryAction} <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="standards">
        <div className="standard-links flex items-center">
          {standards.map((standard) => (
            <a
              href={standard.href}
              className={standard.label === "x402" ? "standard-x402" : undefined}
              key={standard.label}
            >
              {standard.label}
              <span> / {standard.detail}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
