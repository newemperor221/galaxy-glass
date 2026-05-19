import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  output: "static",
  site: "https://stat.357561.xyz",
  build: {
    assets: "_astro",
  },
});
