"use client";

import { useState } from "react";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = ["Instagram", "TikTok", "Email", "General"] as const;

export function ContentGeneratorClient() {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("General");
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<{
    caption: string;
    emailSubject: string;
    emailBody: string;
    recruitmentMessage: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Enter what you're promoting");
      return;
    }
    setIsLoading(true);
    setContent(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), platform }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate");
      }
      const data = await res.json();
      setContent(data);
      toast.success("Content generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          What are you promoting?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Regional competition sign-up, this Saturday 2pm at the gym. Bring your best business casual!"
          rows={4}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          disabled={isLoading}
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
            className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
            disabled={isLoading}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004B87] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate Content
          </button>
        </div>
      </div>

      {content && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Social Media Caption</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(content.caption, "Caption")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
              {content.caption || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Email Template</h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${content.emailSubject}\n\n${content.emailBody}`,
                    "Email"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">Subject</p>
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                {content.emailSubject || "—"}
              </p>
              <p className="text-xs font-medium text-gray-500">Body</p>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                {content.emailBody || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recruitment Message</h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(content.recruitmentMessage, "Recruitment message")
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
              {content.recruitmentMessage || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
