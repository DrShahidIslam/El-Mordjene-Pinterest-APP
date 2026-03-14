import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml, wrapText } from "../templates/svg-text.js";

const THEMES = {
  recipe: {
    background: ["#fff0e1", "#ffc98f", "#d87439"],
    hero: "#6c2f12",
    panel: "#fff3e2",
    panelText: "#5d2f15",
    accent: "#9b471d",
    badge: "EASY RECIPE"
  },
  spread: {
    background: ["#f7ead8", "#d8b07b", "#7f4a22"],
    hero: "#4a2817",
    panel: "#f4e4d1",
    panelText: "#4a2c1c",
    accent: "#74401f",
    badge: "SPREAD INSPO"
  },
  trend: {
    background: ["#fff3e8", "#f0c29d", "#cb6e45"],
    hero: "#6a2d1d",
    panel: "#fff0e4",
    panelText: "#5c3426",
    accent: "#aa4b2c",
    badge: "TRENDING SWEET"
  }
};

const VARIANT_LABELS = {
  hero: "Hero Pin",
  list: "Saveable Summary",
  guide: "Quick Guide"
};

export async function renderAsset(asset, config) {
  const theme = THEMES[asset.contentType] || THEMES.trend;
  const fileName = `${asset.postSlug}-${asset.variant}.png`;
  const outputPath = path.join(config.assetsDir, fileName);
  const base = sharp({
    create: {
      width: 1000,
      height: 1500,
      channels: 4,
      background: theme.background[0]
    }
  });

  const composites = [];
  const visualBuffer = await loadImageBuffer(asset.imageSourceUrl || asset.featuredImage);

  if (visualBuffer) {
    composites.push({
      input: await sharp(visualBuffer)
        .resize(1000, 1500, { fit: "cover", position: "attention" })
        .blur(2)
        .modulate({ saturation: 1.05, brightness: 0.95 })
        .png()
        .toBuffer(),
      top: 0,
      left: 0
    });

    composites.push({
      input: Buffer.from(`<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1500" fill="rgba(42,25,16,0.32)"/></svg>`),
      top: 0,
      left: 0
    });

    composites.push({
      input: await sharp(visualBuffer)
        .resize(840, 640, { fit: "cover", position: "attention" })
        .modulate({ saturation: 1.08, brightness: 1.02 })
        .png()
        .toBuffer(),
      top: 108,
      left: 80
    });
  } else {
    composites.push({
      input: Buffer.from(`<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.background[0]}"/><stop offset="45%" stop-color="${theme.background[1]}"/><stop offset="100%" stop-color="${theme.background[2]}"/></linearGradient></defs><rect width="1000" height="1500" fill="url(#bg)"/></svg>`),
      top: 0,
      left: 0
    });
  }

  const svg = buildOverlaySvg(asset, theme, Boolean(visualBuffer));
  composites.push({ input: Buffer.from(svg), top: 0, left: 0 });

  await fs.mkdir(config.assetsDir, { recursive: true });
  await base.composite(composites).png().toFile(outputPath);
  return outputPath;
}

function buildOverlaySvg(asset, theme, hasPhoto) {
  const titleLines = wrapText(asset.overlayTitle, 18, 4);
  const subtitleLines = wrapText(asset.overlaySubtitle, 28, 3);
  const keywordLabel = wrapText(toDisplayCase(asset.primaryKeyword || asset.overlayTitle), 24, 2);
  const footerTags = wrapText((asset.searchTags || []).slice(0, 3).join("  •  "), 54, 2);
  const variantLabel = VARIANT_LABELS[asset.variant] || "Pinterest Pin";

  const titleSvg = titleLines
    .map((line, index) => {
      const y = hasPhoto ? 870 + index * 86 : 330 + index * 90;
      const fill = hasPhoto ? theme.hero : "#fff8f1";
      return `<text x="100" y="${y}" font-size="72" font-family="Georgia, serif" fill="${fill}" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => {
      const y = 1160 + index * 52;
      return `<text x="110" y="${y}" font-size="42" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const keywordSvg = keywordLabel
    .map((line, index) => `<text x="130" y="${160 + index * 34}" font-size="28" font-family="Arial, sans-serif" fill="#fff7ef" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  const tagSvg = footerTags
    .map((line, index) => `<text x="110" y="${1412 + index * 28}" font-size="22" font-family="Arial, sans-serif" fill="#896756">${escapeHtml(line)}</text>`)
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <rect x="48" y="48" width="904" height="1404" rx="36" fill="#fffaf5" opacity="0.96"/>
      <rect x="80" y="80" width="840" height="640" rx="34" fill="${hasPhoto ? "rgba(255,250,245,0.04)" : theme.hero}"/>
      ${hasPhoto ? `<rect x="80" y="80" width="840" height="640" rx="34" fill="rgba(64,32,18,0.22)"/>` : `<circle cx="770" cy="220" r="170" fill="#ffffff" opacity="0.10"/><circle cx="250" cy="560" r="120" fill="#ffffff" opacity="0.08"/>`}
      <rect x="108" y="108" width="320" height="96" rx="28" fill="${theme.accent}" opacity="0.95"/>
      ${keywordSvg}
      <text x="890" y="128" text-anchor="end" font-size="24" font-family="Arial, sans-serif" fill="#fef1e5" font-weight="700">${escapeHtml(variantLabel)}</text>
      <text x="890" y="158" text-anchor="end" font-size="24" font-family="Arial, sans-serif" fill="#f8ddca" font-weight="700">${escapeHtml(theme.badge)}</text>
      <rect x="84" y="760" width="832" height="420" rx="34" fill="${theme.panel}" opacity="0.98"/>
      <rect x="110" y="1088" width="780" height="156" rx="28" fill="#fff8f1" opacity="0.86"/>
      ${titleSvg}
      ${subtitleSvg}
      <rect x="110" y="1288" width="780" height="88" rx="44" fill="${theme.accent}"/>
      <text x="500" y="1343" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" fill="#fff8f0" font-weight="700">Read more on el-mordjene.info</text>
      <text x="110" y="1380" font-size="26" font-family="Arial, sans-serif" fill="#6f4d39">${escapeHtml(asset.boardName.toUpperCase())}</text>
      ${tagSvg}
    </svg>
  `;
}

async function loadImageBuffer(url) {
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function toDisplayCase(value) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
