// Netlify Scheduled Function — PM auto-check every hour (see netlify.toml)
export default async () => {
  const base = process.env.URL || 'https://bellas-fixhub.netlify.app';
  const key = process.env.CRON_SECRET || '';
  try {
    const res = await fetch(`${base}/api/cron/pm-check`, { headers: { 'x-cron-key': key } });
    const text = await res.text();
    console.log(`[PMCheck] status=${res.status} body=${text.substring(0, 300)}`);
    return new Response(text, { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[PMCheck] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
