/**
 * DECA case study prompt builder using the Ontario case generation dataset.
 * Used when event exists in ontario_deca_oral_events_case_generation_dataset.json
 */

import type { CaseGenerationParams } from "./case-generation-dataset";

const README_RULES = `
## Category realism rules
- **Principles**: one narrow issue, basic workplace/customer problem, entry-level role
- **Individual Series**: industry-specific problem, one decision, manager/owner/client judge
- **Team Decision**: two roles, broader recommendation, one coherent business problem
- **Professional Selling/Consulting**: use the annual topic; these are not district role-plays

## Event Situation rules
- No subheaders inside the Event Situation
- Open with "You are to assume the role..." or "You are to assume the roles..." (for Team Decision)
- Keep it short and DECA-like, not like a business memo
- End with a clear judge interaction cue (e.g., "The owner (judge) has asked you to..." or "The customer (judge) will begin the conversation by...")

## Hard warning
Do NOT copy or lightly paraphrase any published DECA scenario. Use only the structural patterns and indicator pools from the dataset. Generate original organization names, contexts, and conflicts.
`;

/**
 * Build the system prompt for generating ONLY the Event Situation.
 * The full case document is assembled from dataset + AI output in the API route.
 */
export function buildEventSituationPrompt(params: CaseGenerationParams): string {
  const { event, instructionalArea, performanceIndicators, orgType, judgeRole, issueType } =
    params;

  const eventSituationStyle = event.format_profile.event_situation_style;
  const isTeamDecision = event.category_key === "team_decision";
  const isPreparedSales = event.category_key === "professional_selling_consulting";

  const piContext =
    performanceIndicators.length > 0
      ? `The scenario must naturally require the participant to address these performance indicators (never mention them by name):\n${performanceIndicators.map((pi) => `- ${pi}`).join("\n")}`
      : "Use cluster-relevant indicators as support. This is a prepared event—follow the annual topic.";

  return `You are a DECA oral event case generator. You produce realistic, structurally authentic practice cases for Ontario DECA competitors. You NEVER reproduce or lightly paraphrase any published DECA scenario.

## EVENT
- **Event name**: ${event.name}
- **Event code**: ${event.code}
- **Career cluster**: ${event.cluster}
- **Category**: ${event.category_name}
- **Instructional area**: ${instructionalArea}

${README_RULES}

## YOUR TASK

Generate ONLY the EVENT SITUATION section. Output nothing else—no headers, no other sections, no preamble.

Requirements:
${eventSituationStyle.map((s) => `- ${s}`).join("\n")}
- Role level: ${event.generation_profile.role_level}
- Organization type: ${orgType}
- Judge role: ${judgeRole}
- Issue type: ${issueType}
- Realism: ${event.generation_profile.realism_rules.join(" ")}
- Use an original, invented organization name. Never copy a published DECA scenario.
${isTeamDecision ? "- Use TWO roles: 'You are to assume the roles of...'" : ""}
${isPreparedSales && event.prepared_event_topic_2025_2026 ? `- ANNUAL TOPIC: ${event.prepared_event_topic_2025_2026}` : ""}
${event.ontario_override ? `- ${event.ontario_override}` : ""}

${piContext}`;
}

/**
 * Assemble the full DECA case document from dataset params + AI-generated Event Situation.
 */
export function assembleCaseDocument(
  params: CaseGenerationParams,
  eventSituation: string
): string {
  const { event, instructionalArea, performanceIndicators } = params;

  const participantInstructions = event.format_profile.participant_instructions_template;
  const twentyFirstCenturySkills = event.format_profile.twenty_first_century_skills_template;

  const participantInstructionsText = participantInstructions
    .map((line, i) => `${i + 1}. ${line}`)
    .join("\n");

  const skillsText = twentyFirstCenturySkills.map((s) => `• ${s}`).join("\n");

  const piText =
    performanceIndicators.length > 0
      ? performanceIndicators.map((pi, i) => `${i + 1}. ${pi}`).join("\n")
      : "Use cluster-relevant indicators as support; this is a prepared event—follow the annual topic.";

  return `CAREER CLUSTER
${event.cluster}

INSTRUCTIONAL AREA
${instructionalArea}

EVENT NAME
${event.name}

PARTICIPANT INSTRUCTIONS
${participantInstructionsText}

21st CENTURY SKILLS
${skillsText}

PERFORMANCE INDICATORS
${piText}

EVENT SITUATION
${eventSituation.trim()}`;
}
