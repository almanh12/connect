import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinChapterForm } from "./join-form";
import Image from "next/image";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const joinUrl = `/join${code ? `?code=${encodeURIComponent(code)}` : ""}`;

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(joinUrl)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("chapter_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.chapter_id) {
    const { data: chapter } = await supabase
      .from("chapters")
      .select("name")
      .eq("id", profile.chapter_id)
      .single();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <Link href="/" className="mb-6 flex flex-col items-center gap-1">
          <Image src="/deca-logo.png" alt="DECA" width={48} height={49} className="h-10 w-auto object-contain" sizes="48px" />
          <span className="text-lg font-bold text-gray-900">DECA Engage</span>
        </Link>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">You&apos;re already in a chapter</h1>
          <p className="mt-2 text-gray-600">You&apos;re a member of <strong>{chapter?.name ?? "your chapter"}</strong>.</p>
          <Link href="/dashboard" className="mt-6 inline-block w-full rounded-lg bg-[#0072CE] py-3 font-semibold text-white hover:bg-[#004B87]">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <JoinChapterForm code={code ?? ""} />;
}
