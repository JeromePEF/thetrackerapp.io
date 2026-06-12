import fs from 'fs';
let content = fs.readFileSync('auth-pages.css', 'utf8');

content = content.replace(
  /\.auth-top-nav \{\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0\.5rem;\n\}/g,
  `.auth-top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}`
);

content = content.replace(
  /@media \(max-width: 520px\) \{\n  \.auth-top-nav \{\n    flex-wrap: nowrap;\n    gap: 0\.4rem;\n  \}/g,
  `@media (max-width: 520px) {
  .auth-top-nav {
    flex-wrap: wrap; /* allow wrapping to avoid blow-outs on small phones */
    gap: 0.4rem;
  }`
);

fs.writeFileSync('auth-pages.css', content, 'utf8');
