import fs from 'fs';
let content = fs.readFileSync('auth-pages.css', 'utf8');

content = content.replace(
  /html,\nbody \{\n  margin: 0;\n  min-height: 100%;\n  overflow-x: hidden;\n\}/g,
  `html,
body {
  margin: 0;
  min-height: 100%;
}`
);

fs.writeFileSync('auth-pages.css', content, 'utf8');
