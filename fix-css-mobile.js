import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// Fix floating delta color and blur
content = content.replace(
  /\.floating-delta \{[\s\S]*?\}/,
  `.floating-delta {
  color: #ff3333;
  font-weight: bold;
  font-size: 0.9em;
  pointer-events: none;
  animation: smoke-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  z-index: 100;
  white-space: nowrap;
  text-shadow: 0 0 2px rgba(255, 0, 0, 0.8);
}`
);

content = content.replace(
  /filter: blur\(2px\);/,
  'filter: blur(0);'
);

// Fix mobile header (logo shift and right gap)
content = content.replace(
  /@media \(max-width: 640px\) \{\n  \.site-header \{\n    padding-right: 0\.2rem !important;\n    padding-left: 0\.2rem !important;\n  \}\n  \.site-header \.container\.header-row \{\n    padding: 0 !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  \}/,
  `@media (max-width: 640px) {
  .site-header {
    padding: 0.5rem 0 0.3rem !important;
  }
  .site-header .container.header-row {
    padding: 0 0.5rem !important; /* Proper gap on both sides */
    width: 100% !important;
    max-width: 100% !important;
  }
  .header-logo {
    margin-left: 0 !important; /* Stop the logo from shifting left */
  }
  .header-auth {
    margin-right: 0 !important;
  }`
);

fs.writeFileSync('styles.css', content, 'utf8');
