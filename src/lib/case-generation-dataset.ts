/**
 * Ontario DECA Oral Events Case Generation Dataset.
 * Loads and exposes the structured dataset for AI case generation.
 */

import rawDataset from "./data/ontario_deca_oral_events_case_generation_dataset.json";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FormatProfile {
  output_document_sections: string[];
  event_situation_style: string[];
  participant_instructions_template: string[];
  twenty_first_century_skills_template: string[];
}

export interface GenerationProfile {
  role_level: string;
  org_types: string[];
  judge_roles: string[];
  issue_types: string[];
  realism_rules: string[];
}

export interface CaseGenerationEvent {
  code: string;
  name: string;
  category_key: string;
  category_name: string;
  cluster: string;
  district_primary_instructional_areas_2025_2026: string[];
  format_profile: FormatProfile;
  generation_profile: GenerationProfile;
  instructional_area_to_indicator_pool: Record<string, string[]>;
  pi_selection_rule: string;
  prepared_event_topic_2025_2026?: string;
  ontario_override?: string;
}

export interface CaseGenerationDataset {
  dataset_name: string;
  events: CaseGenerationEvent[];
}

export interface CaseGenerationParams {
  event: CaseGenerationEvent;
  instructionalArea: string;
  performanceIndicators: string[];
  orgType: string;
  judgeRole: string;
  issueType: string;
}

// Invalid PI entries (source references, placeholders)
const INVALID_PI_PATTERNS = [
  /^\([A-Z]+\)$/,
  /for 20\d\d-\d\d\s+HS DECA Exams/i,
  /^[A-Za-z\s]+Pathway$/,
  /^[A-Za-z\s]+Cluster for/i,
];

function isValidPi(pi: string): boolean {
  const t = pi.trim();
  if (!t || t.length < 10) return false;
  return !INVALID_PI_PATTERNS.some((p) => p.test(t));
}

function pickRandom<T>(arr: readonly T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ─── Dataset ───────────────────────────────────────────────────────────────

const dataset = rawDataset as unknown as CaseGenerationDataset;
const eventsByCode = new Map<string, CaseGenerationEvent>(
  dataset.events.map((e) => [e.code, e])
);

/**
 * Get a case generation event by code, or undefined if not in the dataset.
 */
export function getCaseGenerationEventByCode(
  code: string
): CaseGenerationEvent | undefined {
  return eventsByCode.get(code.toUpperCase());
}

/**
 * Get the number of PIs to select based on category.
 */
function getPiCountForCategory(categoryKey: string): number {
  switch (categoryKey) {
    case "principles":
      return 4;
    case "individual_series":
      return 5;
    case "team_decision":
      return 7;
    case "personal_financial_literacy":
      return 4;
    default:
      return 5;
  }
}

/**
 * Build case generation parameters for an event in the dataset.
 * Selects instructional area, performance indicators, org type, judge role, and issue type.
 */
export function buildCaseGenerationParams(
  eventCode: string
): CaseGenerationParams | null {
  const event = getCaseGenerationEventByCode(eventCode);
  if (!event) return null;

  const areas = event.district_primary_instructional_areas_2025_2026;
  const pool = event.instructional_area_to_indicator_pool;

  // For Professional Selling/Consulting: no PI pool, use annual topic
  if (Object.keys(pool).length === 0) {
    const orgType = pickRandom(event.generation_profile.org_types) ?? "consulting practice";
    const judgeRole = pickRandom(event.generation_profile.judge_roles) ?? "client";
    const issueType = pickRandom(event.generation_profile.issue_types) ?? "consultation request";
    return {
      event,
      instructionalArea: event.cluster,
      performanceIndicators: [],
      orgType,
      judgeRole,
      issueType,
    };
  }

  // Pick instructional area
  const validAreas = areas?.filter((a) => pool[a]?.length) ?? Object.keys(pool);
  const instructionalArea = pickRandom(validAreas) ?? Object.keys(pool)[0];
  if (!instructionalArea) return null;

  const piList = pool[instructionalArea] ?? [];
  const validPis = piList.filter(isValidPi);
  const count = Math.min(
    getPiCountForCategory(event.category_key),
    validPis.length
  );

  const performanceIndicators = shuffle(validPis).slice(0, count);

  const orgType =
    pickRandom(event.generation_profile.org_types) ??
    event.generation_profile.org_types[0] ??
    "small business";
  const judgeRole =
    pickRandom(event.generation_profile.judge_roles) ??
    event.generation_profile.judge_roles[0] ??
    "manager";
  const issueType =
    pickRandom(event.generation_profile.issue_types) ??
    event.generation_profile.issue_types[0] ??
    "business decision";

  return {
    event,
    instructionalArea,
    performanceIndicators,
    orgType,
    judgeRole,
    issueType,
  };
}
