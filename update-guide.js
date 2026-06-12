import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

// Replace the resize listener and updateGuide calls with a track loop
content = content.replace(
  /\/\/ Update position on resize and scroll[\s\S]*?setTimeout\(updateGuide, 500\); \/\/ Wait for layout to settle/m,
  `// Update position via requestAnimationFrame loop
  let trackingFrame;
  function trackPosition() {
    const serviceSelect = document.getElementById("serviceSelect");
    if (serviceSelect && serviceSelect.value === "telegram") {
      hideGuide();
    } else {
      if (currentState === 'identity' && identityInput) {
        positionGuide(identityInput);
      } else if (currentState === 'consent' && consentCheckbox) {
        positionGuide(consentCheckbox);
      } else if (currentState === 'submit' && submitButton) {
        positionGuide(submitButton);
      } else {
        hideGuide();
      }
    }
    trackingFrame = requestAnimationFrame(trackPosition);
  }
  trackPosition();`
);

// Make the arrow skinnier and fix the layout of it
content = content.replace(
  /<path d="M42,10 L58,10 L58,65 L75,65 L50,95 L25,65 L42,65 Z" fill="rgba\(255, 0, 0, 0\.85\)" stroke="red" stroke-width="1\.5" stroke-linejoin="miter"\/>/,
  '<path d="M46,10 L54,10 L54,70 L65,70 L50,95 L35,70 L46,70 Z" fill="rgba(255, 0, 0, 0.85)" stroke="red" stroke-width="1" stroke-linejoin="miter"/>'
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
