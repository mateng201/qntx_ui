import type { ReactElement } from "react";

import {
  aboutDestinations,
  aboutIntro,
  brandMarkPath,
  hero,
  links,
  primitives,
  protocolIntro,
  standards,
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
            <span>Docs</span> <Icon />
          </a>
        </nav>
      </header>

      <div className="page-mascot" data-mascot aria-hidden="true">
        <svg viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
              <p>
                Independent agents.
                <br />
                Shared possibilities.
              </p>
              <span>
                Scroll to discover <span aria-hidden="true">↓</span>
              </span>
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
              <p className="section-eyebrow">A shared starting point</p>
              <h2 id="about-title">
                {aboutIntro.titleLines[0]}
                <br />
                <span>{aboutIntro.titleLines[1]}</span>
              </h2>
              <p className="about-description">{aboutIntro.description}</p>
              <p className="about-signature">{aboutIntro.signatureLines.join(" ")}</p>
            </div>
          </section>

          <section
            className="page-section protocols-section"
            id="protocols"
            data-page-section="protocols"
            aria-labelledby="protocols-title"
          >
            <div className="protocols-layout">
              <div className="protocols-intro">
                <p className="section-eyebrow">The building blocks</p>
                <h2 id="protocols-title">
                  {protocolIntro.titleLines[0]}
                  <br />
                  {protocolIntro.titleLines[1]}
                </h2>
                <p>{protocolIntro.description}</p>
              </div>
              <div className="protocols-grid">
                {primitives.map((primitive) => (
                  <article className="protocol-card" key={primitive.number}>
                    <div className="protocol-meta">
                      <span>{primitive.number}</span>
                      <span>{primitive.standard}</span>
                    </div>
                    <h3>{primitive.title}</h3>
                    <p>{primitive.description}</p>
                  </article>
                ))}
              </div>
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
                <h1 id="resources-title">
                  {hero.titleLines[0]}
                  <br />
                  {hero.titleLines[1]}
                </h1>
                <p className="resources-description">{hero.description}</p>
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
                <div className="standards-list" aria-label="Open standards">
                  {standards.map((standard) => (
                    <a href={standard.href} key={standard.label}>
                      <strong>{standard.label}</strong>
                      <span>/ {standard.detail}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="resources-links">
                <p className="section-eyebrow">{aboutIntro.destinationHeading}</p>
                {aboutDestinations.map((destination) => (
                  <a href={destination.href} className="resource-link" key={destination.number}>
                    <span className="resource-number">{destination.number}</span>
                    <div>
                      <h2>{destination.label}</h2>
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
