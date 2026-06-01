import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

//placeholder
export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Coming Soon"
        description={`The ${title} section is under development. Stay tuned!`}
      />
    </div>
  );
}
