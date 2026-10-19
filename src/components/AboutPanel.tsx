import type { ReactElement } from "react";

import { links } from "../data/site";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";

const destinations = [
  {
    number: "01",
    label: "Explore the organization",
    detail: "github.com/qntx",
    href: links.github,
  },
  {
    number: "02",
    label: "Read the documentation",
    detail: "qntx.org/developers",
    href: links.docs,
  },
  { number: "03", label: "Follow the work", detail: "@qntxorg on X", href: links.social },
] as const;

export function AboutPanel(): ReactElement {
  return (
    <section
      id="about"
      className="panel about-panel"
      aria-labelledby="about-title"
      data-panel
      data-theme="dark"
    >
      <div className="panel-grid">
        <div className="panel-intro section-intro">
          <p className="eyebrow">04 / THIS IS QUANTX</p>
          <h2 id="about-title">
            Code is law.
            <br />
            We write both.
          </h2>
          <p className="intro-copy">
            An open-source organization building the economic layer for autonomous AI agents.
          </p>
          <a href={links.website} className="text-link section-link">
            Visit qntx.org <Icon />
          </a>
          <div className="about-signature">
            <BrandMark className="signature-mark" />
            <span>
              Independent agents.
              <br />
              Shared possibilities.
            </span>
          </div>
        </div>
        <div className="about-destinations">
          <p className="mono destination-heading">THE NEXT CHAPTER STARTS WITH YOU.</p>
          {destinations.map((destination) => (
            <a href={destination.href} className="destination-row" key={destination.number}>
              <span className="row-number mono">{destination.number}</span>
              <div>
                <h3>{destination.label}</h3>
                <p>{destination.detail}</p>
              </div>
              <Icon />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
