// Netlify Scheduled Function — PM Auto-Check every hour
const BASE_URL = process.env.URL || 'https://bellas-fixhub.netlify.app';

export default async () => {
  try {
    const url = `${BASE_URL}/api/cron/pm-check?key=bellas-cron-2026`;
    console.log(`[PMCheck] Calling: ${url}`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[PMCheck] Status=${res.status}, Body=${text.substring(0,200)}`);
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }),
      { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[PMCheck] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
