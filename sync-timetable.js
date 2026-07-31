// sync-timetable.js
// Fetches your UTS timetable (server-side, so no CORS issue) and uploads
// it to your Neocities site as a plain file: timetable.ics

const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
const UTS_ICAL_URL =
  process.env.UTS_ICAL_URL ||
  "https://mytimetablecloud.uts.edu.au/even/rest/calendar/ical/c1ad8cc7-78e4-4362-a72e-f44bef2094c1";

async function main() {
  if (!NEOCITIES_API_KEY) {
    throw new Error("Missing NEOCITIES_API_KEY environment variable");
  }

  console.log("Fetching timetable from UTS...");
  const res = await fetch(UTS_ICAL_URL);
  if (!res.ok) {
    throw new Error(`UTS fetch failed with status ${res.status}`);
  }

  const icsText = await res.text();
  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error("Response doesn't look like a valid ICS calendar file");
  }

  console.log(`Got ${icsText.length} bytes. Uploading to Neocities...`);

  const form = new FormData();
  form.append(
    "timetable.ics",
    new Blob([icsText], { type: "text/calendar" }),
    "timetable.ics"
  );

  const uploadRes = await fetch("https://neocities.org/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${NEOCITIES_API_KEY}` },
    body: form,
  });

  const result = await uploadRes.json();
  if (result.result !== "success") {
    throw new Error(`Neocities upload failed: ${JSON.stringify(result)}`);
  }

  console.log("✅ Uploaded timetable.ics successfully.");
}

main().catch((err) => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
