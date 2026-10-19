import type { ReactElement } from "react";

import { logoPath } from "../data/logo";
import { overviewNodes } from "../data/overview-nodes";

export function HomeVisual(): ReactElement {
  return (
    <div className="home-visual" data-overview-visual data-logo-region>
      <div className="visual-label">
        <span>INDEPENDENT AGENTS</span>
        <span>SHARED PROTOCOLS</span>
      </div>
      <div className="agent-stage">
        <div className="agent-field">
          <svg viewBox="0 0 560 560" className="network-graphic" fill="none" aria-hidden="true">
            <circle cx="280" cy="280" r="204" stroke="currentColor" className="outer-orbit" />
            <circle cx="280" cy="280" r="156" stroke="currentColor" strokeDasharray="2 7" />
            <path
              d="M280 30v500M30 280h500M103 103l354 354M103 457l354-354"
              stroke="currentColor"
              className="network-guides"
            />
            <path
              d="m280 76 204 204-204 204L76 280Z"
              stroke="currentColor"
              className="inner-orbit"
            />
            <path
              d="M280 76v135m204 69H349m-69 204V349M76 280h135"
              stroke="currentColor"
              className="network-connections"
            />
            <g className="network-nodes">
              {overviewNodes.map((node) => (
                <circle key={node.id} cx={node.x} cy={node.y} r="7" data-node-dot={node.id} />
              ))}
            </g>
            <g className="minor-nodes">
              <circle cx="135.75" cy="135.75" r="4" />
              <circle cx="424.25" cy="135.75" r="4" />
              <circle cx="424.25" cy="424.25" r="4" />
              <circle cx="135.75" cy="424.25" r="4" />
            </g>
          </svg>
          {overviewNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={`network-node node-${node.id}`}
              style={{ left: `${(node.x / 560) * 100}%`, top: `${(node.y / 560) * 100}%` }}
              data-overview-node={node.id}
              aria-expanded="false"
              aria-controls="overview-node-details"
              disabled
            >
              <span className="node-target" aria-hidden="true" />
              <span className={`network-action action-${node.id}`}>{node.label}</span>
            </button>
          ))}
          <div className="network-center">
            <span className="network-mark overview-logo" data-logo-trigger data-phase="rest">
              <svg
                viewBox="-150 -150 300 300"
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="geometricPrecision"
                aria-hidden="true"
                data-q-logo
              >
                <path data-q-id="body" fill="currentColor" fillRule="evenodd" d={logoPath} />
                <g data-q-gaze>
                  <path data-q-eye="left" fill="#fff" d="M0 0Z" display="none" />
                  <path data-q-eye="right" fill="#fff" d="M0 0Z" display="none" />
                </g>
              </svg>
            </span>
          </div>
          <span className="field-coordinate coordinate-top">Q / 001</span>
          <span className="field-coordinate coordinate-bottom">A NETWORK, NOT AN ISLAND.</span>
        </div>
      </div>
      <section
        id="overview-node-details"
        className="network-details"
        aria-labelledby="overview-node-title"
        data-state="closed"
        hidden
      >
        <div className="node-detail-heading">
          <h2 id="overview-node-title" data-node-title>
            Agent network
          </h2>
          <button type="button" data-node-close aria-label="Close node description">
            ×
          </button>
        </div>
        <p data-node-description aria-live="polite" aria-atomic="true" />
      </section>
      <div className="visual-footer">
        <div className="visual-caption">
          <span>Agents earn. Agents pay. Agents scale.</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </div>
  );
}
