import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        runClubs: resolve(__dirname, "run-clubs.html"),
        personalTrainers: resolve(__dirname, "personal-trainers.html"),
        workoutResources: resolve(__dirname, "workout-resources.html"),
      },
    },
  },
});
