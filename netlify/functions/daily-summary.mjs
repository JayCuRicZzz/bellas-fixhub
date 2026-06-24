// Netlify Scheduled Function — Daily LINE Summary at 22:00 Bangkok (15:00 UTC)
const BASE_URL = process.env.URL || 'https://bellas-fixhub.netlify.app';

export default async () => {
  try {
    const url = `${BASE_URL}/api/cron/daily-summary?key=bellas-cron-2026`;
    console.log(`[DailySummary] Calling: ${url}`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[DailySummary] Status=${res.status}, Body=${text.substring(0,200)}`);
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }),
      { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[DailySummary] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
