import { Page } from '@playwright/test'

export async function login(page: Page, email: string = 'test@example.com', password: string = 'password123') {
  // Navigate to login page
  await page.goto('/login')

  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"]', { state: 'visible' })

  // Fill in credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Click login button
  await page.click('button[type="submit"]')

  // Wait for navigation after login
  await page.waitForLoadState('networkidle')

  // Wait a bit for any redirects
  await page.waitForTimeout(1000)
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check if we're on a login/register page
  const url = page.url()
  return !url.includes('/login') && !url.includes('/register')
}
