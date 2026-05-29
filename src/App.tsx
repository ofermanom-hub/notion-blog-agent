import { useState, type CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type GenType = "headlines" | "intro" | "topics";

type ListOutput = { type: "headlines" | "topics"; data: string[] };
type IntroOutput = { type: "intro"; data: { headline: string; intro: string } };
type Output = ListOutput | IntroOutput;

type GenerateResponse =
  | { ok: true; result: string[] | { headline: string; intro: string } }
  | { ok: false; error: string };

// ─── Static config ────────────────────────────────────────────────────────────
const TYPES: ReadonlyArray<{ id: GenType; label: string; hint: string }> = [
  { id: "headlines", label: "Headlines", hint: "5 post titles" },
  { id: "intro", label: "Post intro", hint: "opening paragraph" },
  { id: "topics", label: "Topic ideas", hint: "5 angles to explore" },
];

const EXAMPLES: ReadonlyArray<string> = [
  "How small teams keep their docs from turning into chaos",
  "Switching from a pile of apps to one workspace",
  "Using AI to actually find things in your notes",
  "Building a company wiki people will read",
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [type, setType] = useState<GenType>("headlines");
  const [topic, setTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), type }),
      });
      const json = (await res.json()) as GenerateResponse;
      if (!json.ok) throw new Error(json.error);

      if (type === "intro") {
        const r = json.result as { headline: string; intro: string };
        setOutput({ type: "intro", data: r });
      } else {
        setOutput({ type, data: json.result as string[] });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.header}>
          <div style={S.brandRow}>
            <div style={S.logoMark}>N</div>
            <div>
              <div style={S.brandTop}>
                <span style={{ fontWeight: 600 }}>Notion</span>
                <span style={S.dot}>·</span>
                <span style={S.enso}>enso blog agent</span>
              </div>
              <div style={S.tagline}>Drafts on-brand posts so your workspace writes itself.</div>
            </div>
          </div>
        </header>

        <section style={S.card}>
          <label style={S.label}>What should we write about?</label>
          <textarea
            style={S.textarea}
            value={topic}
            placeholder="e.g. keeping a startup's docs organized as the team grows"
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
          />

          <div style={S.chips}>
            {EXAMPLES.map((ex) => (
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
                  <span style={{ fontWeight: 500 }}>{tp.label}</span>
                  <span style={S.segHint}>{tp.hint}</span>
                </button>
              ))}
            </div>
            <button
              style={{ ...S.run, ...(loading ? S.runOff : {}) }}
              onClick={run}
              disabled={loading}
            >
              {loading ? "Drafting…" : "Generate"}
            </button>
          </div>
        </section>

        <section style={S.output}>
          {error && <div style={S.error}>{error}</div>}

          {loading && (
            <div style={S.skeletonWrap}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="sk" style={{ ...S.sk, width: `${90 - i * 12}%` }} />
              ))}
            </div>
          )}

          {!loading && !output && !error && (
            <div style={S.empty}>
              <div style={S.emptyMark}>✺</div>
              <p style={S.emptyText}>
                Pick a format, give it a topic, and the agent drafts content in Notion's voice.
              </p>
            </div>
          )}

          {output && output.type !== "intro" && (
            <ol style={S.list}>
              {output.data.map((item, i) => (
                <li
                  key={i}
                  className="reveal"
                  style={{ ...S.listItem, animationDelay: `${i * 60}ms` }}
                >
                  <span style={S.num}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          )}

          {output && output.type === "intro" && (
            <article className="reveal" style={S.article}>
              <h2 style={S.postTitle}>{output.data.headline}</h2>
              <p style={S.postIntro}>{output.data.intro}</p>
              <div style={S.byline}>Drafted by the enso agent · review before publishing</div>
            </article>
          )}
        </section>

        <footer style={S.footer}>enso × Notion · prototype · powered by Claude</footer>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ink = "#191918";
const paper = "#fbfaf8";
const line = "#e8e4dc";

const S: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: paper,
    backgroundImage: "radial-gradient(#ece8df 1px, transparent 1px)",
    backgroundSize: "22px 22px",
    fontFamily: "Inter, sans-serif",
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
    display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700,
    fontFamily: "Lora, serif", flexShrink: 0,
  },
  brandTop: { display: "flex", alignItems: "center", gap: 8, fontSize: 17 },
  dot: { color: "#bdb6a8" },
  enso: { color: "#8a8275", fontSize: 14, letterSpacing: 0.2 },
  tagline: { fontFamily: "Lora, serif", fontStyle: "italic", color: "#6f6859", fontSize: 15, marginTop: 3 },

  card: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,.03)" },
  label: { fontSize: 13, fontWeight: 500, color: "#6f6859", display: "block", marginBottom: 8 },
  textarea: {
    width: "100%", border: `1px solid ${line}`, borderRadius: 10, padding: "12px 14px",
    fontSize: 16, fontFamily: "Lora, serif", resize: "none", color: ink, background: "#fff",
    transition: "border-color .15s",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 },
  chip: { fontSize: 12.5, color: "#6f6859", background: "#f4f1ea", border: `1px solid ${line}`, borderRadius: 99, padding: "5px 11px" },

  segRow: { display: "flex", gap: 10, marginTop: 18, alignItems: "stretch", flexWrap: "wrap" },
  seg: { display: "flex", gap: 6, background: "#f4f1ea", padding: 4, borderRadius: 12, flex: 1, minWidth: 240 },
  segBtn: {
    flex: 1, border: "none", background: "transparent", borderRadius: 9, padding: "8px 6px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: "#8a8275",
    transition: "all .15s",
  },
  segActive: { background: "#fff", color: ink, boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  segHint: { fontSize: 10.5, color: "#a39b8c" },
  run: { background: ink, color: paper, border: "none", borderRadius: 12, padding: "0 26px", fontSize: 15, fontWeight: 500, minHeight: 48, transition: "opacity .15s" },
  runOff: { opacity: 0.55 },

  output: { marginTop: 22 },
  empty: { textAlign: "center", padding: "44px 20px", color: "#a39b8c" },
  emptyMark: { fontSize: 30, marginBottom: 10, color: "#cdc6b8" },
  emptyText: { fontFamily: "Lora, serif", fontStyle: "italic", fontSize: 15.5, maxWidth: 360, margin: "0 auto" },

  skeletonWrap: { display: "flex", flexDirection: "column", gap: 14, padding: "12px 4px" },
  sk: { height: 16, background: "#e9e4da", borderRadius: 6 },

  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 },
  listItem: {
    display: "flex", gap: 14, alignItems: "baseline", padding: "14px 16px", borderRadius: 12,
    background: "#fff", border: `1px solid ${line}`, fontSize: 17, fontFamily: "Lora, serif",
    lineHeight: 1.4, marginBottom: 8,
  },
  num: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "#bdb6a8", fontWeight: 600, flexShrink: 0 },

  article: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: "32px 30px" },
  postTitle: { fontFamily: "Lora, serif", fontWeight: 600, fontSize: 27, lineHeight: 1.2, margin: "0 0 16px" },
  postIntro: { fontFamily: "Lora, serif", fontSize: 18, lineHeight: 1.65, color: "#33312c", margin: 0 },
  byline: { marginTop: 22, paddingTop: 16, borderTop: `1px solid ${line}`, fontSize: 12.5, color: "#a39b8c" },

  error: { background: "#fbecea", border: "1px solid #f0cfc9", color: "#9a3b2e", padding: "12px 16px", borderRadius: 10, fontSize: 14 },
  footer: { textAlign: "center", marginTop: 30, fontSize: 12, color: "#bdb6a8" },
};
