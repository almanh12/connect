"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";

type ActionResult = { error?: string; success?: boolean };

export interface UseOptimisticActionOptions<TInput, TResult extends ActionResult> {
  /** Server action or async handler. Return `{ error }` on failure. */
  action: (input: TInput) => Promise<TResult>;
  /**
   * Apply optimistic UI inside a transition.
   * Return a rollback function to restore state on error.
   */
  onOptimistic?: (input: TInput) => void | (() => void);
  onSuccess?: (result: TResult, input: TInput) => void;
  /** Toast on error (default: server `error` string). */
  errorToast?: string | ((message: string) => string);
  /** Toast on success; pass `false` to suppress. */
  successToast?: string | false;
}

export interface OptimisticActionResult<TResult> {
  ok: boolean;
  result?: TResult;
  error?: unknown;
}

/**
 * Wrap server actions with `useTransition`, optimistic updates, toast on error, and rollback.
 *
 * @example Boolean toggle (e.g. attendance present/absent)
 * ```tsx
 * const [present, setPresent] = useState(initial);
 * const { execute, isPending } = useOptimisticAction({
 *   action: (next: boolean) => markAttendance(eventId, userId, next),
 *   onOptimistic: (next) => {
 *     const prev = present;
 *     setPresent(next);
 *     return () => setPresent(prev);
 *   },
 *   successToast: false,
 * });
 * await execute(true);
 * ```
 *
 * @example List membership (e.g. RSVP add/remove)
 * ```tsx
 * const [rsvpIds, setRsvpIds] = useState(initialSet);
 * const { execute } = useOptimisticAction({
 *   action: (join: boolean) => (join ? rsvpToEvent(id) : cancelRsvp(id)),
 *   onOptimistic: (join) => {
 *     const prev = new Set(rsvpIds);
 *     setRsvpIds((s) => {
 *       const next = new Set(s);
 *       join ? next.add(id) : next.delete(id);
 *       return next;
 *     });
 *     return () => setRsvpIds(prev);
 *   },
 *   successToast: (join) => (join ? "RSVP confirmed" : "RSVP cancelled"),
 * });
 * ```
 */
export function useOptimisticAction<TInput, TResult extends ActionResult>({
  action,
  onOptimistic,
  onSuccess,
  errorToast,
  successToast,
}: UseOptimisticActionOptions<TInput, TResult>) {
  const [isPending, startTransition] = useTransition();

  const execute = useCallback(
    async (input: TInput): Promise<OptimisticActionResult<TResult>> => {
      let rollback: (() => void) | undefined;

      startTransition(() => {
        const maybeRollback = onOptimistic?.(input);
        if (typeof maybeRollback === "function") rollback = maybeRollback;
      });

      try {
        const result = await action(input);

        if (result.error) {
          startTransition(() => rollback?.());
          const message =
            typeof errorToast === "function"
              ? errorToast(result.error)
              : errorToast ?? result.error;
          toast.error(message);
          return { ok: false, result };
        }

        if (successToast) toast.success(successToast);
        onSuccess?.(result, input);
        return { ok: true, result };
      } catch (error) {
        startTransition(() => rollback?.());
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        toast.error(
          typeof errorToast === "function" ? errorToast(message) : errorToast ?? message
        );
        return { ok: false, error };
      }
    },
    [action, onOptimistic, onSuccess, errorToast, successToast]
  );

  return { execute, isPending };
}
