import { links, protocolIntro } from "@qntx-ui/content";
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
          <h2 id="protocols-title">
            {protocolIntro.titleLines[0]}
            <br />
            {protocolIntro.titleLines[1]}
          </h2>
          <p className="intro-copy">{protocolIntro.description}</p>
          <a href={links.products} className="text-link section-link">
            {protocolIntro.action} <Icon />
          </a>
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
