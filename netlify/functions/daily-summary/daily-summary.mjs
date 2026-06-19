// Netlify Scheduled Function — Daily LINE Summary at 22:00 Bangkok time
const BASE_URL = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';

exports.handler = async function () {
  try {
    const apiUrl = `${BASE_URL}/api/reports/daily?period=today`;
    console.log(`[Cron] Fetching daily report: ${apiUrl}`);

    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.error(`[Cron] Report API returned ${res.status}`);
      return { statusCode: res.status, body: 'Report API failed' };
    }

    const data = await res.json();
    console.log(`[Cron] Daily report generated`);

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error(`[Cron] Error: ${err.message}`);
    return { statusCode: 500, body: err.message };
  }
};
