import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────
type GenType = "headlines" | "intro" | "topics";

interface RequestBody {
  topic?: string;
  type?: GenType;
}

interface VercelRequest {
  method?: string;
  body: RequestBody | string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
}

// ─── Brand voice + prompts ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the in-house blog content agent for Notion (notion.so).
Notion is the connected workspace for docs, wikis, projects, and notes — and increasingly an AI-native tool.

VOICE & STYLE:
- Calm, clear, human. Notion writes like a thoughtful person, not a marketing department.
- Plain language over jargon. Short sentences. Confident but never hype-y. No exclamation marks, no "revolutionize," no "unleash."
- Practical and grounded — focused on how people actually work and the small frictions of work life.
- Lightly warm, occasionally a touch of dry wit. Lowercase is fine in product, but blog content uses sentence case.
- Themes Notion owns: taming tool sprawl, building a second brain, team docs/wikis, going from chaos to clarity, AI inside your workspace.
Never mention competitors by name. Never overpromise.`;

function buildPrompt(type: GenType, topic: string): string {
  const t = topic || "a topic of your choice that fits Notion";
  if (type === "headlines") {
    return `Write 5 blog post headlines for Notion about: "${t}".
Vary the angle (how-to, contrarian, story-driven, listicle, question).
Return ONLY a JSON array of 5 strings. No preamble, no markdown.`;
  }
  if (type === "topics") {
    return `Suggest 5 blog post topic ideas for Notion related to: "${t}".
Each should be a short, specific angle worth a full post.
Return ONLY a JSON array of 5 strings. No preamble, no markdown.`;
  }
  return `Write the opening paragraph (the intro) of a Notion blog post about: "${t}".
3–5 sentences. Hook the reader with a real, relatable work moment, then point toward the idea.
Return ONLY a JSON object: {"headline": string, "intro": string}. No markdown, no preamble.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  const body: RequestBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const type: GenType = body.type ?? "headlines";
  const topic: string = (body.topic ?? "").trim();

  if (!["headlines", "intro", "topics"].includes(type)) {
    res.status(400).json({ ok: false, error: "Invalid type" });
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(type, topic) }],
    });

    const text = message.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    const parsed: unknown = JSON.parse(text);
    res.status(200).json({ ok: true, result: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    res.status(500).json({ ok: false, error: msg });
  }
}
