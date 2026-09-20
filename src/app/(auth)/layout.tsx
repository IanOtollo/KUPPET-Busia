import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1.05fr_1fr] bg-[var(--canvas)]">
      {/* Left Brand Panel (Desktop) & Mobile Header Strip (<1024px) */}
      <div className="bg-[var(--union)] text-white flex flex-col justify-between p-6 sm:p-8 lg:p-16 h-auto min-h-[128px] lg:min-h-screen lg:h-screen lg:sticky lg:top-0">
        {/* Top brand header */}
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="KUPPET Logo" width={68} height={68} className="rounded-[var(--r-md)] bg-white object-contain p-1 select-none shrink-0" />
          <div>
            <Link
              href="/"
              className="text-[13px] font-semibold tracking-[0.1em] text-white uppercase block"
            >
              KUPPET BUSIA BRANCH
            </Link>
            <span className="text-[11.5px] text-white/70 block">
              Official Members & Administration Portal
            </span>
          </div>
        </div>

        {/* Center narrative (hidden on small mobile header, visible on desktop/tablet) */}
        <div className="hidden lg:block max-w-[460px] my-auto py-8">
          <h1 className="font-serif text-[44px] font-bold leading-[1.1] text-white mb-6">
            Serving the teachers of Busia County.
          </h1>
          <p className="text-[17px] leading-[1.6] text-white/75 mb-8">
            A secure digital platform for post-primary education union members to file welfare claims, report workplace concerns confidentially, and access branch assets.
          </p>

          <div className="w-12 h-[2px] bg-[var(--brass)] mb-6" />

          <ul className="space-y-3.5">
            <li className="flex items-center gap-3 text-[15px] text-white/90">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span>Bereavement support (Mother, Father, Spouse, Child)</span>
            </li>
            <li className="flex items-center gap-3 text-[15px] text-white/90">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span>Safe, confidential workplace harassment reporting</span>
            </li>
            <li className="flex items-center gap-3 text-[15px] text-white/90">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span>Transparent union bus reservation</span>
            </li>
          </ul>
        </div>

        {/* Pinned Bottom */}
        <div className="hidden lg:block text-[12.5px] text-white/55 pt-4">
          © 2026 KUPPET Busia Branch. Kenya Union of Post Primary Education Teachers.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-y-auto relative">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 lg:hidden">
           <Link href="/" className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1.5 transition-colors font-medium">
             Back to Home
           </Link>
        </div>
        <div className="w-full max-w-[420px] bg-[var(--surface)] lg:border lg:border-[var(--line)] lg:rounded-[var(--r-lg)] p-6 sm:p-8 lg:shadow-[var(--shadow-hair)]">
          {children}
        </div>
      </div>
    </div>
  );
}

