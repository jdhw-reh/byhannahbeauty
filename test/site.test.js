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

test('robots.txt and llms.txt are served as text', async () => {
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

test('every page has one h1, a unique title and a self canonical', async () => {
  const titles = new Set();
  const pages = ['/', ...SERVICE_PAGES, '/packages/', '/gallery/', '/about/'];
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

const packages = require('../src/_data/packages.json');
const galleryExtra = require('../src/_data/galleryExtra.json');

test('home page links to every service with its lowest price', async () => {
  const html = await (await fetch(`${base}/`)).text();
  for (const s of services) assert.ok(html.includes(`href="/${s.slug}/"`), s.slug);
  assert.ok(html.includes('from £15<'), 'nails from £15, ignoring add-ons');
  assert.ok(html.includes('from £10<'), 'pedicures from £10, ignoring add-ons');
  assert.ok(html.includes('from £3<'), 'waxing from £3');
  assert.ok(html.includes('from £7.50<'), 'brows from £7.50');
});

test('packages page lists only the packages bookable on Treatwell', async () => {
  const html = await (await fetch(`${base}/packages/`)).text();
  for (const p of packages.onTreatwell) assert.ok(html.includes(p.name) && html.includes(p.price), p.name);
  for (const p of packages.toConfirmWithHannah) assert.ok(!html.includes(p.name), `${p.name} should not be shown`);
});

test('gallery and about images exist', async () => {
  const files = [...services[0].images, ...galleryExtra].map((i) => i.file)
    .concat(['shopfront-the-cosmetic-suites-rice-lane.jpg', 'nail-desk-treatment-room.jpg']);
  for (const f of files) {
    const res = await fetch(`${base}/assets/img/${f}`);
    assert.match(res.headers.get('content-type'), /image\/jpeg/, f);
  }
});

test('about page shows the postcode and all seven days', async () => {
  const html = await (await fetch(`${base}/about/`)).text();
  assert.ok(html.includes(site.address.postcode));
  for (const [day] of site.hoursTable) assert.ok(html.includes(day), day);
});

const ALL_PAGES = ['/', ...SERVICE_PAGES, '/packages/', '/gallery/', '/about/'];

test('sitemap is XML and lists exactly the nine pages', async () => {
  const res = await fetch(`${base}/sitemap.xml`);
  assert.match(res.headers.get('content-type'), /xml/);
  const xml = await res.text();
  assert.ok(xml.startsWith('<?xml'), 'starts with the XML declaration');
  for (const p of ALL_PAGES) assert.ok(xml.includes(`<loc>${site.url}${p}</loc>`), p);
  assert.strictEqual((xml.match(/<loc>/g) || []).length, ALL_PAGES.length);
});

test('robots.txt points at the sitemap and llms.txt lists the pages', async () => {
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.ok(robots.includes(`Sitemap: ${site.url}/sitemap.xml`));
  const llms = await (await fetch(`${base}/llms.txt`)).text();
  for (const p of ALL_PAGES) assert.ok(llms.includes(`${site.url}${p})`), p);
  assert.ok(!llms.includes('&amp;'), 'no HTML escaping in a text file');
  assert.ok(!/single HTML page|no sub-pages/i.test(llms));
});

test('social image and favicon exist', async () => {
  const og = await fetch(`${base}/assets/img/og-image.jpg`);
  assert.match(og.headers.get('content-type'), /image\/jpeg/);
  const icon = await fetch(`${base}/assets/img/favicon.svg`);
  assert.match(icon.headers.get('content-type'), /image\/svg/);
});
