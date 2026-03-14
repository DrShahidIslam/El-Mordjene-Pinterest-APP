import { classifyPost } from "../services/classifier.js";
import { buildPinPlan } from "../services/pin-planner.js";
import { enrichVariantsWithCopy } from "../services/pin-copywriter.js";
import { buildKeywordSet, slugify } from "../lib/text.js";

export async function discoverPosts({ config, state, wordpress }) {
  const posts = await wordpress.fetchRecentPosts();
  const cutoff = Date.now() - config.lookbackHours * 60 * 60 * 1000;

  const eligiblePosts = posts
    .filter((post) => post.status === "publish")
    .filter((post) => new Date(post.date).getTime() >= cutoff)
    .filter((post) => !state.hasPost(post.id))
    .slice(0, config.postsPerRun);

  if (eligiblePosts.length === 0) {
    console.log("No new posts discovered.");
    return;
  }

  for (const post of eligiblePosts) {
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
      console.log(`Skipped ${post.id}: ${post.title}`);
      continue;
    }

    const basePlan = buildPinPlan(post, classification, config);
    const plannedPins = await enrichVariantsWithCopy(post, classification, basePlan, config);

    for (const plan of plannedPins) {
      const assetId = `${post.id}-${plan.key}`;
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

      state.addQueueItem({
        id: `${assetId}-queue`,
        assetId,
        postId: post.id,
        boardName: plan.boardName,
        scheduledFor: plan.scheduledFor,
        status: "draft"
      });
    }

    console.log(`Queued 3 pins for ${post.id}: ${post.title}`);
  }

  await state.save();
}

function buildSearchTags(plan, classification) {
  const seed = [plan.primaryKeyword, ...(plan.supportingKeywords || []), classification.contentType, classification.boardName]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return [...new Set(seed)].slice(0, 8);
}
