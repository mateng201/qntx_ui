import type { ReactElement } from "react";

import { links } from "../data/site";
import { Icon } from "./Icon";

export function HomeIntro(): ReactElement {
  return (
    <div className="home-intro panel-intro">
      <h1>
        The economic layer
        <br />
        for autonomous agents.
      </h1>
      <p className="intro-copy">
        Open protocols and infrastructure for AI agents to transact, collaborate, govern, and evolve
        autonomously on-chain.
      </p>
      <div className="hero-actions flex items-center gap-6">
        <a
          className="button button-primary inline-flex items-center gap-5"
          href="#protocols"
          data-panel-link
        >
          Start exploring <Icon />
        </a>
        <a className="text-link" href={links.github}>
          Built in public <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="standards">
        <div className="standard-links flex items-center">
          <a href="https://github.com/qntx/r402" className="standard-x402">
            x402<span> / payments</span>
          </a>
          <a href="https://github.com/qntx/erc8004">
            ERC–8004<span> / identity</span>
          </a>
          <a href="https://github.com/qntx/erc8183">
            ERC–8183<span> / commerce</span>
          </a>
        </div>
      </div>
    </div>
  );
}
