export function initOnboardingGuide() {
  const identityInput = document.getElementById("serviceIdentityInput");
  const consentWrap = document.getElementById("consentWrap");
  const consentCheckbox = document.getElementById("consentCheckbox");
  const submitButton = document.getElementById("signupSubmitButton");
  const form = document.getElementById("signupForm");

  if (!identityInput || !consentWrap || !consentCheckbox || !submitButton || !form) return;

  // Create the guide element
  const guideBox = document.createElement("div");
  guideBox.id = "onboardingGuideBox";
  document.body.appendChild(guideBox);

  const arrow = document.createElement("div");
  arrow.id = "onboardingGuideArrow";
  arrow.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <path d="M35,10 L65,10 L65,60 L85,60 L50,95 L15,60 L35,60 Z" fill="rgba(255, 0, 0, 0.85)" stroke="red" stroke-width="2" stroke-linejoin="miter"/>
    </svg>
  `;
  document.body.appendChild(arrow);

  function positionGuide(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    guideBox.style.display = "block";
    guideBox.style.top = `${rect.top + scrollY - 5}px`;
    guideBox.style.left = `${rect.left + scrollX - 5}px`;
    guideBox.style.width = `${rect.width + 10}px`;
    guideBox.style.height = `${rect.height + 10}px`;

    arrow.style.display = "block";
    // Point arrow from top center to the element
    arrow.style.top = `${rect.top + scrollY - 65}px`;
    arrow.style.left = `${rect.left + scrollX + (rect.width / 2) - 30}px`;
  }

  function hideGuide() {
    guideBox.style.display = "none";
    arrow.style.display = "none";
  }

  let currentState = 'identity'; // 'identity', 'consent', 'submit', 'done'

  function updateGuide() {
    if (currentState === 'identity') {
      positionGuide(identityInput);
    } else if (currentState === 'consent') {
      positionGuide(consentCheckbox);
    } else if (currentState === 'submit') {
      positionGuide(submitButton);
    } else {
      hideGuide();
    }
  }

  // Update position on resize and scroll
  window.addEventListener("resize", updateGuide);
  // Optional: window.addEventListener("scroll", updateGuide);

  // Initial display
  setTimeout(updateGuide, 500); // Wait for layout to settle

  // Event listeners to progress the state
  identityInput.addEventListener("focus", () => {
    if (currentState === 'identity') {
      currentState = 'consent';
      updateGuide();
    }
  });
  identityInput.addEventListener("input", () => {
    if (currentState === 'identity') {
      currentState = 'consent';
      updateGuide();
    }
  });

  consentCheckbox.addEventListener("change", () => {
    if (consentCheckbox.checked && (currentState === 'consent' || currentState === 'identity')) {
      currentState = 'submit';
      updateGuide();
    } else if (!consentCheckbox.checked && currentState === 'submit') {
      currentState = 'consent';
      updateGuide();
    }
  });

  submitButton.addEventListener("click", () => {
    if (currentState === 'submit') {
      currentState = 'done';
      updateGuide();
    }
  });

  // Setup loading overlay
  const overlay = document.createElement("div");
  overlay.id = "onboardingLoadingOverlay";
  overlay.innerHTML = `
    <div class="onboarding-loading-content">
      <div class="onboarding-circle-wrap">
        <svg class="onboarding-circle" viewBox="0 0 100 100">
          <circle class="onboarding-circle-bg" cx="50" cy="50" r="45"></circle>
          <circle class="onboarding-circle-progress" cx="50" cy="50" r="45"></circle>
          </svg>
        <svg class="onboarding-checkmark-svg" viewBox="0 0 100 100" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%;">
          <path class="onboarding-checkmark" d="M30 50 L45 65 L70 35" fill="none" stroke="#00ff00" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray: 100; stroke-dashoffset: 100;"></path>
        </svg>
        <div class="onboarding-percentage">0%</div>
      </div>
      <div class="onboarding-loading-text">Submitting...</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Hook into the global fetch to show/hide loading animation for /api/onboarding or /signup
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0];
  const isSignup = typeof url === 'string' && (url.includes('/api/onboarding') || url.includes('/signup') || url.includes('/api/welcome'));
  
  if (isSignup && args[1] && args[1].method === 'POST') {
    const overlay = document.getElementById("onboardingLoadingOverlay");
    const progress = document.querySelector(".onboarding-circle-progress");
    const percentText = document.querySelector(".onboarding-percentage");
    const checkmark = document.querySelector(".onboarding-checkmark");
    const loadingText = document.querySelector(".onboarding-loading-text");
    
    if (overlay && progress && percentText && checkmark) {
      overlay.style.display = "flex";
      document.querySelector(".onboarding-checkmark-svg").style.display = "none";
      progress.style.display = "block";
      progress.style.strokeDasharray = "283"; // 2 * pi * 45
      progress.style.strokeDashoffset = "283";
      percentText.style.display = "block";
      percentText.textContent = "0%";
      loadingText.textContent = "Submitting...";

      // Fake progress
      let currentPercent = 0;
      const interval = setInterval(() => {
        if (currentPercent < 90) {
          currentPercent += Math.floor(Math.random() * 15) + 5;
          if (currentPercent > 90) currentPercent = 90;
          percentText.textContent = `${currentPercent}%`;
          progress.style.strokeDashoffset = 283 - (283 * currentPercent) / 100;
        }
      }, 200);

      try {
        const response = await originalFetch.apply(this, args);
        
        clearInterval(interval);
        
        if (response.ok) {
          currentPercent = 100;
          percentText.textContent = "100%";
          progress.style.strokeDashoffset = 0;
          
          setTimeout(() => {
            progress.style.display = "none";
            percentText.style.display = "none";
            document.querySelector(".onboarding-checkmark-svg").style.display = "block";
            loadingText.textContent = "Success!";
            
            // Draw checkmark animation
            checkmark.animate([
              { strokeDasharray: "100", strokeDashoffset: "100" },
              { strokeDashoffset: "0" }
            ], { duration: 500, fill: "forwards" });

            setTimeout(() => {
              overlay.style.display = "none";
            }, 2000);
          }, 300);
        } else {
          overlay.style.display = "none";
        }
        
        return response;
      } catch (e) {
        clearInterval(interval);
        overlay.style.display = "none";
        throw e;
      }
    }
  }
  
  return originalFetch.apply(this, args);
};
