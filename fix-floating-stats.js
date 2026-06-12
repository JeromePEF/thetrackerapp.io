import fs from 'fs';

let mainJs = fs.readFileSync('src/main.js', 'utf8');

const replacementFuncs = `function spawnFloatingDelta(target, formattedDelta) {
  const floater = document.createElement("span");
  floater.className = "floating-delta";
  floater.textContent = \`+\${formattedDelta}\`;
  
  const parent = target.parentElement;
  if (parent) {
    parent.style.position = "relative";
    floater.style.position = "absolute";
    floater.style.left = "calc(100% + 6px)";
    floater.style.bottom = "0";
    
    parent.appendChild(floater);
    
    setTimeout(() => {
      if (floater.parentElement) {
        floater.parentElement.removeChild(floater);
      }
    }, 1500);
  }
}

function setCounterValue(target, value) {
  if (!target) {
    return;
  }

  const newVal = value || 0;
  const prevVal = target.dataset.prevValue ? parseFloat(target.dataset.prevValue) : newVal;

  if (newVal > prevVal) {
    const delta = newVal - prevVal;
    spawnFloatingDelta(target, formatNumber(delta));
  }

  target.dataset.prevValue = newVal;
  target.textContent = formatNumber(newVal);
}

function setCounterValueWithDecimals(target, value, fractionDigits = 1) {
  if (!target) {
    return;
  }

  const newVal = typeof value === "number" ? value : toNumber(value);
  const prevVal = target.dataset.prevValue ? parseFloat(target.dataset.prevValue) : newVal;

  if (newVal > prevVal) {
    const delta = newVal - prevVal;
    spawnFloatingDelta(target, formatDecimal(delta, fractionDigits));
  }

  target.dataset.prevValue = newVal;
  target.textContent = formatDecimal(newVal, fractionDigits);
}`;

mainJs = mainJs.replace(
  /function setCounterValue\(target, value\) \{[\s\S]*?target\.textContent = formatDecimal\(typeof value === "number" \? value : toNumber\(value\), fractionDigits\);\n\}/,
  replacementFuncs
);

// Add the window simulation
mainJs += `

window.simulateStatsIncrease = function() {
  const targets = [
    { id: "usersTodayCount", isDec: false, bump: 1 },
    { id: "usersWeekCount", isDec: false, bump: 1 },
    { id: "workoutsLoggedCount", isDec: false, bump: Math.floor(Math.random() * 3) + 1 },
    { id: "caloriesTrackedCount", isDec: false, bump: Math.floor(Math.random() * 500) + 100 },
    { id: "gallonsDrankCount", isDec: true, bump: +(Math.random() * 0.5).toFixed(1) }
  ];
  
  targets.forEach(t => {
    const el = document.getElementById(t.id);
    if (el && el.dataset.prevValue !== undefined) {
      const current = parseFloat(el.dataset.prevValue);
      if (t.isDec) {
        setCounterValueWithDecimals(el, current + t.bump, 1);
      } else {
        setCounterValue(el, current + t.bump);
      }
    }
  });
  console.log("Simulated stat increase!");
};
`;

fs.writeFileSync('src/main.js', mainJs, 'utf8');

// Add CSS to styles.css
let stylesCss = fs.readFileSync('styles.css', 'utf8');

stylesCss += `
/* FLOATING DELTA SMOKE EFFECT */
.floating-delta {
  color: #38ffd3;
  font-weight: bold;
  font-size: 0.9em;
  pointer-events: none;
  animation: smoke-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  z-index: 100;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(56, 255, 211, 0.6);
}

@keyframes smoke-up {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(-25px) scale(1.1) translateX(5px);
    filter: blur(2px);
  }
}
`;

fs.writeFileSync('styles.css', stylesCss, 'utf8');
