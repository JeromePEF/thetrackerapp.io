import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

// Add listener to serviceSelect so the guide immediately hides/shows when switching
content = content.replace(
  /\/\/ Event listeners to progress the state/,
  `// Add listener for service selection to hide guide for Telegram
  const serviceSelect = document.getElementById("serviceSelect");
  if (serviceSelect) {
    serviceSelect.addEventListener("change", updateGuide);
  }

  // Event listeners to progress the state`
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
