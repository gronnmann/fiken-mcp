import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/__tests__/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/__tests__/**"],
            reporter: ["text", "lcov"],
            thresholds: {
                lines: 100,
                branches: 100,
                functions: 100,
                statements: 100,
            },
        },
    },
});
