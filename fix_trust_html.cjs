const fs = require('fs');

let html = fs.readFileSync('trust.html', 'utf8');

// Add styles.css so it has the site-header CSS
html = html.replace(/<link rel="stylesheet" href="trust.css" \/>/, '<link rel="stylesheet" href="styles.css" />\n    <link rel="stylesheet" href="trust.css" />');

// Unwrap header from trust-page and use site-header
const headerRegex = /<header class="trust-header">[\s\S]*?<\/header>/;

const newHeader = `<header class="site-header">
      <div class="container header-row">
        <a href="/" class="header-logo" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
          <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
            <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
            <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="32" fill="#fff">🏋️</text>
          </svg>
          <span class="logo-text-svg" style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 20px; color: #fff; fill: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
        </a>
        <nav class="app-links trust-nav">
          <a href="/status">System Status</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
        </nav>
      </div>
    </header>`;

html = html.replace(headerRegex, newHeader);
html = html.replace(/<div class="trust-page">\s*<header class="site-header">[\s\S]*?<\/header>/, newHeader + '\n    <div class="trust-page">');

// Footer
const oldFooter = /<footer class="trust-footer">[\s\S]*?<\/footer>\s*<\/div>/;
const newFooter = `</div>
    <footer class="site-footer">
      <div class="container footer-row">
        <a href="/" data-feature="footer.home">Home</a>
        <a href="/privacy" data-feature="footer.privacy">Privacy</a>
        <a href="/terms" data-feature="footer.terms">Terms</a>
        <a href="/status" data-feature="footer.status">Status</a>
      </div>
    </footer>`;

html = html.replace(oldFooter, newFooter);

fs.writeFileSync('trust.html', html);
console.log("Fixed trust.html");
