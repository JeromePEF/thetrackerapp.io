import fs from 'fs';

let content = fs.readFileSync('pricing.css', 'utf8');

// The pricing.html layout differs significantly from the main app.
// We want to make .pricing-header match .site-header from styles.css

content = content.replace(
  /\.pricing-header \{[\s\S]*?\}/,
  `.pricing-header {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  padding: 0.5rem 2rem;
  border-bottom: 1px solid rgba(166, 193, 225, 0.1);
  min-height: 48px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg);
  gap: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
}`
);

content = content.replace(
  /\.logo \{[\s\S]*?\}/,
  `.logo {
  font-family: "Orbitron", sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
}`
);

content = content.replace(
  /\.pricing-nav \{[\s\S]*?\}/,
  `.pricing-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.6rem;
}
.pricing-nav a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: color 0.1s ease;
  padding: 0.15rem 0.2rem;
}
.pricing-nav a:hover {
  color: var(--accent);
}`
);

content = content.replace(
  /\.login-btn \{[\s\S]*?\}/,
  `.login-btn {
  padding: 0.5rem 1.4rem;
  background: transparent;
  border: 1px solid rgba(56, 255, 211, 0.4);
  border-radius: 6px;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 700;
  transition: all 0.2s;
  justify-self: end;
}
.login-btn:hover {
  background: var(--accent);
  color: #000;
  box-shadow: 0 0 10px rgba(56, 255, 211, 0.2);
}`
);

// Match mobile breakpoint structure
content = content.replace(
  /@media \(max-width: 600px\) \{[\s\S]*?\.pricing-header \{[\s\S]*?\}[\s\S]*?\.pricing-nav \{[\s\S]*?\}[\s\S]*?\.pricing-main \{[\s\S]*?\}\s*\}/,
  `@media (max-width: 640px) {
  .pricing-header {
    padding: 0.5rem 0.5rem !important;
    display: flex;
    justify-content: space-between;
  }
  .pricing-nav {
    display: none; /* Hide nav links on mobile to match homepage */
  }
  .pricing-main {
    padding: 2rem 0.5rem;
  }
}`
);

fs.writeFileSync('pricing.css', content, 'utf8');

// Modify pricing.html to use the same logo SVG as homepage
let htmlContent = fs.readFileSync('pricing.html', 'utf8');
htmlContent = htmlContent.replace(
  /<a href="\/" class="logo">The Tracker App<\/a>/,
  `<a href="/" class="logo" aria-label="Home">
            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
              <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
              <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="32" fill="#fff">🏋️</text>
            </svg>
            <span class="logo-text-svg">thetrackerapp.io</span>
          </a>`
);
fs.writeFileSync('pricing.html', htmlContent, 'utf8');

