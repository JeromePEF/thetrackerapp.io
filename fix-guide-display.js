import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

// Fix positionGuide to hide if element is invisible
content = content.replace(
  /function positionGuide\(targetEl\) \{\n    if \(\!targetEl\) return;\n    const rect = targetEl\.getBoundingClientRect\(\);/,
  `function positionGuide(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || targetEl.disabled) {
      hideGuide();
      return;
    }`
);

// Specifically handle Telegram or any bot link where input is disabled
content = content.replace(
  /if \(serviceSelect && serviceSelect\.value === "telegram"\) \{\n      hideGuide\(\);\n    \} else \{/,
  `if (serviceSelect && serviceSelect.value === "telegram") {
      hideGuide();
    } else if (identityInput && identityInput.disabled) {
      hideGuide();
    } else {`
);

// The `trackPosition` block appears twice (once in the definition and once where I replaced it earlier?). Let's check.
fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
