import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

content = content.replace(
  /@keyframes bounce-arrow \{[\s\S]*?\}/,
  `@keyframes bounce-arrow {
  from { transform: translateY(-8px); filter: drop-shadow(0 0 5px red); }
  to { transform: translateY(8px); filter: drop-shadow(0 0 15px red); }
}`
);

// Mobile header padding
content = content.replace(
  /@media \(max-width: 900px\) \{/,
  `@media (max-width: 900px) {
  .site-header .container.header-row {
    padding: 0 1rem !important;
  }`
);

content = content.replace(
  /@media \(max-width: 640px\) \{/,
  `@media (max-width: 640px) {
  .site-header .container.header-row {
    padding: 0 0.5rem !important;
  }`
);

// Optimize consent text on mobile
content = content.replace(
  /@media \(max-width: 640px\) \{[\s\S]*?\.consent-row \{[\s\S]*?\}/,
  `@media (max-width: 640px) {\n  .site-header .container.header-row {\n    padding: 0 0.5rem !important;\n  }\n  .consent-row {\n    font-size: 0.8rem;\n    margin-top: 0.7rem;\n    line-height: 1.4;\n    gap: 0.4rem;\n  }\n  .consent-row input[type="checkbox"] {\n    width: 22px !important;\n    height: 22px !important;\n    margin-top: 0.1rem;\n  }`
);

fs.writeFileSync('styles.css', content, 'utf8');
