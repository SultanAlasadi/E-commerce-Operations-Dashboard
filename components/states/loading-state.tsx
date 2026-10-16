import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card className="bg-card min-h-64 shadow-none">
        <CardContent className="space-y-5 p-7">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
        </CardContent>
      </Card>
    </div>
  );
}
