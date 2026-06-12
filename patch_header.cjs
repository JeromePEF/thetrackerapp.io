const fs = require('fs');

function patchFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // Add the logo right after <div class="container header-row">
  if (html.includes('<div class="container header-row">') && !html.includes('class="header-logo"')) {
    html = html.replace(
      '<div class="container header-row">',
      `<div class="container header-row">\n          <a href="/" class="header-logo" aria-label="Home">\n            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">\n              <circle cx="32" cy="32" r="32" fill="#38ffd3"/>\n              <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="36" fill="#000">🏋</text>\n            </svg>\n            <svg class="logo-text-svg" viewBox="0 0 260 30" fill="none" xmlns="http://www.w3.org/2000/svg">\n              <text x="0" y="24" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="24" fill="#fff" letter-spacing="-0.02em">thetrackerapp.io</text>\n            </svg>\n          </a>`
    );
    fs.writeFileSync(filePath, html);
    console.log(`Patched ${filePath}`);
  }
}

['index.html', 'dashboard.html'].forEach(patchFile);
