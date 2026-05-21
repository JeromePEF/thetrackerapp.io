// Shared Section Components
// Testimonials, FAQ, iPhone Mockup, Step Tape, Body Measurements

const API_BASE = "https://api.thetrackerapp.io";

// ============================================
// TESTIMONIALS SECTION
// ============================================

export function renderTestimonialsSection(container, testimonials = []) {
  if (!container) return;

  container.innerHTML = `
    <section class="testimonials-section" data-feature="testimonials">
      <div class="container">
        <h2 class="section-title">Thousands of Users Talk About Us</h2>
        <p class="section-subtitle">Real results from real people tracking their fitness journey</p>
        
        <div class="testimonials-carousel" id="testimonialsCarousel">
          <button class="carousel-btn prev" aria-label="Previous testimonials" id="testimonialsPrev">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <div class="testimonials-track" id="testimonialsTrack">
            ${testimonials.map((t) => renderTestimonialCard(t)).join("")}
          </div>
          
          <button class="carousel-btn next" aria-label="Next testimonials" id="testimonialsNext">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        
        <div class="testimonials-dots" id="testimonialsDots"></div>
      </div>
    </section>
  `;

  initTestimonialsCarousel();
}

function renderTestimonialCard(testimonial) {
  const stars = "★".repeat(testimonial.rating || 5) + "☆".repeat(5 - (testimonial.rating || 5));

  return `
    <article class="testimonial-card">
      <div class="testimonial-header">
        <div class="testimonial-avatar">
          ${testimonial.avatar ? `<img src="${testimonial.avatar}" alt="${testimonial.name}" />` : getInitials(testimonial.name)}
        </div>
        <div class="testimonial-info">
          <h4>${testimonial.name}</h4>
          <p class="testimonial-meta">${testimonial.location || ""} ${testimonial.platform ? `via ${testimonial.platform}` : ""}</p>
        </div>
      </div>
      <div class="testimonial-rating">${stars}</div>
      <blockquote class="testimonial-content">"${testimonial.content}"</blockquote>
      ${testimonial.stats ? `<p class="testimonial-stats">${testimonial.stats}</p>` : ""}
    </article>
  `;
}

function initTestimonialsCarousel() {
  const track = document.getElementById("testimonialsTrack");
  const prevBtn = document.getElementById("testimonialsPrev");
  const nextBtn = document.getElementById("testimonialsNext");
  const dotsContainer = document.getElementById("testimonialsDots");

  if (!track) return;

  const cards = track.querySelectorAll(".testimonial-card");
  const cardsPerView = window.innerWidth > 900 ? 3 : window.innerWidth > 600 ? 2 : 1;
  const totalSlides = Math.ceil(cards.length / cardsPerView);
  let currentSlide = 0;

  // Create dots
  if (dotsContainer && totalSlides > 1) {
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement("button");
      dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    updateDots();
  }

  function updateDots() {
    const dots = dotsContainer?.querySelectorAll(".carousel-dot");
    dots?.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentSlide);
    });
  }

  prevBtn?.addEventListener("click", () => goToSlide(currentSlide - 1));
  nextBtn?.addEventListener("click", () => goToSlide(currentSlide + 1));

  // Auto-advance
  setInterval(() => {
    goToSlide((currentSlide + 1) % totalSlides);
  }, 5000);
}

// ============================================
// FAQ SECTION
// ============================================

export function renderFAQSection(container, faqs = []) {
  if (!container) return;

  container.innerHTML = `
    <section class="faq-section" data-feature="faq">
      <div class="container">
        <h2 class="section-title">Frequently Asked Questions</h2>
        
        <div class="faq-list">
          ${faqs.map((faq) => renderFAQItem(faq)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFAQItem(faq) {
  return `
    <details class="faq-item">
      <summary>${faq.question}</summary>
      <p>${faq.answer}</p>
    </details>
  `;
}

// ============================================
// IPHONE MOCKUP SECTION
// ============================================

export function renderIPhoneMockupSection(container) {
  if (!container) return;

  container.innerHTML = `
    <section class="iphone-mockup-section" data-feature="iphoneMockup">
      <div class="container">
        <div class="mockup-content">
          <div class="mockup-text">
            <h2>Track Fitness From Your Messages</h2>
            <p>No app to download. No complicated UI. Just text what you did and we'll handle the rest.</p>
            <ul class="mockup-features">
              <li>Log workouts with natural language</li>
              <li>Track calories by describing your meal</li>
              <li>Monitor water intake with quick texts</li>
              <li>View progress charts anytime</li>
            </ul>
            <a href="/" class="btn-primary">Get Started Free</a>
          </div>
          
          <div class="mockup-device">
            <div class="iphone-frame">
              <div class="iphone-notch"></div>
              <div class="iphone-screen">
                <div class="messages-app">
                  <div class="messages-header">
                    <span class="messages-contact">The Tracker App</span>
                  </div>
                  <div class="messages-thread" id="mockupMessages">
                    <!-- Animated messages will appear here -->
                  </div>
                </div>
              </div>
              <div class="iphone-home-indicator"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  initMockupAnimation();
}

