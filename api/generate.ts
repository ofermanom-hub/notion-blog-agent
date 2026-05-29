import Anthropic from "@anthropic-ai/sdk";
import { BRANDS, buildSystemPrompt, isBrandId, type BrandId } from "./brands.js";

// ─── Types ────────────────────────────────────────────────────────────────────
type GenType = "headlines" | "intro" | "topics" | "draft";

interface RequestBody {
  topic?: string;
  type?: GenType;
  brand?: BrandId;
  single?: boolean; // regenerate one list item
  avoid?: string; // the item being replaced, to vary against
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

const VALID_TYPES: ReadonlyArray<GenType> = ["headlines", "intro", "topics", "draft"];

function buildPrompt(type: GenType, topic: string, brandName: string, opts: { single: boolean; avoid: string }): string {
  const t = topic || `a topic of your choice that fits ${brandName}`;

  if (type === "headlines" || type === "topics") {
    const noun = type === "headlines" ? "blog post headlines" : "blog post topic ideas";
    if (opts.single) {
      return `Write 1 alternative ${type === "headlines" ? "blog post headline" : "blog post topic idea"} for ${brandName} about: "${t}".
It must be clearly different in angle from this one: "${opts.avoid}".
Return ONLY a JSON array containing a single string. No preamble, no markdown.`;
    }
    const extra =
      type === "headlines"
        ? "Vary the angle (how-to, contrarian, story-driven, listicle, question)."
        : "Each should be a short, specific angle worth a full post.";
    return `Write 5 ${noun} for ${brandName} about: "${t}".
${extra}
Return ONLY a JSON array of 5 strings. No preamble, no markdown.`;
  }

  if (type === "draft") {
    return `Write a complete short blog post for ${brandName} about: "${t}".
Then produce SEO metadata for it.
Return ONLY a JSON object, no markdown, with this exact shape:
{
  "headline": string,
  "body": string[],            // 4-6 paragraphs, each a string
  "metaDescription": string,   // <= 155 characters, compelling, on-brand
  "internalLinks": [           // exactly 3 suggested internal links
    { "anchor": string, "target": string }  // target is a slug like "/blog/some-post"
  ]
}
No preamble, no markdown fences.`;
  }

  // intro
  return `Write the opening paragraph (the intro) of a ${brandName} blog post about: "${t}".
3-5 sentences. Hook the reader with a real, relatable moment, then point toward the idea.
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
  const brandId: BrandId = isBrandId(body.brand) ? body.brand : "notion";
  const single = Boolean(body.single);
  const avoid = (body.avoid ?? "").trim();

  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({ ok: false, error: "Invalid type" });
    return;
  }

  const brand = BRANDS[brandId];
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: buildSystemPrompt(brand),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildPrompt(type, topic, brand.name, { single, avoid }) }],
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
