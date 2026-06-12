import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

// 1. Change the SVG arrow
content = content.replace(
  '<svg viewBox="0 0 100 100" preserveAspectRatio="none">\n      <path d="M10,10 L90,90 M70,90 L90,90 L90,70" stroke="red" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n    </svg>',
  '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">\n      <path d="M35,10 L65,10 L65,60 L85,60 L50,95 L15,60 L35,60 Z" fill="rgba(255, 0, 0, 0.85)" stroke="red" stroke-width="2" stroke-linejoin="miter"/>\n    </svg>'
);

// 2. Change positionGuide implementation
content = content.replace(
  /function positionGuide\(targetEl, offsetArrowX = 0, offsetArrowY = 0\) \{[\s\S]*?arrow\.style\.left = `\$\{rect\.left \+ scrollX - 80 \+ offsetArrowX\}px`;\n  \}/,
  `function positionGuide(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    guideBox.style.display = "block";
    guideBox.style.top = \`\${rect.top + scrollY - 5}px\`;
    guideBox.style.left = \`\${rect.left + scrollX - 5}px\`;
    guideBox.style.width = \`\${rect.width + 10}px\`;
    guideBox.style.height = \`\${rect.height + 10}px\`;

    arrow.style.display = "block";
    // Point arrow from top center to the element
    arrow.style.top = \`\${rect.top + scrollY - 65}px\`;
    arrow.style.left = \`\${rect.left + scrollX + (rect.width / 2) - 30}px\`;
  }`
);

// 3. Change updateGuide calls
content = content.replace(
  /positionGuide\(identityInput, 0, -20\);/,
  `positionGuide(identityInput);`
);
content = content.replace(
  /positionGuide\(consentWrap, 20, -10\);/,
  `positionGuide(consentCheckbox);`
);
content = content.replace(
  /positionGuide\(submitButton, 50, -10\);/,
  `positionGuide(submitButton);`
);

// 4. Fix checkmark HTML & rotation issue
content = content.replace(
  /<path class="onboarding-checkmark" d="M30 50 L45 65 L70 35" fill="none" stroke="#00ff00" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><\/path>/,
  `</svg>\n        <svg class="onboarding-checkmark-svg" viewBox="0 0 100 100" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%;">\n          <path class="onboarding-checkmark" d="M30 50 L45 65 L70 35" fill="none" stroke="#00ff00" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>`
);

content = content.replace(
  /checkmark\.style\.display = "none";/,
  `document.querySelector(".onboarding-checkmark-svg").style.display = "none";`
);
content = content.replace(
  /checkmark\.style\.display = "block";/,
  `document.querySelector(".onboarding-checkmark-svg").style.display = "block";`
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
