import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card min-h-64 shadow-none">
      <CardContent className="flex h-full flex-col items-start gap-4 p-7">
        <Badge className="bg-accent text-accent-foreground hover:bg-accent px-3 py-1">
          {title}
        </Badge>
        <p className="text-muted-foreground max-w-lg text-sm">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
