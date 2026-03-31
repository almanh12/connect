# Ontario DECA Oral Events Case Generation Dataset

Use the JSON file alongside these rules when asking Claude/Cursor to generate realistic DECA-style scenarios.

## What this file is for
- Building **new** DECA-style oral practice cases for Ontario events
- Matching official DECA formatting and tone
- Using the **current 2025-2026 district instructional areas** where DECA publishes them
- Pulling real performance indicators from the official DECA performance-indicator PDFs

## What this file is NOT for
- Reproducing official DECA scenarios
- Lightly paraphrasing published sample events
- Mixing categories together (for example, making Principles cases feel like Team Decision cases)

## Required output shape for role-play/case-study events
1. CAREER CLUSTER
2. INSTRUCTIONAL AREA
3. EVENT NAME
4. PARTICIPANT INSTRUCTIONS
5. 21st CENTURY SKILLS
6. PERFORMANCE INDICATORS
7. EVENT SITUATION

## Event Situation rules
- No subheaders inside the Event Situation
- Open with `You are to assume the role...` or `You are to assume the roles...`
- Keep it short and DECA-like, not like a business memo
- End with a clear judge interaction cue

## Category realism rules
- **Principles**: one narrow issue, basic workplace/customer problem, entry-level role
- **Individual Series**: industry-specific problem, one decision, manager/owner/client judge
- **Team Decision**: two roles, broader recommendation, one coherent business problem
- **Professional Selling/Consulting**: use the annual topic; these are not district role-plays

## PI selection rules
- **Principles**: choose exactly 4 PIs from one instructional area
- **Individual Series**: choose exactly 5 PIs, biased to the event's district areas
- **Team Decision**: choose exactly 7 PIs, anchored in the district area
- **PFL**: choose 4 managing-credit outcomes that fit the client problem
- **Prepared sales/consulting**: use the annual topic and relevant cluster indicators as support only

## Hard warning
Do not copy or lightly paraphrase any published DECA scenario. Use only the structural patterns and indicator pools from the dataset.
