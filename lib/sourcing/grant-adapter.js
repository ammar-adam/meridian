import { entityId } from '@/lib/sourcing/entity-schema'

/**
 * Curated IRAP / NRC grant recipients from the public Open Government CSV
 * (2024-25 Grants and Contributions). Not a live scraper — manually sampled
 * Ontario tech-adjacent firm awards for Discover seeding.
 *
 * Full dataset:
 * https://ftp.maps.canada.ca/pub/nrc_cnrc/Innovation_Innovation/2024_25_grants_and_contributions/2024_25_grants_and_contributions.csv
 */
export const IRAP_GRANT_SEED = [
  {
    companyName: 'Adviice Inc.',
    founderName: null,
    domain: null,
    grantProgram: 'IRAP Contributions to Firms',
    grantDate: '2024-2025',
    grantAmount: '$100,000',
    city: 'London',
    province: 'ON',
    agreementTitle: 'Financial advice platform',
    referenceNumber: '172-2024-2025-Q1-1016840',
  },
  {
    companyName: 'CircuitIQ Inc.',
    founderName: null,
    domain: null,
    grantProgram: 'IRAP Contributions to Firms',
    grantDate: '2024-2025',
    grantAmount: null,
    city: 'Sudbury',
    province: 'ON',
    agreementTitle: 'Rearchitect and enhance the platform to include new features and scalability',
    referenceNumber: '172-2024-2025-Q1-1016775',
  },
  {
    companyName: 'Gift Better Corporation',
    founderName: null,
    domain: null,
    grantProgram: 'IRAP Contributions to Firms',
    grantDate: '2024-2025',
    grantAmount: null,
    city: 'Ottawa',
    province: 'ON',
    agreementTitle: 'Retention Tool and Wholesale Platform',
    referenceNumber: '172-2024-2025-Q1-1016768',
  },
  {
    companyName: 'Stilo Corporation',
    founderName: null,
    domain: null,
    grantProgram: 'IRAP Contributions to Firms',
    grantDate: '2024-2025',
    grantAmount: null,
    city: 'Ottawa',
    province: 'ON',
    agreementTitle: 'Technical Feasibility of using AI',
    referenceNumber: '172-2024-2025-Q1-1016724',
  },
  {
    companyName: 'Focal Healthcare Inc.',
    founderName: null,
    domain: null,
    grantProgram: 'IRAP Contributions to Firms',
    grantDate: '2023-2024',
    grantAmount: null,
    city: 'Toronto',
    province: 'ON',
    agreementTitle: 'Integration of the Focal Healthcare software with the Procept',
    referenceNumber: '172-2023-2024-Q3-1010833',
  },
  {
    companyName: 'VizworX Inc.',
    founderName: null,
    domain: 'vizworx.com',
    grantProgram: 'IRAP Contributions to Organizations',
    grantDate: '2021-2025',
    grantAmount: '$400,000',
    city: 'Calgary',
    province: 'AB',
    agreementTitle: 'Virtual Operations Environment Framework',
    referenceNumber: '172-2021-2022-Q2-978029',
  },
]

export function runGrantAdapter({ grantSource = IRAP_GRANT_SEED } = {}) {
  return grantSource.map(entry => ({
    id: entityId('grant', entry.companyName, entry.referenceNumber),
    type: entry.founderName ? 'linked' : 'company',
    personName: entry.founderName || null,
    companyName: entry.companyName,
    domain: entry.domain || null,
    source: 'grant',
    confidence: 'medium',
    provenance: `${entry.grantProgram} recipient (${entry.grantDate})`,
    sourceMeta: {
      ...entry,
      stage: 'seed',
      sector: entry.agreementTitle || '',
      geography: entry.province ? `Canada · ${entry.city || ''}, ${entry.province}`.replace(/,\s*$/, '') : 'Canada',
    },
    discoveredAt: new Date().toISOString(),
  }))
}
