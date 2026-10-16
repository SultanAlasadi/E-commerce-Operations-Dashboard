"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState retry={reset} />;
}
