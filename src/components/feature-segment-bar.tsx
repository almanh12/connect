"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Trophy,
  BarChart3,
  Brain,
  Award,
} from "lucide-react";

import { Avatar } from "@/components/avatar";

const EASE = [0.42, 0, 0.58, 1] as const; // easeInOut
const DURATION = 0.2;

/** Landing preview only — mock analytics card (M–F) */
const ANALYTICS_PREVIEW_MF = [
  { label: "M", value: 60 },
  { label: "Tu", value: 75 },
  { label: "W", value: 80 },
  { label: "Th", value: 65 },
  { label: "F", value: 74 },
] as const;
const ANALYTICS_PREVIEW_MF_MAX = Math.max(
  ...ANALYTICS_PREVIEW_MF.map((d) => d.value)
);

const FEATURES = [
  {
    id: "events",
    icon: Calendar,
    label: "Events",
    accent: "from-[#0171BB]/12 to-[#0171BB]/5",
    accentHover: "from-[#0171BB]/28 to-[#0171BB]/10",
    accentActive: "from-[#0171BB]/40 to-[#0171BB]/18",
    accentHex: "#0171BB",
    description:
      "Plan meetings, conferences, fundraisers, and chapter activities in one place.",
    bullets: [
      "Create and manage all chapter events",
      "Track attendance and engagement",
      "Share calendars and reminders",
    ],
    cta: "Explore Events",
    ctaHref: "/login",
  },
  {
    id: "members",
    icon: Users,
    label: "Members",
    accent: "from-[#0B5A8A]/12 to-[#0B5A8A]/5",
    accentHover: "from-[#0B5A8A]/28 to-[#0B5A8A]/10",
    accentActive: "from-[#0B5A8A]/40 to-[#0B5A8A]/18",
    accentHex: "#0B5A8A",
    description:
      "Organize members, roles, participation, and communication across your chapter.",
    bullets: [
      "Manage members and roles",
      "Track participation and engagement",
      "Streamline chapter communication",
    ],
    cta: "See Members",
    ctaHref: "/login",
  },
  {
    id: "practice",
    icon: Trophy,
    label: "Practice",
    accent: "from-[#C8963E]/12 to-[#C8963E]/5",
    accentHover: "from-[#C8963E]/28 to-[#C8963E]/10",
    accentActive: "from-[#C8963E]/40 to-[#C8963E]/18",
    accentHex: "#C8963E",
    description:
      "AI-powered roleplay, quiz, and competition prep tools to help members excel.",
    bullets: [
      "Roleplay and case practice",
      "Quiz and knowledge checks",
      "Competition-ready preparation",
    ],
    cta: "See Practice Tools",
    ctaHref: "/login",
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Analytics",
    accent: "from-[#5B4A9E]/12 to-[#5B4A9E]/5",
    accentHover: "from-[#5B4A9E]/28 to-[#5B4A9E]/10",
    accentActive: "from-[#5B4A9E]/40 to-[#5B4A9E]/18",
    accentHex: "#5B4A9E",
    description:
      "Track chapter engagement, participation, and growth with clear insights.",
    bullets: [
      "Engagement and attendance trends",
      "Participation metrics",
      "Growth and activity reports",
    ],
    cta: "View Analytics",
    ctaHref: "/login",
  },
  {
    id: "ai-assistant",
    icon: Brain,
    label: "AI Assistant",
    accent: "from-[#0D9488]/12 to-[#0D9488]/5",
    accentHover: "from-[#0D9488]/28 to-[#0D9488]/10",
    accentActive: "from-[#0D9488]/40 to-[#0D9488]/18",
    accentHex: "#0D9488",
    description:
      "Help students prepare faster and get instant support for competition prep.",
    bullets: [
      "Instant answers and guidance",
      "Faster learning and prep",
      "24/7 support for members",
    ],
    cta: "Try AI Assistant",
    ctaHref: "/login",
  },
  {
    id: "leaderboards",
    icon: Award,
    label: "Leaderboards",
    accent: "from-[#B45309]/12 to-[#B45309]/5",
    accentHover: "from-[#B45309]/28 to-[#B45309]/10",
    accentActive: "from-[#B45309]/40 to-[#B45309]/18",
    accentHex: "#B45309",
    description:
      "Showcase progress, results, and chapter performance to motivate members.",
    bullets: [
      "Points and rankings",
      "Chapter performance highlights",
      "Recognition and motivation",
    ],
    cta: "See Leaderboards",
    ctaHref: "/login",
  },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

export function FeatureSegmentBar() {
  const [activeId, setActiveId] = useState<FeatureId>("events");
  const [hoveredId, setHoveredId] = useState<FeatureId | null>(null);
  const activeFeature = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Segmented bar container */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Inner highlight / glass */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none z-20" />

        <div className="relative flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60">
          {FEATURES.map((feature) => (
            <Segment
              key={feature.id}
              feature={feature}
              isActive={activeId === feature.id}
              isHovered={hoveredId === feature.id}
              onHover={() => setHoveredId(feature.id)}
              onHoverEnd={() => setHoveredId(null)}
              onSelect={() => setActiveId(feature.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Preview panel */}
      <AnimatePresence mode="wait">
        <PreviewPanel key={activeId} feature={activeFeature} />
      </AnimatePresence>
    </div>
  );
}

function Segment({
  feature,
  isActive,
  isHovered,
  onHover,
  onHoverEnd,
  onSelect,
}: {
  feature: (typeof FEATURES)[number];
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onSelect: () => void;
}) {
  const Icon = feature.icon;
  const isExpanded = isActive || isHovered;

  return (
    <motion.button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onSelect}
      layout
      className={`
        relative flex flex-col items-center justify-center gap-1.5 py-4 sm:py-5 px-3 sm:px-2
        bg-gradient-to-b ${isExpanded ? (isActive ? feature.accentActive : feature.accentHover) : feature.accent}
        cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0171BB] focus-visible:ring-offset-2
      `}
      style={{
        flex: isHovered ? 1.3 : isActive ? 1.05 : 0.92,
      }}
      animate={{
        boxShadow: isActive
          ? "0 -4px 12px rgba(0,0,0,0.08)"
          : "0 0 0 transparent",
        zIndex: isActive ? 10 : 1,
      }}
      transition={{ duration: DURATION, ease: EASE }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Idle shimmer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 5, repeat: Infinity, repeatDelay: 6 }}
      />

      {/* Icon */}
      <motion.div
        className="relative"
        style={{ color: feature.accentHex }}
        animate={{
          scale: isExpanded ? 1.1 : 1,
          y: isExpanded ? -4 : 0,
        }}
        transition={{ duration: DURATION, ease: EASE }}
      >
        <Icon size={26} className="sm:w-7 sm:h-7" strokeWidth={1.75} />
      </motion.div>

      {/* Label */}
      <motion.span
        className={`text-xs sm:text-sm font-semibold tracking-tight ${
          isActive ? "text-slate-900" : isHovered ? "text-slate-800" : "text-slate-600"
        }`}
        animate={{ y: isExpanded ? -2 : 0 }}
        transition={{ duration: DURATION, ease: EASE }}
      >
        {feature.label}
      </motion.span>

      {/* Sliding indicator — 2–3px, layoutId for smooth animation */}
      {isActive && (
        <motion.div
          layoutId="segment-indicator"
          className="absolute bottom-0 left-0 right-0 h-[2.5px] sm:block"
          style={{
            background: `linear-gradient(90deg, ${feature.accentHex}, ${feature.accentHex}99)`,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        />
      )}
    </motion.button>
  );
}

const MOCKUP_BASE = "flex-shrink-0 w-full sm:w-56 max-w-[240px] sm:max-w-none rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)]";

/** Landing Members mockup — DECA-blue avatar tints (primary → light → navy → muted) */
const MEMBER_AVATAR_BGS = [
  "bg-[var(--deca-blue)]",
  "bg-[#4BA3E3]",
  "bg-[var(--deca-blue-dark)]",
  "bg-[#6B8FA3]",
] as const;

function FeatureMockup({ feature }: { feature: (typeof FEATURES)[number] }) {
  const color = feature.accentHex;

  switch (feature.id) {
    case "events": {
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2 flex gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex gap-0.5 mb-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="flex-1 text-[8px] font-medium text-slate-500 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map((n) => (
                  <div key={n} className={`aspect-square rounded-[1px] flex items-center justify-center text-[7px] ${n === 15 ? "bg-[#0171BB] text-white font-semibold" : "bg-slate-100/90 text-slate-500"}`}>{n}</div>
                ))}
              </div>
            </div>
            <div className="w-16 flex-shrink-0 space-y-1">
              <div className="rounded-md p-1.5 shadow-sm" style={{ backgroundColor: `${color}15`, borderLeft: `2px solid ${color}` }}>
                <div className="text-[7px] font-semibold text-slate-700 truncate">Chapter Mtg</div>
                <div className="text-[6px] text-slate-500">Mar 15</div>
              </div>
              <div className="rounded-md p-1.5 bg-slate-50">
                <div className="text-[7px] font-medium text-slate-600 truncate">Fundraiser</div>
                <div className="text-[6px] text-slate-500">Mar 22</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "members": {
      const members = [
        { name: "Alex Chen", role: "President" },
        { name: "Jordan Lee", role: "VP" },
        { name: "Sam Wilson", role: "Member" },
        { name: "Riley Kim", role: "Treasurer" },
      ];
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2 space-y-1.5">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar
                  src={null}
                  name={m.name}
                  size={24}
                  fallbackBg={MEMBER_AVATAR_BGS[i]}
                  className="[&>div]:font-gotham [&>div]:font-bold"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-medium text-slate-700 truncate">{m.name}</div>
                  <div className="text-[6px] text-slate-500">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "practice": {
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2 space-y-2">
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "65%", backgroundColor: color }} />
            </div>
            <div className="space-y-1">
              <div className="text-[8px] font-medium text-slate-700">Case: Retail Strategy</div>
              <div className="text-[7px] text-slate-500">Question 3 of 5</div>
            </div>
            <div className="rounded-md p-1.5 bg-slate-50 border border-slate-200/80">
              <div className="h-2 rounded bg-slate-200/80 w-full mb-1" />
              <div className="h-2 rounded bg-slate-200/80 w-4/5" />
            </div>
            <div className="flex gap-1">
              <div className="flex-1 h-5 rounded text-[7px] font-medium flex items-center justify-center bg-slate-200/80 text-slate-600">Back</div>
              <div className="flex-1 h-5 rounded text-[7px] font-medium flex items-center justify-center text-white" style={{ backgroundColor: color }}>Submit</div>
            </div>
          </div>
        </div>
      );
    }
    case "analytics": {
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2">
            <div className="grid h-14 grid-cols-5 gap-0.5">
              {ANALYTICS_PREVIEW_MF.map(({ label, value }) => {
                const barPct = (value / ANALYTICS_PREVIEW_MF_MAX) * 100;
                return (
                  <div key={label} className="flex min-h-0 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
                      <div
                        className="w-full min-h-[3px] rounded-t"
                        style={{
                          height: `${barPct}%`,
                          background: "linear-gradient(to top, #0072CE, #4BA3E3)",
                        }}
                      />
                    </div>
                    <div className="text-center text-[6px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[6px] text-slate-500">
              <span>Engagement</span>
              <span>74%</span>
            </div>
          </div>
        </div>
      );
    }
    case "ai-assistant": {
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2 space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg rounded-bl-sm px-2 py-1.5 text-[7px] bg-slate-100 text-slate-700">
                How do I structure a marketing plan?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-br-sm px-2 py-1.5 text-[7px] text-white" style={{ backgroundColor: color }}>
                1. Executive summary 2. Situation analysis 3. Objectives...
              </div>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 h-6 rounded-full bg-slate-100 text-[7px] text-slate-400 flex items-center px-2">Type a message...</div>
            </div>
          </div>
        </div>
      );
    }
    case "leaderboards": {
      const ranks = [
        { pos: 1, name: "Alex C.", pts: 420 },
        { pos: 2, name: "Jordan L.", pts: 385 },
        { pos: 3, name: "Sam W.", pts: 342 },
      ];
      return (
        <div className={`${MOCKUP_BASE}`} style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${color}12` }}>
          <div className="h-6 flex items-center gap-1 px-2" style={{ backgroundColor: `${color}18` }}>
            <div className="w-1 h-1 rounded-full bg-slate-400/60" />
          </div>
          <div className="p-2 space-y-1.5">
            {ranks.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold ${i === 0 ? "bg-amber-400/80 text-amber-900" : i === 1 ? "bg-slate-300/80 text-slate-700" : "bg-amber-700/40 text-amber-900"}`}>
                  {r.pos}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-medium text-slate-700 truncate">{r.name}</div>
                </div>
                <div className="text-[8px] font-semibold" style={{ color }}>{r.pts}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

function PreviewPanel({ feature }: { feature: (typeof FEATURES)[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: DURATION, ease: EASE }}
      className="rounded-xl border border-slate-200/90 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Left: UI mock */}
        <div className="flex items-start justify-center p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-white">
          <FeatureMockup feature={feature} />
        </div>

        {/* Right: content */}
        <div className="flex-1 p-4 sm:p-5 min-w-0 flex flex-col justify-center">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-gotham tracking-tight">
            {feature.label}
          </h3>
          <p className="mt-1 text-slate-600 text-sm leading-relaxed">
            {feature.description}
          </p>
          <ul className="mt-2.5 space-y-1">
            {feature.bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: feature.accentHex }}
                />
                {bullet}
              </li>
            ))}
          </ul>
          <Link
            href={feature.ctaHref}
            className="mt-4 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#0171BB] text-white hover:bg-[#015a96] transition-colors shadow-[0_2px_8px_rgba(1,113,187,0.3)] hover:shadow-[0_2px_12px_rgba(1,113,187,0.4)]"
          >
            {feature.cta}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
