"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-20 bg-white border-b border-slate-100 transition-shadow duration-200 ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full flex justify-between items-center">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/ontario-deca-logo.png"
              alt="Ontario DECA"
              width={120}
              height={40}
              className="h-10 w-auto object-contain object-left"
              priority
              sizes="120px"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-[#0171BB] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-[#0171BB] text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-[#015a96] transition-colors"
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
            {mobileMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 z-40 md:hidden bg-white shadow-lg">
          <div className="px-6 py-6 flex flex-col gap-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-600 hover:text-[#0171BB] transition-colors"
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
    </>
  );
}
