import { useState, type CSSProperties } from "react";
import { BRANDS, BRAND_LIST, type BrandTheme } from "./brands";
import type {
  BrandId,
  GenType,
  GenerateResponse,
  IntroResult,
  DraftResult,
} from "./types";

// ─── Local review-state shapes ──────────────────────────────────────────────────
interface ListItem {
  text: string;
  approved: boolean;
  v: number; // bumped on regenerate to remount the editor
}
interface IntroDoc extends IntroResult {
  approved: boolean;
}
interface DraftDoc extends DraftResult {
  approved: boolean;
}

// ─── Static config ──────────────────────────────────────────────────────────────
const TYPES: ReadonlyArray<{ id: GenType; label: string; hint: string }> = [
  { id: "headlines", label: "Headlines", hint: "5 titles" },
  { id: "topics", label: "Topics", hint: "5 angles" },
  { id: "intro", label: "Intro", hint: "opening para" },
  { id: "draft", label: "Full draft", hint: "post + SEO" },
];

const EXAMPLES: Record<BrandId, ReadonlyArray<string>> = {
  notion: [
    "Keeping a startup's docs organized as the team grows",
    "Switching from a pile of apps to one workspace",
    "Using AI to actually find things in your notes",
    "Building a company wiki people will read",
  ],
  patagonia: [
    "Why we repair gear instead of selling you new",
    "What a warming planet means for winter sport",
    "Buying less, choosing well",
    "A river worth fighting for",
  ],
  duolingo: [
    "How streaks rewire your daily habits",
    "Why mistakes help you learn faster",
    "Five minutes a day, one year later",
    "The science behind spaced repetition",
  ],
};

const META_MAX = 155;

