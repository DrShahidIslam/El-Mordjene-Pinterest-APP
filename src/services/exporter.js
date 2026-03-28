import fs from "node:fs/promises";
import path from "node:path";

export async function exportPublishBatch(rows, config) {
  await fs.mkdir(config.exportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join(config.exportsDir, `pinterest-batch-${stamp}.csv`);
  const jsonPath = path.join(config.exportsDir, `pinterest-batch-${stamp}.json`);
  const header = ["Title", "Description", "Link", "Pinterest board", "Media URL", "Publish date", "Keywords"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push([
      csv(row.title),
      csv(row.description),
      csv(row.link),
      csv(row.board),
      csv(row.imageUrl),
      csv(row.scheduledFor),
      csv((row.searchTags || []).join(" | "))
    ].join(","));
  }

  await fs.writeFile(csvPath, `${lines.join("\n")}\n`, "utf8");
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf8");
  return { csvPath, jsonPath };
}

function csv(value) {
  const text = String(value || "").replaceAll('"', '""');
  return `"${text}"`;
}

