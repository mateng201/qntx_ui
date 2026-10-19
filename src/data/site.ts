export const links = {
  website: "https://qntx.org/",
  github: "https://github.com/qntx",
  docs: "https://qntx.org/developers",
  social: "https://x.com/qntxorg",
} as const;

export const sections = [
  { id: "overview", label: "Overview", number: "01", theme: "light" },
  { id: "protocols", label: "Protocols", number: "02", theme: "light" },
  { id: "build", label: "Build", number: "03", theme: "light" },
  { id: "about", label: "About", number: "04", theme: "dark" },
] as const;

export const primitives = [
  {
    number: "01",
    title: "Payments",
    standard: "x402",
    description: "A payment protocol for the machine economy. An open Rust SDK for x402.",
    href: "https://github.com/qntx/r402",
  },
  {
    number: "02",
    title: "Identity",
    standard: "ERC–8004",
    description: "An on-chain execution registry. Give autonomous agents a verifiable identity.",
    href: "https://github.com/qntx/erc8004",
  },
  {
    number: "03",
    title: "Commerce",
    standard: "ERC–8183",
    description: "The building blocks for agentic commerce, available as an open Rust SDK.",
    href: "https://github.com/qntx/erc8183",
  },
  {
    number: "04",
    title: "Wallets",
    standard: "TypeScript",
    description: "A self-custodial wallet SDK. Build with keys and accounts you control.",
    href: "https://github.com/qntx/wallet",
  },
] as const;

export const repositories = [
  {
    name: "r402",
    description: "The x402 payment protocol, in Rust.",
    language: "Rust",
    href: "https://github.com/qntx/r402",
  },
  {
    name: "wallet",
    description: "Self-custodial wallets for TypeScript.",
    language: "TypeScript",
    href: "https://github.com/qntx/wallet",
  },
  {
    name: "erc8004",
    description: "An on-chain registry for AI agents.",
    language: "Rust",
    href: "https://github.com/qntx/erc8004",
  },
  {
    name: "oxc",
    description: "Shared Oxlint and Oxfmt configuration.",
    language: "TypeScript",
    href: "https://github.com/qntx/oxc",
  },
] as const;
