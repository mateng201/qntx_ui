import { aboutDestinations, aboutIntro } from "@qntx-ui/content";
import type { ReactElement } from "react";

import { links } from "../data/site";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";

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
          <h2 id="about-title">
            {aboutIntro.titleLines[0]}
            <br />
            {aboutIntro.titleLines[1]}
          </h2>
          <p className="intro-copy">{aboutIntro.description}</p>
          <a href={links.website} className="text-link section-link">
            {aboutIntro.action} <Icon />
          </a>
          <div className="about-signature">
            <BrandMark className="signature-mark" />
            <span>
              {aboutIntro.signatureLines[0]}
              <br />
              {aboutIntro.signatureLines[1]}
            </span>
          </div>
        </div>
        <div className="about-destinations">
          <p className="mono destination-heading">{aboutIntro.destinationHeading}</p>
          {aboutDestinations.map((destination) => (
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
