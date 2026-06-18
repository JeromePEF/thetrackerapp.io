export function initOnboardingGuide() {
  const identityInput = document.getElementById("serviceIdentityInput");
  const consentWrap = document.getElementById("consentWrap");
  const consentCheckbox = document.getElementById("consentCheckbox");
  const submitButton = document.getElementById("signupSubmitButton");
  const form = document.getElementById("signupForm");
  const statusEl = document.getElementById("signupStatus");

  if (!identityInput || !consentWrap || !consentCheckbox || !submitButton || !form) return;

  // Create the guide element
  const guideBox = document.createElement("div");
  guideBox.id = "onboardingGuideBox";
  document.body.appendChild(guideBox);

  const arrow = document.createElement("div");
  arrow.id = "onboardingGuideArrow";
  arrow.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <path d="M50,15 L50,85 M30,65 L50,85 L70,65" fill="none" stroke="red" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px red);" />
    </svg>
  `;
  document.body.appendChild(arrow);

  function positionGuide(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || targetEl.disabled) {
      hideGuide();
      return;
    }
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

  function shake(el) {
    if (!el) return;
    el.style.animation = "none";
    el.offsetHeight; // reflow
    el.style.animation = "input-shake 0.4s ease";
    el.addEventListener("animationend", () => { el.style.animation = ""; }, { once: true });
  }

  let currentState = 'identity'; // 'identity', 'consent', 'submit', 'done'

  function serviceSelected() {
    return serviceSelect && serviceSelect.value && serviceSelect.value !== "";
  }

  const serviceSelect = document.getElementById("serviceSelect");

  function updateGuide() {
    const serviceVal = serviceSelect ? serviceSelect.value : "";
    if (!serviceVal) {
      if (serviceSelect) positionGuide(serviceSelect);
      else hideGuide();
      return;
    }
    if (serviceVal === "telegram" || serviceVal === "discord" || serviceVal === "slack" || serviceVal === "google-chat") {
      hideGuide();
      return;
    }
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

  // Update position via requestAnimationFrame loop
  let trackingFrame;
  function trackPosition() {
    const svcVal = serviceSelect ? serviceSelect.value : "";
    if (svcVal === "telegram" || svcVal === "discord" || svcVal === "slack" || svcVal === "google-chat") {
      hideGuide();
    } else if (identityInput && identityInput.disabled) {
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
  trackPosition();

if (serviceSelect) {
    serviceSelect.addEventListener("change", () => {
      updateGuide();
    });
  }

  // Event listeners to progress the state
  identityInput.addEventListener("focus", () => {
    // Arrow stays on input until 4+ chars typed
  });
  identityInput.addEventListener("input", () => {
    if (currentState === 'identity') {
      if (identityInput.value.trim().length >= 4) {
        currentState = 'consent';
        updateGuide();
      }
    }
  });

  consentCheckbox.addEventListener("click", (e) => {
    if (currentState === 'identity' && identityInput.value.trim().length < 4) {
      shake(identityInput);
      e.preventDefault();
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

  // --- Loading Animation Logic using MutationObserver on #signupStatus ---
  let currentPercent = 0;
  let lastTime = 0;
  let animFrame = null;
  let isAnimating = false;

  const progressRing = overlay.querySelector(".onboarding-circle-progress");
  const percentText = overlay.querySelector(".onboarding-percentage");
  const checkmarkSvg = overlay.querySelector(".onboarding-checkmark-svg");
  const checkmarkPath = overlay.querySelector(".onboarding-checkmark");
  const loadingText = overlay.querySelector(".onboarding-loading-text");

  function updateProgress(time) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;

    if (currentPercent < 99) {
      const remaining = 99 - currentPercent;
      const speed = Math.max(0.002, remaining * 0.0015); // continuous slow down
      currentPercent += speed * delta;
      if (currentPercent > 99) currentPercent = 99;
      
      const displayPercent = Math.floor(currentPercent);
      percentText.textContent = `${displayPercent}%`;
      progressRing.style.strokeDashoffset = 283 - (283 * currentPercent) / 100;
      animFrame = requestAnimationFrame(updateProgress);
    }
  }

  function startLoading() {
    if (isAnimating) return;
    isAnimating = true;
    
    currentState = 'done';
    updateGuide();

    overlay.style.display = "flex";
    checkmarkSvg.style.display = "none";
    progressRing.style.display = "block";
    progressRing.style.strokeDasharray = "283";
    progressRing.style.strokeDashoffset = "283";
    percentText.style.display = "block";
    percentText.textContent = "0%";
    loadingText.textContent = "Submitting...";

    currentPercent = 0;
    lastTime = 0;
    animFrame = requestAnimationFrame(updateProgress);
  }

  function finishLoadingSuccess() {
    if (!isAnimating) return;
    cancelAnimationFrame(animFrame);
    currentPercent = 100;
    percentText.textContent = "100%";
    progressRing.style.strokeDashoffset = 0;
    
    setTimeout(() => {
      progressRing.style.display = "none";
      percentText.style.display = "none";
      checkmarkSvg.style.display = "block";
      loadingText.textContent = "Success!";
      
      checkmarkPath.animate([
        { strokeDashoffset: "100" },
        { strokeDashoffset: "0" }
      ], { duration: 500, fill: "forwards" });

      setTimeout(() => {
        overlay.style.display = "none";
        isAnimating = false;
      }, 2000);
    }, 300);
  }

  function stopLoadingError() {
    if (!isAnimating) return;
    cancelAnimationFrame(animFrame);
    overlay.style.display = "none";
    isAnimating = false;
  }

  if (statusEl) {
    const observer = new MutationObserver(() => {
      const text = statusEl.textContent || "";
      const isError = statusEl.classList.contains("error");
      const isSuccess = statusEl.classList.contains("success");

      if (text.includes("Submitting signup")) {
        startLoading();
      } else if (isSuccess || text.includes("Signup sent")) {
        finishLoadingSuccess();
      } else if (isError) {
        stopLoadingError();
      }
    });

    observer.observe(statusEl, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
}
