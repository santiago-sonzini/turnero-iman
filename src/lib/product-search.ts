// Lightweight, dependency-free fuzzy product search used by the invoice
// product pickers. Accent-insensitive, multi-token, ranked by relevance, with
// light subsequence matching for typo/abbreviation tolerance.

export interface SearchableProduct {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  catalog?: string | null;
}

export type SearchMode = "slug" | "name";

export const normalizeText = (str?: string | null): string =>
  (str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[ ​-‍﻿]/g, "") // zero-width / nbsp
    .replace(/\s+/g, " ")
    .trim();

// Is `needle` a subsequence of `haystack`? (e.g. "trm" → "termo")
const isSubsequence = (needle: string, haystack: string): boolean => {
  if (!needle) return false;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
};

function scoreProduct(
  p: SearchableProduct,
  query: string,
  mode: SearchMode,
): number {
  const q = normalizeText(query);
  if (!q) return 0;

  const name = normalizeText(p.name);
  const slug = normalizeText(p.slug);
  const category = normalizeText(p.category);
  const catalog = normalizeText(p.catalog);

  if (mode === "slug") {
    if (slug === q) return 1000;
    if (slug.startsWith(q)) return 800;
    if (slug.includes(q)) return 600;
    if (isSubsequence(q, slug)) return 200;
    return 0;
  }

  // name mode → multi-token search across all fields
  const words = q.split(" ").filter(Boolean);
  const haystacks = [name, category, slug, catalog];

  // Every typed word must match somewhere, otherwise the product is excluded.
  const allWordsMatch = words.every(
    (w) => haystacks.some((h) => h.includes(w)) || isSubsequence(w, name),
  );
  if (!allWordsMatch) return 0;

  let score = 0;
  if (name === q) score += 1000;
  else if (name.startsWith(q)) score += 700;
  else if (name.includes(q)) score += 500;

  for (const w of words) {
    if (name.startsWith(w)) score += 120;
    else if (name.includes(w)) score += 80;
    else if (slug.includes(w)) score += 40;
    else if (category.includes(w)) score += 30;
    else if (catalog.includes(w)) score += 20;
    else if (isSubsequence(w, name)) score += 10;
  }

  if (slug.includes(q)) score += 60;
  if (category.includes(q)) score += 40;

  // Tie-breaker: slightly favour shorter (more specific) names.
  score += Math.max(0, 30 - name.length) * 0.1;

  return score;
}

export function searchProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  mode: SearchMode = "name",
  limit = 50,
): T[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];

  return products
    .map((p) => ({ p, s: scoreProduct(p, query, mode) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}
