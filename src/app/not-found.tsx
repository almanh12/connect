import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center">
        <Link href="/" className="mb-4 inline-flex flex-col items-center gap-1 transition-opacity hover:opacity-90">
          <Image
            src="/deca-logo.png"
            alt="DECA"
            width={48}
            height={49}
            className="h-12 w-auto object-contain"
            sizes="48px"
          />
          <span className="text-sm font-bold text-[#1A1A2E]">Engage</span>
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004B87]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
