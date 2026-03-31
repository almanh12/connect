import { z } from "zod";

/**
 * Zod validation for Server Actions (no Request body). Mirrors parseJsonBody semantics.
 */
export function parseActionInput<T extends z.ZodType>(
  schema: T,
  data: unknown
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: string } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.values(flat.fieldErrors).find(
      (msgs): msgs is string[] => Array.isArray(msgs) && msgs.length > 0
    );
    const fieldErr = firstField?.[0];
    const formErr = flat.formErrors[0];
    return {
      ok: false,
      error: fieldErr ?? formErr ?? "Invalid input",
    };
  }
  return { ok: true, data: parsed.data };
}
