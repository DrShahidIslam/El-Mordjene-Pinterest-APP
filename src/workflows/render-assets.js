import { renderAsset } from "../services/asset-renderer.js";
import { resolveImageSource } from "../services/image-source.js";

export async function renderPendingAssets({ config, state }) {
  const assets = state.getPendingAssets(config.renderBatchSize);
  if (assets.length === 0) {
    console.log("No pending assets to render.");
    return;
  }

  for (const asset of assets) {
    if (!asset.imageSourceUrl) {
      const imageSource = await resolveImageSource(asset, config);
      if (imageSource) {
        asset.imageSourceUrl = imageSource.url;
        asset.imageSourceProvider = imageSource.provider;
        asset.imageSourceAttribution = imageSource.attribution || "";
        asset.imageSourcePage = imageSource.sourcePage || "";
      }
    }

    const outputPath = await renderAsset(asset, config);
    asset.outputPath = outputPath;
    asset.status = "rendered";
    asset.renderedAt = new Date().toISOString();
    console.log(`Rendered ${asset.id} -> ${outputPath}`);
  }

  await state.save();
}
