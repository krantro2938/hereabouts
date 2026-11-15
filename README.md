# Hereabouts

**Your town's memories, told in the voices of the people who were there.**

Hereabouts helps you sit down with someone who remembers your street (a grandparent, a neighbour, the woman who has run the fabric shop for forty years) and record their memories. Each memory is pinned to the **place** and the **decade** it's about. Then you slide the map to the 1970s and hear the street as it was.

- **Live:** https://hereabouts.aansl.com. Press *Try the demo account* to look around without signing up.
- **Demo video (1:26):** https://youtu.be/kYI97yZIlNc ([mp4 download](https://github.com/krantro2938/hereabouts/releases/latest/download/hereabouts-demo.mp4))

Built for **Code for Change 2026**.

## Why

- When the people who lived a place's history die, that history usually goes with them, because almost none of it is written down.
- Many older people are lonely, and being *asked* about your life, and listened to, matters.
- Younger people rarely have a reason, or a format, to have that conversation.

Hereabouts gives them the format. It's useful on day one for a single family (a private archive of grandma's voice), and it gets better as people join: family circles share stories, and anything marked public becomes part of a neighbourhood map anyone can explore. There's no cold-start problem: one grandchild and one grandparent is already a complete use.

## What it does

1. **Who's telling the story?** Pick or add a storyteller ("Ria, my grandmother, born 1938").
2. **Record.** A big red record key with a live level meter. An interview card suggests the next question, and *Suggest from what she said* listens back to the recording so far and proposes follow-ups that build on it.
3. **Read it back.** The recording is transcribed, and AI tidies the transcript into a short readable story **in the speaker's own words**. It removes filler and the interviewer's questions and never adds anything. You edit it. The verbatim transcript and the original audio are always kept. You can add a photo of the place.
4. **Where and when.** The places mentioned are looked up on the map and the decade is inferred ("I was six, so 1945"). You drag the pin and confirm the decade.
5. **Who can hear it?** *Just me*, *Family circle*, or *Everyone on the map*. It's private by default.

Explore the map with the **decade scrubber**, a small histogram of memories per decade that doubles as the time control. Pins carry a decade colour that runs from sepia for old memories to dusk blue for recent ones, and pins from other decades fade back instead of disappearing, so the town never looks empty. Each story shows **connected memories**: other people's memories of the same spot, found by location plus meaning (embeddings).

## Try it

On the live site, press **Try the demo account**. You're Daan, who has recorded his grandmother Ria and belongs to the "Van Dam family" circle. Open the map, slide to the 1970s, click a pin and press play. Then open *Record a memory* and record one yourself.

You can also sign in with a 6-digit code sent to your email, or with Google.

> The sample storytellers are fictional and their stories are read by synthetic voices. Every sample is labelled **Sample** in the app. The places and public events they mention (Hoog Catharijne opening, the Catharijnesingel being filled in and later reopened, the Amelisweerd protests, the Griftpark on the old gasworks) are real Utrecht history.

## Run it locally

```bash
pnpm install
cp .env.example .env      # add your keys (see below)
pnpm seed                 # sample Utrecht memories, voices and place photos
pnpm dev                  # http://localhost:8080
```

Without an email key, sign-in codes are printed to the server log. The family circle invite code in the sample data is `VANDAM`.

### Deploy

The `Dockerfile` builds a small image that contains only the server bundle. Mount a volume at `/data` (database, recordings, photos) and pass the same environment variables:

```bash
docker build -t hereabouts .
docker run -d -p 3000:3000 --env-file .env -v ./data:/data hereabouts
```

The live site runs this image behind Caddy, which handles TLS.

## Tech

- **TanStack Start** (React 19, file-based routes, server functions, SSR) in one codebase and one deploy.
- **SQLite** (better-sqlite3 + Drizzle). Tables are created on first run, so there's no migration step.
- **MapLibre GL** with OpenFreeMap tiles, recoloured at runtime into the dark night map. Clustered pins, with geocoding via OpenStreetMap Nominatim (rate-limited and cached).
- **shadcn/ui** (Radix) restyled into the project's own "Night map" design system. See [DESIGN.md](DESIGN.md).
- Audio is recorded with MediaRecorder, stored on disk, and streamed with HTTP Range support. The waveform uses the real peaks decoded with Web Audio.
- Passwordless sign-in: 6-digit email codes via **Resend** (hashed, 10-minute expiry, 5 attempts), plus **Google** OAuth.

### AI (sprinkled in, never in charge)

| Job | Model | Fallback when unavailable |
|---|---|---|
| Next interview question | Text model → backup text model | A curated list of good questions |
| Transcript → story, places, decade | Text model → backup text model | Raw transcript, typed by hand |
| Speech to text | Speech-to-text model | Type what was said |
| Connected memories | Embeddings + distance + decade | Distance + decade only |
| Sample voices (seed only) | Text-to-speech model | No audio on samples |

Every model sits behind an OpenAI-compatible endpoint chosen in `.env`, so any provider that speaks that API works.

Design rule: **AI suggests, the person confirms.** Nothing the AI writes is published without being shown and editable, and the original voice and verbatim transcript are always one tap away.

### Environment

See [.env.example](.env.example). Every key is optional; each feature falls back as shown above.

```
OPENAI_KEY / OPENAI_URL / OPENAI_MODEL                       # text model (OpenAI-compatible)
OPENAI_BACKUP_KEY / OPENAI_BACKUP_URL / OPENAI_BACKUP_MODEL  # fallback text model
OPENAI_LISTEN_KEY / OPENAI_LISTEN_URL / OPENAI_LISTEN_MODEL  # speech to text
OPENAI_EMBED_MODEL / OPENAI_VOICE_MODEL                      # embeddings, seed voices (same endpoint)
RESEND_API_KEY / EMAIL_FROM                # email sign-in codes
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET    # Google sign-in (redirect: APP_URL/auth/google/callback)
APP_URL, SESSION_SECRET
DATABASE_PATH, AUDIO_DIR, PHOTO_DIR        # default to ./data/...
```

### Layout

```
src/
  routes/            pages, /api/audio (upload, transcribe, Range streaming), /api/photos, /auth/google
  server/            db, schema, auth (email codes, Google OAuth, session cookie), access rules, AI, geocoding
  server/fns/        server functions: stories, people (storytellers, circles), record, auth
  components/        story-map, decade-dial, audio-player, app shell, and per-area folders
  components/ui/     shadcn primitives, restyled
scripts/             seed data, and the Wikimedia Commons photo fetcher
DESIGN.md            the design system
```

### Privacy

- Stories are private by default. *Family circle* stories are visible only to circle members, and *Everyone on the map* is a deliberate choice with a reminder to share only what the storyteller is happy to share.
- Public stories can be reported, and three reports hide a story pending review.
- Recordings and photos are served only to people allowed to see the story they belong to (file names are unguessable).

## Credits

- **Photos:** each sample story shows a photograph of its place from Wikimedia Commons (Het Utrechts Archief, Nationaal Archief / Anefo, Rijksdienst voor het Cultureel Erfgoed and individual photographers), all public domain, CC0, CC BY or CC BY-SA. The file for every story is listed in `scripts/seed-data.ts`; `pnpm seed` downloads them and stores the credit line and Commons page URL on the story, and the credit is shown on each photo.
- **Map:** © OpenStreetMap contributors, tiles by OpenFreeMap.
- **Demo video music:** "Beautiful Melancholy Piano" by Universfield (CC BY 4.0). Narration by a synthetic (AI) voice.
