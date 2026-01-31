import { test, expect, Page } from '@playwright/test'

// Helper function to login
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/이메일/i).fill('test@example.com')
  await page.getByLabel(/비밀번호/i).fill('testpassword123')
  await page.getByRole('button', { name: /로그인/i }).click()
  await page.waitForURL(/\/(recipes|dashboard|meal-plans)/)
}

test.describe('Meal Plans', () => {
  test.describe('Meal Calendar', () => {
    test.skip('should display meal plans page after login', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      await expect(page.getByRole('heading', { name: /식사.*계획/i })).toBeVisible()
    })

    test.skip('should show weekly calendar view', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      // Check for day labels
      await expect(page.getByText('월')).toBeVisible()
      await expect(page.getByText('화')).toBeVisible()
      await expect(page.getByText('수')).toBeVisible()
    })

    test.skip('should show meal type slots', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      await expect(page.getByText('아침')).toBeVisible()
      await expect(page.getByText('점심')).toBeVisible()
      await expect(page.getByText('저녁')).toBeVisible()
    })

    test.skip('should have week navigation buttons', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      await expect(page.getByRole('button', { name: /오늘/i })).toBeVisible()
    })

    test.skip('should show shopping list generation button', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      await expect(
        page.getByRole('button', { name: /장보기.*목록.*생성|목록.*생성/i })
      ).toBeVisible()
    })
  })

  test.describe('Week Navigation', () => {
    test.skip('should navigate to previous week', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      const initialText = await page.locator('.font-medium').first().textContent()
      await page.getByRole('button').filter({ hasText: '' }).first().click() // Previous button
      const newText = await page.locator('.font-medium').first().textContent()
      expect(newText).not.toBe(initialText)
    })

    test.skip('should navigate to next week', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      const initialText = await page.locator('.font-medium').first().textContent()
      await page.getByRole('button').filter({ hasText: '' }).nth(1).click() // Next button
      const newText = await page.locator('.font-medium').first().textContent()
      expect(newText).not.toBe(initialText)
    })

    test.skip('should go to today', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      // Navigate away first
      await page.getByRole('button').filter({ hasText: '' }).first().click()
      // Then go to today
      await page.getByRole('button', { name: /오늘/i }).click()
      // Today's date should be highlighted
      await expect(page.locator('.bg-primary')).toBeVisible()
    })
  })

  test.describe('Recipe Selection', () => {
    test.skip('should open recipe picker dialog when clicking empty slot', async ({
      page,
    }) => {
      await login(page)
      await page.goto('/meal-plans')
      // Click on an empty slot (+ button)
      await page.getByRole('button', { name: '+' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test.skip('should show recipe list in picker dialog', async ({ page }) => {
      await login(page)
      await page.goto('/meal-plans')
      await page.getByRole('button', { name: '+' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      // Should have search input
      await expect(page.getByPlaceholder(/검색/i)).toBeVisible()
    })
  })
})

test.describe('Shopping Lists', () => {
  test.describe('Shopping List Page', () => {
    test.skip('should display shopping lists page', async ({ page }) => {
      await login(page)
      await page.goto('/shopping-lists')
      await expect(page.getByRole('heading', { name: /장보기/i })).toBeVisible()
    })

    test.skip('should show create button', async ({ page }) => {
      await login(page)
      await page.goto('/shopping-lists')
      await expect(
        page.getByRole('button', { name: /새.*목록|목록.*추가|생성/i })
      ).toBeVisible()
    })
  })

  test.describe('Shopping List Detail', () => {
    test.skip('should show item checkbox', async ({ page }) => {
      await login(page)
      // Assuming we have a shopping list
      await page.goto('/shopping-lists')
      // Click on first shopping list if exists
      const listLink = page.locator('a[href*="/shopping-lists/"]').first()
      if (await listLink.isVisible()) {
        await listLink.click()
        await expect(page.getByRole('checkbox').first()).toBeVisible()
      }
    })

    test.skip('should show add item form', async ({ page }) => {
      await login(page)
      await page.goto('/shopping-lists')
      const listLink = page.locator('a[href*="/shopping-lists/"]').first()
      if (await listLink.isVisible()) {
        await listLink.click()
        await expect(page.getByPlaceholder(/항목|아이템/i)).toBeVisible()
      }
    })
  })
})
