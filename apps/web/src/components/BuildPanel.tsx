import type { ReactElement } from "react";

import { links, repositories } from "../data/site";
import { Icon } from "./Icon";

export function BuildPanel(): ReactElement {
  return (
    <section
      id="build"
      className="panel build-panel"
      aria-labelledby="build-title"
      data-panel
      data-theme="light"
    >
      <div className="panel-grid">
        <div className="panel-intro section-intro">
          <p className="eyebrow">03 / MADE IN THE OPEN</p>
          <h2 id="build-title">
            From protocol
            <br />
            to pull request.
          </h2>
          <p className="intro-copy">
            Read the source. Find a starting point. Build something useful for the next generation
            of agents.
          </p>
          <a href={links.docs} className="button button-primary inline-flex items-center gap-5">
            Developer resources <Icon />
          </a>
        </div>
        <div className="repository-list">
          <div className="list-heading">
            <span className="mono">SELECTED REPOSITORIES</span>
            <a href={links.github}>
              View all <Icon />
            </a>
          </div>
          {repositories.map((repository) => (
            <a className="repository-row" href={repository.href} key={repository.name}>
              <div>
                <h3>
                  <span className="repo-prefix">qntx / </span>
                  {repository.name}
                </h3>
                <p>{repository.description}</p>
              </div>
              <span className="repo-language">
                <span className="language-dot" />
                {repository.language}
              </span>
              <Icon />
            </a>
          ))}
          <div className="repository-footnote">
            <Icon kind="github" />
            <span>Built in public, one commit at a time.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
