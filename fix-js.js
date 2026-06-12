import fs from 'fs';

let content = fs.readFileSync('src/onboarding-guide.js', 'utf8');

// 1. Change the SVG for the arrow
content = content.replace(
  /<path d="M35,10 L65,10 L65,60 L85,60 L50,95 L15,60 L35,60 Z" fill="rgba\(255, 0, 0, 0\.85\)" stroke="red" stroke-width="2" stroke-linejoin="miter"\/>/,
  '<path d="M42,10 L58,10 L58,65 L75,65 L50,95 L25,65 L42,65 Z" fill="rgba(255, 0, 0, 0.85)" stroke="red" stroke-width="1.5" stroke-linejoin="miter"/>'
);

// 2. Change the loading animation fake progress
content = content.replace(
  /\/\/ Fake progress[\s\S]*?try \{/m,
  `// Fake progress
      let currentPercent = 0;
      let lastTime = performance.now();
      let animFrame;

      function updateProgress(time) {
        const delta = time - lastTime;
        lastTime = time;

        if (currentPercent < 99) {
          // Slow down as it approaches 99
          const remaining = 99 - currentPercent;
          const speed = Math.max(0.005, remaining * 0.002); // percent per ms
          currentPercent += speed * delta;
          if (currentPercent > 99) currentPercent = 99;
          
          const displayPercent = Math.floor(currentPercent);
          percentText.textContent = \`\${displayPercent}%\`;
          progress.style.strokeDashoffset = 283 - (283 * currentPercent) / 100;
          animFrame = requestAnimationFrame(updateProgress);
        }
      }
      animFrame = requestAnimationFrame(updateProgress);

      try {`
);

// 3. Clear animation frame on try complete
content = content.replace(
  /clearInterval\(interval\);/g,
  `cancelAnimationFrame(animFrame);`
);

fs.writeFileSync('src/onboarding-guide.js', content, 'utf8');
