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
  const fileName = `${asset.postSlug}-${asset.variant}.webp`;
  const hasFeaturedImage = Boolean(asset.imageSourceUrl || asset.featuredImage);
  const quality = hasFeaturedImage ? 68 : 74;
  const effort = 6;
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
        .webp({ quality: 70, effort: 5 })
        .toBuffer(),
      top: 0,
      left: 0
    });

    composites.push({
      input: Buffer.from(`<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1500" fill="rgba(42,25,16,0.04)"/></svg>`),
      top: 0,
      left: 0
    });

    composites.push({
      input: await sharp(visualBuffer)
        .resize(740, 520, { fit: "cover", position: "attention" })
        .modulate({ saturation: 1.08, brightness: 1.02 })
        .webp({ quality: 70, effort: 5 })
        .toBuffer(),
      top: 180,
      left: 130
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
  await base.composite(composites).webp({ quality, effort }).toFile(outputPath);
  return outputPath;
}

function buildOverlaySvg(asset, theme, hasPhoto) {
  if (asset.variant === "list") {
    return buildListOverlay(asset, theme, hasPhoto);
  }

  if (asset.variant === "guide") {
    return buildGuideOverlay(asset, theme, hasPhoto);
  }

  return buildHeroOverlay(asset, theme, hasPhoto);
}

function buildHeroOverlay(asset, theme, hasPhoto) {
  const titleLines = wrapText(asset.overlayTitle, 22, 3);
  const subtitleLines = wrapText(asset.overlaySubtitle, 28, 2);
  const keywordLabel = wrapText(toDisplayCase(asset.primaryKeyword || asset.overlayTitle), 16, 1);

  const titleSvg = titleLines
    .map((line, index) => {
      const y = hasPhoto ? 780 + index * 60 : 330 + index * 90;
      const fill = hasPhoto ? theme.hero : "#fff8f1";
      return `<text x="170" y="${y}" font-size="56" font-family="Georgia, serif" fill="${fill}" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => {
      const y = 930 + index * 30;
      return `<text x="170" y="${y}" font-size="26" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">${escapeHtml(line)}</text>`;
    })
    .join("");

  const keywordSvg = keywordLabel
    .map((line, index) => `<text x="170" y="${206 + index * 26}" font-size="20" font-family="Arial, sans-serif" fill="#fff7ef" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <rect x="100" y="140" width="800" height="1040" rx="32" fill="#fffaf5" opacity="0.72"/>
      <rect x="130" y="180" width="740" height="520" rx="28" fill="${hasPhoto ? "rgba(255,250,245,0.01)" : theme.hero}"/>
      ${hasPhoto ? `<rect x="130" y="180" width="740" height="520" rx="28" fill="rgba(64,32,18,0.01)"/>` : `<circle cx="770" cy="220" r="170" fill="#ffffff" opacity="0.10"/><circle cx="250" cy="560" r="120" fill="#ffffff" opacity="0.08"/>`}
      <rect x="140" y="170" width="260" height="58" rx="20" fill="${theme.accent}" opacity="0.92"/>
      ${keywordSvg}
      <rect x="130" y="720" width="740" height="280" rx="28" fill="${theme.panel}" opacity="0.75"/>
      ${titleSvg}
      ${subtitleSvg}
      <rect x="170" y="1060" width="660" height="52" rx="26" fill="${theme.accent}"/>
      <text x="500" y="1094" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" fill="#fff8f0" font-weight="700">Read more on el-mordjene.info</text>
    </svg>
  `;
}

function buildListOverlay(asset, theme, hasPhoto) {
  const titleLines = wrapText(asset.overlayTitle, 20, 3);
  const subtitleLines = wrapText(asset.overlaySubtitle, 26, 3);
  const keywordLabel = wrapText(toDisplayCase(asset.primaryKeyword || asset.overlayTitle), 14, 1);

  const titleSvg = titleLines
    .map((line, index) => `<text x="130" y="${330 + index * 62}" font-size="52" font-family="Georgia, serif" fill="${theme.hero}" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => `<text x="130" y="${540 + index * 34}" font-size="24" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  const keywordSvg = keywordLabel
    .map((line, index) => `<text x="145" y="${242 + index * 24}" font-size="18" font-family="Arial, sans-serif" fill="#fffaf2" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <rect x="70" y="130" width="860" height="1180" rx="36" fill="#fffaf6" opacity="0.78"/>
      <rect x="100" y="180" width="430" height="1080" rx="30" fill="${theme.panel}" opacity="0.92"/>
      <rect x="560" y="180" width="330" height="540" rx="28" fill="${hasPhoto ? "rgba(255,250,245,0.02)" : theme.hero}"/>
      ${hasPhoto ? `<rect x="560" y="180" width="330" height="540" rx="28" fill="rgba(64,32,18,0.04)"/>` : `<circle cx="740" cy="320" r="120" fill="#ffffff" opacity="0.12"/>`}
      <rect x="120" y="210" width="210" height="50" rx="18" fill="${theme.accent}" opacity="0.95"/>
      ${keywordSvg}
      ${titleSvg}
      ${subtitleSvg}
      <rect x="120" y="1120" width="360" height="60" rx="30" fill="${theme.accent}"/>
      <text x="300" y="1158" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#fff8f0" font-weight="700">Save for later</text>
      <rect x="560" y="780" width="330" height="430" rx="28" fill="${theme.panel}" opacity="0.85"/>
      <text x="725" y="840" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">Read more</text>
      <text x="725" y="875" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="${theme.panelText}">el-mordjene.info</text>
    </svg>
  `;
}

function buildGuideOverlay(asset, theme, hasPhoto) {
  const titleLines = wrapText(asset.overlayTitle, 24, 3);
  const subtitleLines = wrapText(asset.overlaySubtitle, 30, 2);
  const keywordLabel = wrapText(toDisplayCase(asset.primaryKeyword || asset.overlayTitle), 16, 1);

  const titleSvg = titleLines
    .map((line, index) => `<text x="500" y="${520 + index * 64}" text-anchor="middle" font-size="56" font-family="Georgia, serif" fill="${theme.hero}" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => `<text x="500" y="${980 + index * 32}" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="${theme.panelText}" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  const keywordSvg = keywordLabel
    .map((line, index) => `<text x="500" y="${252 + index * 26}" text-anchor="middle" font-size="20" font-family="Arial, sans-serif" fill="#fffaf2" font-weight="700">${escapeHtml(line)}</text>`)
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <rect x="100" y="120" width="800" height="1200" rx="40" fill="#fffaf6" opacity="0.75"/>
      <rect x="140" y="170" width="720" height="80" rx="24" fill="${theme.accent}" opacity="0.95"/>
      ${keywordSvg}
      <rect x="160" y="320" width="680" height="520" rx="36" fill="${hasPhoto ? "rgba(255,250,245,0.02)" : theme.hero}"/>
      ${hasPhoto ? `<rect x="160" y="320" width="680" height="520" rx="36" fill="rgba(64,32,18,0.05)"/>` : `<circle cx="700" cy="420" r="130" fill="#ffffff" opacity="0.10"/><circle cx="320" cy="700" r="110" fill="#ffffff" opacity="0.08"/>`}
      ${titleSvg}
      <rect x="170" y="900" width="660" height="150" rx="30" fill="${theme.panel}" opacity="0.9"/>
      ${subtitleSvg}
      <rect x="230" y="1120" width="540" height="64" rx="32" fill="${theme.accent}"/>
      <text x="500" y="1160" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#fff8f0" font-weight="700">Read the full guide</text>
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




























