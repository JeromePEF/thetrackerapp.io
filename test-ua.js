import fetch from 'node-fetch';

async function testUA(ua) {
  const res = await fetch("https://api.thetrackerapp.io/control", {
    method: "GET",
    headers: { "User-Agent": ua }
  });
  console.log(`${ua}: ${res.status}`);
}

async function run() {
  await testUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TheTrackerApp/HomeRenderer");
  await testUA("curl/8.4.0");
  await testUA("Vercel Edge Proxy");
  await testUA("node-fetch/1.0 (+https://github.com/bitinn/node-fetch)");
  await testUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
}
run();