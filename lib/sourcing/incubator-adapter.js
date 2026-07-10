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
    domain: 'worthington.ai',
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
    domain: 'getcanopywms.com',
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Logistics / WMS',
    geography: 'Canada · Waterloo',
    description: 'Warehouse management system for 3PLs and e-commerce brands.',
  },
  {
    companyName: 'SCADABLE',
    founderNames: ['Ali Rahbar'],
    domain: 'scadable.com',
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
    domain: 'justmeds.ca',
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Digital health',
    geography: 'Canada',
    description: 'Digital health platform connecting patients with licensed pharmacists.',
  },
  {
    companyName: 'Photon-IV',
    founderNames: ['Sanal Sina Kamal'],
    domain: 'photon-iv.com',
    cohortName: 'Velocity May 2026',
    cohortDate: '2026-05-15',
    sector: 'Deep tech / defense',
    geography: 'Canada · Cambridge, ON',
    description: 'AI + wireless handover between LEO satellites and ground networks.',
  },
  {
    companyName: 'Simantic',
    founderNames: ['Seungmin Hong', 'Ahnaf Shahriar'],
    domain: 'simantic.dev',
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
    domain: 'existentsorbents.com',
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Climate / carbon capture',
    geography: 'Canada · Calgary, AB',
    description: 'Non-toxic molecular sponge adsorbents for cheaper carbon capture.',
  },
  {
    companyName: 'Eventist',
    founderNames: ['Ciara Azam', 'Daniel Whitney'],
    domain: 'eventist.ca',
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
    founderNames: ['Francois le Roux', 'Zaais van Zyl'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / real estate',
    geography: 'Canada · Waterloo',
    description: 'AI copilot for property developers (planning, approvals, compliance).',
  },
  {
    companyName: 'One of One AI',
    founderNames: ['Josh Zucker'],
    domain: null,
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'AI / networking',
    geography: 'Canada · Waterloo',
    description: 'Helps individuals and orgs use existing networks for introductions.',
  },
  {
    companyName: 'Appfi',
    founderNames: ['Aidan Dizaji', 'Shahdad Kompanizare'],
    domain: 'appfi.dev',
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'No-code / mobile',
    geography: 'Canada · Waterloo',
    description: 'Build iPhone apps without coding.',
  },
  {
    companyName: 'Colver',
    founderNames: ['Nadine Nastas'],
    domain: 'colver.ca',
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
    founderNames: ['Tom Kizito'],
    domain: 'jtcipher.com',
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Industrial / inventory',
    geography: 'Canada · Waterloo',
    description: 'Inventory error reduction for stone slab distributors.',
  },
  {
    companyName: 'TensorOne',
    founderNames: ['Oleg Stukalov', 'James Bastow'],
    domain: 'tensor-one.com',
    cohortName: 'Velocity February 2026',
    cohortDate: '2026-02-09',
    sector: 'Defense / drones',
    geography: 'Canada · Kitchener, ON',
    description: 'Hardware sensors and software for drones to hear and fly without GPS.',
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
    founderNames: ['Shiv Naik'],
    domain: 'newgenhealth.ca',
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'HealthTech',
    geography: 'Canada · Waterloo',
    description: 'Affordable kidney function monitoring for consumer health.',
  },
  {
    companyName: 'PatientCompanion',
    founderNames: ['Ethan Alvizo'],
    domain: 'patientcompanion.ca',
    cohortName: 'Velocity Pitch Competition 2025',
    cohortDate: '2025-04-01',
    sector: 'HealthTech / nursing',
    geography: 'Canada · Waterloo',
    description: 'Customizable nurse workflow tools for patient care.',
  },
  {
    companyName: 'Swish Solar',
    founderNames: ['Amirhossein Boreiri'],
    domain: 'swishsolar.com',
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
    founderNames: ['Shrianand Misir'],
    domain: 'access2pay.com',
    cohortName: 'DMZ Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'Fintech / payments',
    geography: 'Canada · Toronto',
    description: 'Enterprise payment platform for public-sector collection and reconciliation.',
  },
  {
    companyName: 'Zeroma',
    founderNames: [],
    domain: 'zeroma.com',
    cohortName: 'DMZ Incubator Fall 2025',
    cohortDate: '2025-09-01',
    sector: 'AdTech / privacy',
    geography: 'Canada · Toronto',
    description: 'Audience infrastructure from consented zero-party data for brands/publishers.',
  },
  {
    companyName: 'Knead Tech',
    founderNames: [],
    domain: 'kneadtech.com',
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
    founderNames: ['Ipek Isler'],
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
    domain: 'trainingground.ai',
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
    domain: 'julyhealth.com',
    cohortName: 'DMZ Incubator Spring 2026',
    cohortDate: '2026-03-01',
    sector: 'HealthTech',
    geography: 'Canada · Toronto',
    description: 'DTC virtual clinic for chronic hormonal conditions including PCOS.',
  },
  {
    companyName: 'Reeku',
    founderNames: [],
    domain: 'reeku.co',
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
    domain: 'loraverse.io',
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

/**
 * CDL Cancer 2025/26 — CDL-Toronto LinkedIn graduate post (May 2026 window).
 * Company + one-liner only; founders not on the public post.
 */
export const CDL_CANCER_2025_26 = [
  {
    companyName: 'Cime Therapeutics',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / cancer',
    geography: 'Canada · Toronto',
    description: 'Automating synthetic chemistry to accelerate drug discovery.',
  },
  {
    companyName: 'Dynamik Therapies',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / cancer',
    geography: 'Canada · Toronto',
    description: 'Clinical-stage light-activated nanomedicines for more precise cancer cell destruction.',
  },
  {
    companyName: 'Focai Bio',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'AI / oncology',
    geography: 'Canada · Toronto',
    description: 'AI-enabled quantification and design of drug distribution for therapy selection.',
  },
  {
    companyName: 'Lisen Imprinting Diagnostics',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Diagnostics / cancer',
    geography: 'Canada · Toronto',
    description: 'Loss of Imprinting biomarkers to diagnose early and indeterminate tumors faster.',
  },
  {
    companyName: 'METHYS Dx',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Diagnostics / cancer',
    geography: 'Canada · Toronto',
    description: 'Molecular tests for cancer follow-ups using digital PCR and methylation biomarkers.',
  },
  {
    companyName: 'Oncobiotix Inc.',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / immuno-oncology',
    geography: 'Canada · Toronto',
    description: 'Oral microbiome-derived small molecules to improve immunotherapy response.',
  },
  {
    companyName: 'PCare+',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'HealthTech / care delivery',
    geography: 'Canada · Toronto',
    description: 'Digital platform turning clinical standards into versioned, auditable care workflows.',
  },
  {
    companyName: 'PHAIT, Inc.',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / prevention',
    geography: 'Canada · Toronto',
    description: 'Oral Iloprost therapy to halt pre-cancer dysplasia progression for lung cancer prevention.',
  },
  {
    companyName: 'QTAS',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Diagnostics / quantum sensing',
    geography: 'Canada · Toronto',
    description: 'Quantum-sensing device to detect and quantify ultra-rare cells from unprocessed samples.',
  },
  {
    companyName: 'Serafin Labs, Inc.',
    founderNames: [],
    domain: null,
    cohortName: 'CDL Cancer 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / metastasis',
    geography: 'Canada · Toronto',
    description: 'Platform to discover and screen anti-metastatic therapies.',
  },
]

/**
 * CDL-Toronto Neuro 2025/26 — CDL-Toronto LinkedIn graduate post.
 */
export const CDL_NEURO_2025_26 = [
  {
    companyName: 'Clarity',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Neurotech',
    geography: 'Canada · Toronto',
    description: 'Non-invasive brain therapy infrastructure; VR gamma sensory stimulation for Alzheimer\'s.',
  },
  {
    companyName: 'Clee Medical',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Medtech / imaging',
    geography: 'Canada · Toronto',
    description: 'Real-time ultra-high-resolution intraoperative brain imaging.',
  },
  {
    companyName: 'D2B3',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / CNS delivery',
    geography: 'Canada · Toronto',
    description: 'Blood-brain barrier relaxation for therapeutics delivery to the brain.',
  },
  {
    companyName: 'Maxonis',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Biotech / nerve repair',
    geography: 'Canada · Toronto',
    description: 'Injectable peptide-hydrogel platform for peripheral nerve and spinal cord injuries.',
  },
  {
    companyName: 'NeuroBionics',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Medtech / neuromodulation',
    geography: 'Canada · Toronto',
    description: 'Minimally invasive neuromodulation via flexible bioelectronic fibers (MIT spinout).',
  },
  {
    companyName: 'Synaptrix Labs',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Neurotech / BCI',
    geography: 'Canada · Toronto',
    description: 'AI-powered non-invasive BCI for real-time wheelchair and device control.',
  },
  {
    companyName: 'sync2brain GmbH',
    founderNames: [],
    domain: null,
    cohortName: 'CDL-Toronto Neuro 2025/26',
    cohortDate: '2026-05-01',
    sector: 'Medtech / TMS',
    geography: 'International · CDL-Toronto stream',
    description: 'Closed-loop TMS (bossdevice) using real-time EEG for personalized brain stimulation.',
  },
]

export const CDL_COHORTS = [...CDL_AI_2025_26, ...CDL_CANCER_2025_26, ...CDL_NEURO_2025_26]

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
