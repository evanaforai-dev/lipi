import type { ScanDiff } from "../../shared/types";

// Verification is supporting information — one quiet line answering "did it get better?"
export function DiffBanner({ diff }: { diff: ScanDiff }) {
  const parts: string[] = [];
  if (diff.resolved > 0) parts.push(`${diff.resolved} fixed`);
  if (diff.new > 0) parts.push(`${diff.new} new`);
  const text = parts.length > 0 ? `${parts.join(" · ")} since last check` : "No change since last check";
  return <p style={styles.line}>{text}</p>;
}

const styles: Record<string, React.CSSProperties> = {
  line: { fontSize: 11, opacity: 0.55, margin: "0 8px 10px", padding: 0 },
};
