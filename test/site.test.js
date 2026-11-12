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

const services = require('../src/_data/services.json');

test('every service has prices and a unique slug', () => {
  const slugs = new Set(services.map((s) => s.slug));
  assert.strictEqual(slugs.size, 5);
  for (const s of services) {
    const items = s.groups.flatMap((g) => g.items);
    assert.ok(items.length > 0, `${s.slug} has no items`);
    for (const i of items) {
      assert.match(i.price, /^(from )?£\d/, `${s.slug}: ${i.name}`);
      assert.ok(i.duration, `${s.slug}: ${i.name} duration`);
    }
    assert.ok(s.description.length <= 160, `${s.slug} description is ${s.description.length} chars`);
  }
});

const SERVICE_PAGES = services.map((s) => `/${s.slug}/`);

test('home and service pages have one h1, a unique title and a self canonical', async () => {
  const titles = new Set();
  const pages = ['/', ...SERVICE_PAGES];
  for (const p of pages) {
    const res = await fetch(`${base}${p}`);
    assert.strictEqual(res.status, 200, p);
    const html = await res.text();
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, `${p} h1 count`);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    assert.ok(html.includes(`<link rel="canonical" href="${site.url}${p}">`), `${p} canonical`);
    assert.ok(html.includes('class="book-bar"'), `${p} book bar`);
    assert.ok(!html.includes('&amp;amp;'), `${p} double-escaped ampersand`);
  }
  assert.strictEqual(titles.size, pages.length);
});

test('service pages show every price and only images that exist', async () => {
  for (const s of services) {
    const html = await (await fetch(`${base}/${s.slug}/`)).text();
    for (const i of s.groups.flatMap((g) => g.items)) assert.ok(html.includes(`>${i.price}<`), `${s.slug}: ${i.name}`);
    for (const img of s.images) {
      const res = await fetch(`${base}/assets/img/${img.file}`);
      assert.match(res.headers.get('content-type'), /image\/jpeg/, img.file);
    }
  }
});
