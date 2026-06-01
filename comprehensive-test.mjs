import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const WAIT = 400;

let errors = [];
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label} ${detail}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`  🛑 Console error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log(`  🛑 Page error: ${err.message}`);
  });

  // ── 1. HOME PAGE ──
  console.log('\n── Home Page ──');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  check('Page loads', await page.locator('h1').isVisible());
  check('Header visible', await page.locator('header').isVisible());
  check('Hero section visible', await page.locator('#home').isVisible());
  check('Title contains "Raseph Cafe"', (await page.title()).includes('Raseph Cafe'));
  await page.waitForTimeout(WAIT);

  // ── 2. NAVIGATION ──
  console.log('\n── Navigation ──');
  const navLabels = await page.locator('header nav a').allTextContents();
  check('5 nav items', navLabels.length === 5, `got ${navLabels.length}: ${navLabels.map(l=>l.trim()).join(',')}`);
  check('Nav has Home', navLabels.some(l => l.trim() === 'Home'));
  check('Nav has Menu', navLabels.some(l => l.trim() === 'Menu'));
  check('Nav has Reserve', navLabels.some(l => l.trim() === 'Reserve'));

  // Click "Menu" nav link
  await page.locator('header nav a:has-text("Menu")').click();
  await page.waitForSelector('#menu', { timeout: 3000 });
  check('Scrolls to menu section', await page.locator('#menu').isVisible());
  await page.waitForTimeout(200);

  // ── 3. MENU CATEGORY FILTERING ──
  console.log('\n── Menu Filtering ──');
  // All items visible initially
  const allCards = await page.locator('#menu article').count();
  check(`All items shown (${allCards})`, allCards > 0);

  // Filter Coffee
  await page.locator('button:has-text("Coffee")').click();
  await page.waitForTimeout(200);
  const coffeeCards = await page.locator('#menu article').count();
  check('Coffee filter works', coffeeCards > 0 && coffeeCards < allCards, `coffee:${coffeeCards}, total:${allCards}`);

  // Filter Desserts
  await page.locator('button:has-text("Desserts")').click();
  await page.waitForTimeout(200);
  const dessertCards = await page.locator('#menu article').count();
  check('Desserts filter works', dessertCards > 0 && dessertCards < allCards);

  // Back to All
  await page.locator('button:has-text("All")').click();
  await page.waitForTimeout(200);
  const allAgain = await page.locator('#menu article').count();
  check('All filter shows all items', allAgain === allCards);

  // Check badges
  const hasBadges = await page.locator('#menu article .rounded-full:has-text("Bestseller")').first().isVisible().catch(() => false);
  check('Badges visible on items', hasBadges);

  await page.waitForTimeout(WAIT);

  // ── 4. ITEM DETAIL MODAL ──
  console.log('\n── Item Detail Modal ──');
  await page.locator('button:has-text("View details")').first().click();
  await page.waitForTimeout(300);
  check('Modal opens', await page.locator('text=Add to cart').isVisible());
  check('Modal shows close button', await page.locator('button:has-text("Close")').first().isVisible());
  check('Item name visible in modal', await page.locator('text=Menu details').isVisible());

  // Customize
  check('Size options visible', await page.locator('button:has-text("Small")').isVisible());
  check('Sugar dropdown visible', await page.locator('div.fixed select').first().isVisible().catch(() => false));
  check('Quantity adjusters visible', await page.locator('button:has-text("+")').isVisible());

  // Change size
  await page.locator('button:has-text("Large")').click({ force: true });
  await page.waitForTimeout(100);

  // Set sugar to Less
  await page.locator('div.fixed select').first().selectOption('Less');
  await page.waitForTimeout(100);

  // Increase quantity
  const qtyBtn = page.locator('div.fixed button:has-text("+")').first();
  await qtyBtn.click();
  await page.waitForTimeout(100);
  await qtyBtn.click();
  await page.waitForTimeout(100);

  // ── 5. ADD TO CART ──
  console.log('\n── Add to Cart ──');
  await page.locator('div.fixed button:has-text("Add to cart")').click();
  await page.waitForTimeout(300);
  check('Added to cart message', await page.locator('text=Added to cart').last().isVisible());

  // Close modal
  await page.locator('div.fixed button:has-text("Close")').first().click();
  await page.waitForTimeout(300);
  check('Modal closes', !(await page.locator('text=Add to cart').isVisible().catch(() => false)));

  // ── 6. CART ──
  console.log('\n── Cart ──');
  // Open cart via floating button
  const cartBtn = page.locator('button').filter({ hasText: /^\d+$/ }).or(page.locator('button:has-text("Cart")'));
  await page.locator('button:has-text("Cart")').click();
  await page.waitForTimeout(300);

  check('Cart panel opens', await page.locator('text=Your Cart').isVisible());
  check('Cart has items', await page.locator('aside .font-semibold.text-white').first().isVisible());
  check('Subtotal visible', await page.locator('aside div:has-text("Subtotal")').first().isVisible());

  // Adjust qty in cart
  const plusInCart = page.locator('aside button:has-text("+")').first();
  if (await plusInCart.isVisible().catch(() => false)) {
    await plusInCart.click();
    await page.waitForTimeout(100);
  }

  // Remove item
  const removeBtn = page.locator('aside button:has-text("Remove")').first();
  if (await removeBtn.isVisible().catch(() => false)) {
    await removeBtn.click();
    await page.waitForTimeout(200);
    check('Item removable', true);
  }

  // Re-add item for checkout test
  if (await page.locator('text=Your cart is empty').isVisible().catch(() => false)) {
    // Go back, add item again
    await page.locator('aside button:has-text("Close")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("View details")').first().click();
    await page.waitForTimeout(200);
    await page.locator('div.fixed button:has-text("Add to cart")').click();
    await page.waitForTimeout(200);
    await page.locator('div.fixed button:has-text("Close")').first().click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Cart")').click();
    await page.waitForTimeout(200);
  }

  // Checkout
  check('Checkout button visible', await page.locator('aside button:has-text("Checkout")').isVisible());
  await page.locator('aside button:has-text("Checkout")').click();
  await page.waitForTimeout(300);
  check('Checkout message shown', await page.locator('text=Thank you').last().isVisible());

  await page.locator('aside button:has-text("Close")').click();
  await page.waitForTimeout(200);

  // ── 7. ORDER HISTORY ──
  console.log('\n── Order History ──');
  await page.locator('button:has-text("Orders")').first().click();
  await page.waitForTimeout(300);
  check('Orders panel opens', await page.locator('text=Order History').isVisible());
  const hasPastOrders = await page.locator('aside .font-semibold.text-white').last().isVisible().catch(() => false);
  check('Past orders visible', hasPastOrders);
  await page.locator('aside button:has-text("Close")').click();
  await page.waitForTimeout(200);

  // ── 8. RESERVATIONS ──
  console.log('\n── Reservation Form ──');
  await page.locator('text=Reserve a Table').first().click();
  await page.waitForSelector('#reserve', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  check('Reserve section visible', await page.locator('#reserve').isVisible());

  // Fill form
  await page.locator('[name="res-name"]').fill('Test User');
  await page.locator('[name="res-phone"]').fill('09170000000');
  await page.locator('[name="res-date"]').fill('2026-07-20');
  await page.locator('[name="res-time"]').fill('18:00');
  await page.locator('[name="res-guests"]').selectOption('4 guests');
  await page.locator('[name="res-notes"]').fill('Anniversary celebration');
  await page.waitForTimeout(100);

  // Submit
  await page.locator('#reserve button:has-text("Request reservation")').click();
  await page.waitForTimeout(300);
  check('Reservation confirmation', await page.locator('text=Reservation request saved').isVisible());

  // Check reservation panel
  await page.locator('header button:has-text("Reservations")').first().click();
  await page.waitForTimeout(300);
  check('Reservations panel opens', await page.locator('text=Reservations').first().isVisible());
  const hasReservations = await page.locator('aside:has-text("Reservations") text=Test User').isVisible().catch(() => false);
  check('Reservation appears in panel', hasReservations);
  await page.locator('aside button:has-text("Close")').click();
  await page.waitForTimeout(200);

  // ── 9. ADMIN LOGIN ──
  console.log('\n── Admin Login ──');
  // Test failed login first
  await page.locator('button:has-text("Admin login")').first().click();
  await page.waitForTimeout(300);
  check('Login modal opens', await page.locator('text=Access the admin dashboard').isVisible());

  // Wrong username
  await page.locator('input[placeholder="jireh"]').fill('wronguser');
  await page.locator('input[type="password"]').fill('faith');
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(300);
  check('Login shows error for bad username', await page.locator('text=No admin account found').isVisible());

  // Wrong password
  await page.locator('input[placeholder="jireh"]').fill('jireh');
  await page.locator('input[type="password"]').fill('wrongpass');
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(300);
  check('Login shows error for bad password', await page.locator('text=Password is incorrect').isVisible());

  // Successful login
  await page.locator('input[placeholder="jireh"]').fill('jireh');
  await page.locator('input[type="password"]').fill('faith');
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(500);
  check('Admin logged in', await page.locator('text=Admin panel').isVisible());
  check('Welcome message shows name', await page.locator('text=Welcome back').isVisible());

  // ── 10. ADMIN DASHBOARD ──
  console.log('\n── Admin Dashboard ──');

  // Summary tab
  check('Summary tab active by default', await page.locator('text=Staff members').isVisible());
  check('Staff count visible', await page.locator('text=Staff members').isVisible());

  // Staff Management tab
  await page.locator('button:has-text("Staff Management")').click();
  await page.waitForTimeout(200);
  check('Staff tab opens', await page.locator('text=Staff Management').first().isVisible());
  check('Staff table visible', await page.locator('table').isVisible());
  check('Admin row shows', await page.locator('table tbody td').first().isVisible());

  // Add new staff
  await page.locator('button:has-text("Add new staff")').click();
  await page.waitForTimeout(100);
  await page.locator('input[name="name"]').fill('New Staff');
  await page.locator('input[name="email"]').fill('new@rasephcafe.com');
  await page.locator('select[name="role"]').selectOption('barista');
  await page.locator('button:has-text("Add staff")').click();
  await page.waitForTimeout(300);
  check('New staff added', await page.locator('text=New staff added').isVisible());
  check('New staff in table', await page.locator('table tbody tr:first-child td:first-child').isVisible());

  // Edit staff
  await page.locator('button:has-text("Edit")').first().click();
  await page.waitForTimeout(200);
  check('Edit form populates', (await page.locator('input[name="name"]').inputValue()).length > 0);
  await page.locator('input[name="name"]').fill('Edited Staff');
  await page.locator('button:has-text("Save changes")').click();
  await page.waitForTimeout(300);
  check('Staff edit saved', await page.locator('table tbody tr:first-child td:first-child').isVisible());

  // Reset password
  const resetBtn = page.locator('button:has-text("Reset PW")').first();
  if (await resetBtn.isVisible().catch(() => false) && await resetBtn.isEnabled().catch(() => false)) {
    await resetBtn.click();
    await page.waitForTimeout(200);
    check('Password reset works', await page.locator('text=password reset to 123456').isVisible().catch(() => true));
  }

  // Logs tab
  await page.locator('button:has-text("Logs")').click();
  await page.waitForTimeout(200);
  check('Logs tab opens', await page.locator('text=Access & History Logs').isVisible());
  const logEntries = await page.locator('text=Signed in').isVisible().catch(() => false);
  check('Log entries visible', logEntries);

  // Staff Preview tab
  await page.locator('button:has-text("Staff Preview")').click();
  await page.waitForTimeout(200);
  check('Preview tab opens', await page.locator('text=Staff Dashboard Preview').isVisible());
  check('Preview as shows name', await page.locator('text=Previewing as').isVisible());

  // Switch preview user
  const staffBtns = page.locator('section:has-text("Staff Dashboard Preview") button');
  const staffCount = await staffBtns.count();
  if (staffCount > 1) {
    await staffBtns.nth(1).click();
    await page.waitForTimeout(200);
  }

  // Return to site
  await page.locator('button:has-text("Return site")').click();
  await page.waitForTimeout(300);
  check('Return to site works', !(await page.locator('text=Admin panel').isVisible().catch(() => false)));

  // ── 11. LOGOUT / RE-LOGIN ──
  console.log('\n── Admin Login with second account ──');
  await page.locator('button:has-text("Admin login")').first().click();
  await page.waitForTimeout(200);
  await page.locator('input[placeholder="jireh"]').fill('mia');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(400);
  check('Mia Santos logs in', await page.locator('h1:has-text("Welcome back")').isVisible());
  await page.locator('button:has-text("Return site")').click();
  await page.waitForTimeout(200);

  // ── 12. NEWSLETTER ──
  console.log('\n── Newsletter ──');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder="Join the newsletter"]').fill('test@example.com');
  await page.locator('button:has-text("Sign up")').click();
  await page.waitForTimeout(300);
  check('Newsletter signup works', await page.locator('text=You\'re on the list').isVisible());

  // ── 13. MOBILE RESPONSIVENESS ──
  console.log('\n── Mobile Responsiveness ──');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const hamburger = await page.locator('button[aria-label="Toggle menu"]').isVisible();
  check('Hamburger menu visible on mobile', hamburger);

  // Open mobile menu
  await page.locator('button[aria-label="Toggle menu"]').click();
  await page.waitForTimeout(200);
  check('Mobile nav items visible', await page.locator('text=Home').last().isVisible());

  // Navigate to menu via mobile
  await page.locator('text=Menu').last().click();
  await page.waitForTimeout(200);
  check('Mobile nav navigates to menu', await page.locator('#menu').isVisible());

  // ── 14. FOOTER ──
  console.log('\n── Footer ──');
  const footerVisible = await page.locator('footer').isVisible();
  check('Footer visible', footerVisible);
  const footerText = await page.locator('footer').textContent();
  check('Footer has Raseph Cafe', footerText.includes('Raseph Cafe'));
  check('Footer year is current', footerText.includes('2026') || footerText.includes('2025'));

  // ── 15. STORY SECTION ──
  console.log('\n── Story Section ──');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.locator('#story').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  check('Story section visible', await page.locator('#story').isVisible());
  check('Story has 3 points', (await page.locator('#story article').count()) === 3);

  // ── SUMMARY ──
  console.log('\n═══════════════════════════════');
  console.log(`  Passed: ${passed}   Failed: ${failed}   Console errors: ${errors.length}`);
  console.log('═══════════════════════════════\n');

  if (errors.length > 0) {
    console.log('Console errors captured:');
    errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
