"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { X, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface QRModalProps {
  eventId: string;
  eventTitle: string;
  checkInUrl: string;
  initialAttendedCount: number;
  onClose: () => void;
}

export function QRModal({
  eventId,
  eventTitle,
  checkInUrl,
  initialAttendedCount,
  onClose,
}: QRModalProps) {
  const [attendedCount, setAttendedCount] = useState(initialAttendedCount);

  useEffect(() => {
    const supabase = createClient();
    const fetchCount = async () => {
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("attended", true);
      setAttendedCount(count ?? 0);
    };

    const interval = setInterval(fetchCount, 3000);
    fetchCount();
    return () => clearInterval(interval);
  }, [eventId]);

  const content = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal-content w-full h-[95vh] sm:h-auto sm:max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        {/* DECA branding header */}
        <div className="flex flex-col items-center gap-1 bg-gradient-to-r from-[#0072CE] to-[#004B87] px-6 py-3 text-center">
          <Image
            src="/deca-logo.png"
            alt="DECA"
            width={48}
            height={49}
            className="h-8 w-auto object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
            sizes="48px"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
            Engage · Scan to check in
          </p>
        </div>

        <div className="p-8">
          {/* QR code with branded border */}
          <div className="mx-auto flex w-64 justify-center rounded-2xl border-4 border-[#0072CE]/30 bg-white p-6 shadow-inner">
            <QRCodeSVG
              value={checkInUrl}
              size={200}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#0072CE"
            />
          </div>

          <h3 className="mt-6 text-center text-lg font-bold text-gray-900">
            {eventTitle}
          </h3>

          {/* Live attendance counter */}
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-50 py-3">
            <Users className="h-5 w-5 text-[#0072CE]" />
            <span className="text-2xl font-bold text-gray-900">
              {attendedCount}
            </span>
            <span className="text-sm text-gray-600">
              checked in
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
