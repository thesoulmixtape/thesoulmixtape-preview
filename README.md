# #TheSoulMixtape v44

Recovered from the working v43.6 deployment and updated so new podcast audio uses the private Cloudflare R2 bucket instead of Supabase Storage.

## Changes

- Music uploads continue to use R2.
- Podcast uploads now use R2.
- Published podcast audio is served through `/audio/podcast/{episode-id}`.
- Existing published music URLs remain `/audio/{track-id}`.
- Existing podcast rows that still reference Supabase Storage remain compatible.

## Deployment order

1. Deploy `worker.js` to the existing `thesoulmixtape-media` Worker with the `AUDIO_BUCKET` binding connected to `thesoulmixtape-audio`.
2. Deploy the static frontend files, including the updated `backend.js`.
3. Upload a short podcast as a draft, publish it, and verify playback and byte-range seeking.

The current v43.6 production deployment should remain available until the v44 test passes.
