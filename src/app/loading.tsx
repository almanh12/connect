import Image from "next/image";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
      <Image
        src="/deca-logo.png"
        alt="DECA"
        width={64}
        height={65}
        className="h-14 w-auto object-contain"
        sizes="64px"
      />
      <span className="text-base font-bold text-[#1A1A2E]">Engage</span>
      <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#0072CE]" />
      </div>
    </div>
  );
}
