import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Single root .env: Vite reads ../.env (project root) instead of frontend/.env.
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
