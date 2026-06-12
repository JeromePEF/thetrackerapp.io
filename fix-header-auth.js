import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// Adjust mobile padding to pin it more to the edges
content = content.replace(
  /@media \(max-width: 640px\) \{\n  \.site-header \.container\.header-row \{\n    padding: 0 0\.5rem !important;\n  \}/,
  `@media (max-width: 640px) {
  .site-header .container.header-row {
    padding: 0 0.2rem !important;
    width: 100% !important;
    max-width: 100% !important;
  }`
);

fs.writeFileSync('styles.css', content, 'utf8');
