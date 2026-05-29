export type BrandId = "notion" | "patagonia" | "duolingo";

export type GenType = "headlines" | "intro" | "topics" | "draft";

export interface IntroResult {
  headline: string;
  intro: string;
}

export interface InternalLink {
  anchor: string;
  target: string;
}

export interface DraftResult {
  headline: string;
  body: string[];
  metaDescription: string;
  internalLinks: InternalLink[];
}

export type GenerateResult = string[] | IntroResult | DraftResult;

export type GenerateResponse =
  | { ok: true; result: GenerateResult }
  | { ok: false; error: string };
