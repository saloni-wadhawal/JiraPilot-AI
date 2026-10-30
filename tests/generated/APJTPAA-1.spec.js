const { test, expect } = require('@playwright/test');

const EVENTHUB_URL = 'http://127.0.0.1:4173';
const EVENT_NAME = 'Dilli Diwali Mela';
const MOCK_CREDENTIALS = {
  email: 'qa@example.test',
  password: 'LocalMockOnly-123!'
};

let blockedExternalRequests;

test.beforeEach(async ({ page }) => {
  blockedExternalRequests = [];
  await page.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname !== '127.0.0.1' || requestUrl.port !== '4173') {
      blockedExternalRequests.push(requestUrl.origin);
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });
});

test.afterEach(() => {
  expect(
    blockedExternalRequests,
    'Generated mock tests must not make requests outside the local mock server.'
  ).toEqual([]);
});

async function signIn(page) {
  await page.goto(`${EVENTHUB_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(MOCK_CREDENTIALS.email);
  await page.locator('#password').fill(MOCK_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(`${EVENTHUB_URL}/`, { timeout: 15000 });
}

async function resetMockState(page) {
  const response = await page.request.post(`${EVENTHUB_URL}/__test/reset`);
  expect(response.status()).toBe(204);
}

async function openSingleTicketBooking(page) {
  await signIn(page);
  await page.goto(`${EVENTHUB_URL}/events`);

  const eventCard = page.getByTestId('event-card')
    .filter({ hasText: EVENT_NAME });
  await expect(eventCard).toBeVisible();
  await eventCard.getByTestId('book-now-btn').click();
  await expect(page.getByRole('heading', { name: EVENT_NAME })).toBeVisible();
  await expect(page.locator('#ticket-count')).toHaveText('1');
}

async function submitSingleTicketBooking(page) {
  const bookingRequests = [];
  page.on('request', request => {
    if (
      request.method() === 'POST' &&
      request.url() === `${EVENTHUB_URL}/booking/confirm`
    ) {
      bookingRequests.push(request);
    }
  });

  await page.locator('#customerName').fill('Mock Test Customer');
  await page.getByTestId('customer-email').fill('qa@example.test');
  await page.locator('#phone').fill('5550100');
  const [bookingResponse] = await Promise.all([
    page.waitForResponse(response =>
      response.url() === `${EVENTHUB_URL}/booking/confirm` &&
      response.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Confirm Booking' }).click()
  ]);

  expect(bookingRequests).toHaveLength(1);
  const submittedForm = new URLSearchParams(bookingRequests[0].postData() || '');
  expect(submittedForm.getAll('ticketCount')).toEqual(['1']);
  expect(bookingResponse.status()).toBe(200);
}

async function readAvailableSeatCount(eventCard) {
  const cardText = await eventCard.innerText();
  const seatCountMatch = cardText.match(
    /(\d+)\s+seats?\s+(?:available|left|remaining|still open)/i
  );

  expect(
    seatCountMatch,
    `The event card must display an available seat count. Observed: ${cardText}`
  ).not.toBeNull();

  if (seatCountMatch === null) {
    throw new Error('The event card seat count could not be parsed.');
  }

  const seats = Number(seatCountMatch[1]);
  expect(Number.isInteger(seats)).toBe(true);
  expect(seats).toBeGreaterThan(0);
  return seats;
}

test('[AC-01] Open the EventHub application', async ({ page }) => {
  await page.goto(`${EVENTHUB_URL}/login`);

  await expect(page.getByPlaceholder('you@email.com')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('[AC-02] Log in with configured test credentials', async ({ page }) => {
  await signIn(page);
});

test('[AC-03] Select the evidenced EventHub event', async ({ page }) => {
  await signIn(page);
  await page.goto(`${EVENTHUB_URL}/events`);

  const eventCard = page.getByTestId('event-card')
    .filter({ hasText: EVENT_NAME });

  await expect(eventCard).toBeVisible();
  const bookNowButton = eventCard.getByTestId('book-now-btn');
  await expect(bookNowButton).toBeEnabled();
  await bookNowButton.click();

  await expect(
    page.getByRole('heading', { name: EVENT_NAME })
  ).toBeVisible();
});

test('[AC-04] Record the available seat count before booking', async ({ page }) => {
  await signIn(page);
  await page.goto(`${EVENTHUB_URL}/events`);

  const eventCard = page.getByTestId('event-card')
    .filter({ hasText: EVENT_NAME });

  await expect(eventCard).toBeVisible();

  const cardText = await eventCard.innerText();
  const seatCountMatch = cardText.match(
    /(\d+)\s+seats?\s+(?:available|left|remaining|still open)/i
  );

  expect(
    seatCountMatch,
    `The event card must display an available seat count. Observed: ${cardText}`
  ).not.toBeNull();

  if (seatCountMatch === null) {
    throw new Error('The event card seat count could not be parsed.');
  }

  const seatsBefore = Number(seatCountMatch[1]);
  expect(Number.isInteger(seatsBefore)).toBe(true);
  expect(seatsBefore).toBeGreaterThan(0);
  console.log(`Available seats before booking: ${seatsBefore}`);
});

test('[AC-05] Book exactly one ticket', async ({ page }) => {
  await resetMockState(page);
  await openSingleTicketBooking(page);
  await submitSingleTicketBooking(page);
});

test('[AC-06] Verify the booking confirmation', async ({ page }) => {
  await resetMockState(page);
  await openSingleTicketBooking(page);
  await submitSingleTicketBooking(page);

  await expect(page.getByRole('heading', { name: 'Booking Confirmed!' })).toBeVisible();
  await expect(page.getByText('Your tickets are reserved.')).toBeVisible();
});

test('[AC-07] Verify exactly one seat is deducted', async ({ page }) => {
  await resetMockState(page);
  await signIn(page);
  await page.goto(`${EVENTHUB_URL}/events`);

  const eventCard = page.getByTestId('event-card')
    .filter({ hasText: EVENT_NAME });
  await expect(eventCard).toBeVisible();
  const seatsBefore = await readAvailableSeatCount(eventCard);

  await eventCard.getByTestId('book-now-btn').click();
  await expect(page.locator('#ticket-count')).toHaveText('1');
  await submitSingleTicketBooking(page);
  await page.goto(`${EVENTHUB_URL}/events`);

  const updatedEventCard = page.getByTestId('event-card')
    .filter({ hasText: EVENT_NAME });
  await expect(updatedEventCard).toBeVisible();
  await expect.poll(() => readAvailableSeatCount(updatedEventCard))
    .toBe(seatsBefore - 1);
});
