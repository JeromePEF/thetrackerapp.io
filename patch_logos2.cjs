const fs = require('fs');

function patchIndex() {
  let html = fs.readFileSync('index.html', 'utf8');
  const logoRegex = /<a href="\/" class="header-logo"[\s\S]*?<\/a>/;
  const newLogo = `<a href="/" class="header-logo" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
              <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
              <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34">🏋</text>
            </svg>
            <span class="logo-text-svg" style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 20px; color: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
          </a>`;
  html = html.replace(logoRegex, newLogo);
  fs.writeFileSync('index.html', html);
  console.log("Patched index.html logo");
}

function patchDashboard() {
  let html = fs.readFileSync('dashboard.html', 'utf8');
  const logoRegex = /<a href="\/" class="header-logo auth-brand"[\s\S]*?<\/a>/;
  const newLogo = `<a href="/" class="header-logo auth-brand" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none; margin:0;">
            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px;">
              <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
              <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30">🏋</text>
            </svg>
            <span style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 18px; color: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
          </a>`;
  html = html.replace(logoRegex, newLogo);
  fs.writeFileSync('dashboard.html', html);
  console.log("Patched dashboard.html logo");
}

patchIndex();
patchDashboard();
