import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        logout: resolve(__dirname, "logout.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
        pebbleApp: resolve(__dirname, "pebble-app.html"),
        macApps: resolve(__dirname, "mac-apps.html"),
        authorize: resolve(__dirname, "authorize.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        runClubs: resolve(__dirname, "run-clubs.html"),
        personalTrainers: resolve(__dirname, "personal-trainers.html"),
        workoutResources: resolve(__dirname, "workout-resources.html"),
        affiliateSignup: resolve(__dirname, "affiliate/signup.html"),
        affiliateDashboard: resolve(__dirname, "affiliate/dashboard.html"),
        affiliateConnect: resolve(__dirname, "affiliate/connect.html"),
        // New pages
        blog: resolve(__dirname, "blog.html"),
        press: resolve(__dirname, "press.html"),
        products: resolve(__dirname, "products.html"),
        brackets: resolve(__dirname, "brackets.html"),
        win: resolve(__dirname, "win.html"),
        // Free Tools (SEO pages)
        tdeeCalculator: resolve(__dirname, "tools/tdee-calculator.html"),
        bmiCalculator: resolve(__dirname, "tools/bmi-calculator.html"),
        aiMealPlanner: resolve(__dirname, "tools/ai-meal-planner.html"),
        foodDiary: resolve(__dirname, "tools/food-diary.html"),
      },
    },
  },
});
