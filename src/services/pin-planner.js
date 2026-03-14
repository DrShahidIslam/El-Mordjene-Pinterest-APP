import { clampText, extractHeadingsFromHtml, extractListItemsFromHtml } from "../lib/text.js";

export function buildPinPlan(post, classification, config) {
  const headings = extractHeadingsFromHtml(post.contentHtml);
  const listItems = extractListItemsFromHtml(post.contentHtml);
  const firstHeading = headings[0] || post.excerpt || post.title;
  const listLead = listItems[0] || headings[1] || firstHeading;
  const guideLead = headings[2] || post.excerpt || firstHeading;

  const variants = [
    {
      key: "hero",
      overlayTitle: clampText(post.title, 56),
      overlaySubtitle: clampText(firstHeading, 70),
      pinTitle: clampText(post.title, 100),
      pinDescription: clampText(`${post.title}. Read the full article for steps, tips, and details.`, 320)
    },
    {
      key: "list",
      overlayTitle: buildListTitle(post, classification),
      overlaySubtitle: clampText(listLead, 70),
      pinTitle: clampText(`${buildListTitle(post, classification)} | ${post.title}`, 100),
      pinDescription: clampText(`Save this summary pin for ${post.title.toLowerCase()}.`, 320)
    },
    {
      key: "guide",
      overlayTitle: buildGuideTitle(post, classification),
      overlaySubtitle: clampText(guideLead, 70),
      pinTitle: clampText(`${buildGuideTitle(post, classification)} | ${post.title}`, 100),
      pinDescription: clampText(`Quick tips and extra context for ${post.title.toLowerCase()}.`, 320)
    }
  ];

  return variants.map((variant, index) => ({
    ...variant,
    boardKey: classification.boardKey,
    boardName: classification.boardName,
    scheduledFor: scheduleDate(post.date, index, config),
    sourcePostId: post.id
  }));
}

function buildListTitle(post, classification) {
  if (classification.contentType === "recipe") {
    return post.language === "fr" ? "Ingredients et etapes" : "Ingredients to make it";
  }

  if (classification.contentType === "spread") {
    return post.language === "fr" ? "Ce qu il faut savoir" : "What to know first";
  }

  return post.language === "fr" ? "Pourquoi tout le monde en parle" : "Why everyone is saving this";
}

function buildGuideTitle(post, classification) {
  if (classification.contentType === "recipe") {
    return post.language === "fr" ? "Conseils pour bien la reussir" : "Tips to get it right";
  }

  if (classification.contentType === "spread") {
    return post.language === "fr" ? "Texture gout et astuces" : "Texture taste and tips";
  }

  return post.language === "fr" ? "A retenir avant de cliquer" : "Before you click through";
}

function scheduleDate(postDate, index, config) {
  const offsets = [
    config.queueSpacingDays.first,
    config.queueSpacingDays.second,
    config.queueSpacingDays.third
  ];
  const date = new Date(postDate);
  date.setUTCDate(date.getUTCDate() + (offsets[index] || 0));
  return date.toISOString();
}
