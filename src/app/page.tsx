"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  BarChart3,
  ChevronDown,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Menu,
  X,
} from "lucide-react";
import { FeatureSegmentBar } from "@/components/feature-segment-bar";

/** Landing-page preview only — not real analytics */
const LANDING_ENGAGEMENT_WEEK = [
  { label: "M", value: 72 },
  { label: "Tu", value: 85 },
  { label: "W", value: 68 },
  { label: "Th", value: 91 },
  { label: "F", value: 78 },
  { label: "Sa", value: 45 },
  { label: "Su", value: 30 },
] as const;
const LANDING_ENGAGEMENT_MAX = Math.max(
  ...LANDING_ENGAGEMENT_WEEK.map((d) => d.value)
);
const LANDING_ANALYTICS_STATS = [
  { label: "Events", val: "94%" },
  { label: "Members", val: "127" },
  { label: "Practice", val: "68" },
] as const;

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const video0Ref = useRef<HTMLVideoElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    video0Ref.current?.play();
  }, []);

  const handleVideoEnded = (endedIndex: number) => {
    const nextIndex = endedIndex === 0 ? 1 : 0;
    const nextVideo = nextIndex === 0 ? video0Ref.current : video1Ref.current;
    const endedVideo = endedIndex === 0 ? video0Ref.current : video1Ref.current;
    if (nextVideo && endedVideo) {
      endedVideo.currentTime = 0;
      nextVideo.currentTime = 0;
      nextVideo.play();
      setActiveVideo(nextIndex);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen font-gotham font-light bg-white">
      {/* ========== SECTION 1: NAVIGATION ========== */}
      <nav className="fixed left-0 right-0 top-0 z-50 w-full overflow-visible bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between overflow-visible px-6 lg:px-10">
          <Link
            href="/"
            className="flex shrink-0 items-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/bruhlogogo.png"
              alt="Williams Business Council"
              width={280}
              height={86}
              className="h-14 w-auto object-contain object-left sm:h-16"
              priority
              sizes="(max-width: 640px) 200px, 280px"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold px-5 py-2.5 rounded-md bg-[#0171BB] text-white hover:bg-[#015a96] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-slate-600"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile slide-down panel */}
      {mobileMenuOpen && (
        <div className="fixed left-0 right-0 top-20 z-40 md:hidden bg-white shadow-lg">
          <div className="px-6 py-6 flex flex-col gap-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-[#0171BB] text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-[#015a96] transition-colors text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* ========== SECTION 2: HERO ========== */}
      <section className="relative h-[100dvh] min-h-[32rem] overflow-hidden">
        <video
          ref={video0Ref}
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover object-[75%_center] ${activeVideo === 0 ? "opacity-100 z-0" : "opacity-0 z-[-1] pointer-events-none"}`}
          src="/hero-video.mp4"
          onEnded={() => handleVideoEnded(0)}
        />
        <video
          ref={video1Ref}
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover object-[75%_center] ${activeVideo === 1 ? "opacity-100 z-0" : "opacity-0 z-[-1] pointer-events-none"}`}
          src="/hero-video.mp4"
          onEnded={() => handleVideoEnded(1)}
        />

        {/* Base darkening + blue/navy tint */}
        <div
          className="absolute inset-0 z-[1] bg-[#0a1a2e]/50"
          aria-hidden
        />
        {/* Stronger left readability zone, cinematic right */}
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-r from-[#051a28]/95 via-[#0a2d4d]/70 to-[#045299]/20"
          aria-hidden
        />

        {/* Content — logo upper-left; text block grouped lower in hero */}
        <div className="relative z-10 flex h-full flex-col px-6 pb-16 pt-20 lg:px-10">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
            <div className="flex min-h-0 flex-1 max-w-3xl flex-col items-start">
              {/* Spacer — pins logo + text to lower hero; text block position unchanged */}
              <div className="min-h-0 flex-1" aria-hidden />
              {/* Primary: WBC Connect wordmark — sits just above text block */}
              <div className="shrink-0 leading-none">
                <Image
                  src="/Untitled%20design-3.png"
                  alt="Williams Business Council Connect"
                  width={840}
                  height={240}
                  className="block h-auto max-h-[24vh] w-auto max-w-[min(100%,280px)] object-contain object-left sm:max-h-[28vh] sm:max-w-[360px] md:max-h-[30vh] md:max-w-[480px] lg:max-w-[580px] lg:max-h-[32vh]"
                  style={{
                    filter: "brightness(0) invert(1)",
                    mixBlendMode: "screen",
                  }}
                  priority
                  sizes="(max-width: 640px) 280px, (max-width: 768px) 360px, (max-width: 1024px) 480px, 580px"
                />
              </div>
              {/* Slogan, tagline, CTAs — grouped; position unchanged */}
              <div className="mt-8 shrink-0 sm:mt-10 md:mt-12">
                <div className="flex flex-col items-start">
                  <p className="text-lg text-white font-gotham font-bold leading-snug tracking-tight sm:text-xl md:text-2xl">
                    Excel. Elevate. Evolve.
                  </p>
                  <p className="mt-1 text-sm text-white/95 font-gotham font-medium tracking-tight md:text-base">
                    Williams Business Council DECA
                  </p>
                  <div className="mt-4 flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center bg-white text-[#0171BB] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/95 transition-colors shadow-sm"
                    >
                      Join Williams Business Council
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/25 hover:border-white transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-down chevron */}
        <Link
          href="#cluster-cards"
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 animate-bounce-slow sm:bottom-6"
          aria-label="Scroll to features"
        >
          <ChevronDown size={24} className="text-white/30" />
        </Link>
      </section>

      {/* ========== SECTION 3: FEATURE SEGMENT BAR ========== */}
      <section
        id="cluster-cards"
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="section-fade bg-[#FAFBFC] pt-12 sm:pt-16 pb-10 sm:pb-14 px-6 border-t-4 border-[#0171BB]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5 sm:mb-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#0171BB] uppercase">
              BUILT FOR WILLIAMS BUSINESS COUNCIL
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-3 font-gotham">
              Everything our chapter needs.
            </h2>
            <p className="text-base text-slate-500 mt-3">
              From our events to AI-powered competition practice for our members.
            </p>
          </div>

          <FeatureSegmentBar />
        </div>
      </section>

      {/* ========== TRANSITION BLOCK ========== */}
      <section
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="section-fade transition-block py-12 sm:py-14 px-6"
        style={{
          background: "linear-gradient(180deg, #0B1F33 0%, #0F2A44 100%)",
          marginBottom: "48px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold font-gotham tracking-tight leading-tight max-w-[900px] mx-auto sm:whitespace-nowrap"
            style={{ color: "#FFFFFF", textShadow: "0 0 40px rgba(59,130,246,0.15)" }}
          >
            Run our entire chapter from one platform.
          </h2>
          <p
            className="mt-2 text-[1rem] sm:text-[1.125rem] max-w-[700px] mx-auto"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            We plan, engage, and prepare — without switching tools.
          </p>
        </div>
      </section>

      {/* ========== SECTION 4: FEATURES (Alternating) ========== */}
      {/* Feature 1: Image left, text right */}
      <section
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="section-fade bg-white py-6 sm:py-8 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10 items-center">
            <div className="rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/60">
              <div className="bg-white rounded-xl overflow-hidden flex flex-col">
                <div className="h-9 bg-[#0171BB] flex items-center gap-1.5 px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  <span className="ml-2 text-[10px] font-semibold text-white">Dashboard</span>
                </div>
                <div className="flex flex-1 p-3.5 gap-3 min-h-[220px]">
                  <div className="w-20 flex-shrink-0 space-y-2">
                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">March</div>
                    <div className="space-y-1">
                      {[15, 18, 22, 25].map((d) => (
                        <div key={d} className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${d === 18 ? "bg-[#0171BB] text-white" : "bg-slate-200/80 text-slate-700"}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="rounded-lg p-2.5 border-l-4 border-[#0171BB] bg-[#0171BB]/5 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-900">Chapter Meeting</div>
                      <div className="text-[9px] text-slate-600 font-medium">Mar 18 · 24 attending</div>
                    </div>
                    <div className="rounded-lg p-2.5 bg-slate-100 border border-slate-200/80">
                      <div className="text-[11px] font-semibold text-slate-800">Fundraiser</div>
                      <div className="text-[9px] text-slate-600">Mar 22 · 12 attending</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-6 rounded-md bg-slate-100 border border-slate-200/80 flex items-center px-2">
                        <span className="text-[8px] text-slate-500">Search events...</span>
                      </div>
                      <div className="h-6 w-6 rounded-md bg-[#0171BB]/20 flex items-center justify-center border border-[#0171BB]/20">
                        <Calendar size={12} className="text-[#0171BB]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:pl-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#0171BB] uppercase">
                Chapter Management
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 font-gotham tracking-tight">
                Our chapter, organized.
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 leading-tight max-w-[420px]">
                Create events, track who shows up, manage our members, and see
                engagement trends — all from one dashboard. Our officers get the
                tools. Our members get the experience.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[#0171BB] hover:text-[#015a96] transition-colors"
              >
                Learn more
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Text left, image right — layered card variation */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="section-fade bg-[#F5F7FA] py-6 sm:py-8 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10 items-center">
            <div className="lg:order-2 relative">
              <div className="absolute -inset-2 bg-[#0171BB]/5 rounded-2xl -z-10" />
              <div className="relative rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-200/80">
                <div className="bg-white rounded-xl overflow-hidden">
                  <div className="h-8 bg-[#0171BB] flex items-center justify-between px-3">
                    <span className="text-[10px] font-bold text-white tracking-wider">CASE STUDY</span>
                    <span className="text-[9px] text-white/90 font-medium">Retail Management</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <div className="h-2.5 bg-slate-300 rounded w-full" />
                      <div className="h-2.5 bg-slate-300 rounded w-[90%]" />
                      <div className="h-2.5 bg-slate-300 rounded w-[75%]" />
                    </div>
                    <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-300/80 shadow-sm">
                      <div className="text-[9px] font-bold text-amber-900">AI Feedback</div>
                      <div className="text-[8px] text-amber-800/90 mt-0.5 font-medium">Strong analysis of market positioning. Consider expanding on competitive advantages.</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1">
                        {["PI 1", "PI 2", "PI 3"].map((l, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">{l}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold text-[#0171BB]">92</span>
                        <span className="text-[10px] text-slate-600 font-medium">/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:order-1 lg:pr-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#0171BB] uppercase">
                Competition Practice
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 font-gotham tracking-tight">
                Practice like it&apos;s provincials.
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 leading-tight max-w-[420px]">
                AI-generated case studies for every DECA event. Real
                performance indicator grading. Prep time and presentation time
                that match actual competition format.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[#0171BB] hover:text-[#015a96] transition-colors"
              >
                Start practicing
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Image left, text right */}
      <section
        ref={(el) => { sectionRefs.current[4] = el; }}
        className="section-fade bg-white py-6 sm:py-8 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10 items-center">
            <div className="rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/60">
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#0171BB]" />
                    <span className="text-xs font-bold text-slate-800">Engagement</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">Last 7 days</span>
                </div>
                <div className="grid h-28 grid-cols-7 gap-1.5">
                  {LANDING_ENGAGEMENT_WEEK.map(({ label, value }) => {
                    const barPct = (value / LANDING_ENGAGEMENT_MAX) * 100;
                    return (
                      <div key={label} className="flex min-h-0 flex-col">
                        <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
                          <div
                            className="w-full min-h-[4px] rounded-t"
                            style={{
                              height: `${barPct}%`,
                              background: "linear-gradient(to top, #0072CE, #4BA3E3)",
                            }}
                          />
                        </div>
                        <span className="text-center text-[8px] font-medium text-slate-600">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2">
                  {LANDING_ANALYTICS_STATS.map(({ label, val }, i) => (
                    <div key={i} className="text-center">
                      <div className="text-sm font-bold text-slate-900">{val}</div>
                      <div className="text-[9px] text-slate-600 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:pl-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#0171BB] uppercase">
                Smart Analytics
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 font-gotham tracking-tight">
                Data-driven decisions.
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 leading-tight max-w-[420px]">
                See who&apos;s engaged across our chapter, who&apos;s falling off, and what events
                get the most turnout. AI-powered recommendations tell us
                exactly what to do next.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[#0171BB] hover:text-[#015a96] transition-colors"
              >
                View analytics
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 5: STATS BAR ========== */}
      <section
        ref={(el) => { sectionRefs.current[5] = el; }}
        className="section-fade stats-band py-14 px-6 relative"
        style={{
          background: "linear-gradient(135deg, #1D6FA3 0%, #155C8A 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <div className="stats-item">
            <p className="text-4xl font-extrabold text-white sm:text-5xl">180+</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              Members
            </p>
          </div>
        </div>
      </section>

      {/* ========== SECTION 6: CTA ========== */}
      <section
        ref={(el) => { sectionRefs.current[6] = el; }}
        className="section-fade bg-gradient-to-b from-[#EEF2F7] to-[#E2E8F0] py-8 sm:py-10 px-6"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-gotham">
            Ready to join us?
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Join Williams Business Council and start your DECA journey today.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 px-8 py-3 text-sm font-semibold bg-[#0171BB] text-white rounded-lg hover:bg-[#015a96] transition-colors"
          >
            Join Williams Business Council
          </Link>
        </div>
      </section>

      {/* ========== SECTION 7: FOOTER ========== */}
      <footer className="bg-[#0F172A] border-t border-white/[0.06] pt-8 pb-10 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <Image
                src="/wbcconnect.png"
                alt="Williams Business Council Connect"
                width={200}
                height={56}
                className="h-9 w-auto object-contain object-left sm:h-10"
                style={{ filter: "brightness(0) invert(1)" }}
                sizes="(max-width: 640px) 160px, 200px"
              />
              <p className="mt-2 text-sm text-white/50">
                Williams Business Council DECA.
              </p>
            </div>
            <div className="flex gap-6">
              <a
                href="https://deca.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Ontario DECA
              </a>
              <a
                href="https://deca.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                DECA Inc.
              </a>
              <a
                href="mailto:deca@wbc.ca"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 mt-6 pt-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/40">© 2026 Williams Business Council</p>
            <div className="flex gap-5">
              <a
                href="https://www.instagram.com/ontariodeca/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://www.facebook.com/OntarioDECA/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={16} />
              </a>
              <a
                href="https://www.linkedin.com/company/ontario-deca/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://www.youtube.com/@OntarioDECA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={16} />
              </a>
              <a
                href="https://twitter.com/OntarioDECA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
