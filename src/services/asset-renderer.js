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
  const titleLines = wrapText(asset.overlayTitle, 18, 4);
  const subtitleLines = wrapText(asset.overlaySubtitle, 28, 3);

  const titleSvg = titleLines
    .map((line, index) => {
      const y = 280 + index * 90;
      return `<text x="108" y="${y}" font-size="74" font-family="Georgia, serif" fill="#fff8f1" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => {
      const y = 860 + index * 58;
      return `<text x="108" y="${y}" font-size="46" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const svg = `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.background[0]}"/>
          <stop offset="45%" stop-color="${theme.background[1]}"/>
          <stop offset="100%" stop-color="${theme.background[2]}"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="1500" fill="url(#bg)"/>
      <rect x="48" y="48" width="904" height="1404" rx="34" fill="#fffaf5" opacity="0.95"/>
      <rect x="86" y="86" width="828" height="628" rx="34" fill="${theme.hero}"/>
      <circle cx="770" cy="220" r="170" fill="#ffffff" opacity="0.10"/>
      <circle cx="250" cy="560" r="120" fill="#ffffff" opacity="0.08"/>
      <rect x="108" y="124" width="270" height="58" rx="29" fill="#fff4ea" opacity="0.94"/>
      <text x="243" y="162" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="${theme.hero}" font-weight="700">${escapeHtml(theme.badge)}</text>
      <text x="892" y="162" text-anchor="end" font-size="26" font-family="Arial, sans-serif" fill="#fbe7d3" font-weight="700">${escapeHtml(VARIANT_LABELS[asset.variant] || "Pinterest Pin")}</text>
      ${titleSvg}
      <rect x="108" y="780" width="784" height="248" rx="30" fill="${theme.panel}"/>
      ${subtitleSvg}
      <rect x="108" y="1164" width="784" height="118" rx="59" fill="${theme.accent}"/>
      <text x="500" y="1237" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" fill="#fff8f0" font-weight="700">Read more on el-mordjene.info</text>
      <text x="108" y="1356" font-size="27" font-family="Arial, sans-serif" fill="#6f4d39">${escapeHtml(asset.boardName.toUpperCase())}</text>
      <text x="108" y="1402" font-size="24" font-family="Arial, sans-serif" fill="#866452">${escapeHtml(asset.pinTitle)}</text>
    </svg>
  `;

  await fs.mkdir(config.assetsDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}
