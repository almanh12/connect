/**
 * Zod schemas for API request bodies — strict where possible to reject unexpected fields.
 * Keep max lengths aligned with DB columns and UI limits (OWASP: limit input size).
 */

import { z } from "zod";

const uuid = z.string().uuid("Invalid id");

export const practiceStartBodySchema = z
  .object({
    event_code: z.string().min(1).max(32).optional(),
    event_category: z.string().min(1).max(500).optional(),
    category: z.string().max(200).optional(),
    case_study: z.string().max(200_000).nullable().optional(),
  })
  .strict()
  .refine((d) => (d.event_code ?? d.event_category) != null, {
    message: "event_code or event_category is required",
  });

export const practiceSaveBodySchema = z
  .object({
    session_id: uuid,
    event_code: z.string().min(1).max(32).optional(),
    event_category: z.string().min(1).max(500).optional(),
    category: z.string().max(200).optional(),
    score: z.number().int().min(0).max(100).nullable().optional(),
    pi_scores: z.record(z.string(), z.number()).nullable().optional(),
    feedback: z.string().max(500_000).nullable().optional(),
    duration_seconds: z.number().int().min(0).max(86400).nullable().optional(),
    case_study: z.string().max(200_000).nullable().optional(),
    student_response: z.string().max(200_000).nullable().optional(),
  })
  .strict()
  .refine((d) => (d.event_code ?? d.event_category) != null, {
    message: "event_code or event_category is required",
  });

export const competitionPostBodySchema = z
  .object({
    event_code: z.string().min(1).max(32),
    event_name: z.string().min(1).max(500),
    competition_level: z.enum(["regional", "provincial", "icdc"]),
    partner_id: uuid.nullable().optional(),
    user_id: uuid.optional(),
  })
  .strict();

export const chatPostBodySchema = z
  .object({
    message: z.string().min(1).max(16_000),
    conversation_id: uuid,
  })
  .strict();

/** PATCH competition registration — empty object still bumps updated_at server-side */
export const competitionPatchBodySchema = z
  .object({
    status: z.enum(["registered", "confirmed", "completed", "withdrawn"]).optional(),
    partner_id: uuid.nullable().optional(),
  })
  .strict();

const chatTurnSchema = z
  .object({
    role: z.string().min(1).max(20),
    content: z.string().max(200_000),
  })
  .strict();

/** POST /api/practice — interactive roleplay + feedback */
export const practicePostBodySchema = z
  .object({
    event_code: z.string().max(32).optional(),
    event_category: z.string().max(500).optional(),
    category: z.string().max(200).optional(),
    messages: z.array(chatTurnSchema).max(100).optional(),
    request_feedback: z.boolean().optional(),
  })
  .strict()
  .refine((d) => (d.event_code ?? d.event_category) != null, {
    message: "event_code or event_category is required",
  });

export const evaluateBodySchema = z
  .object({
    event_code: z.string().min(1).max(32),
    case_study: z.string().min(1).max(200_000),
    student_response: z.string().min(1).max(200_000),
    instructional_area: z.string().max(500).optional(),
  })
  .strict();

export const generateCaseBodySchema = z
  .object({
    event_code: z.string().min(1).max(32),
  })
  .strict();

export const analyticsInsightsBodySchema = z
  .object({
    metrics: z.record(z.string(), z.unknown()),
  })
  .strict()
  .refine((d) => JSON.stringify(d.metrics).length <= 2_000_000, {
    message: "metrics payload too large",
  });

export const strategiesPostBodySchema = z
  .object({
    challenges: z.array(z.string().max(500)).max(50).optional(),
    description: z.string().max(10_000).optional(),
    timeline: z.string().max(500).optional(),
    resources: z.array(z.string().max(500)).max(50).optional(),
  })
  .strict();

export const strategyImplementBodySchema = z
  .object({
    strategy: z.record(z.string(), z.unknown()),
  })
  .strict()
  .refine((d) => JSON.stringify(d.strategy).length <= 500_000, {
    message: "strategy payload too large",
  });

export const contentPostBodySchema = z
  .object({
    prompt: z.string().min(1).max(16_000),
    platform: z.enum(["Instagram", "TikTok", "Email", "General"]).optional(),
  })
  .strict();

export const notificationReadBodySchema = z
  .object({
    id: z.string().min(1).max(200),
  })
  .strict();

export const memberRolePutBodySchema = z
  .object({
    role: z.enum(["admin", "member"]),
  })
  .strict();

/** Settings profile update (server action) */
export const profileUpdateBodySchema = z.object({
  full_name: z.string().min(1).max(200).trim(),
  grade: z.number().int().min(0).max(100).nullable(),
  experience_level: z.string().max(100).nullable(),
  interests: z.array(z.string().max(200)).max(50).nullable(),
});

// ─── Admin server actions (chapter officers / owners) ───────────────────────

export const EVENT_TYPE_VALUES = [
  "meeting",
  "competition",
  "social",
  "fundraiser",
  "workshop",
  "other",
  "mcq_practice",
  "roleplay_practice",
  "community_service",
] as const;

export const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);

