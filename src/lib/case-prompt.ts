/**
 * DECA case study prompt builder for Claude.
 */

import type { CaseData } from "./case-generator";
import { getEventByCode } from "./ontario-deca-data";

export function buildCaseStudyPrompt(caseData: CaseData): string {
  const event = getEventByCode(caseData.eventCode);
  const eventName = event?.name ?? caseData.eventCode;
  const eventCode = caseData.eventCode;

  return `You are generating an official DECA roleplay case study for the ${eventName} (${eventCode}) event.

Generate a case study in this EXACT format:

**ROLE:** Assign the candidate a realistic job role at the company (e.g., "You are the Marketing Coordinator at [company]")

**COMPANY BACKGROUND:** 2-3 sentences describing ${caseData.companyName}, a ${caseData.companyType} in the ${caseData.cluster} industry. Include company size, years in business, and market position.

**SITUATION:** 3-4 sentences describing the ${caseData.problem} the company is facing. Use business context relevant to the ${caseData.instructionalArea} instructional area. Do NOT explicitly mention any performance indicators — the scenario should naturally require the student to apply them.

**CONSTRAINTS:** 1-2 sentences describing the ${caseData.constraint} limitation. This adds realism and difficulty.

**OBJECTIVE:** 1-2 sentences clearly stating what the participant must do. Connect to the objective of ${caseData.objective}. End with "Present your recommendations to [appropriate person]."

Rules:
- Match the official DECA competition tone — formal, professional, concise
- Do NOT mention performance indicators anywhere in the case
- The scenario must logically connect the problem to the objective
- Make it realistic enough that a real business could face this situation
- Keep it to about 150-200 words total (matching real DECA case length)
- The company background, situation, and constraints should naturally require the student to demonstrate knowledge in ${caseData.instructionalArea}

Output ONLY the case study text, no preamble or explanation.`;
}
