export function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clampText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

export function extractHeadingsFromHtml(html) {
  const matches = String(html || "").match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/gims) || [];
  return matches.map((match) => stripHtml(match)).filter(Boolean).slice(0, 8);
}

export function extractListItemsFromHtml(html) {
  const matches = String(html || "").match(/<li[^>]*>(.*?)<\/li>/gims) || [];
  return matches.map((match) => stripHtml(match)).filter(Boolean).slice(0, 8);
}
