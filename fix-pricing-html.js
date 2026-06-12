import fs from 'fs';

let content = fs.readFileSync('pricing.html', 'utf8');

// The pricing.html still uses #pricingApp and .pricing-header etc. Let's make sure its header mirrors index.html's header structure exactly for consistency.

content = content.replace(
  /<header class="pricing-header">[\s\S]*?<\/header>/,
  `<header class="site-header">
        <div class="container header-row">
          <a href="/" class="header-logo" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
              <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
              <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="32" fill="#fff">🏋️</text>
            </svg>
            <span class="logo-text-svg" style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 20px; color: #fff; fill: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
          </a>
          <nav class="app-links" aria-label="App downloads">
            <a href="/" data-feature="footer.home" hidden>Home</a>
            <a href="/community" data-feature="footer.community" hidden>Community</a>
            <a href="/blog" data-feature="footer.blog" hidden>Blog</a>
          </nav>
          <div class="header-auth">
            <span class="header-login-emoji" aria-hidden="true">🏋</span>
            <a id="loginLink" class="login-link" href="/login">Login</a>
          </div>
        </div>
      </header>`
);

content = content.replace(
  /<link rel="stylesheet" href="pricing.css" \/>/,
  `<link rel="stylesheet" href="styles.css" />\n    <link rel="stylesheet" href="pricing.css" />`
);

// Get rid of the wrapper div that might mess up global styles
content = content.replace(/<div id="pricingApp">/, '');
content = content.replace(/<\/footer>\s*<\/div>/, '</footer>');

fs.writeFileSync('pricing.html', content, 'utf8');

// In pricing.css, hide or override things that clash with styles.css now
let cssContent = fs.readFileSync('pricing.css', 'utf8');
cssContent = cssContent.replace(
  /\.pricing-header \{[\s\S]*?margin: 0 auto;\n\}/,
  `/* Using .site-header from styles.css instead */`
);
fs.writeFileSync('pricing.css', cssContent, 'utf8');

