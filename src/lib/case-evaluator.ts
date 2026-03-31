/**
 * DECA case study evaluation prompt builder.
 */

import type { OntarioDecaEvent } from "./ontario-deca-data";
import type { CategoryTemplate } from "./ontario-deca-data";

export interface EventDataForEval {
  event: OntarioDecaEvent;
  template: CategoryTemplate | undefined;
  instructionalArea: string;
}

export function buildEvaluationPrompt(
  caseStudy: string,
  studentResponse: string,
  eventData: EventDataForEval
): string {
  const { event, template, instructionalArea } = eventData;
  const participants = template?.participants ?? "1";
  const presentationTime = template?.presentation_time_minutes ?? 10;
  const category = template?.category_name ?? event.category_key;

  return `You are an experienced DECA competition judge evaluating a student's roleplay performance in the ${event.name} (${event.code}) event at Ontario DECA Provincials.

THE CASE STUDY GIVEN TO THE STUDENT:
${caseStudy}

THE STUDENT'S RESPONSE:
${studentResponse}

EVENT DETAILS:
- Category: ${category}
- Cluster: ${event.cluster}
- Instructional Area: ${instructionalArea}
- Participants: ${participants}
- Presentation Time: ${presentationTime} minutes

EVALUATE using these Performance Indicator categories:

1. Knowledge & Understanding (0-30 points):
- Understanding of ${event.cluster} concepts related to ${instructionalArea}
- Application of relevant business principles
- Accuracy of information presented
- Depth of subject matter knowledge

2. Critical Thinking & Problem Solving (0-30 points):
- Quality of analysis of the situation
- Feasibility and creativity of recommendations
- Consideration of constraints in the solution
- Logical connection between problem and proposed solution

3. Communication & Presentation Skills (0-25 points):
- Clarity and organization of ideas
- Use of professional business vocabulary
- Persuasiveness of the presentation
- Logical flow and structure of response

4. Professional Presence & Poise (0-15 points):
- Professional tone and confidence
- Handling of the scenario with composure
- Appropriate level of detail and specificity
- Overall impression

RESPOND IN THIS EXACT JSON FORMAT (no other text before or after):
{
  "overall_score": <number 0-100>,
  "pi_scores": {
    "knowledge_understanding": { "score": <0-30>, "feedback": "<specific feedback>" },
    "critical_thinking": { "score": <0-30>, "feedback": "<specific feedback>" },
    "communication": { "score": <0-25>, "feedback": "<specific feedback>" },
    "professional_presence": { "score": <0-15>, "feedback": "<specific feedback>" }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "event_specific_tips": ["<tip 1>", "<tip 2>"],
  "overall_feedback": "<2-3 sentence summary>"
}

Be encouraging but honest. Reference specific things the student said. Compare against what a competitive DECA student would be expected to deliver at provincials.`;
}
