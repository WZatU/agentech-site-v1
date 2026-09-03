import { ComingSoonRobot } from "@/components/coming-soon-robot";

type PlaceholderPageProps = {
  title: string;
  headline?: string;
  description?: string;
  compact?: boolean;
};

export function PlaceholderPage({
  title,
  headline,
  description,
  compact = false
}: PlaceholderPageProps) {
  return (
    <ComingSoonRobot
      eyebrow={title}
      title={headline}
      description={description}
      compact={compact}
    />
  );
}
