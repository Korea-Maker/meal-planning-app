import { test, expect, Page } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Meal Plans - Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page)

    // Take screenshot after login
    await page.screenshot({
      path: 'e2e/screenshots/00-after-login.png',
      fullPage: true
    })

    // Navigate to meal plans page
    await page.goto('/meal-plans')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Take initial screenshot
    await page.screenshot({
      path: 'e2e/screenshots/01-initial-page.png',
      fullPage: true
    })
  })

  test('TC1: Page loads and displays meal plan structure', async ({ page }) => {
    // Verify page title or heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Check for week navigation or date display
    const weekNavigation = page.locator('[data-testid*="week"], [class*="week"]')
    const hasWeekElements = await weekNavigation.count() > 0

    console.log('Week navigation elements found:', hasWeekElements)

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/02-page-structure.png',
      fullPage: true
    })
  })

  test('TC2: Check for meal cards and "추천으로 채우기" button', async ({ page }) => {
    // Look for meal cards
    const mealCards = page.locator('[data-testid*="meal"], [class*="meal-card"], [draggable="true"]')
    const mealCardCount = await mealCards.count()

    console.log('Meal cards found:', mealCardCount)

    // Look for "추천으로 채우기" button
    const fillButton = page.locator('button:has-text("추천으로 채우기"), button:has-text("추천"), button:has-text("채우기")')
    const fillButtonVisible = await fillButton.isVisible().catch(() => false)

    console.log('Fill button visible:', fillButtonVisible)

    if (fillButtonVisible) {
      // Highlight the button
      await fillButton.evaluate(el => {
        el.style.border = '3px solid red'
      })

      await page.screenshot({
        path: 'e2e/screenshots/03-fill-button-found.png',
        fullPage: true
      })

      // Click the button
      await fillButton.click()

      // Wait for recipes to load
      await page.waitForTimeout(2000)

      // Take screenshot after filling
      await page.screenshot({
        path: 'e2e/screenshots/04-after-fill.png',
        fullPage: true
      })
    } else {
      await page.screenshot({
        path: 'e2e/screenshots/03-no-fill-button.png',
        fullPage: true
      })
    }

    // Re-count meal cards
    const updatedMealCardCount = await mealCards.count()
    console.log('Meal cards after fill:', updatedMealCardCount)
  })

  test('TC3: Drag and drop meal card to different slot', async ({ page }) => {
    // Wait for any initial animations
    await page.waitForTimeout(1000)

    // Find draggable meal cards
    const draggableCards = page.locator('[draggable="true"]')
    const cardCount = await draggableCards.count()

    console.log('Draggable cards found:', cardCount)

    if (cardCount === 0) {
      console.log('No draggable cards found. Checking for fill button...')
      const fillButton = page.locator('button:has-text("추천으로 채우기"), button:has-text("추천"), button:has-text("채우기")')
      const fillButtonVisible = await fillButton.isVisible().catch(() => false)

      if (fillButtonVisible) {
        await fillButton.click()
        await page.waitForTimeout(2000)
      }
    }

    // Re-check for draggable cards
    const updatedCardCount = await draggableCards.count()
    console.log('Draggable cards after fill attempt:', updatedCardCount)

    if (updatedCardCount < 2) {
      console.log('Not enough meal cards for drag and drop test')
      await page.screenshot({
        path: 'e2e/screenshots/05-insufficient-cards.png',
        fullPage: true
      })
      test.skip()
      return
    }

    // Get source and target cards
    const sourceCard = draggableCards.nth(0)
    const targetCard = draggableCards.nth(1)

    // Get initial positions
    const sourceBoundingBox = await sourceCard.boundingBox()
    const targetBoundingBox = await targetCard.boundingBox()

    if (!sourceBoundingBox || !targetBoundingBox) {
      console.log('Could not get bounding boxes')
      test.skip()
      return
    }

    console.log('Source card position:', sourceBoundingBox)
    console.log('Target card position:', targetBoundingBox)

    // Highlight source and target
    await sourceCard.evaluate(el => {
      el.style.border = '3px solid blue'
    })
    await targetCard.evaluate(el => {
      el.style.border = '3px solid green'
    })

    await page.screenshot({
      path: 'e2e/screenshots/06-before-drag.png',
      fullPage: true
    })

    // Perform drag and drop with detailed steps
    // 1. Mouse down on source
    await page.mouse.move(
      sourceBoundingBox.x + sourceBoundingBox.width / 2,
      sourceBoundingBox.y + sourceBoundingBox.height / 2
    )

    await page.screenshot({
      path: 'e2e/screenshots/07-mouse-on-source.png',
      fullPage: true
    })

    await page.mouse.down()

    // 2. Wait a moment (important for drag start)
    await page.waitForTimeout(300)

    await page.screenshot({
      path: 'e2e/screenshots/08-drag-started.png',
      fullPage: true
    })

    // 3. Move to intermediate position (to verify element follows cursor)
    const midX = (sourceBoundingBox.x + targetBoundingBox.x) / 2 + sourceBoundingBox.width / 2
    const midY = (sourceBoundingBox.y + targetBoundingBox.y) / 2 + sourceBoundingBox.height / 2

    await page.mouse.move(midX, midY, { steps: 10 })
    await page.waitForTimeout(200)

    await page.screenshot({
      path: 'e2e/screenshots/09-dragging-midpoint.png',
      fullPage: true
    })

    // 4. Move to target
    await page.mouse.move(
      targetBoundingBox.x + targetBoundingBox.width / 2,
      targetBoundingBox.y + targetBoundingBox.height / 2,
      { steps: 10 }
    )

    await page.waitForTimeout(200)

    await page.screenshot({
      path: 'e2e/screenshots/10-over-target.png',
      fullPage: true
    })

    // 5. Mouse up to drop
    await page.mouse.up()

    // 6. Wait for any animations or state updates
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'e2e/screenshots/11-after-drop.png',
      fullPage: true
    })

    console.log('Drag and drop completed')
  })

  test('TC4: Visual verification - dragged element follows cursor', async ({ page }) => {
    // This test focuses on verifying the visual behavior during drag

    await page.waitForTimeout(1000)

    const draggableCards = page.locator('[draggable="true"]')
    const cardCount = await draggableCards.count()

    if (cardCount === 0) {
      const fillButton = page.locator('button:has-text("추천으로 채우기"), button:has-text("추천"), button:has-text("채우기")')
      const fillButtonVisible = await fillButton.isVisible().catch(() => false)

      if (fillButtonVisible) {
        await fillButton.click()
        await page.waitForTimeout(2000)
      }
    }

    const sourceCard = draggableCards.nth(0)
    const boundingBox = await sourceCard.boundingBox()

    if (!boundingBox) {
      test.skip()
      return
    }

    // Start drag
    const startX = boundingBox.x + boundingBox.width / 2
    const startY = boundingBox.y + boundingBox.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.waitForTimeout(300)

    // Move to multiple positions and take screenshots
    const movements = [
      { x: startX + 100, y: startY, name: '12-drag-right-100px' },
      { x: startX + 200, y: startY + 50, name: '13-drag-right-down' },
      { x: startX + 150, y: startY + 150, name: '14-drag-down-diagonal' },
      { x: startX - 50, y: startY + 100, name: '15-drag-left-down' },
    ]

    for (const movement of movements) {
      await page.mouse.move(movement.x, movement.y, { steps: 5 })
      await page.waitForTimeout(200)
      await page.screenshot({
        path: `e2e/screenshots/${movement.name}.png`,
        fullPage: true
      })
      console.log(`Cursor at: (${movement.x}, ${movement.y})`)
    }

    await page.mouse.up()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'e2e/screenshots/16-final-position.png',
      fullPage: true
    })
  })
})
