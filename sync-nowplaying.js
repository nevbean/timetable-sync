// sync-nowplaying.js
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;

async function getAccessToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to refresh access token: " + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !NEOCITIES_API_KEY) {
    throw new Error("Missing one or more required environment variables");
  }

  const accessToken = await getAccessToken();

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let payload;
  if (res.status === 204) {
    payload = { playing: false };
  } else {
    const data = await res.json();
    if (data && data.item) {
      payload = {
        playing: !!data.is_playing,
        track: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(", "),
        album: data.item.album.name,
        art: data.item.album.images && data.item.album.images[1]
          ? data.item.album.images[1].url
          : (data.item.album.images[0] ? data.item.album.images[0].url : null),
        url: data.item.external_urls.spotify,
      };
    } else {
      payload = { playing: false };
    }
  }

  const json = JSON.stringify(payload);
  console.log("Uploading:", json);

  const form = new FormData();
  form.append("now-playing.json", new Blob([json], { type: "application/json" }), "now-playing.json");

  const uploadRes = await fetch("https://neocities.org/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${NEOCITIES_API_KEY}` },
    body: form,
  });

  const result = await uploadRes.json();
  if (result.result !== "success") {
    throw new Error("Neocities upload failed: " + JSON.stringify(result));
  }

  console.log("✅ Uploaded now-playing.json successfully.");
}

main().catch((err) => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
