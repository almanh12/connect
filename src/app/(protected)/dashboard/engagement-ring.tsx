"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getTier, getTierProgress, formatTierForDisplay } from "@/lib/points";

interface EngagementRingProps {
  score: number;
  tier?: string;
}

/** Single wheel component: progress ring + DECA logo + points text inside. */
export function EngagementRing({ score }: EngagementRingProps) {
  const tierInfo = getTier(score);
  const { pointsNeeded, nextTier } = getTierProgress(score);
  const percentage = tierInfo.progressPercent / 100;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(percentage);
  }, [percentage]);

  const size = 220;
  const radius = 105; // (size/2) - (strokeWidth/2) for 220px ring
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 10;
  const dashLength = animatedProgress * circumference;
  const gapLength = circumference - dashLength;

  const progressLabel =
    nextTier != null && pointsNeeded > 0
      ? `${pointsNeeded} pts to ${formatTierForDisplay(nextTier)}`
      : nextTier != null
        ? `Next: ${formatTierForDisplay(nextTier)} (${tierInfo.nextThreshold} pts)`
        : "Max tier reached";

  const tierTextColor =
    ["silver", "gold", "platinum", "bronze"].includes(tierInfo.name)
      ? "#1a1a1a"
      : "#fff";

  return (
    <div className="engagement-ring-container flex flex-col items-center relative">
      {/* Single 220px container — ring, logo, text all layered inside */}
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {/* SVG progress ring */}
        <svg
          viewBox="0 0 220 220"
          width={size}
          height={size}
          className="absolute inset-0"
          aria-hidden
        >
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={tierInfo.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${gapLength}`}
            transform="rotate(-90 110 110)"
            style={{
              transition: "stroke-dasharray 1.2s ease-out",
              filter: `drop-shadow(0 0 12px ${tierInfo.color}50)`,
            }}
          />
        </svg>
        {/* DECA logo centered inside ring — subtle background texture */}
        <Image
          src="/deca-logo.png"
          alt=""
          width={165}
          height={165}
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            filter: "brightness(0) invert(1)",
            opacity: 0.3,
          }}
        />
        {/* Points text centered on top of logo */}
        <div
          className="absolute flex flex-col items-center justify-center pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <span
            className="font-bold text-white leading-none"
            style={{ fontSize: 34 }}
          >
            {score}
          </span>
          <span
            className="font-medium uppercase mt-0.5 text-white"
            style={{
              fontSize: 11,
              letterSpacing: "2px",
            }}
          >
            PTS
          </span>
        </div>
      </div>
      <p
        className="mt-3 text-center max-w-[140px]"
        style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}
      >
        {progressLabel}
      </p>
      <div
        className="mt-3 font-semibold uppercase rounded-full px-4 py-1"
        style={{
          backgroundColor: tierInfo.color,
          color: tierTextColor,
          fontSize: 11,
          letterSpacing: "1px",
          padding: "4px 16px",
          borderRadius: 100,
        }}
      >
        {formatTierForDisplay(tierInfo.name)}
      </div>
    </div>
  );
}
