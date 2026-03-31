/**
 * Ontario DECA 2025-2026 dataset — typed exports.
 * Source: ontario-deca-data.json
 */

import rawData from "./ontario-deca-data.json";

// ─── Types ─────────────────────────────────────────────────────────────────

export type CategoryKey =
  | "principles"
  | "individual_series"
  | "team_decision"
  | "personal_financial_literacy"
  | "operations_research"
  | "project_management"
  | "entrepreneurship_prepared"
  | "integrated_marketing_campaign"
  | "professional_selling_consulting"
  | "online_events";

export type ClusterKey =
  | "Business Administration Core"
  | "Business Management and Administration"
  | "Entrepreneurship"
  | "Finance"
  | "Hospitality and Tourism"
  | "Marketing"
  | "Personal Financial Literacy";

export interface OntarioDecaEvent {
  code: string;
  name: string;
  category_key: CategoryKey;
  cluster: string;
  exam: string | null;
  pi_cluster: string;
  pi_source_page: string;
  district_instructional_areas_source?: string;
  deca_guide_source?: string;
  ontario_competitive_events_source?: string;
  ontario_restrictions?: string[];
  ontario_note?: string;
  ontario_requires_submission?: boolean;
  report_topic_note?: string;
  entry_format?: string;
  entry_limit?: string;
}

export interface CategoryTemplate {
  category_name: string;
  participants: string;
  prep_time_minutes?: number;
  presentation_time_minutes?: number;
  exam_required?: boolean;
  exam_type?: string;
  report_limit?: string;
  entry_format?: string;
  entry_limit?: string;
  entry_length_varies?: boolean;
  ontario_notes?: string[];
  ontario_override?: string;
  ontario_submission?: string;
  source?: string;
}

export interface ClusterPiSource {
  pi_source_key: string;
  primary_use: string[];
}

export interface RubricTemplate {
  applies_to: CategoryKey[];
  scored_components: string[];
  modeling_note?: string;
}

export interface OntarioDecaDataset {
  dataset_name: string;
  generated_on: string;
  scope: string;
  notes: string[];
  official_sources: Record<string, string | Record<string, string>>;
  cluster_pi_sources: Record<string, ClusterPiSource>;
  category_templates: Record<string, CategoryTemplate>;
  rubric_templates: Record<string, RubricTemplate>;
  events: OntarioDecaEvent[];
}

// ─── Parsed data ───────────────────────────────────────────────────────────

const dataset = rawData as unknown as OntarioDecaDataset;

export const ONTARIO_DECA_EVENTS: OntarioDecaEvent[] = dataset.events;
export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = dataset.category_templates;
export const CLUSTER_PI_SOURCES: Record<string, ClusterPiSource> = dataset.cluster_pi_sources;
export const OFFICIAL_SOURCES = dataset.official_sources;
export const PI_SOURCE_PAGES = dataset.official_sources?.pi_pages as Record<string, string> | undefined;

// ─── Category display names (for UI) ───────────────────────────────────────

export const CATEGORY_DISPLAY_NAMES: Record<CategoryKey, string> = {
  principles: "Principles of Business Administration",
  individual_series: "Individual Series",
  team_decision: "Team Decision Making",
  personal_financial_literacy: "Personal Financial Literacy",
  operations_research: "Operations Research",
  project_management: "Project Management",
  entrepreneurship_prepared: "Entrepreneurship",
  integrated_marketing_campaign: "Integrated Marketing Campaigns",
  professional_selling_consulting: "Professional Selling and Consulting",
  online_events: "Online Events",
};

// ─── Roleplay vs prepared event classification ──────────────────────────────

export const ROLEPLAY_CATEGORIES: CategoryKey[] = [
  "principles",
  "individual_series",
  "team_decision",
  "personal_financial_literacy",
  "professional_selling_consulting",
];

export const WRITTEN_PREPARED_CATEGORIES: CategoryKey[] = [
  "operations_research",
  "project_management",
  "entrepreneurship_prepared",
  "integrated_marketing_campaign",
];

