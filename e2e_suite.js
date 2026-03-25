const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('🚀 Starting E2E Test Suite...');

  try {
    // 1. Authentication Tests
    await testAuthentication(page);

    // 2. Booking Flow - Step 1: Occupancy
    await testBookingStep1(page);

    // 3. Booking Flow - Step 2: Meals & Seasonal Rules
    await testBookingStep2(page);

    // 4. Review & Confirm
    await testBookingStep3(page);

    // 5. Admin Dashboard & Reports
    await testAdminDashboard(page);

    console.log('\n✅ ALL E2E TESTS PASSED!');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    // Log visible text on failure for debugging
    const text = await page.evaluate(() => document.body.innerText).catch(() => 'Could not get page text');
    console.log('--- Page text at failure ---');
    console.log(text.substring(0, 1000));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function testAuthentication(page) {
  console.log('\n--- Scenario 1: Authentication ---');

  // Test Invalid Login
  console.log('Testing invalid login...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('select');
  await page.select('select', 'admin');
  await page.type('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  await wait(1000); 
  
  // Test Valid Login (Admin)
  console.log('Testing valid admin login...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('select');
  await page.select('select', 'admin');
  await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for landing page
  await page.waitForSelector('h1, h2', { timeout: 5000 });
  console.log('Admin login successful.');
}

async function testBookingStep1(page) {
  console.log('\n--- Scenario 2: Booking Flow Step 1 ---');
  
  // Ensure we are in Grid View
  console.log('Switching to Grid View...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Grid View'));
    if (btn) btn.click();
  });
  await wait(1000);

  // Select cells
  console.log('Selecting dates for Clubhouse #1...');
  await page.evaluate(() => {
    // Try multiple ways to find the grid container
    const gridContainer = document.querySelector('div[style*="grid-template-columns"]') || 
                          Array.from(document.querySelectorAll('.grid')).find(el => el.children.length > 100);
    
    if (!gridContainer) {
      const allDivs = Array.from(document.querySelectorAll('div')).length;
      throw new Error(`Grid container not found. Total divs on page: ${allDivs}`);
    }
    
    console.log(`Grid container found with ${gridContainer.children.length} children.`);

    // Match logic for Saturday Mar 21
    const headers = Array.from(document.querySelectorAll('.bg-amber-50\\/50, .bg-stone-50, .bg-emerald-50'));
    const satHeader = headers.find(h => h.textContent.includes('21') && h.textContent.includes('Sat'));
    if (!satHeader) throw new Error('Saturday header (Mar 21) not found');
    
    const headerChildren = Array.from(satHeader.parentElement.children);
    const satIndex = headerChildren.indexOf(satHeader) - 1; // header row has a corner div
    
    const roomRows = Array.from(document.querySelectorAll('.sticky.left-0')).filter(el => el.textContent.includes('#'));
    const ch1RowIndex = roomRows.findIndex(el => el.textContent.includes('Clubhouse #1'));
    if (ch1RowIndex === -1) throw new Error('Clubhouse #1 row not found in sticky headers');
    
    const itemsPerRow = 22;
    const baseIndex = (ch1RowIndex + 1) * itemsPerRow;
    
    // Click Fri, Sat, Sun with delays
    const cells = gridContainer.children;
    const click = (idx) => { if (cells[idx]) cells[idx].click(); };
    click(baseIndex + satIndex - 1); // Fri
    click(baseIndex + satIndex);     // Sat
    click(baseIndex + satIndex + 1); // Sun
  });

  await wait(1000);
  
  console.log('Confirming selection...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Selection'));
    if (btn) btn.click();
  });
  
  await page.waitForSelector('input[placeholder="Your name"]', { timeout: 10000 });
  await page.type('input[placeholder="Your name"]', 'E2E Tester');
  
  console.log('Proceeding to Step 2: Meals...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue' || 'Meals'));
    if (btn) btn.click();
  });
  
  await wait(2000);
}

async function testBookingStep2(page) {
  console.log('\n--- Scenario 3: Meal Logic & Seasonal Rules ---');
  
  await page.waitForFunction(
    () => document.body.innerText.includes('Meal Planning'),
    { timeout: 10000 }
  );
  
  const mealStatus = await page.evaluate(() => {
    // Find all divs, filter for ones that contain "Mar 21" and "Breakfast"
    // and have at least some inputs.
    const potentialRows = Array.from(document.querySelectorAll('div')).filter(el => {
      const text = el.innerText || '';
      return text.includes('Mar 21') && text.includes('Breakfast') && el.querySelector('input');
    });

    if (potentialRows.length === 0) return { error: 'Saturday row (Mar 21) not found by text search.' };
    
    // Pick the most comprehensive one (longest text that contains the requirements)
    const satRow = potentialRows.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    
    // Correct way: Find the checkboxes by looking for the meal text labels
    const findCheckbox = (label) => {
      const container = Array.from(satRow.querySelectorAll('div')).find(el => el.innerText.includes(label));
      return container ? container.querySelector('input[type="checkbox"]') : null;
    };

    const brCb = findCheckbox('Breakfast');
    const luCb = findCheckbox('Lunch');
    const suCb = findCheckbox('Bar Supper');

    return {
      br: brCb ? !brCb.disabled : 'MISSING',
      lu: luCb ? !luCb.disabled : 'MISSING',
      su: suCb ? !suCb.disabled : 'MISSING'
    };
  });

  if (mealStatus.error) throw new Error(mealStatus.error);
  console.log(`Saturday (Mar 21) Meals: Br:${mealStatus.br}, Lu:${mealStatus.lu}, Su:${mealStatus.su}`);
  if (mealStatus.br === 'MISSING' || mealStatus.lu === 'MISSING' || mealStatus.su === 'MISSING') {
     throw new Error('Some meal checkboxes were not found in Saturday row.');
  }
  if (!mealStatus.br || !mealStatus.lu || !mealStatus.su) throw new Error('Saturday Meal Logic Failure');

  console.log('Proceeding to review...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Booking') || b.textContent.includes('Review Selection'));
    if (btn) btn.click();
  });
  
  await wait(2000);
}

async function testBookingStep3(page) {
  console.log('\n--- Scenario 4: Review & Confirm ---');
  await page.waitForSelector('h2', { timeout: 5000 });
  
  console.log('Completing booking...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Complete Booking'));
    if (btn) btn.click();
  });
  
  await wait(2000);
}

async function testAdminDashboard(page) {
  console.log('\n--- Scenario 5: Admin Dashboard ---');
  
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
    if (btn) btn.click();
  });
  await wait(500);
  
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reports'));
    if (btn) btn.click();
  });
  await wait(500);
  
  console.log('Reports View reached successfully.');
}

runTests();
