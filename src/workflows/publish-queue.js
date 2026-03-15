import { exportPublishBatch } from "../services/exporter.js";

export async function publishDueQueue({ config, state, wordpress }) {
  const dueItems = state.getDueQueueItems(config.publishBatchSize);
  if (dueItems.length === 0) {
    console.log("No due queue items to publish.");
    return { exportedCount: 0, dueCount: 0 };
  }

  const rows = [];
  const groupedByPost = new Map();

  for (const item of dueItems) {
    const asset = state.getAsset(item.assetId);
    if (!asset || asset.status !== "rendered" || !asset.outputPath) {
      continue;
    }

    if (!asset.mediaUrl) {
      const media = await wordpress.uploadMedia(asset.outputPath, asset.pinTitle);
      asset.mediaId = media.id;
      asset.mediaUrl = media.url;
      asset.uploadedAt = new Date().toISOString();
    }

    rows.push({
      title: asset.pinTitle,
      description: asset.pinDescription,
      link: asset.postUrl,
      board: asset.boardName,
      imageUrl: asset.mediaUrl,
      scheduledFor: item.scheduledFor,
      variant: asset.variant,
      contentType: asset.contentType,
      language: asset.language,
      primaryKeyword: asset.primaryKeyword,
      searchTags: asset.searchTags || []
    });

    if (!groupedByPost.has(asset.postId)) {
      groupedByPost.set(asset.postId, []);
    }
    groupedByPost.get(asset.postId).push(asset);

    item.status = "exported";
    item.exportedAt = new Date().toISOString();
    asset.status = "ready_to_publish";
  }

  if (rows.length === 0) {
    console.log("No rendered assets were ready for export.");
    return { exportedCount: 0, dueCount: dueItems.length };
  }

  for (const [postId, assets] of groupedByPost.entries()) {
    const primaryAsset = assets[0];
    await wordpress.appendPinterestGallery(postId, primaryAsset.postUrl, assets);
    for (const asset of assets) {
      asset.galleryInjectedAt = new Date().toISOString();
      asset.status = "rss_ready";
    }
  }

  const files = await exportPublishBatch(rows, config);
  for (const item of dueItems) {
    if (item.status === "exported") {
      item.exportCsv = files.csvPath;
      item.exportJson = files.jsonPath;
      item.rssReady = true;
    }
  }

  await state.save();
  console.log(`Exported ${rows.length} due pins and injected post galleries -> ${files.csvPath}`);
  return { exportedCount: rows.length, dueCount: dueItems.length };
}
