import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * M10 accessibility DoD: "axe/manual screen-reader pass on create/edit
 * forms and admin tables shows no missing-label errors." This suite runs
 * axe-core (wcag2a/wcag2aa/wcag21aa rulesets, axe's defaults) against the
 * real rendered app — a static code review can flag obviously missing
 * `htmlFor`/`aria-label` pairs but can't catch runtime issues (focus
 * order, computed contrast, dynamically-injected content, landmark
 * structure), which is why this needs a live browser pass.
 *
 * Requires: `npm run dev` running against a local Supabase instance with
 * demo users seeded (`npm run seed:users`) and at least one approved
 * listing seeded (see scratchpad seed-properties.sql from this session).
 */

const ADMIN_EMAIL = 'admin@othman.com'
const ADMIN_PASSWORD = 'OthmanAdmin#6421!'
const USER_EMAIL = 'user@othman.com'
const USER_PASSWORD = 'OthmanUser#6421!'

async function login(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.goto('/auth/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

async function runAxe(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
}

function formatViolations(violations: import('axe-core').Result[]) {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n) => `    - ${n.target.join(' ')}: ${n.failureSummary}`)
        .join('\n')
      return `[${v.impact}] ${v.id} — ${v.help}\n${nodes}`
    })
    .join('\n\n')
}

test.describe('Public pages', () => {
  test('home page has no axe violations', async ({ page }) => {
    await page.goto('/')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('properties search/listing page has no axe violations', async ({
    page,
  }) => {
    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('property detail page has no axe violations', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
    const firstCard = page.locator('a[href^="/properties/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('login page has no axe violations', async ({ page }) => {
    await page.goto('/auth/login')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})

test.describe('Authenticated user: create/edit listing forms', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD)
  })

  test('create-listing form has no axe violations', async ({ page }) => {
    await page.goto('/dashboard/properties/create')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('dashboard properties list has no axe violations', async ({ page }) => {
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('edit-listing form has no axe violations', async ({ page }) => {
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')
    const editLink = page.locator('a[href*="/edit"]').first()
    if ((await editLink.count()) === 0) {
      test.skip(true, 'No owned listing available to edit in seeded data')
    }
    await editLink.click()
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})

test.describe('Admin: tables', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  })

  test('admin properties table has no axe violations', async ({ page }) => {
    await page.goto('/admin/properties')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('admin users table has no axe violations', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('admin analytics page has no axe violations', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('admin audit log page has no axe violations', async ({ page }) => {
    await page.goto('/admin/audit-log')
    await page.waitForLoadState('networkidle')
    const results = await runAxe(page)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})
