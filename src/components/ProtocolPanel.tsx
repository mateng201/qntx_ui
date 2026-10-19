import type { ReactElement } from "react";

import { primitives } from "../data/site";
import { Icon } from "./Icon";

export function ProtocolPanel(): ReactElement {
  return (
    <section
      id="protocols"
      className="panel protocol-panel"
      aria-labelledby="protocols-title"
      data-panel
      data-theme="light"
    >
      <div className="panel-grid">
        <div className="panel-intro section-intro">
          <p className="eyebrow">02 / THE BUILDING BLOCKS</p>
          <h2 id="protocols-title">
            Small primitives.
            <br />
            An open economy.
          </h2>
          <p className="intro-copy">
            Payments, identity, commerce, and wallets. A practical foundation for software that can
            act on its own.
          </p>
          <a href="https://qntx.org/products" className="text-link section-link">
            Explore the ecosystem <Icon />
          </a>
          <div className="protocol-note">
            <span className="mono">OPEN PROTOCOLS</span>
            <p>
              Built to work together.
              <br />
              Open for anyone to build on.
            </p>
          </div>
        </div>
        <div className="primitive-list">
          {primitives.map((primitive) => (
            <a className="primitive-row" href={primitive.href} key={primitive.number}>
              <div className="primitive-meta">
                <span className="row-number mono">{primitive.number}</span>
                <span className="protocol-badge mono">{primitive.standard}</span>
                <Icon />
              </div>
              <div className="primitive-content">
                <h3>{primitive.title}</h3>
                <p>{primitive.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
