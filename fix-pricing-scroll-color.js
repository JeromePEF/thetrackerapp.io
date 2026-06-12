import fs from 'fs';

let content = fs.readFileSync('pricing.css', 'utf8');

// 1. Fix Scroll
content = content.replace(
  /body \{\n  font-family: "Space Grotesk", sans-serif;\n  background: var\(--bg\);\n  color: var\(--text\);\n  min-height: 100vh;\n\}/,
  `html, body {
  overflow: auto !important;
  height: auto !important;
  min-height: 100vh !important;
}

body {
  font-family: "Space Grotesk", sans-serif;
  background: var(--bg);
  color: var(--text);
}`
);

// 2. Change Premium from Purple to Red
content = content.replace(
  /border-color: rgba\(186, 104, 200, 0\.32\);/,
  'border-color: rgba(255, 51, 51, 0.32);'
);

content = content.replace(
  /color: #d68ee0;/,
  'color: #ff5555;'
);

content = content.replace(
  /border-color: rgba\(186, 104, 200, 0\.6\);\n  box-shadow: 0 14px 40px rgba\(186, 104, 200, 0\.22\);/,
  'border-color: rgba(255, 51, 51, 0.6);\n  box-shadow: 0 14px 40px rgba(255, 51, 51, 0.22);'
);

content = content.replace(
  /background: linear-gradient\(135deg, #ba68c8, #7b1fa2\);/,
  'background: linear-gradient(135deg, #ff5555, #cc0000); color: #fff;'
);

fs.writeFileSync('pricing.css', content, 'utf8');
