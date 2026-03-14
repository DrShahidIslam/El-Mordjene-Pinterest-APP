import { buildKeywordSet, slugify } from "../lib/text.js";
import { enrichVariantsWithCopy } from "../services/pin-copywriter.js";
import { buildPinPlan } from "../services/pin-planner.js";
import { classifyPost } from "../services/classifier.js";

const PLAN_KEYS = ["hero", "list", "guide"];

export async function queuePost({ config, state, post, scheduleAnchorDate }) {
  const classification = classifyPost(post, config.boards);
  const keywordSet = buildKeywordSet(post);

  state.addPost({
    postId: post.id,
    title: post.title,
    url: post.url,
    slug: post.slug,
    language: classification.language,
    boardKey: classification.boardKey,
    boardName: classification.boardName,
    shouldPin: classification.shouldPin,
    contentType: classification.contentType,
    featuredImage: post.featuredImage,
    keywordSet,
    discoveredAt: new Date().toISOString()
  });

  if (!classification.shouldPin) {
    return {
      queuedAssets: 0,
      queuedQueueItems: 0,
      skipped: true
    };
  }

  const missingAssetKeys = PLAN_KEYS.filter((key) => !state.hasAsset(buildAssetId(post.id, key)));
  const missingQueueKeys = PLAN_KEYS.filter((key) => !state.hasQueueItem(buildQueueId(post.id, key)));

  if (missingAssetKeys.length === 0 && missingQueueKeys.length === 0) {
    return {
      queuedAssets: 0,
      queuedQueueItems: 0,
      skipped: false
    };
  }

  const basePlan = buildPinPlan(post, classification, config, { scheduleAnchorDate });
  const plans = missingAssetKeys.length > 0
    ? await enrichVariantsWithCopy(post, classification, basePlan, config)
    : basePlan;
  const plansByKey = new Map(plans.map((plan) => [plan.key, plan]));

  let queuedAssets = 0;
  let queuedQueueItems = 0;

  for (const key of PLAN_KEYS) {
    const plan = plansByKey.get(key);
    if (!plan) {
      continue;
    }

    const assetId = buildAssetId(post.id, key);
    if (!state.hasAsset(assetId)) {
      state.addAsset({
        id: assetId,
        postId: post.id,
        postSlug: slugify(post.slug || post.title),
        postUrl: post.url,
        boardKey: plan.boardKey,
        boardName: plan.boardName,
        variant: plan.key,
        contentType: classification.contentType,
        language: classification.language,
        overlayTitle: plan.overlayTitle,
        overlaySubtitle: plan.overlaySubtitle,
        pinTitle: plan.pinTitle,
        pinDescription: plan.pinDescription,
        primaryKeyword: plan.primaryKeyword,
        supportingKeywords: plan.supportingKeywords,
        searchTags: buildSearchTags(plan, classification),
        featuredImage: post.featuredImage,
        status: "pending_render",
        createdAt: new Date().toISOString(),
        scheduledFor: plan.scheduledFor
      });
      queuedAssets += 1;
    }

    const queueId = buildQueueId(post.id, key);
    if (!state.hasQueueItem(queueId)) {
      state.addQueueItem({
        id: queueId,
        assetId,
        postId: post.id,
        boardName: plan.boardName,
        scheduledFor: plan.scheduledFor,
        status: "draft"
      });
      queuedQueueItems += 1;
    }
  }

  return {
    queuedAssets,
    queuedQueueItems,
    skipped: false
  };
}

function buildAssetId(postId, key) {
  return `${postId}-${key}`;
}

function buildQueueId(postId, key) {
  return `${buildAssetId(postId, key)}-queue`;
}

function buildSearchTags(plan, classification) {
  const seed = [plan.primaryKeyword, ...(plan.supportingKeywords || []), classification.contentType, classification.boardName]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return [...new Set(seed)].slice(0, 8);
}
