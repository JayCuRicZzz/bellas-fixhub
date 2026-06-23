// Netlify Scheduled Function — Daily LINE Summary at 22:00 Bangkok (15:00 UTC)
// Calls the Next.js cron API which handles DB query + LINE sending
const BASE_URL = process.env.URL || 'https://bellas-fixhub.netlify.app';

exports.handler = async function () {
  try {
    const url = `${BASE_URL}/api/cron/daily-summary?key=bellas-cron-2026`;
    console.log(`[DailySummary] Calling: ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`[DailySummary] Result:`, JSON.stringify(data));
    return { statusCode: res.ok ? 200 : 500, body: JSON.stringify(data) };
  } catch (err) {
    console.error('[DailySummary] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
