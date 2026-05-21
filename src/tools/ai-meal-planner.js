// AI Meal Planner JavaScript
import { initFeatureFlags } from "../feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// DOM Elements
const mealPlannerForm = document.getElementById("mealPlannerForm");
const mealPlanResults = document.getElementById("mealPlanResults");
const mealPlanDays = document.getElementById("mealPlanDays");
const regeneratePlanBtn = document.getElementById("regeneratePlanBtn");
const downloadPlanBtn = document.getElementById("downloadPlanBtn");

let currentPlan = null;
let currentParams = null;

// Generate meal plan
async function generateMealPlan(params) {
  currentParams = params;

  try {
    // Show loading state
    mealPlanDays.innerHTML = '<p class="loading-state">Generating your personalized meal plan...</p>';
    mealPlanResults.hidden = false;
    mealPlanResults.scrollIntoView({ behavior: "smooth" });

    const response = await fetch(`${API_BASE}/api/tools/meal-planner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to generate meal plan");
    }

    const plan = await response.json();
    currentPlan = plan;
    renderMealPlan(plan);
  } catch (error) {
    console.error("Error generating meal plan:", error);

    // Generate client-side fallback plan
    const fallbackPlan = generateFallbackPlan(params);
    currentPlan = fallbackPlan;
    renderMealPlan(fallbackPlan);
  }
}

// Generate fallback meal plan (client-side)
function generateFallbackPlan(params) {
  const { calories, protein, goal, mealsPerDay, diet = [], exclude = "" } = params;

  const mealsCount = parseInt(mealsPerDay);
  const caloriesPerMeal = Math.round(calories / mealsCount);
  const proteinPerMeal = protein ? Math.round(protein / mealsCount) : Math.round(calories * 0.3 / 4 / mealsCount);

  const mealTemplates = getMealTemplates(diet, exclude);

  const days = [];
  for (let day = 0; day < 7; day++) {
    const meals = [];
    for (let meal = 0; meal < mealsCount; meal++) {
      const mealType = getMealType(meal, mealsCount);
      const template = getRandomMeal(mealTemplates, mealType);

      meals.push({
        type: mealType,
        name: template.name,
        foods: template.foods,
        calories: caloriesPerMeal + Math.round((Math.random() - 0.5) * 100),
        protein: proteinPerMeal + Math.round((Math.random() - 0.5) * 10),
        carbs: Math.round(caloriesPerMeal * 0.4 / 4),
        fat: Math.round(caloriesPerMeal * 0.3 / 9),
      });
    }
    days.push({
      day: day + 1,
      dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day],
      meals,
    });
  }

  const totalCalories = Math.round(days[0].meals.reduce((sum, m) => sum + m.calories, 0));
  const totalProtein = Math.round(days[0].meals.reduce((sum, m) => sum + m.protein, 0));
  const totalCarbs = Math.round(days[0].meals.reduce((sum, m) => sum + m.carbs, 0));
  const totalFat = Math.round(days[0].meals.reduce((sum, m) => sum + m.fat, 0));

  return {
    days,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
  };
}

// Get meal templates based on dietary preferences
function getMealTemplates(diet, exclude) {
  const excludeList = exclude.toLowerCase().split(",").map(e => e.trim());

  const templates = {
    breakfast: [
      { name: "Protein Oatmeal", foods: "Oats, protein powder, banana, almond butter" },
      { name: "Egg White Scramble", foods: "Egg whites, spinach, whole grain toast, avocado" },
      { name: "Greek Yogurt Bowl", foods: "Greek yogurt, berries, granola, honey" },
      { name: "Protein Smoothie", foods: "Whey protein, banana, oats, milk, peanut butter" },
      { name: "Avocado Toast", foods: "Whole grain bread, avocado, eggs, tomatoes" },
    ],
    lunch: [
      { name: "Grilled Chicken Salad", foods: "Chicken breast, mixed greens, quinoa, olive oil" },
      { name: "Turkey Wrap", foods: "Whole wheat wrap, turkey, lettuce, hummus" },
      { name: "Salmon Bowl", foods: "Salmon, brown rice, vegetables, teriyaki sauce" },
      { name: "Chicken Stir-Fry", foods: "Chicken, broccoli, peppers, rice, soy sauce" },
      { name: "Lean Beef Tacos", foods: "Lean ground beef, corn tortillas, salsa, beans" },
    ],
    dinner: [
      { name: "Baked Salmon", foods: "Salmon fillet, asparagus, sweet potato" },
      { name: "Chicken & Vegetables", foods: "Chicken thighs, roasted vegetables, quinoa" },
      { name: "Lean Steak", foods: "Sirloin steak, broccoli, baked potato" },
      { name: "Shrimp Pasta", foods: "Shrimp, whole wheat pasta, marinara, vegetables" },
      { name: "Turkey Meatballs", foods: "Turkey meatballs, zucchini noodles, tomato sauce" },
    ],
    snack: [
      { name: "Protein Shake", foods: "Whey protein, almond milk, ice" },
      { name: "Greek Yogurt", foods: "Greek yogurt, berries" },
      { name: "Mixed Nuts", foods: "Almonds, cashews, dried fruit" },
      { name: "Cottage Cheese", foods: "Cottage cheese, pineapple" },
      { name: "Protein Bar", foods: "High protein bar" },
    ],
  };

  // Filter based on diet
  if (diet.includes("vegetarian") || diet.includes("vegan")) {
    templates.lunch = [
      { name: "Buddha Bowl", foods: "Chickpeas, quinoa, roasted vegetables, tahini" },
      { name: "Tofu Stir-Fry", foods: "Tofu, vegetables, rice, teriyaki sauce" },
      { name: "Lentil Soup", foods: "Lentils, vegetables, whole grain bread" },
    ];
    templates.dinner = [
      { name: "Veggie Curry", foods: "Chickpeas, vegetables, coconut curry, rice" },
      { name: "Black Bean Tacos", foods: "Black beans, corn tortillas, avocado, salsa" },
      { name: "Pasta Primavera", foods: "Whole wheat pasta, vegetables, olive oil" },
    ];
  }

  return templates;
}

// Get meal type based on position
function getMealType(mealIndex, totalMeals) {
  if (totalMeals === 3) {
    return ["Breakfast", "Lunch", "Dinner"][mealIndex];
  }
  if (totalMeals === 4) {
    return ["Breakfast", "Lunch", "Snack", "Dinner"][mealIndex];
  }
  if (totalMeals === 5) {
    return ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"][mealIndex];
  }
  return ["Breakfast", "Snack", "Lunch", "Snack", "Dinner", "Snack"][mealIndex];
}

// Get random meal from templates
function getRandomMeal(templates, mealType) {
  const key = mealType.toLowerCase();
  const options = templates[key] || templates.snack;
  return options[Math.floor(Math.random() * options.length)];
}

// Render meal plan
function renderMealPlan(plan) {
  // Update totals
  document.getElementById("planTotalCalories").textContent = plan.totals.calories.toLocaleString();
  document.getElementById("planTotalProtein").textContent = `${plan.totals.protein}g`;
  document.getElementById("planTotalCarbs").textContent = `${plan.totals.carbs}g`;
  document.getElementById("planTotalFat").textContent = `${plan.totals.fat}g`;

  // Render days
  mealPlanDays.innerHTML = plan.days
    .map(
      (day) => `
    <div class="meal-day">
      <div class="meal-day-header">${day.dayName}</div>
      <div class="meal-items">
        ${day.meals
          .map(
            (meal) => `
          <div class="meal-item">
            <div>
              <div class="meal-item-name">${meal.type}: ${meal.name}</div>
              <div class="meal-item-foods">${meal.foods}</div>
            </div>
            <div class="meal-item-macros">
              <div>${meal.calories} cal</div>
              <div>P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `
    )
    .join("");
}

// Download plan as PDF (simplified - just text for now)
function downloadPlan() {
  if (!currentPlan) return;

  let text = "YOUR PERSONALIZED MEAL PLAN\n";
  text += "Generated by The Tracker App\n";
  text += "================================\n\n";

  text += `Daily Totals: ${currentPlan.totals.calories} calories | ${currentPlan.totals.protein}g protein | ${currentPlan.totals.carbs}g carbs | ${currentPlan.totals.fat}g fat\n\n`;

  currentPlan.days.forEach((day) => {
    text += `${day.dayName.toUpperCase()}\n`;
    text += "-".repeat(20) + "\n";

    day.meals.forEach((meal) => {
      text += `${meal.type}: ${meal.name}\n`;
      text += `  Foods: ${meal.foods}\n`;
      text += `  Macros: ${meal.calories} cal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g\n\n`;
    });

    text += "\n";
  });

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meal-plan.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// Handle form submission
function handleSubmit(e) {
  e.preventDefault();

  const formData = new FormData(mealPlannerForm);

  const params = {
    calories: parseInt(formData.get("calories")),
    protein: formData.get("protein") ? parseInt(formData.get("protein")) : null,
    goal: formData.get("goal"),
    mealsPerDay: formData.get("mealsPerDay"),
    diet: formData.getAll("diet"),
    exclude: formData.get("exclude") || "",
  };

  generateMealPlan(params);

  // Track for analytics
  if (typeof gtag === "function") {
    gtag("event", "meal_plan_generated", {
      event_category: "calculator",
      event_label: params.goal,
    });
  }
}

// Event listeners
mealPlannerForm?.addEventListener("submit", handleSubmit);

regeneratePlanBtn?.addEventListener("click", () => {
  if (currentParams) {
    generateMealPlan(currentParams);
  }
});

downloadPlanBtn?.addEventListener("click", downloadPlan);

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const loginLink = document.getElementById("loginLink");
  const dashboardLink = document.getElementById("dashboardLink");
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";

  if (loginLink) loginLink.hidden = isAuthenticated;
  if (dashboardLink) dashboardLink.hidden = !isAuthenticated;
}

init();
