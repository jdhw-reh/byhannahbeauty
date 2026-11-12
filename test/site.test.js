const test = require('node:test');
const assert = require('node:assert');
const app = require('../server.js');
const site = require('../src/_data/site.json');

let server, base;
test.before(() => new Promise((resolve) => {
  server = app.listen(0, () => { base = `http://localhost:${server.address().port}`; resolve(); });
}));
test.after(() => server.close());

test('home page returns 200', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
});

test('unknown URL returns 404 with the 404 page', async () => {
  const res = await fetch(`${base}/no-such-page`);
  assert.strictEqual(res.status, 404);
  assert.match(await res.text(), /Page not found/);
});

test('home page uses the shared layout', async () => {
  const html = await (await fetch(`${base}/`)).text();
  assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, 'h1 count');
  assert.ok(html.includes(`<link rel="canonical" href="${site.url}/">`), 'canonical');
  assert.ok(html.includes('class="book-bar"'), 'book bar');
  assert.ok(html.includes(`"postalCode": "${site.address.postcode}"`), 'postcode in schema');
  assert.ok(html.includes('OpeningHoursSpecification'), 'hours in schema');
});

test('stylesheet is served as CSS', async () => {
  const res = await fetch(`${base}/assets/css/style.css`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});

test('robots.txt and llms.txt are still served as text', async () => {
  for (const p of ['/robots.txt', '/llms.txt']) {
    const res = await fetch(`${base}${p}`);
    assert.strictEqual(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/plain/, p);
  }
});
