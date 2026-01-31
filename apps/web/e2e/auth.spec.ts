import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should show registration page', async ({ page }) => {
      await page.goto('/register')
      // Card title
      await expect(page.locator('div.text-2xl:has-text("회원가입")')).toBeVisible()
    })

    test('should have email, password, name fields', async ({ page }) => {
      await page.goto('/register')
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()
      await expect(page.locator('input#name')).toBeVisible()
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/register')
      await page.getByRole('button', { name: '회원가입' }).click()
      // Validation errors should appear
      await expect(page.getByText(/입력하세요/i).first()).toBeVisible()
    })

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/register')
      await page.getByRole('link', { name: '로그인' }).click()
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Login', () => {
    test('should show login page', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByText('로그인', { exact: true }).first()).toBeVisible()
    })

    test('should have email and password fields', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('label:has-text("이메일")')).toBeVisible()
      await expect(page.locator('label:has-text("비밀번호")')).toBeVisible()
    })

    test.skip('should show error for invalid credentials', async ({ page }) => {
      // This test requires backend to be running
      await page.goto('/login')
      await page.locator('input#email').fill('invalid@example.com')
      await page.locator('input#password').fill('wrongpassword123')
      await page.getByRole('button', { name: '로그인' }).click()
      await expect(page.getByText(/실패|오류/i)).toBeVisible({ timeout: 10000 })
    })

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('link', { name: '회원가입' }).click()
      await expect(page).toHaveURL(/\/register/)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing recipes', async ({ page }) => {
      await page.goto('/recipes')
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect to login when accessing meal plans', async ({ page }) => {
      await page.goto('/meal-plans')
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect to login when accessing shopping lists', async ({ page }) => {
      await page.goto('/shopping-lists')
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
