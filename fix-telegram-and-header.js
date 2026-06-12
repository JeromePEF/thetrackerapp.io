import fs from 'fs';

// 1. Fix header auth padding for mobile
let stylesContent = fs.readFileSync('styles.css', 'utf8');

stylesContent = stylesContent.replace(
  /@media \(max-width: 640px\) \{\n  \.site-header \.container\.header-row \{\n    padding: 0 0\.2rem !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  \}/,
  `@media (max-width: 640px) {
  .site-header .container.header-row {
    padding: 0 0.5rem 0 0.2rem !important; /* Small gap on right, tighter on left */
    width: 100% !important;
    max-width: 100% !important;
  }`
);

fs.writeFileSync('styles.css', stylesContent, 'utf8');

// 2. Hide guide for Telegram
let guideContent = fs.readFileSync('src/onboarding-guide.js', 'utf8');

guideContent = guideContent.replace(
  /function updateGuide\(\) \{/,
  `function updateGuide() {
    const serviceSelect = document.getElementById("serviceSelect");
    if (serviceSelect && serviceSelect.value === "telegram") {
      hideGuide();
      return;
    }`
);

fs.writeFileSync('src/onboarding-guide.js', guideContent, 'utf8');
