import type { BrandId } from "./types";

export interface BrandTheme {
  id: BrandId;
  name: string;
  mark: string;
  tagline: string;
  ink: string;
  paper: string;
  line: string;
  dot: string;
  chipBg: string;
  accent: string; // approve/active accent
  serif: string; // content font
  sans: string; // UI font
}

export const BRANDS: Record<BrandId, BrandTheme> = {
  notion: {
    id: "notion",
    name: "Notion",
    mark: "N",
    tagline: "Drafts on-brand posts so your workspace writes itself.",
    ink: "#191918",
    paper: "#fbfaf8",
    line: "#e8e4dc",
    dot: "#ece8df",
    chipBg: "#f4f1ea",
    accent: "#191918",
    serif: "'Lora', Georgia, serif",
    sans: "'Inter', system-ui, sans-serif",
  },
  patagonia: {
    id: "patagonia",
    name: "Patagonia",
    mark: "P",
    tagline: "Stories for people who'd rather be outside.",
    ink: "#0b2742",
    paper: "#f4f1ea",
    line: "#ddd4c4",
    dot: "#e7ddcd",
    chipBg: "#ece2d2",
    accent: "#c8102e",
    serif: "Georgia, 'Times New Roman', serif",
    sans: "'Inter', system-ui, sans-serif",
  },
  duolingo: {
    id: "duolingo",
    name: "Duolingo",
    mark: "D",
    tagline: "Lessons that stick — and the streak to prove it.",
    ink: "#3c3c3c",
    paper: "#fffef9",
    line: "#e6e6e6",
    dot: "#e9f6d8",
    chipBg: "#eaf6d9",
    accent: "#58cc02",
    serif: "'Nunito', system-ui, sans-serif",
    sans: "'Nunito', system-ui, sans-serif",
  },
};

export const BRAND_LIST: ReadonlyArray<BrandTheme> = Object.values(BRANDS);
