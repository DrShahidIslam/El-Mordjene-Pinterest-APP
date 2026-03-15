<?php
/**
 * Plugin Name: Pinterest Autopilot Feed
 * Description: Exposes a custom RSS feed with one item per Pinterest pin variant injected by the autopilot app.
 * Version: 1.0.0
 * Author: El Mordjene
 */

if (!defined('ABSPATH')) {
  exit;
}

const PAF_FEED_SLUG = 'pinterest-autopilot';
const PAF_FEED_PATH = 'pinterest-feed';
const PAF_ALLOWED_CATEGORIES = ['recipes', 'recettes', 'spreads', 'pates-a-tartiner', 'trends'];

add_action('init', function () {
  add_feed(PAF_FEED_SLUG, 'paf_render_feed');
  add_rewrite_rule('^' . PAF_FEED_PATH . '/?$', 'index.php?feed=' . PAF_FEED_SLUG, 'top');
});

register_activation_hook(__FILE__, function () {
  add_feed(PAF_FEED_SLUG, 'paf_render_feed');
  add_rewrite_rule('^' . PAF_FEED_PATH . '/?$', 'index.php?feed=' . PAF_FEED_SLUG, 'top');
  flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
  flush_rewrite_rules();
});

function paf_render_feed() {
  $items = paf_collect_items();

  header('Content-Type: application/rss+xml; charset=UTF-8');

  $site_url = get_bloginfo('url');
  $site_title = get_bloginfo('name');
  $now = date(DATE_RFC2822);

  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
  echo '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">' . "\n";
  echo "<channel>\n";
  echo '<title>' . esc_html($site_title . ' Pinterest Feed') . "</title>\n";
  echo '<link>' . esc_url($site_url) . "</link>\n";
  echo '<description>' . esc_html('Pinterest pin variants for auto-publishing') . "</description>\n";
  echo '<lastBuildDate>' . esc_html($now) . "</lastBuildDate>\n";

  foreach ($items as $item) {
    $title = $item['title'];
    $description = $item['description'];
    $link = $item['link'];
    $image = $item['image'];
    $pub_date = $item['pub_date'];
    $guid = $item['guid'];
    $mime = $item['mime'];

    echo "<item>\n";
    echo '<title>' . esc_html($title) . "</title>\n";
    echo '<link>' . esc_url($link) . "</link>\n";
    echo '<guid isPermaLink="false">' . esc_html($guid) . "</guid>\n";
    echo '<pubDate>' . esc_html($pub_date) . "</pubDate>\n";
    echo '<description><![CDATA[' . $description . ']]></description>' . "\n";
    echo '<media:content url="' . esc_url($image) . '" medium="image" />' . "\n";
    echo '<enclosure url="' . esc_url($image) . '" type="' . esc_attr($mime) . '" />' . "\n";
    echo "</item>\n";
  }

  echo "</channel>\n";
  echo "</rss>";
  exit;
}

function paf_collect_items() {
  $max_items = apply_filters('paf_max_items', 200);
  $include_future = apply_filters('paf_include_future', false);
  $now_ts = time();

  $posts = get_posts([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 50,
    'orderby' => 'date',
    'order' => 'DESC',
    's' => 'pinterest-gallery'
  ]);

  $items = [];

  foreach ($posts as $post) {
    if (!paf_post_in_allowed_categories($post->ID)) {
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

function paf_post_in_allowed_categories($post_id) {
  $terms = wp_get_post_terms($post_id, 'category', ['fields' => 'slugs']);
  if (!is_array($terms) || empty($terms)) {
    return false;
  }
  foreach ($terms as $slug) {
    if (in_array($slug, PAF_ALLOWED_CATEGORIES, true)) {
      return true;
    }
  }
  return false;
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
      'guid' => $guid,
      'scheduled_ts' => $scheduled_ts,
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
