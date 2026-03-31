import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkInViaUrl } from "@/app/(protected)/admin/events/actions";
import { CheckInResult } from "./checkin-result";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = React.use(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await checkInViaUrl(eventId, user.id);

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  const isSuccess = !!(result && "success" in result && result.success);
  const isAlreadyCheckedIn = result.error === "Already checked in";

  return (
    <CheckInResult
      success={isSuccess}
      alreadyCheckedIn={!!isAlreadyCheckedIn}
      error={result.error && !isAlreadyCheckedIn ? result.error : null}
      points={result.points ?? 0}
      eventTitle={event?.title ?? null}
    />
  );
}