export function isRoleplayEvent(event: OntarioDecaEvent): boolean {
  return ROLEPLAY_CATEGORIES.includes(event.category_key);
}

export function isPreparedEvent(event: OntarioDecaEvent): boolean {
  return WRITTEN_PREPARED_CATEGORIES.includes(event.category_key);
}

export function isOnlineEvent(event: OntarioDecaEvent): boolean {
  return event.category_key === "online_events";
}

/** True if event requires/permits a partner: Team Decision Making, Integrated Marketing Campaigns, or 2+ participants */
export function isTeamEvent(event: OntarioDecaEvent): boolean {
  if (event.category_key === "team_decision" || event.category_key === "integrated_marketing_campaign") {
    return true;
  }
  const template = getCategoryTemplate(event.category_key);
  const participants = template?.participants ?? "1";
  const match = participants.match(/(\d+)/g);
  if (!match) return false;
  const max = Math.max(...match.map((n) => parseInt(n, 10)));
  return max >= 2;
}

// ─── Scoring rubrics ───────────────────────────────────────────────────────

export const ROLEPLAY_PI_SCORING = {
  "Knowledge & Understanding of [cluster] concepts": 30,
  "Critical Thinking & Problem Solving": 30,
  "Communication & Presentation Skills": 25,
  "Professional Presence & Poise": 15,
} as const;

export const PREPARED_EVENT_SCORING = {
  "Executive Summary / Overview": 15,
  "Research & Analysis": 20,
  "Strategy & Implementation Plan": 25,
  "Financial Projections / Budget": 20,
  "Presentation & Format Quality": 20,
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getEventByCode(code: string): OntarioDecaEvent | undefined {
  return ONTARIO_DECA_EVENTS.find((e) => e.code === code);
}

export function getEventsByCategory(categoryKey: CategoryKey): OntarioDecaEvent[] {
  return ONTARIO_DECA_EVENTS.filter((e) => e.category_key === categoryKey);
}

export function getEventsByCodes(codes: string[]): OntarioDecaEvent[] {
  const set = new Set(codes);
  return ONTARIO_DECA_EVENTS.filter((e) => set.has(e.code));
}

export function getEventsGroupedByCategory(): Record<string, OntarioDecaEvent[]> {
  const grouped: Record<string, OntarioDecaEvent[]> = {};
  for (const event of ONTARIO_DECA_EVENTS) {
    const label = CATEGORY_DISPLAY_NAMES[event.category_key] ?? event.category_key;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(event);
  }
  return grouped;
}

export function searchEvents(query: string): OntarioDecaEvent[] {
  const q = query.toLowerCase().trim();
  if (!q) return ONTARIO_DECA_EVENTS;
  return ONTARIO_DECA_EVENTS.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.cluster.toLowerCase().includes(q) ||
      (CATEGORY_DISPLAY_NAMES[e.category_key] ?? "").toLowerCase().includes(q)
  );
}

export function getCategoryTemplate(categoryKey: CategoryKey): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES[categoryKey];
}

export function getEventWithTemplate(event: OntarioDecaEvent): OntarioDecaEvent & { template: CategoryTemplate } {
  const template = getCategoryTemplate(event.category_key) ?? ({} as CategoryTemplate);
  return { ...event, template };
}

export function getParticipantsCount(participants: string): string {
  return participants;
}

export function getPrepTimeMinutes(event: OntarioDecaEvent): number | null {
  const t = getCategoryTemplate(event.category_key);
  return t?.prep_time_minutes ?? null;
}

export function getPresentationTimeMinutes(event: OntarioDecaEvent): number | null {
  const t = getCategoryTemplate(event.category_key);
  return t?.presentation_time_minutes ?? null;
}

export function getEntryLimit(event: OntarioDecaEvent): string | null {
  return event.entry_limit ?? getCategoryTemplate(event.category_key)?.entry_limit ?? null;
}

export function getEntryFormat(event: OntarioDecaEvent): string | null {
  return event.entry_format ?? getCategoryTemplate(event.category_key)?.entry_format ?? null;
}
