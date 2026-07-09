import { entityId } from '@/lib/sourcing/entity-schema'

/**
 * Multi-incubator cohort data — manually maintained from public announcements.
 * See docs/incubator-sources.md for sources, viability, and refresh plan.
 *
 * Decision: structure as INCUBATOR_SOURCES map so Discover can merge Velocity +
 * DMZ (+ future) without hardcoding a single program. Empty arrays mean
 * "attempted, not viable yet" — do not invent placeholder companies.
 */

/** Velocity May 2026 — https://www.velocityincubator.com/news/meet-velocitys-newest-cohort */
export const VELOCITY_MAY_2026 = [
  {
    companyName: 'Worthington',
    founderNames: ['Dan Goossen', 'Thomas Kousholt'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'AI / real estate',
    geography: 'Canada · Waterloo',
    description: 'AI assistant for real estate agents (email, calendar, CRM).',
  },
  {
    companyName: 'Hope',
    founderNames: ['Mohammad Pasha Khoshkebari'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'EdTech / AI',
    geography: 'Canada · Waterloo',
    description: 'AI STEM tutor for middle school through university.',
  },
  {
    companyName: 'Canopy',
    founderNames: ['Afraz Hemraj', 'Leon Xu'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Logistics / WMS',
    geography: 'Canada · Waterloo',
    description: 'Warehouse management system for 3PLs and e-commerce brands.',
  },
  {
    companyName: 'SCADABLE',
    founderNames: ['Ali Rahbar'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'IoT / DevTools',
    geography: 'Canada · Waterloo',
    description: 'Connect IoT hardware to cloud infrastructure in minutes.',
  },
  {
    companyName: 'Gasner HealthTech',
    founderNames: ['Dr Jon Gasner', 'Ellise Gasner'],
    domain: 'gasnerhealthtech.com',
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'HealthTech / medtech',
    geography: 'Canada',
    description: 'Non-invasive devices addressing root causes of TMD.',
  },
  {
    companyName: 'Justmeds',
    founderNames: ['Abed Moati', 'Moe Hansrod'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Digital health',
    geography: 'Canada',
    description: 'Digital health platform connecting patients with licensed pharmacists.',
  },
  {
    companyName: 'Photon-IV',
    founderNames: ['Sanal Sina Kamal'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Deep tech / defense',
    geography: 'Canada · Cambridge, ON',
    description: 'AI + wireless handover between LEO satellites and ground networks.',
  },
  {
    companyName: 'Simantic',
    founderNames: ['Seungmin Hong', 'Ahnaf Shahriar'],
    domain: null,
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'DevTools / embedded',
    geography: 'Canada · Waterloo',
    description: 'Firmware test automation using simulated hardware.',
  },
]

/** Velocity Feb 2026 — https://www.velocityincubator.com/news/meet-the-newest-companies-building-at-velocity */
export const VELOCITY_FEB_2026 = [
  {
    companyName: 'Anthum AI',
    founderNames: ['Orri Bogdan', 'Joseph Weinerman'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / creator tools',
    geography: 'Canada · Waterloo',
    description: 'Crowdsourced AI video content marketplace connecting creators with brands.',
  },
  {
    companyName: 'ZeroTwo AI',
    founderNames: ['Zijing Wu', 'Manjot Singh Hunjan', 'Huagang Tan'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / drug discovery',
    geography: 'Canada · Waterloo',
    description: 'Agentic AI platform to screen more drug-like structures in early R&D.',
  },
  {
    companyName: 'Existent',
    founderNames: ['Adrien Côté'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Climate / carbon capture',
    geography: 'Canada · Calgary, AB',
    description: 'Non-toxic molecular sponge adsorbents for cheaper carbon capture.',
  },
  {
    companyName: 'Eventist',
    founderNames: ['Ciara Azam', 'Daniel Whitney'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Events / ticketing',
    geography: 'Canada · Waterloo',
    description: 'All-in-one event planning and ticketing platform.',
  },
  {
    companyName: 'Flomaru',
    founderNames: ['Ali Shaverdi', 'Amal Aqel'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Commerce / gifting',
    geography: 'Canada · Kitchener, ON',
    description: 'Cross-border gifting via local sellers in the recipient country.',
  },
  {
    companyName: 'ItemIQ',
    founderNames: ['Saad Khan', 'Arhem Rana'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'E-commerce / inventory',
    geography: 'Canada · Waterloo',
    description: 'Real-time inventory and catalog intelligence for e-commerce brands.',
  },
  {
    companyName: 'Applied Intelligence',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / real estate',
    geography: 'Canada · Waterloo',
    description: 'AI copilot for property developers (planning, approvals, compliance).',
  },
  {
    companyName: 'One of One AI',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / networking',
    geography: 'Canada · Waterloo',
    description: 'Helps individuals and orgs use existing networks for introductions.',
  },
  {
    companyName: 'Appfi',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'No-code / mobile',
    geography: 'Canada · Waterloo',
    description: 'Build iPhone apps without coding.',
  },
  {
    companyName: 'Colver',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Health / consumer',
    geography: 'Canada · Waterloo',
    description: 'Clinically oriented antiviral nasal sprays for seasonal viruses.',
  },
  {
    companyName: 'Innowind',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Climate / energy',
    geography: 'Canada · Waterloo',
    description: 'AI-controlled robotic fins to improve wind turbine efficiency.',
  },
  {
    companyName: 'JTCipher',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Industrial / inventory',
    geography: 'Canada · Waterloo',
    description: 'Inventory error reduction for stone slab distributors.',
  },
  {
    companyName: 'TensorOne',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Defense / drones',
    geography: 'Canada · Waterloo',
    description: 'Autonomous detection/response to unauthorized drones near infrastructure.',
  },
]

/**
 * Velocity Pitch Competition 2025 finalists —
 * https://www.velocityincubator.com/news/announcing-the-finalists-for-the-2025-velocity-pitch-competition-all-stars
 * Company-level public list; founder names only where published on that page.
 */
export const VELOCITY_PITCH_2025 = [
  {
    companyName: 'CELLECT',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'HealthTech',
    geography: 'Canada · Waterloo',
    description: 'Non-invasive cervical cancer / HPV screening via menstrual blood collection.',
  },
  {
    companyName: 'NewGen Health',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'HealthTech',
    geography: 'Canada · Waterloo',
    description: 'Affordable kidney function monitoring for consumer health.',
  },
  {
    companyName: 'PatientCompanion',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'HealthTech / nursing',
    geography: 'Canada · Waterloo',
    description: 'Customizable nurse workflow tools for patient care.',
  },
  {
    companyName: 'Swish Solar',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'Cleantech',
    geography: 'Canada · Waterloo',
    description: 'Self-cleaning solar panel tech for snow and sand accumulation.',
  },
  {
    companyName: 'MapMate',
    founderNames: [],
    domain: null,
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'Software',
    geography: 'Canada · Waterloo',
    description: 'Velocity Pitch Competition 2025 finalist (mapping / geospatial).',
  },
]

/** Combined Velocity rows (backward-compatible export name). */
export const VELOCITY_COHORTS = [
  ...VELOCITY_MAY_2026,
  ...VELOCITY_FEB_2026,
  ...VELOCITY_PITCH_2025,
]

/**
 * DMZ Fall 2025 — https://dmz.torontomu.ca/post/dmz-welcomes-our-fall-2025-cohorts
 * Public announcement lists companies + descriptions; founders not named on that page.
 */
export const DMZ_FALL_2025 = [
  {
    companyName: 'Access2Pay',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'Fintech / payments',
    geography: 'Canada · Toronto',
    description: 'Enterprise payment platform for public-sector collection and reconciliation.',
  },
  {
    companyName: 'Zeroma',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'AdTech / privacy',
    geography: 'Canada · Toronto',
    description: 'Audience infrastructure from consented zero-party data for brands/publishers.',
  },
  {
    companyName: 'Knead Tech',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'Climate / food waste',
    geography: 'Canada · Toronto',
    description: 'White-label food recovery app to redirect surplus food safely.',
  },
  {
    companyName: 'ClassClown',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'EdTech',
    geography: 'Canada · Toronto',
    description: 'AI management platform for tutors and education institutions.',
  },
  {
    companyName: 'Quotograph.io',
    founderNames: [],
    domain: 'quotograph.io',
    cohortName: 'DMZ Pre-Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'Construction tech',
    geography: 'Canada · Toronto',
    description: 'Construction management workflows to reduce cost and risk.',
  },
  {
    companyName: 'Manela',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'HRTech',
    geography: 'Canada · Toronto',
    description: 'Parental-leave support plans and resources for employers.',
  },
  {
    companyName: 'Aeovision.ai',
    founderNames: [],
    domain: 'aeovision.ai',
    cohortName: 'DMZ Pre-Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'AI / marketing',
    geography: 'Canada · Toronto',
    description: 'Track brand visibility in AI search (ChatGPT, Perplexity).',
  },
  {
    companyName: 'TrainingGround.ai',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'EdTech / AI',
    geography: 'Canada · Toronto',
    description: 'AI assistant turning lesson plans into adaptive learning pathways.',
  },
]

/** DMZ Spring 2026 — https://dmz.torontomu.ca/post/dmz-welcomes-our-spring-2026-cohorts */
export const DMZ_SPRING_2026 = [
  {
    companyName: 'Arbling',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Retail / AI',
    geography: 'Canada · Toronto',
    description: 'Digitize jewelry inventory into AI-readable catalogs for agentic commerce.',
  },
  {
    companyName: 'Dawn Energy',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Cleantech',
    geography: 'Canada · Toronto',
    description: 'Electrical panel monitoring for efficiency and electrification upgrades.',
  },
  {
    companyName: 'Enabled Talent',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'HRTech / inclusion',
    geography: 'Canada · Toronto',
    description: 'Workforce inclusion network connecting disabled professionals to employers.',
  },
  {
    companyName: 'Homekin',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Marketplace / design',
    geography: 'Canada · Toronto',
    description: 'Marketplace matching homeowners with interior designers.',
  },
  {
    companyName: 'July Health',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'HealthTech',
    geography: 'Canada · Toronto',
    description: 'DTC virtual clinic for chronic hormonal conditions including PCOS.',
  },
  {
    companyName: 'Reeku',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Housing / marketplace',
    geography: 'Canada · Toronto',
    description: 'Managed homesharing marketplace for apartment sublets while away.',
  },
  {
    companyName: 'Tyce',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Construction / AI',
    geography: 'Canada · Toronto',
    description: 'AI-native platform helping firms win infrastructure projects.',
  },
  {
    companyName: 'Loraverse',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Creative / generative AI',
    geography: 'Canada · Toronto',
    description: 'Modular studio for generative assets with provenance and control.',
  },
  {
    companyName: 'MyKitchenOps',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'Restaurant ops',
    geography: 'Canada · Toronto',
    description: 'Kitchen ops platform connecting POS, recipes, and costing for independents.',
  },
  {
    companyName: 'Smart Workforce ai',
    founderNames: [],
    domain: null,
    cohortName: 'DMZ Pre-Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'HRTech / scheduling',
    geography: 'Canada · Toronto',
    description: 'Workforce intelligence for scheduling and forecasting shift-based industries.',
  },
]

export const DMZ_COHORTS = [...DMZ_FALL_2025, ...DMZ_SPRING_2026]

/**
 * CDL-Toronto AI 2025/26 graduates — public LinkedIn announcement (company names + one-liners).
 * Founders not listed on that post → company-only entities until manually enriched.
 * https://www.linkedin.com/posts/cdl-toronto_buildsomethingmassive-activity-7453513753280794625-ll7r
 */
export const CDL_AI_2025_26 = [
  {
    companyName: 'Aixelo Inc.',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto AI 2025/26',
    cohortDate: '2026-06-01',
    sector: 'AI / materials',
    geography: 'Canada · Toronto',
    description: 'Edison-4.0 lab productivity AI for chemistry/materials formulation.',
  },
  {
    companyName: 'FL01',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto AI 2025/26',
    cohortDate: '2026-06-01',
    sector: 'AI / thermal fluids',
    geography: 'Canada · Toronto',
    description: 'Autonomous fast experimentation for next-gen thermal fluids.',
  },
  {
    companyName: 'MEISSNER',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto AI 2025/26',
    cohortDate: '2026-06-01',
    sector: 'AI / quantum materials',
    geography: 'Canada · Toronto',
    description: 'AI + quantum simulation for superconducting materials discovery.',
  },
  {
    companyName: 'PreFab Photonics',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto AI 2025/26',
    cohortDate: '2026-06-01',
    sector: 'AI / photonics',
    geography: 'Canada · Toronto',
    description: 'AI platform to predict/optimize photonic chip design and fabrication.',
  },
  {
    companyName: 'RAKE ML',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto AI 2025/26',
    cohortDate: '2026-06-01',
    sector: 'AI / infrastructure',
    geography: 'Canada · Toronto',
    description: 'Predict roof/infrastructure failures from geospatial imagery and weather.',
  },
]

export const CDL_COHORTS = [...CDL_AI_2025_26]

/** Empty — Communitech has no usable public early-stage cohort roster (job board only). */
export const COMMUNITECH_COHORTS = []

/** Empty — MaRS Connect directory is gated; public pages are alumni/momentum not early cohorts. */
export const MARS_COHORTS = []

export const INCUBATOR_SOURCES = {
  velocity: VELOCITY_COHORTS,
  dmz: DMZ_COHORTS,
  cdl: CDL_COHORTS,
  communitech: COMMUNITECH_COHORTS,
  mars: MARS_COHORTS,
}

function toEntity(entry, programKey) {
  const hasFounders = Array.isArray(entry.founderNames) && entry.founderNames.length > 0
  return {
    id: entityId('incubator', programKey, entry.companyName),
    type: hasFounders ? 'linked' : 'company',
    personName: hasFounders ? entry.founderNames.join(', ') : null,
    companyName: entry.companyName,
    domain: entry.domain || null,
    source: 'incubator',
    confidence: 'high',
    provenance: `${entry.cohortName} (${entry.cohortDate})`,
    sourceMeta: {
      ...entry,
      program: programKey,
      stage: 'pre-seed',
      sector: entry.sector || '',
      geography: entry.geography || 'Canada',
    },
    discoveredAt: new Date().toISOString(),
  }
}

/**
 * @param {{ sources?: string[] }} [opts]
 */
export function runIncubatorAdapter({ sources = Object.keys(INCUBATOR_SOURCES) } = {}) {
  const out = []
  for (const key of sources) {
    const list = INCUBATOR_SOURCES[key]
    if (!list?.length) continue
    for (const entry of list) out.push(toEntity(entry, key))
  }
  return out
}

export function incubatorSourceStats() {
  return Object.fromEntries(
    Object.entries(INCUBATOR_SOURCES).map(([k, v]) => [k, v.length]),
  )
}
