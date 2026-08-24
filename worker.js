const SUPABASE_URL = "https://yzeprmubwogcscmnvoow.supabase.co";
const SUPABASE_KEY = "sb_publishable_aMVnZ7Bjz0SVES1T3TNy0Q_S1z-juft";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_MULTIPART_AUDIO_BYTES = 200 * 1024 * 1024;
const MULTIPART_PART_SIZE = 10 * 1024 * 1024;

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
]);

function allowedOrigin(origin) {
  if (!origin) return true;
  return /^https:\/\/thesoulmixtape(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

function cors(request) {
  const origin = request.headers.get("Origin");

  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Filename, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });

  if (origin && allowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function reply(request, data, status = 200) {
  const headers = cors(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function extension(filename, type) {
  const match = (filename || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  if (match) return match[1];

  const types = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
  };

  return types[type] || "bin";
}

async function contributor(request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) return null;

  const user = await userResponse.json();
  if (!user?.id) return null;

  const profileResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,role,active&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authorization,
      },
    }
  );

  if (!profileResponse.ok) return null;

  const profiles = await profileResponse.json();
  const profile = profiles?.[0];

  if (!profile?.active || !["admin", "contributor"].includes(profile.role)) {
    return null;
  }

  return { user, profile };
}

async function publishedTrack(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/tracks?id=eq.${encodeURIComponent(id)}&status=eq.published&select=id,audio_url&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
      },
    }
  );

  if (!response.ok) return null;

  const tracks = await response.json();
  return tracks?.[0] || null;
}

async function publishedPodcast(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/podcast_episodes?id=eq.${encodeURIComponent(id)}&status=eq.published&select=id,audio_url&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
      },
    }
  );

  if (!response.ok) return null;

  const episodes = await response.json();
  return episodes?.[0] || null;
}

function getR2Key(value) {
  if (!value?.startsWith("r2:")) return null;
  return value.slice(3);
}

function canManageKey(auth, key) {
  return !!(
    auth &&
    key &&
    (auth.profile.role === "admin" || key.startsWith(`${auth.user.id}/`))
  );
}

