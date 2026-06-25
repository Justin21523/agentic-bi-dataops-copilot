type Props = { children: string };

export function DatasetBadge({ children }: Props) {
  return <span className="badge">{children}</span>;
}
