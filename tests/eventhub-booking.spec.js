// require('dotenv').config();
// const { test, expect } = require('@playwright/test');

// test('Successful EventHub ticket booking', async ({ page }) => {
//   // 1. Open the login page
//   await page.goto('https://eventhub.rahulshettyacademy.com/login');

//   // 2. Log in using credentials stored locally in .env
//   await page.getByPlaceholder('you@email.com').fill(process.env.EVENTHUB_EMAIL);
//   await page.locator('#password').fill(process.env.EVENTHUB_PASSWORD);
//   await page.getByRole('button', { name: 'Sign In' }).click();

//   // 3. Verify login succeeds
//   await expect(page).toHaveURL(
//     'https://eventhub.rahulshettyacademy.com/',
//     { timeout: 15000 }
//   );

//   // 4. Open the Events page directly
//   await page.goto('https://eventhub.rahulshettyacademy.com/events');

//   // 5. Find Dilli Diwali Mela
//   const eventCard = page.getByTestId('event-card')
//     .filter({ hasText: 'Dilli Diwali Mela' });

//   await expect(eventCard).toBeVisible();

//   // 6. Open the selected event
//   await eventCard.getByTestId('book-now-btn').click();

//   await expect(
//     page.getByRole('heading', { name: 'Dilli Diwali Mela' })
//   ).toBeVisible();

//   // 7. Verify one ticket is selected
//   await expect(page.locator('#ticket-count')).toHaveText('1');

//   // 8. Fill in the booking form
//   await page.locator('#customerName').fill('Playwright Test User');
//   await page.getByTestId('customer-email').fill(process.env.EVENTHUB_EMAIL);
//   await page.locator('#phone').fill('9876543210');

//   // 9. Confirm the booking
//   await page.getByRole('button', { name: 'Confirm Booking' }).click();

//   // 10. Verify booking confirmation
//   await expect(page.getByText('Booking Confirmed!')).toBeVisible();
//   await expect(page.getByText('Your tickets are reserved.')).toBeVisible();

//   console.log('EventHub booking confirmation verified.');
// });




require('dotenv').config();
const { test, expect } = require('@playwright/test');

test('Successful EventHub ticket booking and seat count decrement', async ({ page }) => {
  // 1. Log in
  await page.goto('https://eventhub.rahulshettyacademy.com/login');

  await page.getByPlaceholder('you@email.com').fill(process.env.EVENTHUB_EMAIL);
  await page.locator('#password').fill(process.env.EVENTHUB_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(
    'https://eventhub.rahulshettyacademy.com/',
    { timeout: 15000 }
  );

  // 2. Open Events and find the event
  await page.goto('https://eventhub.rahulshettyacademy.com/events');

  const eventCard = page.getByTestId('event-card')
    .filter({ hasText: 'Dilli Diwali Mela' });

  await expect(eventCard).toBeVisible();

  // 3. Record the available seats before booking
  const beforeText = await eventCard.innerText();
  const beforeMatch = beforeText.match(
    /(\d+)\s+seats?\s+(?:available|left)/i
  );

  expect(
    beforeMatch,
    `Could not read the initial seat count. Event card text: ${beforeText}`
  ).not.toBeNull();

  const seatsBefore = Number(beforeMatch[1]);
  console.log(`Seats before booking: ${seatsBefore}`);

  // 4. Open the event
  await eventCard.getByTestId('book-now-btn').click();

  await expect(
    page.getByRole('heading', { name: 'Dilli Diwali Mela' })
  ).toBeVisible();

  await expect(page.locator('#ticket-count')).toHaveText('1');

  // 5. Fill in booking details
  await page.locator('#customerName').fill('Playwright Test User');
  await page.getByTestId('customer-email').fill(process.env.EVENTHUB_EMAIL);
  await page.locator('#phone').fill('9876543210');

  // 6. Confirm booking
  await page.getByRole('button', { name: 'Confirm Booking' }).click();

  await expect(page.getByText('Booking Confirmed!')).toBeVisible();
  await expect(page.getByText('Your tickets are reserved.')).toBeVisible();

  // 7. Return to Events and read the updated seat count
  await page.goto('https://eventhub.rahulshettyacademy.com/events');

  const updatedCard = page.getByTestId('event-card')
    .filter({ hasText: 'Dilli Diwali Mela' });

  await expect(updatedCard).toBeVisible();

  await expect.poll(async () => {
    const text = await updatedCard.innerText();
    const match = text.match(
      /(\d+)\s+seats?\s+(?:available|left)/i
    );

    return match ? Number(match[1]) : null;
  }, { timeout: 10000 }).toBe(seatsBefore - 1);

  const afterText = await updatedCard.innerText();
  const afterMatch = afterText.match(
    /(\d+)\s+seats?\s+(?:available|left)/i
  );

  const seatsAfter = Number(afterMatch[1]);

  console.log(`Seats after booking: ${seatsAfter}`);
  console.log('Booking confirmation and seat count decrement verified.');
});
