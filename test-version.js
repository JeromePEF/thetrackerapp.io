import fetch from "node-fetch";

async function run() {
  const start = Date.now();
  try {
    const res = await fetch("https://thetrackerapp.io/api/control-version");
    const data = await res.json();
    console.log("Time:", Date.now() - start);
    console.log(data);
  } catch(e) {
    console.log(e);
  }
}
run();