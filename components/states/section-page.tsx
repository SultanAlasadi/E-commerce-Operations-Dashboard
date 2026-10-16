import { EmptyState } from "@/components/states/empty-state";

export function SectionPage({
  heading,
  title,
  description,
}: {
  heading: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
        <p className="text-muted-foreground mt-3 text-sm">{description}</p>
      </div>
      <EmptyState title={title} description={description} />
    </div>
  );
}
