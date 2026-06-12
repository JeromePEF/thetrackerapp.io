import fs from 'fs';
let content = fs.readFileSync('auth-pages.css', 'utf8');

content = content.replace(
  /\.auth-shell,\n\.dashboard-shell \{\n  width: min\(1180px, calc\(100% - 1\.5rem\)\);\n  margin: 0 auto;\n  padding: 1rem 0 1\.5rem;\n\}/g,
  `.auth-shell,
.dashboard-shell {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem 0.75rem 1.5rem;
}`
);

content = content.replace(
  /body\.login-page \.auth-shell,\nbody\.dashboard-page \.dashboard-shell \{\n  width: min\(1240px, calc\(100% - 1\.5rem\)\);\n\}/g,
  `body.login-page .auth-shell,
body.dashboard-page .dashboard-shell {
  max-width: 1240px;
}`
);

fs.writeFileSync('auth-pages.css', content, 'utf8');
