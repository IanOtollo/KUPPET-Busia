"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  /** What will happen, in plain words. Mention who is affected and whether it can be undone. */
  description: React.ReactNode;
  confirmLabel?: string;
  /** "danger" for irreversible or member-facing actions. */
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * Mount once (the admin layout does) and call `useConfirm()` anywhere below:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, description }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        // A second prompt while one is open counts as "no" for the first.
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(opts);
      }),
    []
  );

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-2.5 pr-6">
              <AlertTriangle
                className={`h-5 w-5 mt-1 shrink-0 ${
                  options?.tone === "danger" ? "text-[var(--danger)]" : "text-[var(--brass)]"
                }`}
              />
              {options?.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-1">{options?.description}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => settle(false)}>
              Go back
            </Button>
            <Button
              type="button"
              variant={options?.tone === "danger" ? "destructive" : "primary"}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Yes, continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
