# Pinterest RSS Feed Plan

Generated: 2026-03-14

## Current reality on the site

Your WordPress categories are not yet cleanly separated by language and board intent.
That means Pinterest RSS can work, but the best results will come after a small taxonomy cleanup.

## Current usable feeds

Recipes / mixed recipe feed
- https://el-mordjene.info/category/recipes-recettes/feed/
- Category name: Recipes
- Slug: recipes-recettes
- Count: 35

Recettes / French recipe feed
- https://el-mordjene.info/category/recipes-recettes-fr/feed/
- Category name: Recettes
- Slug: recipes-recettes-fr
- Count: 4

Spreads / English spreads feed
- https://el-mordjene.info/category/spreads/feed/
- Category name: Spreads
- Slug: spreads
- Count: 2

Trends feed
- https://el-mordjene.info/category/trends/feed/
- Category name: Trends
- Slug: trends
- Count: 13

Sweets feed
- https://el-mordjene.info/category/sweets/feed/
- Category name: Sweets
- Slug: sweets
- Count: 1

## Recommended Pinterest board mapping right now

Recipes
- temporary feed: https://el-mordjene.info/category/recipes-recettes/feed/
- warning: this feed is mixed and may include content that also belongs in French recipe flows

Recettes
- feed: https://el-mordjene.info/category/recipes-recettes-fr/feed/

Spreads
- feed: https://el-mordjene.info/category/spreads/feed/

Pates a tartiner
- no dedicated category feed exists yet
- this should be created in WordPress before enabling a clean French spreads board feed

Sweets & Trends
- primary feed: https://el-mordjene.info/category/trends/feed/
- optional secondary feed: https://el-mordjene.info/category/sweets/feed/

## Best cleanup to make the system fully hands-off

1. Create a dedicated English Recipes category with a clean slug like `recipes`
2. Keep `recipes-recettes-fr` only for French recipe content
3. Create a dedicated French spreads category with a slug like `pates-a-tartiner`
4. Keep `spreads` only for English spread content
5. Keep `trends` for trend/news-like visual posts
6. Keep `sweets` for evergreen desserts that are not strictly recipes or spreads

## After taxonomy cleanup, the ideal Pinterest RSS mapping becomes

Recipes
- https://el-mordjene.info/category/recipes/feed/

Recettes
- https://el-mordjene.info/category/recipes-recettes-fr/feed/

Spreads
- https://el-mordjene.info/category/spreads/feed/

Pates a tartiner
- https://el-mordjene.info/category/pates-a-tartiner/feed/

Sweets & Trends
- https://el-mordjene.info/category/trends/feed/
- optionally also connect sweets separately if Pinterest allows a second board-specific feed workflow in your account

## Operational recommendation

Until taxonomy is cleaned up:
- use RSS for `Recettes`, `Spreads`, and `Sweets & Trends`
- do not fully trust RSS for the mixed English `Recipes` board yet
- do not enable `Pates a tartiner` through RSS until the missing category/feed exists

## Why this matters

Pinterest RSS automation works best when each board is fed by one clean topical feed.
If a feed mixes languages or intents, Pinterest can still ingest it, but board quality and click relevance will suffer.
