import fs from 'fs';

let content = fs.readFileSync('auth-pages.css', 'utf8');

content = content.replace(
  /\.dashboard-content \{/,
  `.dashboard-content {
  min-width: 0;`
);

content = content.replace(
  /\.dashboard-layout \{/,
  `.dashboard-layout {
  min-width: 0;`
);

fs.writeFileSync('auth-pages.css', content, 'utf8');

