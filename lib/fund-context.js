export const SAGARD_CONTEXT = {
  fundName: "Sagard AI Fund",
  fundFooterName: "Sagard Holdings",

  portfolio: {
    portage: [
      { name: "Benepass", domain: "benepass.com", description: "Employee benefits platform" },
      { name: "KidKare", domain: "kidkare.com", description: "Childcare management software" },
      { name: "Ansel Health", domain: "anselhealth.com", description: "Supplemental health insurance" },
      { name: "Xceedance", domain: "xceedance.com", description: "Insurance operations and technology" },
    ],
    diagram: [
      { name: "Lyteflo", domain: "lyteflo.com", description: "Energy data and analytics" },
      { name: "Novisto", domain: "novisto.com", description: "ESG data management" },
    ],
    powerCorp: [
      { name: "Great-West Lifeco", domain: "greatwestlifeco.com", description: "Insurance and financial services" },
      { name: "IGM Financial", domain: "igmfinancial.com", description: "Wealth and asset management" },
    ],
  },

  thesis: `
    Sagard is a multi-strategy alternative asset manager with four fund arms:
    - Portage: early-stage fintech and insurtech venture
    - Diagram: growth equity, primarily B2B SaaS and data infrastructure
    - Private Credit: direct lending to mid-market companies
    - Power Corp ecosystem: Great-West Lifeco (insurance, $2T AUM) and IGM Financial
      (wealth management, $250B AUM) as operating company distribution channels

    The AI Fund focuses on commercial-stage AI companies that can be deployed as
    commercial pilots across the Sagard ecosystem. Strong preference for:
    - Enterprise distribution advantage: can Sagard portcos be early customers?
    - Data moats: proprietary data that compounds over time
    - Canadian expansion angle: companies that benefit from Sagard's Canadian
      government and financial services relationships
    - Cross-fund activation: does this investment create value across Portage,
      Diagram, AND Power Corp simultaneously?

    Avoid: consumer AI, foundational model plays, horizontal developer tooling
    with no clear enterprise distribution path.
  `,

  thesisInstructions: `
    For the THESIS_HEADLINE: write a single declarative statement specific to
    why this company compounds value across the Sagard ecosystem. Do not write
    something that could apply to any fund. Reference at least one specific
    Sagard fund arm or portfolio company.

    For the three thesis points, choose from these angles (pick the three most
    relevant to this company):
    - Distribution: which specific portcos are natural first customers and why
    - Canadian expansion: how Sagard's Canadian relationships accelerate this company
    - AI Fund mandate: how this activates multiple fund arms simultaneously
    - Power Corp channel: how Great-West Lifeco or IGM Financial is a distribution path
    - Data compounding: how proprietary data strengthens with Sagard's ecosystem access
    - Competitive moat: what Sagard can offer this company that no financial investor can

    Each thesis point must reference at least one specific company name, fund arm,
    or concrete use case. No generic statements.
  `,
}
