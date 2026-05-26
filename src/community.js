// Community Page JS
import { fetchFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

const DEFAULT_TESTIMONIALS = [
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
    content: "Finally a tracker that doesn't make me feel like I need a PhD to log a sandwich. Just text it and done.",
    stats: "Gained 8 lbs muscle",
  },
  {
    name: "David M.",
    location: "Seattle",
    platform: "SMS",
    rating: 5,
    content: "The body measurement tracking is incredible. I can see my biceps and chest growing week over week.",
    stats: "+2 inches on arms",
  },
  {
    name: "Lisa P.",
    location: "Miami",
    platform: "Telegram",
    rating: 4,
    content: "Great for water tracking! I always forgot to drink enough water until I started texting every glass.",
    stats: "Hydration: 100% daily",
  },
  {
    name: "Marcus T.",
    location: "Denver",
    platform: "iMessage",
    rating: 5,
    content: "As a personal trainer, I recommend this to all my clients. They actually stick with tracking because it's so easy.",
    stats: "50+ clients onboarded",
  },
  {
    name: "Rachel W.",
    location: "Boston",
    platform: "SMS",
    rating: 5,
    content: "The AI understands exactly what I mean. I can say 'chicken and rice for lunch' and it logs everything perfectly.",
    stats: "Lost 15 lbs",
  },
];

const DEFAULT_FAQS = [
  {
    question: "How do I log a workout?",
    answer: "Just text naturally! Say 'Just did 20 pushups' or 'bench press 185x8x3' or 'ran 3 miles in 28 minutes'. You can also use voice dictation - tap the mic and say what you did. We understand natural language and log it automatically.",
  },
  {
    question: "How do I track what I eat?",
    answer: "Text your meals in plain English: 'I ate 2 eggs and a banana' or 'grilled chicken salad with olive oil dressing'. We'll break it down and calculate calories, protein, carbs, and fats for you.",
  },
  {
    question: "Can I track water intake?",
    answer: "Absolutely! Just text 'Drank 16 ounces of water' or even simpler: '16oz water'. Ask 'How much today?' anytime to see your daily total and progress toward your hydration goal.",
  },
  {
    question: "What messaging apps work?",
    answer: "We support iMessage, SMS, and Telegram - pick whichever you prefer. Wearable integrations include Pebble, Fitbit, Garmin, Whoop, Oura, and Apple Watch for automatic syncing.",
  },
  {
    question: "Can I track body measurements?",
    answer: "Yes! Track weight, body fat, and specific measurements like biceps, chest, waist, quads, and more. We'll chart your progress over time with visual graphs and goal tracking.",
  },
  {
    question: "Is my data private?",
    answer: "Your health data is encrypted and never sold to third parties. You own your data - export or delete it anytime from your dashboard.",
  },
  {
    question: "How does the leaderboard work?",
    answer: "Opt-in to compete with others! Leaderboards track total volume lifted, workout streaks, step counts, and more. Great for motivation and friendly competition.",
  },
  {
    question: "Can I track supplements?",
    answer: "Yes! Text 'took 5g creatine' or 'vitamin D 5000 IU' and we'll track your supplement intake over time. View trends on your dashboard.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes! Basic tracking is free forever. Premium unlocks advanced analytics, unlimited history, custom goals, and priority support.",
  },
];

function renderTestimonials(testimonials) {
  const grid = document.getElementById("testimonialsGrid");
  if (!grid) return;

  grid.innerHTML = testimonials.map((t) => {
    const stars = "★".repeat(t.rating || 5) + "☆".repeat(5 - (t.rating || 5));
    const initials = t.name.split(" ").map(n => n[0]).join("").toUpperCase();
    return `
      <article class="testimonial-card-full">
        <div class="testimonial-header-full">
          <div class="testimonial-avatar-full">${initials}</div>
          <div class="testimonial-info-full">
            <h4>${t.name}</h4>
            <p class="testimonial-meta-full">${t.location || ""} via ${t.platform || ""}</p>
          </div>
        </div>
        <div class="testimonial-rating-full">${stars}</div>
        <blockquote class="testimonial-content-full">"${t.content}"</blockquote>
        ${t.stats ? `<p class="testimonial-stats-full">${t.stats}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderFAQ(faqs) {
  const list = document.getElementById("faqList");
  if (!list) return;

  list.innerHTML = faqs.map((faq) => `
    <details class="faq-item">
      <summary>${faq.question}</summary>
      <p>${faq.answer}</p>
    </details>
  `).join("");
}

async function checkMaintenanceMode() {
  try {
    const flags = await fetchFeatureFlags();
    if (flags.maintenanceMode) {
      const overlay = document.getElementById("maintenanceOverlay");
      const message = document.getElementById("maintenanceMessage");
      if (overlay) {
        overlay.hidden = false;
        if (message && flags.maintenanceMessage) {
          message.textContent = flags.maintenanceMessage;
        }
      }
      return true;
    }
  } catch (e) {
    console.warn("Could not check maintenance mode:", e);
  }
  return false;
}

async function loadTestimonials() {
  try {
    const res = await fetch(`${API_BASE}/api/testimonials`);
    if (res.ok) {
      const data = await res.json();
      renderTestimonials(data.testimonials || DEFAULT_TESTIMONIALS);
      return;
    }
  } catch (e) {
    console.warn("Could not fetch testimonials:", e);
  }
  renderTestimonials(DEFAULT_TESTIMONIALS);
}

async function init() {
  await checkMaintenanceMode();
  await loadTestimonials();
  renderFAQ(DEFAULT_FAQS);
}

init();
