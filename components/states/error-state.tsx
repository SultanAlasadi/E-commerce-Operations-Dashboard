"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";

export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <EmptyState
      title="Online error"
      description="Could not load this page. Saved data is unchanged."
      action={
        <Button onClick={retry}>
          <RotateCcw aria-hidden="true" /> Retry
        </Button>
      }
    />
  );
}
