import { defineConfig, devices } from '@playwright/test'

/**
 * Local-only config for driving the app with a real browser — currently
 * used for the M10 accessibility pass (axe-core) that static code review
 * can't perform. Assumes `npm run dev` (or an equivalent server) is
 * already running against a local Neon database with migrated/seeded data;
 * it intentionally does NOT define a `webServer` block, since this suite
 * is run manually against dev, not wired into CI yet.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
