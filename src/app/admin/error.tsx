"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <EmptyState icon={AlertTriangle} title="Something went wrong" description={<>This page failed to load. {error.digest && <span className="block mt-1 text-xs">Reference: {error.digest}</span>}</>}
        action={<Button onClick={reset}>Try again</Button>} />
    </Card>
  );
}
