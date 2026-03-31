"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { joinChapter, lookupChapterByCode } from "../chapter-setup/actions";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";

export function JoinChapterForm({ code }: { code: string }) {
  const router = useRouter();
  const initialCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).split("");
  const [joinCode, setJoinCode] = useState<string[]>(() =>
    initialCode.length === 6 ? initialCode : ["", "", "", "", "", ""]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterInfo, setChapterInfo] = useState<{ name: string; school_name: string | null } | null>(null);

  useEffect(() => {
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (c.length === 6) {
      const arr = c.split("");
      setJoinCode(arr);
      lookupChapterByCode(c).then((res) => {
        if (res.chapter) setChapterInfo(res.chapter);
      });
    }
  }, [code]);

  const joinCodeStr = joinCode.join("").toUpperCase();

  const handleCodeChange = (index: number, value: string) => {
    const char = value.toUpperCase().slice(-1);
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    const next = [...joinCode];
    next[index] = char;
    setJoinCode(next);
    setError(null);
    setChapterInfo(null);
    if (char && index < 5) {
      const nextInput = document.getElementById(`join-code-${index + 1}`);
      nextInput?.focus();
    }
    if (next.every((c) => c)) {
      lookupChapterByCode(next.join("")).then((res) => {
        if (res.chapter) setChapterInfo(res.chapter);
        else setChapterInfo(null);
      });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !joinCode[index] && index > 0) {
      const prev = document.getElementById(`join-code-${index - 1}`);
      prev?.focus();
      const next = [...joinCode];
      next[index - 1] = "";
      setJoinCode(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    toast.success(`Welcome to ${result.chapterName ?? "your chapter"}!`);
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8">
      <Link href="/chapter-setup" className="mb-6 flex flex-col items-center gap-1 transition-opacity hover:opacity-90">
        <Image src="/deca-logo.png" alt="DECA" width={48} height={49} className="h-10 w-auto object-contain" sizes="48px" />
        <span className="text-lg font-bold text-gray-900">DECA Engage</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/chapter-setup" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Join a Chapter</h1>
        <p className="mt-1 text-sm text-gray-600">Enter the 6-character invite code from your advisor.</p>
        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                id={`join-code-${i}`}
                type="text"
                inputMode="text"
                maxLength={1}
                value={joinCode[i]}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border-2 border-gray-300 text-center text-xl font-bold uppercase focus:border-[#0171BB] focus:outline-none focus:ring-2 focus:ring-[#0171BB]/30"
              />
            ))}
          </div>
          {chapterInfo && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-800">{chapterInfo.name}</p>
              {chapterInfo.school_name && <p className="text-sm text-green-700">{chapterInfo.school_name}</p>}
            </div>
          )}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || joinCodeStr.length !== 6}
            className="mt-6 w-full rounded-lg bg-[#0171BB] py-3 font-semibold text-white hover:bg-[#015a96] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : chapterInfo ? `Join ${chapterInfo.name}` : "Join Chapter"}
          </button>
        </form>
      </div>
    </div>
  );
}
