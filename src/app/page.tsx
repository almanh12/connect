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
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex justify-between items-center">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/ontario-deca-logo.png"
              alt="Ontario DECA"
              width={120}
              height={44}
              className="h-11 w-auto object-contain"
              priority
              sizes="120px"
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
        <div className="fixed top-20 left-0 right-0 z-40 md:hidden bg-white shadow-lg">
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
      <section className="relative min-h-screen overflow-hidden">
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

        {/* Content — upper-left, intentional placement */}
        <div className="relative z-10 flex items-start min-h-screen pt-36 md:pt-44 lg:pt-52 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col items-start max-w-xl">
              {/* Primary: Logo — 10–15% larger */}
              <Image
                src="/deca-engage-logo.png"
                alt="DECA Engage"
                width={700}
                height={200}
                className="w-[320px] md:w-[460px] lg:w-[640px] h-auto object-contain object-left"
                style={{
                  filter: "brightness(0) invert(1)",
                  mixBlendMode: "screen",
                }}
                priority
                sizes="(max-width: 768px) 320px, (max-width: 1024px) 460px, 640px"
              />
              {/* Tagline + supporting line */}
              <p className="mt-3 text-xl md:text-2xl text-white font-gotham font-bold tracking-tight leading-snug">
                Engage. Elevate. Excel.
              </p>
              <p className="mt-1 text-sm md:text-base text-white/95 font-gotham font-medium tracking-tight">
                Built for Ontario DECA chapters.
              </p>
              {/* CTA row */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center bg-white text-[#0171BB] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/95 transition-colors shadow-sm"
                >
                  Create a Chapter
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/25 hover:border-white transition-colors"
                >
                  Join Your Chapter
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-down chevron */}
        <Link
          href="#cluster-cards"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-slow"
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
              BUILT FOR ONTARIO DECA
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-3 font-gotham">
              Everything your chapter needs.
            </h2>
            <p className="text-base text-slate-500 mt-3">
              From event management to AI-powered competition practice.
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
            Run your entire chapter from one platform.
          </h2>
          <p
            className="mt-2 text-[1rem] sm:text-[1.125rem] max-w-[700px] mx-auto"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Plan, engage, and prepare — without switching tools.
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
                Your chapter, organized.
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 leading-tight max-w-[420px]">
                Create events, track who shows up, manage your members, and see
                engagement trends — all from one dashboard. Officers get the
                tools. Members get the experience.
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
                AI-generated case studies for every Ontario DECA event. Real
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
                <div className="h-28 flex items-end gap-2">
                  {[72, 58, 85, 62, 91, 78, 88].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex-1 flex items-end rounded-t overflow-hidden bg-slate-200/80">
                        <div
                          className="w-full rounded-t"
                          style={{ height: `${val}%`, backgroundColor: i === 4 ? "#0171BB" : "#0B5A8A" }}
                        />
                      </div>
                      <span className="text-[8px] text-slate-600 font-medium">{["M", "Tu", "W", "Th", "F", "S", "S"][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2">
                  {[
                    { label: "Events", val: "94%" },
                    { label: "Members", val: "127" },
                    { label: "Practice", val: "68" },
                  ].map(({ label, val }, i) => (
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
                See who&apos;s engaged, who&apos;s falling off, and what events
                get the most turnout. AI-powered recommendations tell you
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
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="stats-item">
              <p className="text-4xl sm:text-5xl font-extrabold text-white">47+</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Years in Ontario</p>
            </div>
            <div className="stats-item">
              <p className="text-4xl sm:text-5xl font-extrabold text-white">200K+</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>DECA members globally</p>
            </div>
            <div className="stats-item">
              <p className="text-4xl sm:text-5xl font-extrabold text-white">50+</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Competitive events</p>
            </div>
            <div className="stats-item">
              <p className="text-4xl sm:text-5xl font-extrabold text-white">AI</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Powered grading</p>
            </div>
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
            Ready to lead your chapter?
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Create your chapter on DECA Engage and start managing your team today.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 px-8 py-3 text-sm font-semibold bg-[#0171BB] text-white rounded-lg hover:bg-[#015a96] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ========== SECTION 7: FOOTER ========== */}
      <footer className="bg-[#0F172A] border-t border-white/[0.06] pt-8 pb-10 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <Image
                src="/deca-engage-logo.png"
                alt="DECA Engage"
                width={140}
                height={40}
                className="h-8 min-h-[32px] w-auto object-contain"
                style={{
                  filter: "brightness(0) invert(1)",
                  mixBlendMode: "screen",
                }}
                sizes="140px"
              />
              <p className="mt-2 text-sm text-white/50">
                Built by DECA members, for DECA chapters.
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
                href="mailto:hello@deca.ca"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 mt-6 pt-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/40">© 2026 DECA Engage</p>
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