export const createEventBodySchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(10_000),
    event_type: eventTypeSchema,
    date: z.string().min(10).max(10),
    start_time: z.string().min(1).max(32),
    end_time: z.string().min(1).max(32),
    start_timestamp: z.string().max(80).optional(),
    end_timestamp: z.string().max(80).optional(),
    location: z.string().max(500),
    virtual_link: z.string().max(2000).optional(),
    is_mandatory: z.boolean(),
    max_capacity: z.number().int().positive().max(100_000).optional(),
    recurring: z.boolean(),
    recurrence_type: z.enum(["weekly", "biweekly", "monthly"]).optional(),
    recurrence_until: z.enum(["month", "semester", "custom"]).optional(),
    recurrence_end: z.string().max(10).optional(),
  })
  .strict();

export const updateEventPartialSchema = createEventBodySchema.partial().strict();

export const eventIdParamSchema = z.string().uuid();
export const recurringGroupIdParamSchema = z.string().uuid();

export const manualCheckInBodySchema = z
  .object({
    attendanceId: uuid,
    eventId: uuid,
  })
  .strict();

export const bulkAwardPointsBodySchema = z
  .object({
    userIds: z.array(uuid).min(1).max(500),
    points: z.number().int().min(1).max(1_000_000),
    reason: z.string().max(2000),
  })
  .strict();

export const awardPointsToMemberBodySchema = z
  .object({
    userId: uuid,
    points: z.number().int().min(1).max(1_000_000),
    reason: z.string().max(2000),
  })
  .strict();

export const memberUserIdParamSchema = z.string().uuid();

export const updateMemberRoleBodySchema = z
  .object({
    userId: uuid,
    role: z.enum(["admin", "member"]),
  })
  .strict();

export const markAttendanceBodySchema = z
  .object({
    eventId: uuid,
    userId: uuid,
    attended: z.boolean(),
  })
  .strict();

export const saveBulkAttendanceBodySchema = z
  .object({
    eventId: uuid,
    presentUserIds: z.array(uuid).max(2000),
  })
  .strict();

export const markAllAbsentBodySchema = z.object({ eventId: uuid }).strict();

export const awardBonusPointsBodySchema = awardPointsToMemberBodySchema;

const strategyActionStepSchema = z
  .object({
    text: z.string().max(10_000),
    completed: z.boolean(),
    completed_at: z.string().max(50).nullable().optional(),
  })
  .strict();

export const createStrategyRowSchema = z
  .object({
    title: z.string().min(1).max(500),
    priority: z.string().max(50),
    tags: z.array(z.string().max(100)).max(50),
    problem_statement: z.string().max(20_000),
    action_steps: z.array(strategyActionStepSchema).max(200),
    expected_impact: z.string().max(20_000),
    timeline: z.string().max(2000),
    success_metrics: z.array(z.unknown()).max(100),
    intake_data: z.record(z.string(), z.unknown()),
  })
  .strict()
  .refine((d) => JSON.stringify(d.intake_data).length <= 500_000, {
    message: "intake_data too large",
  });

export const createStrategiesBatchSchema = z
  .array(createStrategyRowSchema)
  .min(1)
  .max(50);

export const strategyStatusBodySchema = z
  .object({
    id: uuid,
    status: z.enum(["new", "active", "completed", "dismissed"]),
  })
  .strict();

export const updateStrategyDetailsBodySchema = z
  .object({
    id: uuid,
    updates: z
      .object({
        due_date: z.string().max(32).nullable().optional(),
        assigned_to: uuid.nullable().optional(),
        action_steps: z.array(strategyActionStepSchema).max(200).optional(),
      })
      .strict(),
  })
  .strict();

export const toggleActionStepBodySchema = z
  .object({
    strategyId: uuid,
    stepIndex: z.number().int().min(0).max(500),
    completed: z.boolean(),
  })
  .strict();

export const announcementPrioritySchema = z.enum(["urgent", "normal", "fyi"]);

export const createAnnouncementBodySchema = z
  .object({
    title: z.string().min(1).max(500),
    content: z.string().max(50_000),
    priority: announcementPrioritySchema,
  })
  .strict();

export const updateAnnouncementBodySchema = z
  .object({
    id: uuid,
    title: z.string().min(1).max(500),
    content: z.string().max(50_000),
    priority: announcementPrioritySchema,
  })
  .strict();

export const announcementIdParamSchema = z.string().uuid();

export const chapterIdParamSchema = z.string().uuid();

export const updateChapterBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    school_name: z.string().max(200).nullable().optional(),
    advisor_name: z.string().max(200).nullable().optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.name !== undefined ||
      d.school_name !== undefined ||
      d.advisor_name !== undefined,
    { message: "At least one field is required" }
  );

export const updateChapterActionSchema = z
  .object({
    chapterId: uuid,
    input: updateChapterBodySchema,
  })
  .strict();

export const getMemberProfileParamSchema = z.string().uuid();

/** API: PUT /api/chapters/[chapterId]/members/[memberId]/role */
export const chapterMemberRoleParamsSchema = z
  .object({
    chapterId: uuid,
    memberId: uuid,
  })
  .strict();
