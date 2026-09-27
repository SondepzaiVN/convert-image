import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const routeInputs = Object.fromEntries(
  readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !["index.html", "404.html"].includes(entry.name))
    .map((entry) => [entry.name.replace(/\.html$/, ""), resolve(entry.name)]),
);

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    rollupOptions: { input: { main: resolve("index.html"), notFound: resolve("404.html"), ...routeInputs } },
  },
  worker: { format: "es" },
});
