import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

content = content.replace(
  /function updateGuide\(\) \{\n    const serviceSelect = document\.getElementById\("serviceSelect"\);\n    if \(serviceSelect && serviceSelect\.value === "telegram"\) \{\n      hideGuide\(\);\n      return;\n    \}/,
  `function updateGuide() {
    const serviceSelect = document.getElementById("serviceSelect");
    const serviceVal = serviceSelect ? serviceSelect.value : "";
    if (serviceVal === "telegram" || serviceVal === "discord" || serviceVal === "slack" || serviceVal === "google-chat") {
      hideGuide();
      return;
    }`
);

content = content.replace(
  /function trackPosition\(\) \{\n    const serviceSelect = document\.getElementById\("serviceSelect"\);\n    if \(serviceSelect && serviceSelect\.value === "telegram"\) \{\n      hideGuide\(\);\n    \} else if \(identityInput && identityInput\.disabled\) \{\n      hideGuide\(\);\n    \} else \{/,
  `function trackPosition() {
    const serviceSelect = document.getElementById("serviceSelect");
    const serviceVal = serviceSelect ? serviceSelect.value : "";
    if (serviceVal === "telegram" || serviceVal === "discord" || serviceVal === "slack" || serviceVal === "google-chat") {
      hideGuide();
    } else if (identityInput && identityInput.disabled) {
      hideGuide();
    } else {`
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
