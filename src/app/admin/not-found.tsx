import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Card>
      <EmptyState icon={FileQuestion} title="Not found" description="The item you were looking for doesn't exist or was deleted."
        action={<Link href="/admin" className={buttonClasses("outline")}>Back to dashboard</Link>} />
    </Card>
  );
}
