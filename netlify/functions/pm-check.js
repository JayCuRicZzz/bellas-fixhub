// Netlify Scheduled Function — PM Auto-Check every hour
const BASE_URL = process.env.URL || 'https://bellas-fixhub.netlify.app';

exports.handler = async function () {
  try {
    const url = `${BASE_URL}/api/cron/pm-check?key=bellas-cron-2026`;
    console.log(`[PMCheck] Calling: ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`[PMCheck] Result:`, JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error('[PMCheck] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
