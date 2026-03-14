import { clampText } from "../lib/text.js";

export async function resolveImageSource(asset, config) {
  const queries = buildQueries(asset);
  const candidates = [];

  if (asset.featuredImage) {
    candidates.push({
      provider: "featured",
      url: asset.featuredImage,
      score: 100,
      attribution: "site"
    });
  }

  const shouldSearchStockFirst = config.imageSourceMode === "stock-first";

  if (shouldSearchStockFirst) {
    const stockCandidates = await findStockCandidates(queries, config);
    candidates.unshift(...stockCandidates);
  } else {
    const stockCandidates = await findStockCandidates(queries, config);
    candidates.push(...stockCandidates);
  }

  const best = candidates
    .filter((candidate) => Boolean(candidate.url))
    .sort((a, b) => b.score - a.score)[0];

  return best || null;
}

async function findStockCandidates(queries, config) {
  const candidates = [];

  if (config.pexelsApiKey) {
    for (const query of queries) {
      const candidate = await searchPexels(query, config.pexelsApiKey);
      if (candidate) {
        candidates.push(candidate);
        break;
      }
    }
  }

  if (config.pixabayApiKey) {
    for (const query of queries) {
      const candidate = await searchPixabay(query, config.pixabayApiKey);
      if (candidate) {
        candidates.push(candidate);
        break;
      }
    }
  }

  return candidates;
}

function buildQueries(asset) {
  const seeds = [
    asset.primaryKeyword,
    ...(asset.searchTags || []),
    asset.pinTitle,
    asset.boardName,
    asset.contentType === "spread" ? (asset.language === "fr" ? "pate a tartiner" : "chocolate spread") : "",
    asset.contentType === "recipe" ? (asset.language === "fr" ? "food recipe" : "food recipe") : "",
    asset.contentType === "trend" ? "dessert food" : ""
  ].filter(Boolean);

  const cleaned = [];
  for (const seed of seeds) {
    const value = clampText(String(seed).replace(/[|]/g, " ").trim(), 60);
    if (value && !cleaned.includes(value)) {
      cleaned.push(value);
    }
  }

  return cleaned.slice(0, 6);
}

async function searchPexels(query, apiKey) {
  try {
    const endpoint = new URL("https://api.pexels.com/v1/search");
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("per_page", "10");
    endpoint.searchParams.set("orientation", "portrait");

    const response = await fetch(endpoint, {
      headers: {
        Authorization: apiKey
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const photo = photos.find((item) => item.src?.large2x || item.src?.portrait || item.src?.large);
    if (!photo) {
      return null;
    }

    return {
      provider: "pexels",
      url: photo.src.large2x || photo.src.portrait || photo.src.large,
      score: 88,
      attribution: `Pexels / ${photo.photographer || "unknown"}`,
      sourcePage: photo.url || ""
    };
  } catch {
    return null;
  }
}

async function searchPixabay(query, apiKey) {
  try {
    const endpoint = new URL("https://pixabay.com/api/");
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("image_type", "photo");
    endpoint.searchParams.set("orientation", "vertical");
    endpoint.searchParams.set("per_page", "10");
    endpoint.searchParams.set("safesearch", "true");

    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const hits = Array.isArray(data.hits) ? data.hits : [];
    const hit = hits.find((item) => item.largeImageURL || item.webformatURL);
    if (!hit) {
      return null;
    }

    return {
      provider: "pixabay",
      url: hit.largeImageURL || hit.webformatURL,
      score: 82,
      attribution: `Pixabay / ${hit.user || "unknown"}`,
      sourcePage: hit.pageURL || ""
    };
  } catch {
    return null;
  }
}
