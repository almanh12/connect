"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createChapter, lookupChapterByCode, joinChapter } from "./actions";
import { getPublicAppOrigin } from "@/lib/public-origin";
import { toast } from "sonner";
import { Loader2, Users, Flag, Copy, Check, ChevronLeft, ImagePlus } from "lucide-react";

type Mode = "choose" | "create" | "create-step2" | "create-success" | "join" | "join-confirm" | "join-success";

/** Layout defined at module level so it is NOT recreated on each render — prevents input focus loss. */
function ChapterSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 pt-6 pb-10 sm:pt-8 sm:pb-12">
      <Link
        href="/"
        className="mb-4 sm:mb-5 flex flex-col items-center transition-opacity hover:opacity-90"
      >
        <Image
          src="/Untitled%20design-3.png"
          alt="DECA Engage"
          width={220}
          height={64}
          className="w-[160px] sm:w-[200px] h-auto object-contain"
          sizes="(max-width: 640px) 160px, 200px"
        />
      </Link>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

export default function ChapterSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    school_name: "",
    advisor_name: "",
    description: "",
  });
  const [createResult, setCreateResult] = useState<{ inviteCode: string; inviteLink: string } | null>(null);

  const [joinCode, setJoinCode] = useState(["", "", "", "", "", ""]);
  const [joinChapterInfo, setJoinChapterInfo] = useState<{ name: string; school_name: string | null } | null>(null);
  const [joinSuccessName, setJoinSuccessName] = useState<string>("");

  const joinCodeStr = joinCode.join("").toUpperCase();

  const handleCreateStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMode("create-step2");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await createChapter({
      name: createForm.name,
      school_name: createForm.school_name,
      advisor_name: createForm.advisor_name,
      description: createForm.description || undefined,
    });
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      setError(result.error);
      return;
    }
    if (result.success && result.inviteCode && result.inviteLink) {
      setCreateResult({ inviteCode: result.inviteCode, inviteLink: result.inviteLink });
      setMode("create-success");
    } else {
      toast.error("Something went wrong");
    }
  };

  const handleJoinCodeChange = (index: number, value: string) => {
    const char = value.toUpperCase().slice(-1);
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    const next = [...joinCode];
    next[index] = char;
    setJoinCode(next);
    setError(null);
    setJoinChapterInfo(null);
    if (char && index < 5) {
      const nextInput = document.getElementById(`join-code-${index + 1}`);
      nextInput?.focus();
    }
    if (next.every((c) => c)) {
      lookupChapterByCode(next.join("")).then((res) => {
        if (res.chapter) setJoinChapterInfo(res.chapter);
        else setJoinChapterInfo(null);
      });
    }
  };

  const handleJoinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !joinCode[index] && index > 0) {
      const prev = document.getElementById(`join-code-${index - 1}`);
      prev?.focus();
      const next = [...joinCode];
      next[index - 1] = "";
      setJoinCode(next);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await joinChapter(joinCodeStr);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      setError(result.error);
      return;
    }
    setJoinSuccessName(result.chapterName ?? "your chapter");
    setMode("join-success");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  if (mode === "choose") {
    return (
      <ChapterSetupLayout>
        <h1 className="text-center text-2xl font-bold text-gray-900">Get started</h1>
        <p className="mt-2 text-center text-gray-600">Create a chapter or join an existing one.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-[#0171BB] hover:bg-[#0171BB]/5 hover:shadow-md"
          >
            <div className="rounded-2xl bg-[#0171BB]/10 p-5 transition group-hover:bg-[#0171BB]/20">
              <Flag className="h-12 w-12 text-[#0171BB]" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Create a Chapter</span>
            <span className="text-sm text-gray-500">Set up your DECA chapter and invite members</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-[#0171BB] hover:bg-[#0171BB]/5 hover:shadow-md"
          >
            <div className="rounded-2xl bg-[#0171BB]/10 p-5 transition group-hover:bg-[#0171BB]/20">
              <Users className="h-12 w-12 text-[#0171BB]" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Join a Chapter</span>
            <span className="text-sm text-gray-500">Enter your chapter&apos;s invite code</span>
          </button>
        </div>
      </ChapterSetupLayout>
    );
  }

  if (mode === "create") {
    return (
      <ChapterSetupLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <button type="button" onClick={() => setMode("choose")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Create a Chapter</h1>
          <p className="mt-1 text-sm text-gray-500">Step 1 of 2 — Basic info</p>
          <form onSubmit={handleCreateStep1} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Chapter name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                placeholder="e.g. Lincoln High DECA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">School name *</label>
              <input
                type="text"
                value={createForm.school_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, school_name: e.target.value }))}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                placeholder="e.g. Lincoln High School"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Advisor name</label>
              <input
                type="text"
                value={createForm.advisor_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, advisor_name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                placeholder="e.g. Ms. Johnson"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-[#0171BB] py-2.5 font-semibold text-white hover:bg-[#015a96]">
              Continue
            </button>
          </form>
        </div>
      </ChapterSetupLayout>
    );
  }

  if (mode === "create-step2") {
    return (
      <ChapterSetupLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <button type="button" onClick={() => setMode("create")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Customize (optional)</h1>
          <p className="mt-1 text-sm text-gray-500">Step 2 of 2</p>
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Chapter logo</label>
              <div className="mt-2 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">Upload coming soon</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chapter description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                placeholder="Optional: describe your chapter..."
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#0171BB] py-2.5 font-semibold text-white hover:bg-[#015a96] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Create Chapter"}
            </button>
          </form>
        </div>
      </ChapterSetupLayout>
    );
  }

  if (mode === "create-success" && createResult) {
    const inviteShareUrl = `${getPublicAppOrigin()}/join?code=${createResult.inviteCode}`;
    return (
      <ChapterSetupLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-gray-900">Chapter created!</h1>
          <p className="mt-2 text-gray-600">Share this invite code with members:</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <code className="rounded-xl bg-gray-100 px-6 py-4 text-3xl font-mono font-bold tracking-[0.3em] text-gray-900">
              {createResult.inviteCode}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(createResult.inviteCode, "Invite code")}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-50"
            >
              <Copy className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">Or share the link:</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteShareUrl}
              className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(inviteShareUrl, "Invite link")}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              router.push("/onboarding");
              router.refresh();
            }}
            className="mt-8 w-full rounded-lg bg-[#0171BB] py-3 font-semibold text-white hover:bg-[#015a96]"
          >
            Continue to Profile Setup
          </button>
        </div>
      </ChapterSetupLayout>
    );
  }

  if (mode === "join") {
    return (
      <ChapterSetupLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <button type="button" onClick={() => setMode("choose")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Join a Chapter</h1>
          <p className="mt-1 text-sm text-gray-600">Enter the 6-character invite code from your advisor.</p>
          <form onSubmit={handleJoin} className="mt-8">
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  id={`join-code-${i}`}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={joinCode[i]}
                  onChange={(e) => handleJoinCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleJoinKeyDown(i, e)}
                  className="h-14 w-12 rounded-xl border-2 border-gray-300 text-center text-xl font-bold uppercase focus:border-[#0171BB] focus:outline-none focus:ring-2 focus:ring-[#0171BB]/30"
                />
              ))}
            </div>
            {joinChapterInfo && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="font-medium text-green-800">{joinChapterInfo.name}</p>
                {joinChapterInfo.school_name && <p className="text-sm text-green-700">{joinChapterInfo.school_name}</p>}
              </div>
            )}
            {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting || joinCodeStr.length !== 6}
              className="mt-6 w-full rounded-lg bg-[#0171BB] py-3 font-semibold text-white hover:bg-[#015a96] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : joinChapterInfo ? `Join ${joinChapterInfo.name}` : "Join Chapter"}
            </button>
          </form>
        </div>
      </ChapterSetupLayout>
    );
  }

  if (mode === "join-success") {
    return (
      <ChapterSetupLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-gray-900">Welcome to {joinSuccessName}!</h1>
          <p className="mt-2 text-gray-600">Complete your profile to get started.</p>
          <button
            type="button"
            onClick={() => {
              router.push("/onboarding");
              router.refresh();
            }}
            className="mt-8 w-full rounded-lg bg-[#0171BB] py-3 font-semibold text-white hover:bg-[#015a96]"
          >
            Continue to Profile Setup
          </button>
        </div>
      </ChapterSetupLayout>
    );
  }

  return null;
}
