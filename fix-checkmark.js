import fs from 'fs';
let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

content = content.replace(
  /<path class="onboarding-checkmark".*?><\/path>/,
  '<path class="onboarding-checkmark" d="M30 50 L45 65 L70 35" fill="none" stroke="#00ff00" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray: 100; stroke-dashoffset: 100;"></path>'
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
