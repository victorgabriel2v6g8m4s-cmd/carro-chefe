import { statusLabels } from "@carro-chefe/ui";
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status status--${status}`}>{statusLabels[status] ?? status}</span>;
}
