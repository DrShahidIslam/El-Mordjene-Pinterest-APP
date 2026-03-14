import { renderAsset } from "../services/asset-renderer.js";

export async function renderPendingAssets({ config, state }) {
  const assets = state.getPendingAssets(config.renderBatchSize);
  if (assets.length === 0) {
    console.log("No pending assets to render.");
    return;
  }

  for (const asset of assets) {
    const outputPath = await renderAsset(asset, config);
    asset.outputPath = outputPath;
    asset.status = "rendered";
    asset.renderedAt = new Date().toISOString();
    console.log(`Rendered ${asset.id} -> ${outputPath}`);
  }

  await state.save();
}
