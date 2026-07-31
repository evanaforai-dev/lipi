import { useState } from "react";
import type { CheckId } from "../../shared/types";
import type { ScreenView } from "../screenViewModel";
import { ArrowRightIcon, ChevronIcon, RevealIcon } from "./icons";

// Screen-first triage as a quiet tree: screen → problem type → layers. Pure "what & where" —
// the fix lives once in Design System, reached via "See the fix". Density grows with problem
// TYPES, not issue volume, so it stays calm at 150+ issues.
export function ScreensView({
  views,
  openId,
  onToggleScreen,
  onReveal,
  onPreviewScreen,
  onSeeFix,
}: {
  views: ScreenView[];
  openId: string | null;
  onToggleScreen: (screenId: string) => void;
  onReveal: (checkId: CheckId, nodeIds: string[]) => void;
  onPreviewScreen: (screenId: string) => void;
  onSeeFix: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div style={styles.list}>
      {views.map((screen) => {
        const open = openId === screen.screenId;
        return (
          <section
            key={screen.screenId}
            className={`lpt-card${open ? " is-open" : ""}`}
            style={styles.card}
          >
            <div style={styles.head}>
              <button
                style={styles.headToggle}
                onClick={() => onToggleScreen(screen.screenId)}
                title={open ? "Collapse" : "Show findings"}
              >
                <span style={styles.headText}>
                  <span style={styles.name}>{screen.screenName}</span>
                  {!open && <span style={styles.summary}>{screen.typeSummary}</span>}
                </span>
                <span style={styles.count}>
                  {screen.findingCount} finding{screen.findingCount === 1 ? "" : "s"}
                </span>
                <ChevronIcon
                  size={14}
                  className="lpt-chevron"
                  style={{ opacity: 0.45, transform: open ? "rotate(90deg)" : "none" }}
                />
              </button>
              <button
                className="lpt-btn lpt-btn-ghost lpt-btn-sm lpt-row-action"
                onClick={() => onPreviewScreen(screen.screenId)}
                title="Zoom to this screen on the canvas"
              >
                Preview
              </button>
            </div>

            {open && (
              <div className="lpt-reveal" style={styles.groups}>
                {screen.groups.map((group) => {
                  const gkey = `${screen.screenId}:${group.checkId}`;
                  const collapsible = group.layers.length > 2;
                  const showLayers = !collapsible || openGroups.has(gkey);
                  return (
                    <div key={group.checkId} style={styles.group}>
                      <div style={styles.groupHead}>
                        {collapsible ? (
                          <button style={styles.groupToggle} onClick={() => toggleGroup(gkey)}>
                            <span style={styles.groupLabel}>{group.label}</span>
                            <span style={styles.groupCount}>({group.layers.length})</span>
                            <ChevronIcon
                              size={13}
                              className="lpt-chevron"
                              style={{
                                opacity: 0.4,
                                marginLeft: 2,
                                transform: showLayers ? "rotate(90deg)" : "none",
                              }}
                            />
                          </button>
                        ) : (
                          <span style={styles.groupToggle}>
                            <span style={styles.groupLabel}>{group.label}</span>
                            <span style={styles.groupCount}>({group.layers.length})</span>
                          </span>
                        )}
                        <button
                          className="lpt-reveal-link"
                          onClick={() => onReveal(group.checkId, group.nodeIds)}
                          title={`Reveal all ${group.layers.length} on the canvas`}
                        >
                          <RevealIcon size={13} />
                          <span>Reveal</span>
                        </button>
                      </div>

                      {showLayers && (
                        <>
                          <div style={styles.layers}>
                            {group.layers.map(({ issue, name, detail }) => (
                              <div key={issue.id} style={styles.layer}>
                                <span style={styles.layerName} title={name}>
                                  {name}
                                </span>
                                {detail && <span style={styles.layerDetail}>{detail}</span>}
                                <button
                                  className="lpt-reveal-link"
                                  onClick={() => onReveal(issue.checkId, [issue.nodeId])}
                                >
                                  <RevealIcon size={13} />
                                  <span>Reveal</span>
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Connection to the system view — the fix lives there, once. */}
                          <button style={styles.seeFix} onClick={onSeeFix}>
                            <span>See the fix</span>
                            <ArrowRightIcon size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "16px 16px 12px",
    borderRadius: 8,
    background: "var(--figma-color-bg-secondary, #f7f7f7)",
  },
  head: { display: "flex", alignItems: "center", gap: 8, width: "100%" },
  headToggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  headText: { display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 },
  name: {
    fontSize: 15,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  summary: {
    fontSize: 11,
    opacity: 0.55,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  count: { fontSize: 12, opacity: 0.55, flex: "0 0 auto" },
  chevron: { fontSize: 15, opacity: 0.4, flex: "0 0 auto", width: 10, textAlign: "center" },

  // Level 2 — problem groups
  groups: { display: "flex", flexDirection: "column", gap: 16 },
  group: { display: "flex", flexDirection: "column", gap: 4 },
  groupHead: { display: "flex", alignItems: "center", gap: 8 },
  groupToggle: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  groupLabel: { fontSize: 13, fontWeight: 600 },
  groupCount: { fontSize: 12, opacity: 0.5 },
  groupChevron: { fontSize: 13, opacity: 0.4, marginLeft: 2 },

  // Level 3 — layers
  layers: { display: "flex", flexDirection: "column", marginTop: 4, paddingLeft: 2 },
  layer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
    borderTop: "1px solid var(--figma-color-border, #ececec)",
  },
  layerName: {
    fontSize: 12,
    fontWeight: 500,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  layerDetail: {
    fontSize: 11,
    color: "var(--figma-color-text-secondary, #7a7a7a)",
    fontVariantNumeric: "tabular-nums",
    flex: "0 0 auto",
  },
  seeFix: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--figma-color-text-brand, #0d99ff)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
};
