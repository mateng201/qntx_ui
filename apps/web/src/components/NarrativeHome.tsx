import {
  aboutDestinations,
  aboutIntro,
  brandMarkPath,
  hero,
  links,
  primitives,
  protocolIntro,
  standards,
} from "@qntx-ui/content";
import type { ReactElement } from "react";

import { Icon } from "./Icon";

/** Server-rendered content; a small native scroll adapter progressively enhances the desktop. */
export function NarrativeHome(): ReactElement {
  return (
    <div className="desktop-home" id="beginning" data-narrative>
      <a className="narrative-skip" href="#narrative-origin" data-story-skip>
        Skip to the organization
      </a>
      <header className="narrative-header">
        <a className="narrative-brand" href="#beginning" aria-label="QuantX home">
          <span className="mascot-dock" data-mascot-dock aria-hidden="true" />
          <span>QuantX</span>
        </a>
        <nav className="narrative-utilities" aria-label="QuantX resources">
          <a href={links.github}>
            <Icon kind="github" /> <span>GitHub</span>
          </a>
          <a href={links.docs}>
            <span>Docs</span> <Icon />
          </a>
        </nav>
      </header>

      <div className="narrative-mascot" data-story-mascot aria-hidden="true">
        <svg viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path data-mascot-body d={brandMarkPath} fill="currentColor" fillRule="evenodd" />
          <path data-mascot-eye="left" d="M0 0Z" fill="#ffffff" />
          <path data-mascot-eye="right" d="M0 0Z" fill="#ffffff" />
        </svg>
      </div>

      <main className="narrative-track" data-story-track>
        <div className="narrative-stage" data-story-stage>
          <section
            className="story-scene story-opening"
            data-story-scene="opening"
            aria-label="Welcome to QuantX"
          >
            <div className="opening-caption">
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
            className="story-scene story-origin"
            id="narrative-origin"
            data-story-scene="origin"
            aria-labelledby="origin-title"
            tabIndex={-1}
          >
            <div className="origin-content">
              <p className="story-kicker">A shared starting point</p>
              <h2 id="origin-title">
                {aboutIntro.titleLines[0]}
                <br />
                <span>{aboutIntro.titleLines[1]}</span>
              </h2>
              <p className="origin-description">{aboutIntro.description}</p>
              <p className="origin-signature">{aboutIntro.signatureLines.join(" ")}</p>
            </div>
          </section>

          <section
            className="story-scene story-protocols"
            id="narrative-protocols"
            data-story-scene="protocols"
            aria-labelledby="narrative-protocol-title"
          >
            <div className="protocol-story-layout">
              <div className="protocol-story-intro">
                <p className="story-kicker">The building blocks</p>
                <h2 id="narrative-protocol-title">
                  {protocolIntro.titleLines[0]}
                  <br />
                  {protocolIntro.titleLines[1]}
                </h2>
                <p>{protocolIntro.description}</p>
              </div>
              <div className="protocol-story-grid">
                {primitives.map((primitive) => (
                  <article className="protocol-feature" key={primitive.number}>
                    <div className="feature-meta">
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
            className="story-scene story-connect"
            id="narrative-connect"
            data-story-scene="connect"
            aria-labelledby="connect-title"
          >
            <div className="merged-overview">
              <div className="merged-intro">
                <h1 id="connect-title">
                  {hero.titleLines[0]}
                  <br />
                  {hero.titleLines[1]}
                </h1>
                <p className="merged-description">{hero.description}</p>
                <div className="merged-actions">
                  <a className="narrative-primary" href={links.github}>
                    {hero.primaryAction}
                    <Icon />
                  </a>
                  <a className="narrative-secondary" href={links.github}>
                    {hero.secondaryAction}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className="merged-standards" aria-label="Open standards">
                  {standards.map((standard) => (
                    <a href={standard.href} key={standard.label}>
                      <strong>{standard.label}</strong>
                      <span>/ {standard.detail}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="merged-destinations">
                <p className="story-kicker">{aboutIntro.destinationHeading}</p>
                {aboutDestinations.map((destination) => (
                  <a
                    href={destination.href}
                    className="narrative-destination"
                    key={destination.number}
                  >
                    <span className="destination-number">{destination.number}</span>
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
