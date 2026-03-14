import { clampText } from "../lib/text.js";

export async function enrichVariantsWithCopy(post, classification, variants, config) {
  if (!config.geminiApiKey) {
    return variants;
  }

  try {
    const prompt = [
      "You create Pinterest pin copy for a food and sweets website.",
      "Return valid JSON only.",
      "Return an object with a variants array of exactly 3 items.",
      "Each item must have overlayTitle, overlaySubtitle, pinTitle, pinDescription.",
      "No hashtags.",
      "Overlay title max 56 characters.",
      "Overlay subtitle max 70 characters.",
      "Pin title max 100 characters.",
      "Pin description max 320 characters.",
      `Post title: ${post.title}`,
      `Language: ${post.language}`,
      `Board: ${classification.boardName}`,
      `Content type: ${classification.contentType}`,
      `Excerpt: ${post.excerpt || "N/A"}`,
      `Existing variants: ${JSON.stringify(variants)}`
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiTextModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text || "{}");
    const generated = Array.isArray(parsed.variants) ? parsed.variants : [];

    return variants.map((variant, index) => {
      const item = generated[index] || {};
      return {
        ...variant,
        overlayTitle: clampText(item.overlayTitle || variant.overlayTitle, 56),
        overlaySubtitle: clampText(item.overlaySubtitle || variant.overlaySubtitle, 70),
        pinTitle: clampText(item.pinTitle || variant.pinTitle, 100),
        pinDescription: clampText(item.pinDescription || variant.pinDescription, 320)
      };
    });
  } catch {
    return variants;
  }
}
