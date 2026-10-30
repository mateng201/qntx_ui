import type { ReactElement } from "react";

import {
  aboutDestinations,
  aboutIntro,
  brandMarkPath,
  hero,
  homePageCopy,
  links,
} from "../data/site";
import { Icon } from "./Icon";

/** One server-rendered structure for every viewport, enhanced by native document scrolling. */
export function HomePage(): ReactElement {
  return (
    <div className="home-page" id="beginning" data-home-page>
      <a className="skip-to-content" href="#about" data-skip-to-about>
        Skip to the organization
      </a>
      <header className="site-header">
        <a className="site-brand" href="#beginning" aria-label="QuantX home">
          <span className="mascot-dock" data-mascot-dock aria-hidden="true" />
          <span>QuantX</span>
        </a>
        <nav className="resource-navigation" aria-label="QuantX resources">
          <a href={links.github}>
            <Icon kind="github" /> <span>GitHub</span>
          </a>
          <a href={links.docs}>
            <Icon /> <span>Docs</span>
          </a>
        </nav>
      </header>

      <div className="page-mascot" data-mascot aria-hidden="true">
        <svg viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="mascot-material" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#60645b" />
              <stop offset="0.4" stopColor="#363a31" />
              <stop offset="1" stopColor="#191c17" />
            </linearGradient>
          </defs>
          <path data-mascot-body d={brandMarkPath} fill="currentColor" fillRule="evenodd" />
          <path data-mascot-eye="left" d="M0 0Z" fill="#ffffff" />
          <path data-mascot-eye="right" d="M0 0Z" fill="#ffffff" />
        </svg>
      </div>

      <main className="scroll-track" data-scroll-track>
        <div className="scroll-viewport" data-scroll-viewport>
          <section
            className="page-section welcome-section"
            data-page-section="opening"
            aria-label="Welcome to QuantX"
          >
            <div className="welcome-caption">
              <h1>{homePageCopy.mission}</h1>
              <p>{homePageCopy.missionDetail}</p>
            </div>
          </section>

          <section
            className="page-section about-section"
            id="about"
            data-page-section="about"
            aria-labelledby="about-title"
            tabIndex={-1}
          >
            <div className="about-content">
              <h2 id="about-title">
                {aboutIntro.titleLines[0]}
                <br />
                <span>{aboutIntro.titleLines[1]}</span>
              </h2>
              <p className="about-description">{aboutIntro.description}</p>
            </div>
          </section>

          <section
            className="page-section resources-section"
            id="resources"
            data-page-section="resources"
            aria-labelledby="resources-title"
          >
            <div className="resources-layout">
              <div className="resources-intro">
                <h2 id="resources-title">
                  {hero.titleLines[0]}
                  <br />
                  {hero.titleLines[1]}
                </h2>
                <p className="resources-description">{homePageCopy.valueProposition}</p>
                <div className="resources-actions">
                  <a className="primary-link" href={links.github}>
                    {hero.primaryAction}
                    <Icon />
                  </a>
                  <a className="secondary-link" href={links.github}>
                    {hero.secondaryAction}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
              <div className="resources-links">
                <p className="section-eyebrow">{aboutIntro.destinationHeading}</p>
                {aboutDestinations.map((destination) => (
                  <a href={destination.href} className="resource-link" key={destination.number}>
                    <span className="resource-number">{destination.number}</span>
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
        </div>
      </main>
    </div>
  );
}
