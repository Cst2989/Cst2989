#!/usr/bin/env node
/**
 * Fetches profile readme data from neciudan.dev API and updates README.md.
 * Used by GitHub Actions to keep the profile readme in sync daily.
 *
 * Expected API: GET https://neciudan.dev/api/profile-readme.json
 * Response shape: { episodes: [...], articles: [...], videos: [...] }
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { get } from 'https';

const API_URL = 'https://neciudan.dev/api/profile-readme.json';
const README_PATH = join(process.cwd(), 'README.md');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function escapeMarkdown(title) {
  return title.replace(/\[/g, '\\[');
}

function buildEpisodesMarkdown(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) return '';
  return episodes
    .slice(0, 5)
    .map(
      (e) =>
        `- **${escapeMarkdown(e.title)}** (Ep. ${e.episodeNumber || ''}) ${e.duration ? `· ${e.duration}` : ''}  
  [Spotify](${e.spotifyUrl}) · [YouTube](${e.youtubeUrl})`
    )
    .join('\n');
}

function buildArticlesMarkdown(articles) {
  if (!Array.isArray(articles) || articles.length === 0) return '';
  return articles
    .slice(0, 5)
    .map((a) => `- [${escapeMarkdown(a.title)}](${a.url})`)
    .join('\n');
}

function buildVideosMarkdown(videos) {
  if (!Array.isArray(videos) || videos.length === 0) return '';
  return videos
    .slice(0, 5)
    .map((v) => `- [${escapeMarkdown(v.title)}](${v.url})${v.date ? ` · ${v.date}` : ''}`)
    .join('\n');
}

function replaceBetween(content, startMarker, endMarker, newContent) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return content;
  return (
    content.slice(0, start + startMarker.length) +
    '\n' +
    newContent +
    '\n' +
    content.slice(end)
  );
}

async function main() {
  let data;
  try {
    data = await fetchJson(API_URL);
  } catch (err) {
    console.warn('Profile-readme API not available yet:', err.message);
    console.warn('Add https://neciudan.dev/api/profile-readme.json (see docs/profile-readme-api.md)');
    process.exit(0);
  }

  let readme = readFileSync(README_PATH, 'utf8');

  if (data.episodes) {
    readme = replaceBetween(
      readme,
      '<!-- PODCAST-LIST:START -->',
      '<!-- PODCAST-LIST:END -->',
      buildEpisodesMarkdown(data.episodes)
    );
  }
  if (data.articles) {
    readme = replaceBetween(
      readme,
      '<!-- BLOG-POST-LIST:START -->',
      '<!-- BLOG-POST-LIST:END -->',
      buildArticlesMarkdown(data.articles)
    );
  }
  if (data.videos) {
    readme = replaceBetween(
      readme,
      '<!-- YOUTUBE-LIST:START -->',
      '<!-- YOUTUBE-LIST:END -->',
      buildVideosMarkdown(data.videos)
    );
  }

  writeFileSync(README_PATH, readme);
  console.log('README.md updated from profile-readme API.');
}

main();