function initMockupAnimation() {
  const messagesContainer = document.getElementById("mockupMessages");
  if (!messagesContainer) return;

  const conversations = [
    { type: "sent", text: "bench press 185x8x3" },
    { type: "received", text: "Logged! Bench Press: 185 lb x 8 reps x 3 sets. Total volume: 4,440 lb" },
    { type: "sent", text: "water 20oz" },
    { type: "received", text: "Added 20 oz water. Today: 60 oz (75% of goal)" },
    { type: "sent", text: "grilled chicken salad with olive oil" },
    { type: "received", text: "Logged! ~450 cal | 42g protein | 12g carbs | 26g fat" },
    { type: "sent", text: "weight 175.5" },
    { type: "received", text: "Recorded: 175.5 lb. Down 0.8 lb from last week!" },
  ];

  let messageIndex = 0;

  function addMessage() {
    if (messageIndex >= conversations.length) {
      // Clear and restart
      setTimeout(() => {
        messagesContainer.innerHTML = "";
        messageIndex = 0;
        addMessage();
      }, 3000);
      return;
    }

    const msg = conversations[messageIndex];
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${msg.type}`;
    bubble.textContent = msg.text;
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(10px)";

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Animate in
    requestAnimationFrame(() => {
      bubble.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(0)";
    });

    messageIndex++;
    setTimeout(addMessage, msg.type === "sent" ? 1500 : 2500);
  }

  addMessage();
}

// ============================================
// PEBBLE STEP TAPE (Homepage Widget)
// ============================================

export function renderStepTapeWidget(container) {
  if (!container) return;

  container.innerHTML = `
    <aside class="pebble-step-tape" data-feature="stepTape">
      <h3>PEBBLE STEP TAPE</h3>
      <p class="step-tape-live"><span class="live-dot"></span>LIVE</p>
      
      <div class="step-tape-totals">
        <div class="step-stat">
          <span class="step-stat-label">TOTAL STEPS (ALL-TIME)</span>
          <span class="step-stat-value" id="stepTapeTotalSteps">0</span>
        </div>
        <div class="step-stat">
          <span class="step-stat-label">TOTAL MILES (ALL-TIME)</span>
          <span class="step-stat-value" id="stepTapeTotalMiles">0.0</span>
        </div>
      </div>
      
      <div class="step-tape-feed">
        <div class="step-tape-waiting" id="stepTapeWaiting">
          <p>Waiting for step activity...</p>
          <small>Recent Pebble step deltas will appear here.</small>
        </div>
        <ul class="step-tape-list" id="stepTapeList"></ul>
      </div>
      
      <p class="step-tape-note">Tracking top Pebble step rows. New +step deltas will stream in here.</p>
      
      <div class="step-tape-integrations">
        <span>Integrations:</span>
        <span class="integration-badge">Oura</span>
        <span class="integration-badge">Garmin</span>
        <span class="integration-badge">Whoop</span>
        <span class="integration-badge">Fitbit</span>
        <span class="integration-badge">Pebble</span>
      </div>
    </aside>
  `;

  initStepTapeFeed();
}

async function initStepTapeFeed() {
  const totalStepsEl = document.getElementById("stepTapeTotalSteps");
  const totalMilesEl = document.getElementById("stepTapeTotalMiles");
  const waitingEl = document.getElementById("stepTapeWaiting");
  const listEl = document.getElementById("stepTapeList");

  if (!listEl) return;

  // Fetch initial data
  try {
    const response = await fetch(`${API_BASE}/api/steps/live`);
    if (response.ok) {
      const data = await response.json();
      totalStepsEl.textContent = (data.totalSteps || 0).toLocaleString();
      totalMilesEl.textContent = (data.totalMiles || 0).toFixed(1);

      if (data.recentActivity?.length) {
        waitingEl.hidden = true;
        renderStepActivity(listEl, data.recentActivity);
      }
    }
  } catch (e) {
    console.warn("Failed to fetch step data:", e);
  }

  // Poll for updates
  setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/steps/live/recent`);
      if (response.ok) {
        const data = await response.json();
        if (data.activity?.length) {
          waitingEl.hidden = true;
          prependStepActivity(listEl, data.activity);
        }
        if (data.totalSteps) {
          totalStepsEl.textContent = data.totalSteps.toLocaleString();
        }
        if (data.totalMiles) {
          totalMilesEl.textContent = data.totalMiles.toFixed(1);
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 10000);
}

function renderStepActivity(container, activities) {
  container.innerHTML = activities
    .slice(0, 10)
    .map(
      (a) => `
    <li class="step-activity-item">
      <span class="step-username">${a.username || "Anonymous"}</span>
      <span class="step-delta">+${a.steps.toLocaleString()}</span>
      <span class="step-source">${a.source || "Pebble"}</span>
    </li>
  `
    )
    .join("");
}

function prependStepActivity(container, activities) {
  const existing = container.querySelectorAll(".step-activity-item");
  activities.reverse().forEach((a) => {
    const li = document.createElement("li");
    li.className = "step-activity-item new";
    li.innerHTML = `
      <span class="step-username">${a.username || "Anonymous"}</span>
      <span class="step-delta">+${a.steps.toLocaleString()}</span>
      <span class="step-source">${a.source || "Pebble"}</span>
    `;
    container.insertBefore(li, container.firstChild);
  });

  // Keep only 10 items
  while (container.children.length > 10) {
    container.removeChild(container.lastChild);
  }
}

// ============================================
// HELPERS
// ============================================

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// DEFAULT DATA
// ============================================

export const DEFAULT_TESTIMONIALS = [
  {
    name: "Mike R.",
    location: "Austin, TX",
    platform: "iMessage",
    rating: 5,
    content: "I've tried every fitness app out there. This is the first one that actually stuck because I don't have to open anything - just text what I did.",
    stats: "Lost 23 lbs in 4 months",
  },
  {
    name: "Sarah K.",
    location: "NYC",
    platform: "SMS",
    rating: 5,
    content: "The simplicity is genius. I text my meals and workouts throughout the day, then check my dashboard weekly. Finally hit my protein goals consistently.",
    stats: "180 day streak",
  },
  {
    name: "James L.",
    location: "Chicago",
    platform: "Telegram",
    rating: 5,
    content: "Love the Pebble integration! My watch syncs automatically and I can see everything in one place. The leaderboard keeps me motivated.",
    stats: "Top 10 on strength board",
  },
  {
    name: "Emily T.",
    location: "LA",
    platform: "iMessage",
    rating: 5,
    content: "Finally a tracker that doesn't make me feel like I need a PhD to log a sandwich. Just text it and done. My nutritionist loves the reports.",
    stats: "Gained 8 lbs muscle",
  },
  {
    name: "David M.",
    location: "Seattle",
    platform: "SMS",
    rating: 5,
    content: "The body measurement tracking is incredible. I can see my biceps and chest growing week over week. Keeps me pushing harder in the gym.",
    stats: "+2 inches on arms",
  },
  {
    name: "Lisa P.",
    location: "Miami",
    platform: "Telegram",
    rating: 4,
    content: "Great for water tracking! I always forgot to drink enough water until I started texting every glass. Now I hit 100oz daily.",
    stats: "Hydration: 100% daily",
  },
];

export const DEFAULT_FAQS = [
  {
    question: "How do I track workouts via text?",
    answer: "Simply text your exercise, weight, reps, and sets. For example: 'bench press 185x8x3' or 'ran 3 miles in 28 minutes'. Our AI understands natural language and logs it automatically.",
  },
  {
    question: "What platforms are supported?",
    answer: "We support iMessage, SMS, and Telegram. You can track from any phone or messaging app. Wearable integrations include Pebble, Fitbit, Garmin, Whoop, Oura, and Apple Watch.",
  },
  {
    question: "How does calorie tracking work?",
    answer: "Text what you ate in plain English, like 'grilled chicken salad with olive oil dressing'. We'll identify the foods and calculate calories, protein, carbs, and fats automatically.",
  },
  {
    question: "Is my data private?",
    answer: "Yes! Your health data is encrypted and never sold. You can export or delete your data anytime from your dashboard. See our privacy policy for details.",
  },
  {
    question: "Can I track body measurements?",
    answer: "Absolutely! Track weight, body fat, and specific measurements like biceps, chest, waist, etc. We'll show your progress over time with charts and goal tracking.",
  },
  {
    question: "What's the Pebble Step Tape?",
    answer: "It's a live feed showing step activity from Pebble watch users in real-time. You can see global step counts and compete on the leaderboard. Syncs with multiple wearables.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes! Basic tracking is free forever. Premium plans unlock advanced analytics, unlimited history, and priority support.",
  },
  {
    question: "How do brackets and competitions work?",
    answer: "Join or create fitness competitions with friends, run clubs, or globally. Compete in brackets, track progress in real-time, and win prizes!",
  },
];
