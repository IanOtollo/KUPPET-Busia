"use client";

import { useState } from "react";
import { Phone, Mail, ChevronRight, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface OfficialProps {
  _id: string;
  fullName: string;
  position: string;
  responsibilities: string;
  portfolioArea?: string;
  phone?: string;
  email?: string;
  photoUrl?: string | null;
  tier: "executive" | "official" | "subcounty";
}

export function OfficialCard({ official }: { official: OfficialProps }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-hair)] flex flex-col justify-between min-h-[220px]">
        <div>
          {/* Larger official portrait, with a clear default when no photo is set. */}
          <div className="mb-4">
            {official.photoUrl ? (
              <img
                src={official.photoUrl}
                alt={official.fullName}
                className="h-24 w-24 rounded-full border-2 border-[var(--brass)]/50 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--brass)]/40 bg-[var(--surface-sunk)] text-[var(--union)]" aria-label={`${official.fullName} profile placeholder`}>
                <UserRound className="h-11 w-11 stroke-[1.5]" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Name & Position */}
          <h3 className="font-serif text-[19px] font-semibold text-[var(--ink)] leading-tight mb-1">
            {official.fullName}
          </h3>
          <p className="text-[13px] font-semibold tracking-[0.06em] text-[var(--union)] uppercase mb-4">
            {official.position}
          </p>

          <div className="h-px bg-[var(--line)] w-full mb-4" />

          {/* Responsibilities with 3-line clamp */}
          <p className="text-[14px] leading-[1.6] text-[var(--ink-muted)] line-clamp-3 mb-2">
            {official.responsibilities}
          </p>

          {official.responsibilities.length > 140 && (
            <button
              onClick={() => setShowModal(true)}
              className="text-[12.5px] font-medium text-[var(--union)] hover:underline inline-flex items-center gap-0.5 mb-4 cursor-pointer"
            >
              Read full mandate <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Contact Links */}
        <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center gap-4 text-[13px] text-[var(--ink-body)] mt-auto">
          {official.phone && (
            <a
              href={`tel:${official.phone}`}
              className="flex items-center gap-1.5 hover:text-[var(--union)]"
              title={`Call ${official.fullName}`}
            >
              <Phone className="h-4 w-4 text-[var(--ink-muted)] shrink-0" />
              <span>{official.phone}</span>
            </a>
          )}
          {official.email && (
            <a
              href={`mailto:${official.email}`}
              className="flex items-center gap-1.5 hover:text-[var(--union)]"
              title={`Email ${official.fullName}`}
            >
              <Mail className="h-4 w-4 text-[var(--ink-muted)] shrink-0" />
              <span>{official.email}</span>
            </a>
          )}
        </div>
      </div>

      {/* Full portfolio responsibilities dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <span className="eyebrow block mb-1">{official.position}</span>
            <DialogTitle>{official.fullName}</DialogTitle>
            {official.portfolioArea && (
              <DialogDescription className="text-[13px] text-[var(--brass)] font-medium">
                Portfolio: {official.portfolioArea}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-2 text-[15px] leading-[1.65] text-[var(--ink-body)]">
            <h4 className="text-[13.5px] uppercase font-semibold text-[var(--ink-muted)] tracking-wider mb-2">
              Official Responsibilities & Portfolio:
            </h4>
            <p className="whitespace-pre-line">{official.responsibilities}</p>
          </div>

          <div className="pt-4 border-t border-[var(--line)] flex gap-4 text-[13.5px]">
            {official.phone && (
              <a
                href={`tel:${official.phone}`}
                className="flex items-center gap-1.5 text-[var(--union)] font-medium"
              >
                <Phone className="h-4 w-4" /> {official.phone}
              </a>
            )}
            {official.email && (
              <a
                href={`mailto:${official.email}`}
                className="flex items-center gap-1.5 text-[var(--union)] font-medium"
              >
                <Mail className="h-4 w-4" /> {official.email}
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