function validMultipartParts(parts) {
  return (
    Array.isArray(parts) &&
    parts.length > 0 &&
    parts.length <= 10000 &&
    parts.every(
      (part) =>
        Number.isInteger(Number(part?.partNumber)) &&
        Number(part.partNumber) >= 1 &&
        Number(part.partNumber) <= 10000 &&
        typeof part?.etag === "string" &&
        part.etag.length > 0
    )
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");

      if (!allowedOrigin(origin)) {
        return reply(request, { error: "Origin not allowed" }, 403);
      }

      return new Response(null, {
        status: 204,
        headers: cors(request),
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return reply(request, {
        ok: true,
        storage: "r2",
      });
    }

    if (url.pathname === "/upload" && request.method === "POST") {
      const origin = request.headers.get("Origin");

      if (!allowedOrigin(origin)) {
        return reply(request, { error: "Origin not allowed" }, 403);
      }

      const auth = await contributor(request);

      if (!auth) {
        return reply(request, { error: "Unauthorized" }, 401);
      }

      const contentType = (request.headers.get("Content-Type") || "")
        .split(";")[0]
        .toLowerCase();

      if (!AUDIO_TYPES.has(contentType)) {
        return reply(request, { error: "Unsupported audio type" }, 415);
      }

      const size = Number(request.headers.get("Content-Length") || 0);

      if (size > MAX_AUDIO_BYTES) {
        return reply(request, { error: "Audio file exceeds 50 MB" }, 413);
      }

      if (!request.body) {
        return reply(request, { error: "Missing audio file" }, 400);
      }

      const filename = request.headers.get("X-Filename") || "audio";
      const ext = extension(filename, contentType);

      const key = `${auth.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      await env.AUDIO_BUCKET.put(key, request.body, {
        httpMetadata: {
          contentType,
          cacheControl: "private, max-age=0, no-store",
        },
        customMetadata: {
          owner: auth.user.id,
        },
      });

      return reply(
        request,
        {
          audio_url: `r2:${key}`,
        },
        201
      );
    }


    if (url.pathname === "/multipart/create" && request.method === "POST") {
      const origin = request.headers.get("Origin");
      if (!allowedOrigin(origin)) return reply(request, { error: "Origin not allowed" }, 403);
      const auth = await contributor(request);
      if (!auth) return reply(request, { error: "Unauthorized" }, 401);

      let data;
      try { data = await request.json(); } catch { return reply(request, { error: "Invalid request" }, 400); }
      const contentType = String(data?.content_type || "").split(";")[0].toLowerCase();
      const size = Number(data?.size || 0);
      if (!AUDIO_TYPES.has(contentType)) return reply(request, { error: "Unsupported audio type" }, 415);
      if (!Number.isFinite(size) || size <= 0) return reply(request, { error: "Invalid audio size" }, 400);
      if (size > MAX_MULTIPART_AUDIO_BYTES) return reply(request, { error: "Audio file exceeds 200 MB" }, 413);

      const filename = String(data?.filename || "audio");
      const ext = extension(filename, contentType);
      const key = `${auth.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      try {
        const upload = await env.AUDIO_BUCKET.createMultipartUpload(key, {
          httpMetadata: { contentType, cacheControl: "private, max-age=0, no-store" },
          customMetadata: { owner: auth.user.id },
        });
        return reply(request, { key, upload_id: upload.uploadId, audio_url: `r2:${key}`, part_size: MULTIPART_PART_SIZE }, 201);
      } catch (error) {
        return reply(request, { error: `Could not start multipart upload: ${String(error?.message || error)}` }, 500);
      }
    }

    if (url.pathname === "/multipart/part" && request.method === "PUT") {
      const origin = request.headers.get("Origin");
      if (!allowedOrigin(origin)) return reply(request, { error: "Origin not allowed" }, 403);
      const auth = await contributor(request);
      if (!auth) return reply(request, { error: "Unauthorized" }, 401);
      const key = url.searchParams.get("key") || "";
      const uploadId = url.searchParams.get("uploadId") || "";
      const partNumber = Number(url.searchParams.get("partNumber") || 0);
      if (!canManageKey(auth, key)) return reply(request, { error: "Forbidden" }, 403);
      if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000 || !request.body) {
        return reply(request, { error: "Invalid multipart part request" }, 400);
      }
      const size = Number(request.headers.get("Content-Length") || 0);
      if (size > MULTIPART_PART_SIZE) return reply(request, { error: "Multipart part is too large" }, 413);
      try {
        const upload = env.AUDIO_BUCKET.resumeMultipartUpload(key, uploadId);
        const part = await upload.uploadPart(partNumber, request.body);
        return reply(request, { partNumber: part.partNumber, etag: part.etag });
      } catch (error) {
        return reply(request, { error: `Multipart part failed: ${String(error?.message || error)}` }, 400);
      }
    }

    if (url.pathname === "/multipart/complete" && request.method === "POST") {
      const origin = request.headers.get("Origin");
      if (!allowedOrigin(origin)) return reply(request, { error: "Origin not allowed" }, 403);
      const auth = await contributor(request);
      if (!auth) return reply(request, { error: "Unauthorized" }, 401);
      let data;
      try { data = await request.json(); } catch { return reply(request, { error: "Invalid request" }, 400); }
      const key = String(data?.key || "");
      const uploadId = String(data?.upload_id || "");
      if (!canManageKey(auth, key)) return reply(request, { error: "Forbidden" }, 403);
      if (!uploadId || !validMultipartParts(data?.parts)) return reply(request, { error: "Invalid multipart completion request" }, 400);
      try {
        const upload = env.AUDIO_BUCKET.resumeMultipartUpload(key, uploadId);
        const parts = data.parts.map((part) => ({ partNumber: Number(part.partNumber), etag: String(part.etag) }));
        await upload.complete(parts);
        return reply(request, { audio_url: `r2:${key}` });
      } catch (error) {
        return reply(request, { error: `Could not complete multipart upload: ${String(error?.message || error)}` }, 400);
      }
    }

    if (url.pathname === "/multipart/abort" && request.method === "POST") {
      const origin = request.headers.get("Origin");
      if (!allowedOrigin(origin)) return reply(request, { error: "Origin not allowed" }, 403);
      const auth = await contributor(request);
      if (!auth) return reply(request, { error: "Unauthorized" }, 401);
      let data;
      try { data = await request.json(); } catch { return reply(request, { error: "Invalid request" }, 400); }
      const key = String(data?.key || "");
      const uploadId = String(data?.upload_id || "");
      if (!canManageKey(auth, key)) return reply(request, { error: "Forbidden" }, 403);
      if (!uploadId) return reply(request, { error: "Invalid multipart abort request" }, 400);
      try {
        const upload = env.AUDIO_BUCKET.resumeMultipartUpload(key, uploadId);
        await upload.abort();
      } catch {}
      return reply(request, { aborted: true });
    }

    if (url.pathname === "/object" && request.method === "DELETE") {
      const origin = request.headers.get("Origin");

      if (!allowedOrigin(origin)) {
        return reply(request, { error: "Origin not allowed" }, 403);
      }

      const auth = await contributor(request);

      if (!auth) {
        return reply(request, { error: "Unauthorized" }, 401);
      }

      let data;

      try {
        data = await request.json();
      } catch {
        return reply(request, { error: "Invalid request" }, 400);
      }

      const key = getR2Key(data?.audio_url);

      if (!key) {
        return reply(request, { error: "Invalid R2 path" }, 400);
      }

      if (
        auth.profile.role !== "admin" &&
        !key.startsWith(`${auth.user.id}/`)
      ) {
        return reply(request, { error: "Forbidden" }, 403);
      }

      await env.AUDIO_BUCKET.delete(key);

      return reply(request, {
        deleted: true,
      });
    }

    const trackMatch = url.pathname.match(/^\/audio\/([0-9a-f-]{36})$/i);
    const podcastMatch = url.pathname.match(
      /^\/audio\/podcast\/([0-9a-f-]{36})$/i
    );

    if (
      (trackMatch || podcastMatch) &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const published = trackMatch
        ? await publishedTrack(trackMatch[1])
        : await publishedPodcast(podcastMatch[1]);
      const key = getR2Key(published?.audio_url);

      if (!published || !key) {
        return reply(request, { error: "Audio not found" }, 404);
      }

      if (request.method === "HEAD") {
        const object = await env.AUDIO_BUCKET.head(key);

        if (!object) {
          return reply(request, { error: "Audio not found" }, 404);
        }

        const headers = cors(request);

        object.writeHttpMetadata(headers);

        headers.set("Content-Length", String(object.size));
        headers.set("Accept-Ranges", "bytes");
        headers.set("ETag", object.httpEtag);

        return new Response(null, {
          status: 200,
          headers,
        });
      }

      const object = await env.AUDIO_BUCKET.get(key, {
        range: request.headers,
      });

      if (!object || !("body" in object)) {
        return reply(request, { error: "Audio not found" }, 404);
      }

      const headers = cors(request);

      object.writeHttpMetadata(headers);

      headers.set("Accept-Ranges", "bytes");
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=3600");

      let status = 200;

      if (
        object.range &&
        typeof object.range.offset === "number" &&
        typeof object.range.length === "number"
      ) {
        const start = object.range.offset;
        const end = start + object.range.length - 1;

        headers.set(
          "Content-Range",
          `bytes ${start}-${end}/${object.size}`
        );
        headers.set("Content-Length", String(object.range.length));

        status = 206;
      } else {
        headers.set("Content-Length", String(object.size));
      }

      return new Response(object.body, {
        status,
        headers,
      });
    }

    return reply(request, { error: "Not found" }, 404);
  },
};
