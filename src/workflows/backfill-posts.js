import { queuePost } from "./queue-post.js";

export async function backfillPosts({ config, state, wordpress }) {
  const collected = [];
  const targetCount = Math.max(config.backfillPostsPerRun, 1);
  const maxPages = Math.max(config.backfillMaxPages, 1);

  for (let page = 1; page <= maxPages && collected.length < targetCount; page += 1) {
    const posts = await wordpress.fetchPostsPage(page, Math.max(targetCount * 2, 20));
    if (posts.length === 0) {
      break;
    }

    for (const post of posts) {
      if (post.status !== "publish" || state.hasPost(post.id)) {
        continue;
      }

      collected.push(post);
      if (collected.length >= targetCount) {
        break;
      }
    }
  }

  if (collected.length === 0) {
    console.log("No older untracked posts found for backfill.");
    return;
  }

  let queuedPosts = 0;
  let skippedPosts = 0;
  const baseStart = Date.now() + (config.backfillStartDelayHours * 60 * 60 * 1000);

  for (const [index, post] of collected.entries()) {
    const scheduleAnchorDate = new Date(baseStart + (index * config.backfillPostIntervalHours * 60 * 60 * 1000)).toISOString();
    const result = await queuePost({ config, state, post, scheduleAnchorDate });

    if (result.skipped) {
      skippedPosts += 1;
      console.log(`Skipped ${post.id}: ${post.title}`);
      continue;
    }

    if (result.queuedAssets === 0 && result.queuedQueueItems === 0) {
      console.log(`Already queued ${post.id}: ${post.title}`);
      continue;
    }

    queuedPosts += 1;
    console.log(`Backfilled ${post.id}: ${post.title} -> starts ${scheduleAnchorDate}`);
  }

  await state.save();
  console.log(`Backfill complete. Queued ${queuedPosts} posts, skipped ${skippedPosts} non-pinnable posts.`);
}
