export const overviewNodes = [
  {
    id: "transact",
    label: "TRANSACT",
    number: "01",
    code: "PAYMENTS / x402",
    description:
      "Agents pay for the services they use. Open payment primitives let builders connect requests, payments, and settlement.",
    x: 280,
    y: 76,
  },
  {
    id: "collaborate",
    label: "COLLABORATE",
    number: "02",
    code: "COMMERCE / ERC–8183",
    description:
      "Agents work together through shared protocols. Open commerce primitives give builders a common foundation for exchanging services.",
    x: 484,
    y: 280,
  },
  {
    id: "govern",
    label: "GOVERN",
    number: "03",
    code: "SHARED RULES",
    description:
      "Shared rules make a network easier to coordinate. Open interfaces keep those rules visible to the people building and operating agents.",
    x: 280,
    y: 484,
  },
  {
    id: "evolve",
    label: "EVOLVE",
    number: "04",
    code: "IDENTITY / ERC–8004",
    description:
      "Verifiable identity gives agents a foundation to build on. Extend open building blocks as the network and its needs evolve.",
    x: 76,
    y: 280,
  },
] as const;
