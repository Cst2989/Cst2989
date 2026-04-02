# Profile README API (neciudan.dev)

This repo’s GitHub Action calls this API daily to update the profile README. Implement it in your **neciudan.dev** project.

## Endpoint

- **URL:** `https://neciudan.dev/api/profile-readme.json`
- **Method:** `GET`
- **Response:** JSON, `Content-Type: application/json`

## Response shape

```json
{
  "episodes": [
    {
      "title": "Technical Leadership at Scale with Anemari Fiser (O'Reilly Author and Engineering Coach)",
      "episodeNumber": 24,
      "duration": "51m",
      "spotifyUrl": "https://podcasters.spotify.com/pod/show/dan-neciu/episodes/...",
      "youtubeUrl": "https://www.youtube.com/playlist?list=PLeeGnEj5psFIwWJfpCwnedMsFApK6CvRr"
    }
  ],
  "articles": [
    {
      "title": "The Future of Coding in the Age of AI is Git",
      "url": "https://neciudan.dev/blog/the-future-of-coding-in-the-age-of-ai-is-git"
    }
  ],
  "videos": [
    {
      "title": "Whats new in React 19.2: Activity Component",
      "url": "https://youtu.be/loAuSFtNuc4",
      "date": "Dec 18, 2025"
    }
  ]
}
```

- **episodes:** Up to 5 items (top/latest). Each: `title`, `spotifyUrl`, `youtubeUrl`; optional: `episodeNumber`, `duration`.
- **articles:** Up to 5 items. Each: `title`, `url` (full blog post URL).
- **videos:** Up to 5 items. Each: `title`, `url` (YouTube); optional: `date`.

Any section can be omitted; the updater script only replaces blocks for keys that exist.

## Example implementations

### Astro (server endpoint)

Create `src/pages/api/profile-readme.json.ts` (or `.js`):

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Load from CMS, markdown, or static config
  const data = {
    episodes: [ /* top 5 from your podcast source */ ],
    articles: [ /* top 5 from your blog */ ],
    videos: [ /* top 5 from YouTube or config */ ],
  };
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Next.js (App Router)

Create `app/api/profile-readme/route.ts`:

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = { episodes: [...], articles: [...], videos: [...] };
  return NextResponse.json(data);
}
```

### Static JSON (no backend)

If your site is static, build a JSON file at build time (e.g. from content collections) and serve it at `/api/profile-readme.json` via redirect or copy to `public/api/profile-readme.json`.
