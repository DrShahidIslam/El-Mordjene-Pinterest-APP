<?php
/**
 * Plugin Name: Pinterest Autopilot Feed
 * Description: Exposes custom RSS feeds with one item per Pinterest pin variant injected by the autopilot app.
 * Version: 1.1.4
 * Author: El Mordjene
 */

if (!defined('ABSPATH')) {
  exit;
}

const PAF_FEED_SLUG = 'pinterest-autopilot';
const PAF_FEED_PATH_BASE = 'pinterest-feed';
const PAF_ALLOWED_CATEGORIES = ['recipes', 'recettes', 'spreads', 'pates-a-tartiner', 'trends'];

add_action('init', function () {
  add_feed(PAF_FEED_SLUG, 'paf_render_feed');
  add_rewrite_rule('^' . PAF_FEED_PATH_BASE . '/?$', 'index.php?feed=' . PAF_FEED_SLUG, 'top');
  paf_register_category_feeds();
});

register_activation_hook(__FILE__, function () {
  add_feed(PAF_FEED_SLUG, 'paf_render_feed');
  add_rewrite_rule('^' . PAF_FEED_PATH_BASE . '/?$', 'index.php?feed=' . PAF_FEED_SLUG, 'top');
  paf_register_category_feeds();
  flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
  flush_rewrite_rules();
});

function paf_register_category_feeds() {
  foreach (PAF_ALLOWED_CATEGORIES as $slug) {
    $feed = PAF_FEED_SLUG . '-' . $slug;
    add_feed($feed, 'paf_render_feed');
    add_rewrite_rule('^' . PAF_FEED_PATH_BASE . '/' . $slug . '/?$', 'index.php?feed=' . $feed, 'top');
  }
}

function paf_render_feed() {
  $category = paf_get_requested_category();
  $items = paf_collect_items($category);

  header('Content-Type: application/rss+xml; charset=UTF-8');

  $site_url = get_bloginfo('url');
  $site_title = get_bloginfo('name');
  $now = date(DATE_RFC2822);

  echo '<?xml version="1.0" encoding="UTF-8"?>' . "
";
  echo '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">' . "
";
  echo "<channel>
";
  $title_suffix = $category ? ' - ' . $category : '';
  echo '<title>' . esc_html($site_title . ' Pinterest Feed' . $title_suffix) . "</title>
";
  echo '<link>' . esc_url($site_url) . "</link>
";
  echo '<description>' . esc_html('Pinterest pin variants for auto-publishing') . "</description>
";
  echo '<lastBuildDate>' . esc_html($now) . "</lastBuildDate>
";

  foreach ($items as $item) {
    $title = $item['title'];
    $description = $item['description'];
    $link = $item['link'];
    $image = $item['image'];
    $pub_date = $item['pub_date'];
    $guid = $item['guid'];
    $mime = $item['mime'];

    echo "<item>
";
    echo '<title>' . esc_html($title) . "</title>
";
    echo '<link>' . esc_url($link) . "</link>
";
    echo '<guid isPermaLink="false">' . esc_html($guid) . "</guid>
";
    echo '<pubDate>' . esc_html($pub_date) . "</pubDate>
";
    echo '<description><![CDATA[' . $description . ']]></description>' . "
";
    echo '<media:content url="' . esc_url($image) . '" medium="image" />' . "
";
    echo '<enclosure url="' . esc_url($image) . '" type="' . esc_attr($mime) . '" />' . "
";
    echo "</item>
";
  }

  echo "</channel>
";
  echo "</rss>";
  exit;
}

function paf_get_requested_category() {
  $feed = get_query_var('feed');
  if (!$feed) {
    return null;
  }
  if (strpos($feed, PAF_FEED_SLUG . '-') !== 0) {
    return null;
  }
  $slug = substr($feed, strlen(PAF_FEED_SLUG) + 1);
  return $slug ?: null;
}

function paf_collect_items($only_category = null) {
  $max_items = apply_filters('paf_max_items', 200);
  $include_future = apply_filters('paf_include_future', false);
  $now_ts = time();

  $args = [
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 200,
    'orderby' => 'date',
    'order' => 'DESC'
  ];

  if ($only_category) {
    $args['category_name'] = $only_category;
    $args['lang'] = paf_language_for_category($only_category);
  } else {
    $args['s'] = 'pinterest-gallery';
  }

  $posts = get_posts($args);
  $items = [];

  foreach ($posts as $post) {
    $link = get_permalink($post);
    if (!paf_matches_language_path($only_category, $link)) {
      continue;
    }

    $content = get_post_field('post_content', $post->ID);
    if (strpos($content, 'pinterest-gallery') === false) {
      continue;
    }

    foreach (paf_extract_gallery_items($content, $post) as $entry) {
      $scheduled_ts = $entry['scheduled_ts'];
      if (!$include_future && $scheduled_ts > $now_ts) {
        continue;
      }

      $items[] = $entry;
      if (count($items) >= $max_items) {
        break 2;
      }
    }
  }

  usort($items, function ($a, $b) {
    return $a['scheduled_ts'] <=> $b['scheduled_ts'];
  });

  return $items;
}

function paf_language_for_category($category) {
  if (in_array($category, ['recettes', 'pates-a-tartiner'], true)) {
    return 'fr';
  }
  return 'en';
}

function paf_matches_language_path($category, $link) {
  if (!$category) {
    return true;
  }
  $isFrenchCategory = in_array($category, ['recettes', 'pates-a-tartiner'], true);
  $hasFrPath = strpos($link, '/fr/') !== false;
  return $isFrenchCategory ? $hasFrPath : !$hasFrPath;
}

function paf_extract_gallery_items($content, $post) {
  $items = [];

  libxml_use_internal_errors(true);
  $doc = new DOMDocument();
  $wrapped = '<!DOCTYPE html><html><body>' . $content . '</body></html>';
  $doc->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR);

  $xpath = new DOMXPath($doc);
  $nodes = $xpath->query('//div[contains(@class, "pinterest-gallery")]//img');

  if (!$nodes) {
    return $items;
  }

  foreach ($nodes as $node) {
    $src = $node->getAttribute('src');
    if (!$src) {
      continue;
    }

    $title = $node->getAttribute('data-pin-title');
    if (!$title) {
      $title = $node->getAttribute('alt');
    }
    $description = $node->getAttribute('data-pin-description');
    if (!$description) {
      $description = $title;
    }
    $scheduled = $node->getAttribute('data-pin-scheduled');
    $scheduled_ts = $scheduled ? strtotime($scheduled) : strtotime($post->post_date_gmt ?: $post->post_date);
    if (!$scheduled_ts) {
      $scheduled_ts = time();
    }

    $pub_date = date(DATE_RFC2822, $scheduled_ts);
    $guid = sha1($post->ID . '|' . $src . '|' . $scheduled . '|' . $title);

    $items[] = [
      'title' => $title,
      'description' => $description,
      'link' => get_permalink($post),
      'image' => $src,
      'pub_date' => $pub_date,
      'scheduled_ts' => $scheduled_ts,
      'guid' => $guid,
      'mime' => paf_guess_mime($src)
    ];
  }

  return $items;
}

function paf_guess_mime($url) {
  $path = parse_url($url, PHP_URL_PATH);
  $ext = $path ? strtolower(pathinfo($path, PATHINFO_EXTENSION)) : '';
  switch ($ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}
