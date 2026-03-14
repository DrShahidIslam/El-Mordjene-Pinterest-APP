import path from "node:path";

const DEFAULT_BOARDS = {
  recipes_en: "Recipes",
  recipes_fr: "Recettes",
  spreads_en: "Spreads",
  spreads_fr: "Pates a tartiner",
  sweets_trends: "Sweets & Trends"
};

export function loadConfig() {
  const siteUrl = required("SITE_URL");

  return {
    siteUrl,
    wpUsername: required("WP_USERNAME"),
    wpAppPassword: required("WP_APP_PASSWORD"),
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
    geminiTextModel: process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.0-flash",
    lookbackHours: numberFromEnv("LOOKBACK_HOURS", 48),
    postsPerRun: numberFromEnv("POSTS_PER_RUN", 6),
    renderBatchSize: numberFromEnv("RENDER_BATCH_SIZE", 9),
    publishBatchSize: numberFromEnv("PUBLISH_BATCH_SIZE", 9),
    assetsDir: path.resolve(process.env.ASSETS_DIR?.trim() || "data/assets"),
    exportsDir: path.resolve(process.env.EXPORTS_DIR?.trim() || "data/exports"),
    statePath: path.resolve(process.env.STATE_PATH?.trim() || "data/state.json"),
    queueSpacingDays: {
      first: numberFromEnv("PIN_DAY_1", 0),
      second: numberFromEnv("PIN_DAY_2", 2),
      third: numberFromEnv("PIN_DAY_3", 7)
    },
    boards: {
      recipes_en: process.env.BOARD_RECIPES_EN?.trim() || DEFAULT_BOARDS.recipes_en,
      recipes_fr: process.env.BOARD_RECIPES_FR?.trim() || DEFAULT_BOARDS.recipes_fr,
      spreads_en: process.env.BOARD_SPREADS_EN?.trim() || DEFAULT_BOARDS.spreads_en,
      spreads_fr: process.env.BOARD_SPREADS_FR?.trim() || DEFAULT_BOARDS.spreads_fr,
      sweets_trends: process.env.BOARD_SWEETS_TRENDS?.trim() || DEFAULT_BOARDS.sweets_trends
    }
  };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberFromEnv(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
