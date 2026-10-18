"use client";
import * as React from "react";
import * as AD from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
};

const ConfirmContext = React.createContext<(o: ConfirmOptions) => void>(() => {});

/** App-wide confirmation dialog. Call `useConfirm()(options)` from any client component. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <ConfirmContext.Provider value={setOpts}>
      {children}
      <AD.Root open={!!opts} onOpenChange={(o) => !o && !busy && setOpts(null)}>
        <AD.Portal>
          <AD.Overlay className="fixed inset-0 z-[60] bg-navy-950/40 backdrop-blur-[2px]" />
          <AD.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-5 shadow-pop">
            <div className="flex gap-4">
              {opts?.destructive && (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <AD.Title className="text-base font-semibold text-navy-900">{opts?.title}</AD.Title>
                <AD.Description asChild>
                  <div className="mt-1.5 text-sm text-muted">{opts?.description}</div>
                </AD.Description>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <AD.Cancel asChild>
                <Button variant="outline" disabled={busy}>Cancel</Button>
              </AD.Cancel>
              <Button
                variant={opts?.destructive ? "destructive" : "default"}
                loading={busy}
                onClick={async () => {
                  if (!opts) return;
                  setBusy(true);
                  try { await opts.onConfirm(); } finally { setBusy(false); setOpts(null); }
                }}
              >
                {opts?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </AD.Content>
        </AD.Portal>
      </AD.Root>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => React.useContext(ConfirmContext);
