import { test, expect, Page } from '@playwright/test'

// Helper function to login
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/이메일/i).fill('test@example.com')
  await page.getByLabel(/비밀번호/i).fill('testpassword123')
  await page.getByRole('button', { name: /로그인/i }).click()
  await page.waitForURL(/\/(recipes|dashboard)/)
}

test.describe('Recipes', () => {
  test.describe('Recipe List', () => {
    test.skip('should display recipes page after login', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(page.getByRole('heading', { name: /레시피/i })).toBeVisible()
    })

    test.skip('should show new recipe button', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(
        page.getByRole('link', { name: /새.*레시피|레시피.*추가/i })
      ).toBeVisible()
    })

    test.skip('should show URL import button', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(page.getByRole('button', { name: /URL|가져오기/i })).toBeVisible()
    })
  })

  test.describe('Recipe Creation', () => {
    test.skip('should show recipe creation form', async ({ page }) => {
      await login(page)
      await page.goto('/recipes/new')
      await expect(page.getByLabel(/제목/i)).toBeVisible()
      await expect(page.getByLabel(/설명/i)).toBeVisible()
    })

    test.skip('should have ingredient fields', async ({ page }) => {
      await login(page)
      await page.goto('/recipes/new')
      await expect(page.getByText(/재료/i)).toBeVisible()
    })

    test.skip('should have instruction fields', async ({ page }) => {
      await login(page)
      await page.goto('/recipes/new')
      await expect(page.getByText(/조리.*순서|순서/i)).toBeVisible()
    })

    test.skip('should validate required fields', async ({ page }) => {
      await login(page)
      await page.goto('/recipes/new')
      await page.getByRole('button', { name: /저장|생성/i }).click()
      await expect(page.getByText(/필수/i).first()).toBeVisible()
    })
  })

  test.describe('Recipe Search', () => {
    test.skip('should show search input', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(page.getByPlaceholder(/검색|찾기/i)).toBeVisible()
    })

    test.skip('should show category filter', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(page.getByText(/카테고리/i)).toBeVisible()
    })

    test.skip('should show difficulty filter', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await expect(page.getByText(/난이도/i)).toBeVisible()
    })
  })

  test.describe('URL Import', () => {
    test.skip('should open URL import dialog', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await page.getByRole('button', { name: /URL|가져오기/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test.skip('should show URL input field in dialog', async ({ page }) => {
      await login(page)
      await page.goto('/recipes')
      await page.getByRole('button', { name: /URL|가져오기/i }).click()
      await expect(page.getByPlaceholder(/URL/i)).toBeVisible()
    })
  })
})
