import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/__tests__/**", "apps/*/__tests__/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**"],
    },
  },
});