function autosize(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [brandId, setBrandId] = useState<BrandId>("notion");
  const [type, setType] = useState<GenType>("headlines");
  const [topic, setTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [list, setList] = useState<ListItem[] | null>(null);
  const [intro, setIntro] = useState<IntroDoc | null>(null);
  const [draft, setDraft] = useState<DraftDoc | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [regenDoc, setRegenDoc] = useState<boolean>(false);
  const [docV, setDocV] = useState<number>(0);

  const theme = BRANDS[brandId];
  const S = makeStyles(theme);

  const clearOutput = (): void => {
    setList(null);
    setIntro(null);
    setDraft(null);
    setError(null);
  };

  const flash = (key: string): void => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const copy = (key: string, text: string): void => {
    void navigator.clipboard?.writeText(text);
    flash(key);
  };

  type Payload = { topic: string; type: GenType; brand: BrandId; single?: boolean; avoid?: string };
  const callApi = async (payload: Payload): Promise<GenerateResponse> => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as GenerateResponse;
  };

  const generate = async (): Promise<void> => {
    setLoading(true);
    clearOutput();
    try {
      const json = await callApi({ topic: topic.trim(), type, brand: brandId });
      if (!json.ok) throw new Error(json.error);

      if (type === "intro") {
        setIntro({ ...(json.result as IntroResult), approved: false });
      } else if (type === "draft") {
        setDraft({ ...(json.result as DraftResult), approved: false });
      } else {
        const arr = json.result as string[];
        setList(arr.map((text) => ({ text, approved: false, v: 0 })));
      }
      setDocV((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const regenItem = async (i: number): Promise<void> => {
    if (!list) return;
    setBusyIdx(i);
    try {
      const json = await callApi({
        topic: topic.trim(),
        type,
        brand: brandId,
        single: true,
        avoid: list[i].text,
      });
      if (!json.ok) throw new Error(json.error);
      const next = (json.result as string[])[0] ?? list[i].text;
      setList((prev) =>
        prev
          ? prev.map((it, idx) => (idx === i ? { text: next, approved: false, v: it.v + 1 } : it))
          : prev,
      );
    } catch {
      /* keep existing item on failure */
    } finally {
      setBusyIdx(null);
    }
  };

  const regenDocFn = async (): Promise<void> => {
    setRegenDoc(true);
    try {
      const json = await callApi({ topic: topic.trim(), type, brand: brandId });
      if (!json.ok) throw new Error(json.error);
      if (type === "intro") setIntro({ ...(json.result as IntroResult), approved: false });
      if (type === "draft") setDraft({ ...(json.result as DraftResult), approved: false });
      setDocV((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed.");
    } finally {
      setRegenDoc(false);
    }
  };

  const draftMarkdown = (d: DraftDoc): string =>
    `# ${d.headline}\n\n${d.body.join("\n\n")}\n\n---\nMeta description: ${d.metaDescription}\n\nInternal links:\n${d.internalLinks
      .map((l) => `- [${l.anchor}](${l.target})`)
      .join("\n")}`;

  const approvedCount = list ? list.filter((i) => i.approved).length : 0;

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* Header + brand switcher */}
        <header style={S.header}>
          <div style={S.brandRow}>
            <div style={S.logoMark}>{theme.mark}</div>
            <div style={{ flex: 1 }}>
              <div style={S.brandTop}>
                <span style={{ fontWeight: 700 }}>{theme.name}</span>
                <span style={S.dot}>·</span>
                <span style={S.enso}>enso blog agent</span>
              </div>
              <div style={S.tagline}>{theme.tagline}</div>
            </div>
            <label style={S.switcher}>
              <span style={S.switcherLabel}>Brand</span>
              <select
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value as BrandId);
                  clearOutput();
                }}
                style={S.select}
              >
                {BRAND_LIST.map((b: BrandTheme) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {/* Composer */}
        <section style={S.card}>
          <label style={S.label}>What should we write about?</label>
          <textarea
            style={S.textarea}
            value={topic}
            placeholder="e.g. a topic your readers actually care about"
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
          />

          <div style={S.chips}>
            {EXAMPLES[brandId].map((ex) => (
              <button key={ex} style={S.chip} onClick={() => setTopic(ex)}>
                {ex}
              </button>
            ))}
          </div>

          <div style={S.segRow}>
            <div style={S.seg}>
              {TYPES.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => setType(tp.id)}
                  style={{ ...S.segBtn, ...(type === tp.id ? S.segActive : {}) }}
                >
                  <span style={{ fontWeight: 600 }}>{tp.label}</span>
                  <span style={S.segHint}>{tp.hint}</span>
                </button>
              ))}
            </div>
            <button
              style={{ ...S.run, ...(loading ? S.runOff : {}) }}
              onClick={generate}
              disabled={loading}
            >
              {loading ? "Drafting…" : "Generate"}
            </button>
          </div>
        </section>

        {/* Output */}
        <section style={S.output}>
          {error && <div style={S.error}>{error}</div>}

          {loading && (
            <div style={S.skeletonWrap}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="sk" style={{ ...S.sk, width: `${90 - i * 12}%` }} />
              ))}
            </div>
          )}

          {!loading && !error && !list && !intro && !draft && (
            <div style={S.empty}>
              <div style={S.emptyMark}>✺</div>
              <p style={S.emptyText}>
                Pick a format, give it a topic, and the agent drafts content in {theme.name}'s voice — then
                edit, regenerate, or approve each piece before it ships.
              </p>
            </div>
          )}

          {/* List output (headlines / topics) */}
          {list && (
            <div>
              <div style={S.reviewBar}>
                <span>
                  {approvedCount}/{list.length} approved
                </span>
                <button
                  style={S.miniBtn}
                  onClick={() =>
                    copy(
                      "all",
                      list
                        .filter((i) => i.approved)
                        .map((i) => i.text)
                        .join("\n") || list.map((i) => i.text).join("\n"),
                    )
                  }
                >
                  {copied === "all" ? "Copied" : "Copy approved"}
                </button>
              </div>
              <ol style={S.list}>
                {list.map((item, i) => (
                  <li
                    key={`${i}-${item.v}`}
                    className="reveal"
                    style={{
                      ...S.listItem,
                      ...(item.approved ? S.itemApproved : {}),
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <span style={S.num}>{String(i + 1).padStart(2, "0")}</span>
                    <textarea
                      ref={autosize}
                      style={S.itemInput}
                      value={item.text}
                      onChange={(e) =>
                        setList((prev) =>
                          prev ? prev.map((it, idx) => (idx === i ? { ...it, text: e.target.value } : it)) : prev,
                        )
                      }
                      onInput={(e) => autosize(e.currentTarget)}
                      rows={1}
                    />
                    <div style={S.itemActions}>
                      <button
                        title="Regenerate this line"
                        style={S.iconBtn}
                        onClick={() => regenItem(i)}
                        disabled={busyIdx === i}
                      >
                        {busyIdx === i ? "…" : "↻"}
                      </button>
                      <button title="Copy" style={S.iconBtn} onClick={() => copy(`item-${i}`, item.text)}>
                        {copied === `item-${i}` ? "✓" : "⧉"}
                      </button>
                      <button
                        title={item.approved ? "Approved" : "Approve"}
                        style={{ ...S.iconBtn, ...(item.approved ? S.iconApproved : {}) }}
                        onClick={() =>
                          setList((prev) =>
                            prev ? prev.map((it, idx) => (idx === i ? { ...it, approved: !it.approved } : it)) : prev,
                          )
                        }
                      >
                        ✓
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Intro output */}
          {intro && (
            <article
              key={`intro-${docV}`}
              className="reveal"
              style={{ ...S.article, ...(intro.approved ? S.docApproved : {}) }}
            >
              <textarea
                ref={autosize}
                style={S.editTitle}
                value={intro.headline}
                onChange={(e) => setIntro({ ...intro, headline: e.target.value })}
                onInput={(e) => autosize(e.currentTarget)}
                rows={1}
              />
              <textarea
                ref={autosize}
                style={S.editBody}
                value={intro.intro}
                onChange={(e) => setIntro({ ...intro, intro: e.target.value })}
                onInput={(e) => autosize(e.currentTarget)}
                rows={3}
              />
              {docActions(S, {
                regen: regenDocFn,
                regenBusy: regenDoc,
                copied: copied === "intro",
                onCopy: () => copy("intro", `${intro.headline}\n\n${intro.intro}`),
                approved: intro.approved,
                onApprove: () => setIntro({ ...intro, approved: !intro.approved }),
              })}
            </article>
          )}

          {/* Full draft output */}
          {draft && (
            <article
              key={`draft-${docV}`}
              className="reveal"
              style={{ ...S.article, ...(draft.approved ? S.docApproved : {}) }}
            >
              <textarea
                ref={autosize}
                style={S.editTitle}
                value={draft.headline}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                onInput={(e) => autosize(e.currentTarget)}
                rows={1}
              />
              {draft.body.map((p, i) => (
                <textarea
                  key={`p-${i}-${docV}`}
                  ref={autosize}
                  style={S.editBody}
                  value={p}
                  onChange={(e) =>
                    setDraft({ ...draft, body: draft.body.map((q, idx) => (idx === i ? e.target.value : q)) })
                  }
                  onInput={(e) => autosize(e.currentTarget)}
                  rows={2}
                />
              ))}

              <div style={S.seoBlock}>
                <div style={S.seoHead}>
                  <span style={S.seoTitle}>SEO meta description</span>
                  <span
                    style={{
                      ...S.charCount,
                      ...(draft.metaDescription.length > META_MAX ? S.charOver : {}),
                    }}
                  >
                    {draft.metaDescription.length}/{META_MAX}
                  </span>
                </div>
                <textarea
                  ref={autosize}
                  style={S.metaInput}
                  value={draft.metaDescription}
                  onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                  onInput={(e) => autosize(e.currentTarget)}
                  rows={2}
                />

                <div style={S.seoTitle}>Suggested internal links</div>
                {draft.internalLinks.map((l, i) => (
                  <div key={`l-${i}`} style={S.linkRow}>
                    <input
                      style={S.linkAnchor}
                      value={l.anchor}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          internalLinks: draft.internalLinks.map((x, idx) =>
                            idx === i ? { ...x, anchor: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      style={S.linkTarget}
                      value={l.target}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          internalLinks: draft.internalLinks.map((x, idx) =>
                            idx === i ? { ...x, target: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {docActions(S, {
                regen: regenDocFn,
                regenBusy: regenDoc,
                copied: copied === "draft",
                onCopy: () => copy("draft", draftMarkdown(draft)),
                copyLabel: "Copy as Markdown",
                approved: draft.approved,
                onApprove: () => setDraft({ ...draft, approved: !draft.approved }),
              })}
            </article>
          )}
        </section>

        <footer style={S.footer}>enso × {theme.name} · prototype · powered by Claude</footer>
      </div>
    </div>
  );
}

// ─── Doc action bar (shared by intro + draft) ───────────────────────────────────
function docActions(
  S: Record<string, CSSProperties>,
  o: {
    regen: () => void;
    regenBusy: boolean;
    copied: boolean;
    onCopy: () => void;
    copyLabel?: string;
    approved: boolean;
    onApprove: () => void;
  },
): JSX.Element {
  return (
    <div style={S.docBar}>
      <button style={S.miniBtn} onClick={o.regen} disabled={o.regenBusy}>
        {o.regenBusy ? "Regenerating…" : "↻ Regenerate"}
      </button>
      <button style={S.miniBtn} onClick={o.onCopy}>
        {o.copied ? "Copied" : (o.copyLabel ?? "Copy")}
      </button>
      <button
        style={{ ...S.miniBtn, ...(o.approved ? S.miniApproved : {}) }}
        onClick={o.onApprove}
      >
        {o.approved ? "✓ Approved" : "Approve"}
      </button>
    </div>
  );
}

// ─── Brand-aware styles ─────────────────────────────────────────────────────────
function makeStyles(t: BrandTheme): Record<string, CSSProperties> {
  const { ink, paper, line, dot, chipBg, accent, serif, sans } = t;
  return {
    page: {
      minHeight: "100vh",
      background: paper,
      backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`,
      backgroundSize: "22px 22px",
      fontFamily: sans,
      color: ink,
      padding: "40px 16px",
      display: "flex",
      justifyContent: "center",
    },
    shell: { width: "100%", maxWidth: 660 },
    header: { marginBottom: 22 },
    brandRow: { display: "flex", alignItems: "center", gap: 14 },
    logoMark: {
      width: 44, height: 44, borderRadius: 10, background: ink, color: paper,
      display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800,
      fontFamily: serif, flexShrink: 0,
    },
    brandTop: { display: "flex", alignItems: "center", gap: 8, fontSize: 17 },
    dot: { color: "#bdb6a8" },
    enso: { color: "#8a8275", fontSize: 14, letterSpacing: 0.2 },
    tagline: { fontFamily: serif, fontStyle: "italic", color: "#6f6859", fontSize: 15, marginTop: 3 },
    switcher: { display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" },
    switcherLabel: { fontSize: 10.5, color: "#a39b8c", textTransform: "uppercase", letterSpacing: 0.6 },
    select: {
      fontFamily: sans, fontSize: 14, fontWeight: 600, color: ink, background: "#fff",
      border: `1px solid ${line}`, borderRadius: 9, padding: "7px 10px", cursor: "pointer",
    },

    card: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,.03)" },
    label: { fontSize: 13, fontWeight: 600, color: "#6f6859", display: "block", marginBottom: 8 },
    textarea: {
      width: "100%", border: `1px solid ${line}`, borderRadius: 10, padding: "12px 14px",
      fontSize: 16, fontFamily: serif, resize: "none", color: ink, background: "#fff",
      transition: "border-color .15s",
    },
    chips: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 },
    chip: { fontSize: 12.5, color: "#6f6859", background: chipBg, border: `1px solid ${line}`, borderRadius: 99, padding: "5px 11px" },

    segRow: { display: "flex", gap: 10, marginTop: 18, alignItems: "stretch", flexWrap: "wrap" },
    seg: { display: "flex", gap: 6, background: chipBg, padding: 4, borderRadius: 12, flex: 1, minWidth: 260 },
    segBtn: {
      flex: 1, border: "none", background: "transparent", borderRadius: 9, padding: "8px 4px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: "#8a8275",
      transition: "all .15s", minWidth: 56,
    },
    segActive: { background: "#fff", color: ink, boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
    segHint: { fontSize: 10, color: "#a39b8c" },
    run: { background: ink, color: paper, border: "none", borderRadius: 12, padding: "0 26px", fontSize: 15, fontWeight: 600, minHeight: 48, transition: "opacity .15s" },
    runOff: { opacity: 0.55 },

    output: { marginTop: 22 },
    empty: { textAlign: "center", padding: "44px 20px", color: "#a39b8c" },
    emptyMark: { fontSize: 30, marginBottom: 10, color: "#cdc6b8" },
    emptyText: { fontFamily: serif, fontStyle: "italic", fontSize: 15.5, maxWidth: 400, margin: "0 auto", lineHeight: 1.55 },

    skeletonWrap: { display: "flex", flexDirection: "column", gap: 14, padding: "12px 4px" },
    sk: { height: 16, background: "#e9e4da", borderRadius: 6 },

    reviewBar: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "#8a8275", margin: "0 2px 10px" },

    list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
    listItem: {
      display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 12px 12px 14px", borderRadius: 12,
      background: "#fff", border: `1px solid ${line}`, borderLeft: `3px solid ${line}`,
    },
    itemApproved: { borderLeft: `3px solid ${accent}`, background: "#fffdfa" },
    num: { fontFamily: sans, fontSize: 12, color: "#bdb6a8", fontWeight: 700, flexShrink: 0, paddingTop: 6 },
    itemInput: {
      flex: 1, border: "none", background: "transparent", resize: "none", outline: "none",
      fontFamily: serif, fontSize: 17, lineHeight: 1.4, color: ink, padding: "4px 0", overflow: "hidden",
    },
    itemActions: { display: "flex", gap: 4, flexShrink: 0 },
    iconBtn: {
      width: 30, height: 30, borderRadius: 8, border: `1px solid ${line}`, background: "#fff",
      color: "#8a8275", fontSize: 14, display: "grid", placeItems: "center", lineHeight: 1,
    },
    iconApproved: { background: accent, color: "#fff", borderColor: accent },

    article: { background: "#fff", border: `1px solid ${line}`, borderLeft: `3px solid ${line}`, borderRadius: 16, padding: "26px 26px" },
    docApproved: { borderLeft: `3px solid ${accent}` },
    editTitle: {
      width: "100%", border: "none", outline: "none", background: "transparent", resize: "none", overflow: "hidden",
      fontFamily: serif, fontWeight: 700, fontSize: 26, lineHeight: 1.2, color: ink, margin: "0 0 14px", padding: 0,
    },
    editBody: {
      width: "100%", border: "none", outline: "none", background: "transparent", resize: "none", overflow: "hidden",
      fontFamily: serif, fontSize: 18, lineHeight: 1.65, color: "#33312c", margin: "0 0 12px", padding: 0,
    },

    seoBlock: { marginTop: 8, paddingTop: 18, borderTop: `1px solid ${line}` },
    seoHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
    seoTitle: { fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: "#8a8275", textTransform: "uppercase", letterSpacing: 0.6, margin: "14px 0 6px" },
    charCount: { fontSize: 11.5, color: "#a39b8c", fontFamily: sans },
    charOver: { color: "#c8102e", fontWeight: 700 },
    metaInput: {
      width: "100%", border: `1px solid ${line}`, borderRadius: 8, padding: "8px 10px", resize: "none", overflow: "hidden",
      fontFamily: sans, fontSize: 13.5, lineHeight: 1.5, color: ink, background: "#fcfbf9", outline: "none",
    },
    linkRow: { display: "flex", gap: 8, marginBottom: 6 },
    linkAnchor: {
      flex: 1, border: `1px solid ${line}`, borderRadius: 8, padding: "7px 10px",
      fontFamily: sans, fontSize: 13, color: ink, background: "#fff", outline: "none",
    },
    linkTarget: {
      flex: 1, border: `1px solid ${line}`, borderRadius: 8, padding: "7px 10px",
      fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#6f6859", background: "#fcfbf9", outline: "none",
    },

    docBar: { display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${line}`, flexWrap: "wrap" },
    miniBtn: {
      border: `1px solid ${line}`, background: "#fff", color: "#6f6859", borderRadius: 9,
      padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: sans,
    },
    miniApproved: { background: accent, color: "#fff", borderColor: accent },

    error: { background: "#fbecea", border: "1px solid #f0cfc9", color: "#9a3b2e", padding: "12px 16px", borderRadius: 10, fontSize: 14 },
    footer: { textAlign: "center", marginTop: 30, fontSize: 12, color: "#bdb6a8" },
  };
}
