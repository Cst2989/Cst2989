#!/usr/bin/env node
/**
 * Fetches profile data from neciudan.dev/api/profile-readme.json
 * and updates README.md sections between marker comments.
 *
 * Run by GitHub Actions daily (see .github/workflows/blog-post-workflow.yml).
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { get } from 'https';

const API_URL = 'https://neciudan.dev/api/profile-readme.json';
const README_PATH = join(process.cwd(), 'README.md');
const LIMIT = 4;

// ── Fetch ────────────────────────────────────────────────────────────

function fetchJson(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        const target = new URL(res.headers.location, url).href;
        return fetchJson(target, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Markdown builders ────────────────────────────────────────────────

function esc(str) {
  return str.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function buildEpisodes(episodes) {
  return episodes.slice(0, LIMIT).map((e) => {
    const num = e.episodeNumber ? ` (Ep. ${e.episodeNumber})` : '';
    const dur = e.duration ? ` · ${e.duration}` : '';
    const desc = e.description ? `\n  ${e.description}` : '';
    const links = [
      e.spotifyUrl && `[Spotify](${e.spotifyUrl})`,
      e.youtubeUrl && `[YouTube](${e.youtubeUrl})`,
    ].filter(Boolean).join(' · ');
    const linksLine = links ? `\n  ${links}` : '';
    return `- **${esc(e.title)}**${num}${dur}  ${desc}${linksLine}`;
  }).join('\n');
}

function buildArticles(articles) {
  return articles.slice(0, LIMIT).map((a) => {
    const desc = a.description ? `\n  ${a.description}` : '';
    return `- [${esc(a.title)}](${a.url})${desc}`;
  }).join('\n');
}

function buildSpeaking(speaking) {
  return speaking.slice(0, LIMIT).map((s) => {
    const loc = s.location ? ` — ${s.location}` : '';
    const talk = s.talk ? `: *${s.talk}*` : '';
    return `- **${esc(s.event)}** · ${s.date}${loc}${talk}`;
  }).join('\n');
}

// ── Replace between markers ──────────────────────────────────────────

function replaceBetween(content, startMarker, endMarker, newContent) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return content;
  return (
    content.slice(0, start + startMarker.length) +
    '\n' + newContent + '\n' +
    content.slice(end)
  );
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  let data;
  try {
    data = await fetchJson(API_URL);
  } catch (err) {
    console.error(`Failed to fetch ${API_URL}:`, err.message);
    console.error('Deploy the API endpoint on neciudan.dev first (src/pages/api/profile-readme.json.ts).');
    process.exit(1);
  }

  let readme = readFileSync(README_PATH, 'utf8');

  if (data.episodes?.length) {
    readme = replaceBetween(readme, '<!-- PODCAST-LIST:START -->', '<!-- PODCAST-LIST:END -->', buildEpisodes(data.episodes));
    console.log(`  ✓ Podcast: ${Math.min(data.episodes.length, LIMIT)} episodes`);
  }

  if (data.articles?.length) {
    readme = replaceBetween(readme, '<!-- BLOG-POST-LIST:START -->', '<!-- BLOG-POST-LIST:END -->', buildArticles(data.articles));
    console.log(`  ✓ Articles: ${Math.min(data.articles.length, LIMIT)} posts`);
  }

  if (data.speaking?.length) {
    readme = replaceBetween(readme, '<!-- SPEAKING-LIST:START -->', '<!-- SPEAKING-LIST:END -->', buildSpeaking(data.speaking));
    console.log(`  ✓ Speaking: ${Math.min(data.speaking.length, LIMIT)} engagements`);
  }

  writeFileSync(README_PATH, readme);
  console.log('README.md updated.');
}

main();
