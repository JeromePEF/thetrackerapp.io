import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// Adjust mobile padding to pin it more to the edges
content = content.replace(
  /@media \(max-width: 640px\) \{\n  \.site-header \.container\.header-row \{\n    padding: 0 0\.5rem 0 0\.2rem !important; \/\* Small gap on right, tighter on left \*\/\n    width: 100% !important;\n    max-width: 100% !important;\n  \}/,
  `@media (max-width: 640px) {
  .site-header {
    padding-right: 0.2rem !important;
    padding-left: 0.2rem !important;
  }
  .site-header .container.header-row {
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }`
);

fs.writeFileSync('styles.css', content, 'utf8');
