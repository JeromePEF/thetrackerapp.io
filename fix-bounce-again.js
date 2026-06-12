import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// The messed up part looks like:
// @keyframes bounce-arrow {
//   from { transform: translateY(-8px); filter: drop-shadow(0 0 5px red); }
//   to { transform: translateY(8px); filter: drop-shadow(0 0 15px red); }
// }
//   to { transform: translate(5px, 5px); filter: drop-shadow(0 0 15px red); }
// }

content = content.replace(
  /@keyframes bounce-arrow \{[\s\S]*?\}\s*to \{ transform: translate\(5px, 5px\); filter: drop-shadow\(0 0 15px red\); \}\s*\}/,
  `@keyframes bounce-arrow {
  from { transform: translateY(-8px); filter: drop-shadow(0 0 5px red); }
  to { transform: translateY(8px); filter: drop-shadow(0 0 15px red); }
}`
);

fs.writeFileSync('styles.css', content, 'utf8');
