/**
 * DECA roleplay case study generator.
 * Uses cluster data to generate realistic case parameters.
 */

import { getEventByCode } from "./ontario-deca-data";

const CASE_DATASET = {
  clusters: {
    Marketing: {
      instructional_areas: [
        "Promotion",
        "Selling",
        "Market Planning",
        "Pricing",
        "Product Service Management",
        "Channel Management",
        "Marketing Information Management",
      ],
      company_types: [
        "retail clothing store",
        "e-commerce brand",
        "sports team",
        "entertainment company",
        "restaurant chain",
        "tech startup",
        "cosmetics brand",
      ],
      problems: [
        "declining sales",
        "low brand awareness",
        "poor social media engagement",
        "increasing competition",
        "negative brand perception",
        "low customer retention",
      ],
    },
    Finance: {
      instructional_areas: [
        "Financial Analysis",
        "Banking Services",
        "Risk Management",
        "Securities and Investments",
        "Corporate Finance",
      ],
      company_types: [
        "commercial bank",
        "investment firm",
        "fintech startup",
        "insurance company",
      ],
      problems: [
        "high financial risk",
        "declining investment returns",
        "poor budgeting decisions",
        "client portfolio imbalance",
      ],
    },
    "Hospitality and Tourism": {
      instructional_areas: [
        "Lodging",
        "Food and Beverage",
        "Travel and Tourism",
        "Recreation",
      ],
      company_types: [
        "hotel",
        "resort",
        "airline",
        "event planning company",
        "restaurant",
      ],
      problems: [
        "low occupancy rates",
        "poor customer satisfaction",
        "seasonal demand fluctuations",
        "negative guest reviews",
      ],
    },
    "Business Management and Administration": {
      instructional_areas: [
        "Human Resources",
        "Operations Management",
        "Strategic Management",
        "Project Management",
      ],
      company_types: [
        "corporate office",
        "logistics company",
        "consulting firm",
        "manufacturing company",
      ],
      problems: [
        "low employee productivity",
        "high turnover",
        "inefficient operations",
        "lack of strategic direction",
      ],
    },
    "Business Administration Core": {
      instructional_areas: [
        "Human Resources",
        "Operations Management",
        "Strategic Management",
        "Project Management",
        "Business Fundamentals",
      ],
      company_types: [
        "corporate office",
        "logistics company",
        "consulting firm",
        "manufacturing company",
      ],
      problems: [
        "low employee productivity",
        "high turnover",
        "inefficient operations",
        "lack of strategic direction",
      ],
    },
    Entrepreneurship: {
      instructional_areas: [
        "Business Planning",
        "Growth Strategy",
        "Operations",
        "Concept Development",
      ],
      company_types: ["startup", "small business", "new product venture"],
      problems: [
        "lack of funding",
        "unclear target market",
        "scaling issues",
        "weak value proposition",
      ],
    },
    "Personal Financial Literacy": {
      instructional_areas: [
        "Budgeting",
        "Savings and Investments",
        "Credit and Debt",
        "Financial Planning",
      ],
      company_types: [
        "financial advisory firm",
        "credit union",
        "personal finance app company",
      ],
      problems: [
        "clients struggling with debt",
        "low savings rates among target demographic",
        "poor financial literacy in community",
      ],
    },
  },
  constraints: [
    "limited budget",
    "tight deadline",
    "small team",
    "economic downturn",
    "new competitor entering market",
    "supply chain disruptions",
  ],
  objectives: [
    "increase revenue",
    "improve brand awareness",
    "reduce costs",
    "increase market share",
    "improve customer satisfaction",
    "expand into new market",
  ],
  company_names: [
    "Summit Ventures",
    "Horizon Group",
    "Pinnacle Enterprises",
    "Apex Solutions",
    "Nexus Partners",
    "Catalyst Inc.",
    "Meridian Holdings",
    "Vertex Consulting",
    "Atlas Industries",
    "Stellar Brands",
    "Prime Dynamics",
    "Fusion Group",
    "Vanguard Associates",
    "Crestview Partners",
    "Northgate Corp",
    "Riverside Holdings",
    "Silverline Group",
    "Blue Ridge Enterprises",
    "Greenfield Partners",
    "Sunrise Ventures",
  ],
} as const;

export interface CaseData {
  cluster: string;
  instructionalArea: string;
  companyType: string;
  companyName: string;
  problem: string;
  constraint: string;
  objective: string;
  eventCode: string;
}

const CLUSTER_MAP: Record<string, keyof typeof CASE_DATASET.clusters> = {
  "Business Administration Core": "Business Administration Core",
  "Business Management and Administration": "Business Management and Administration",
  Finance: "Finance",
  "Hospitality and Tourism": "Hospitality and Tourism",
  Marketing: "Marketing",
  Entrepreneurship: "Entrepreneurship",
  "Personal Financial Literacy": "Personal Financial Literacy",
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function generateCase(eventCode: string): CaseData | null {
  const event = getEventByCode(eventCode);
  if (!event) return null;

  const clusterKey = CLUSTER_MAP[event.pi_cluster] ?? event.pi_cluster;
  const clusterData = CASE_DATASET.clusters[clusterKey as keyof typeof CASE_DATASET.clusters];
  if (!clusterData) return null;

  return {
    cluster: event.pi_cluster,
    instructionalArea: pickRandom(clusterData.instructional_areas),
    companyType: pickRandom(clusterData.company_types),
    companyName: pickRandom(CASE_DATASET.company_names),
    problem: pickRandom(clusterData.problems),
    constraint: pickRandom(CASE_DATASET.constraints),
    objective: pickRandom(CASE_DATASET.objectives),
    eventCode: event.code,
  };
}
