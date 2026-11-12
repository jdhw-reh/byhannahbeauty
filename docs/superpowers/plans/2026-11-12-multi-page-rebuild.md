# By Hannah Beauty Multi-Page Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-page site into a 9-page site with real photos, full prices, hours and a map, so each service can rank locally and visitors can reach the right Treatwell booking in one tap.

**Architecture:** Eleventy builds static HTML from one shared layout and two data files (business details and the price list). The five service pages are generated from the price list, so prices live in one place and feed both the pages and the schema. Express keeps serving the output on Railway, but returns a real 404 for unknown URLs.

**Tech Stack:** Eleventy 3 (Nunjucks templates), plain CSS, Express 4, `node:test` for checks, Railway for hosting.

---

## Facts gathered on 2026-11-12

From the Treatwell listing (https://www.treatwell.co.uk/place/by-hannah-beauty/):

- Address: 485 Rice Lane, Liverpool, L9 8AP (inside The Cosmetic Suites). Treatwell files it under Orrell Park; Hannah's bio says Walton.
- Hours: Mon, Tue, Fri, Sat 10:00–14:00. Wed 10:00–17:00. Thu and Sun closed. Some evenings by arrangement over Instagram.
- Rating: 5.0 from 34 verified reviews.
- Transport: Orrell Park station around the corner, Rice Lane station about 10 minutes' walk, free parking.
- Categories: Manicure (7, from £15), Pedicures (3, from £10), Nail Extras (5, from £5), Brows and Lashes (10, from £7.50), Facial Waxing (1, from £3), Body Waxing (5, from £15), Mummy & Me (2, from £40).

**The current site's prices do not match Treatwell.** Examples: the site says manicures from £20 (Treatwell £15), brows from £25 (Treatwell £7.50), Essential Holiday Prep £40 for 3h 10min (Treatwell £45 for 2h 45min). Task 0 settles this.

## Inputs needed from Hannah (Task 0, no code)

- [ ] Confirm the full price list. Open each of the 7 Treatwell categories, copy every service name, duration and price, and have Hannah confirm it is current. Ask whether Prom Glam Duo and Prom Besties still run and what each includes.
- [ ] 15 to 25 photos of her work, original files, at least 3 per service, plus one of Hannah and one of the room or shopfront.
- [ ] Permission to quote 3 Treatwell reviews by first name.
- [ ] Whether a Google Business Profile exists, and who has the login.
- [ ] Treatwell deep links. In Treatwell Connect, check whether a link can pre-select a service. If not, every button uses the main listing URL.

Build tasks 1 to 3 do not depend on these. Tasks 4 onward do.

## File structure

```
eleventy.config.js        build config
server.js                 serves _site, real 404
src/
  _data/site.json         name, address, hours, links, rating
  _data/services.json     the price list, one entry per service page
  _includes/base.njk      head, schema, header nav, sticky book bar, footer
  _includes/price-table.njk
  assets/css/style.css    tokens, layout, components
  assets/img/             photos (webp) and og-image.jpg
  assets/video/           compressed loops
  index.njk               home
  service.njk             generates /nails/ /pedicures/ /brows-lashes/ /waxing/ /mummy-and-me/
  packages.njk  gallery.njk  about.njk  404.njk
  sitemap.njk  robots.njk  llms.njk
test/site.test.js         build and server checks
```

URLs: `/`, `/nails/`, `/pedicures/`, `/brows-lashes/`, `/waxing/`, `/mummy-and-me/`, `/packages/`, `/gallery/`, `/about/`.

---

### Task 1: Eleventy scaffold and a server that returns 404

**Files:**
- Create: `eleventy.config.js`, `.gitignore`, `src/index.njk`, `src/404.njk`, `test/site.test.js`
- Modify: `server.js`, `package.json`
- Move: `public/style.css` to `src/assets/css/style.css`; delete `public/` and the root `robots.txt` and `llms.txt` once Task 8 replaces them

- [ ] **Step 1: Install Eleventy**

```bash
npm install --save-dev @11ty/eleventy@^3
```

- [ ] **Step 2: Write the failing test**

`test/site.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const app = require('../server.js');

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
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test`
Expected: FAIL, `app.listen is not a function` (server.js exports nothing yet).

- [ ] **Step 4: Write the config, server and stub pages**

`eleventy.config.js`:

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');
  return { dir: { input: 'src', output: '_site' } };
};
```

`server.js`:

```js
const express = require('express');
const path = require('path');

const app = express();
const SITE = path.join(__dirname, '_site');

app.use(express.static(SITE));
app.use((req, res) => res.status(404).sendFile(path.join(SITE, '404.html')));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`By Hannah Beauty running on port ${PORT}`));
}

module.exports = app;
```

`src/index.njk`:

```njk
---
title: By Hannah Beauty
---
<h1>By Hannah Beauty</h1>
```

`src/404.njk`:

```njk
---
title: Page not found
permalink: /404.html
eleventyExcludeFromCollections: true
---
<h1>Page not found</h1>
<p><a href="/">Back to the home page</a></p>
```

`package.json` scripts:

```json
"scripts": {
  "build": "eleventy",
  "start": "node server.js",
  "dev": "eleventy --serve",
  "test": "npm run build && node --test"
}
```

`.gitignore`:

```
node_modules/
_site/
.DS_Store
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Move to Eleventy build and return real 404s"
```

---

### Task 2: Business details and price list as data

**Files:**
- Create: `src/_data/site.json`, `src/_data/services.json`
- Test: `test/site.test.js`

- [ ] **Step 1: Write `src/_data/site.json`**

```json
{
  "name": "By Hannah Beauty",
  "url": "https://www.byhannahbeauty.co.uk",
  "bookingUrl": "https://trea.tw/8dJmnt9Eura9cnDaq",
  "instagramUrl": "https://www.instagram.com/byhannah.beauty/",
  "instagramDmUrl": "https://ig.me/m/byhannah.beauty",
  "address": {
    "venue": "The Cosmetic Suites",
    "street": "485 Rice Lane",
    "area": "Walton",
    "city": "Liverpool",
    "postcode": "L9 8AP"
  },
  "geo": { "lat": 53.4452, "lng": -2.9623 },
  "hours": [
    { "days": ["Monday", "Tuesday", "Friday", "Saturday"], "opens": "10:00", "closes": "14:00" },
    { "days": ["Wednesday"], "opens": "10:00", "closes": "17:00" }
  ],
  "closedDays": ["Thursday", "Sunday"],
  "rating": { "value": "5.0", "count": 34, "source": "Treatwell", "checked": "2026-11-12" }
}
```

Check the `geo` values against 485 Rice Lane in Google Maps before launch; they were carried over from the old page.

- [ ] **Step 2: Write `src/_data/services.json`**

One object per service page. The shape, with the nails entry showing the format (fill every `items` array from the list confirmed in Task 0):

```json
[
  {
    "slug": "nails",
    "name": "Nails",
    "h1": "Gel nails, BIAB and manicures in Walton, Liverpool",
    "title": "Gel Nails & BIAB in Walton, Liverpool L9 | By Hannah Beauty",
    "description": "Gel manicures, builder gel (BIAB) and nail art at By Hannah Beauty, 485 Rice Lane, Walton. See prices and book online.",
    "intro": "",
    "groups": [
      { "heading": "Manicures", "items": [ { "name": "Builder Gel Manicure", "duration": "", "price": "" } ] },
      { "heading": "Nail extras", "items": [] }
    ],
    "faqs": [ { "q": "How long does BIAB last?", "a": "" } ],
    "images": [],
    "video": "nails"
  }
]
```

The other four entries use slugs `pedicures`, `brows-lashes`, `waxing` (facial and body waxing as two groups), `mummy-and-me`. Each needs 3 to 5 FAQs: how long it lasts, aftercare, patch test rules for tints, age limits for Mummy & Me. Hannah supplies the answers; run all intro and FAQ copy through the humanizer skill.

- [ ] **Step 3: Add a data test**

Append to `test/site.test.js`:

```js
const services = require('../src/_data/services.json');

test('every service has prices and a unique slug', () => {
  const slugs = new Set(services.map((s) => s.slug));
  assert.strictEqual(slugs.size, 5);
  for (const s of services) {
    const items = s.groups.flatMap((g) => g.items);
    assert.ok(items.length > 0, `${s.slug} has no items`);
    for (const i of items) assert.match(i.price, /^(from )?£\d/, `${s.slug}: ${i.name}`);
  }
});
```

- [ ] **Step 4: Run and commit**

Run: `npm test`. Expected: 3 passing once Task 0 prices are in.

```bash
git add -A && git commit -m "Add business details and price list data"
```

---

### Task 3: Shared layout, navigation and contrast fix

**Files:**
- Create: `src/_includes/base.njk`
- Modify: `src/assets/css/style.css`, `src/index.njk`, `src/404.njk` (add `layout: base.njk`)
- Test: `test/site.test.js`

- [ ] **Step 1: Write the failing test**

```js
const PAGES = ['/', '/nails/', '/pedicures/', '/brows-lashes/', '/waxing/', '/mummy-and-me/', '/packages/', '/gallery/', '/about/'];

test('every page has one h1, a unique title and a self canonical', async () => {
  const titles = new Set();
  for (const p of PAGES) {
    const res = await fetch(`${base}${p}`);
    assert.strictEqual(res.status, 200, p);
    const html = await res.text();
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, `${p} h1 count`);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    assert.ok(html.includes(`<link rel="canonical" href="https://www.byhannahbeauty.co.uk${p}">`), `${p} canonical`);
    assert.ok(html.includes('class="book-bar"'), `${p} book bar`);
  }
  assert.strictEqual(titles.size, PAGES.length);
});
```

Run: `npm test`. Expected: FAIL on `/nails/` (404). It passes at the end of Task 6.

- [ ] **Step 2: Write `src/_includes/base.njk`**

```njk
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
  <link rel="canonical" href="{{ site.url }}{{ page.url }}">
  <meta property="og:title" content="{{ title }}">
  <meta property="og:description" content="{{ description }}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{ site.url }}{{ page.url }}">
  <meta property="og:image" content="{{ site.url }}/assets/img/og-image.jpg">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Dancing+Script:wght@600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": "{{ site.url }}/#salon",
    "name": "{{ site.name }}",
    "url": "{{ site.url }}",
    "image": "{{ site.url }}/assets/img/og-image.jpg",
    "priceRange": "£",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "{{ site.address.venue }}, {{ site.address.street }}",
      "addressLocality": "{{ site.address.city }}",
      "postalCode": "{{ site.address.postcode }}",
      "addressCountry": "GB"
    },
    "geo": { "@type": "GeoCoordinates", "latitude": {{ site.geo.lat }}, "longitude": {{ site.geo.lng }} },
    "openingHoursSpecification": [
      {% for h in site.hours %}{ "@type": "OpeningHoursSpecification", "dayOfWeek": {{ h.days | dump | safe }}, "opens": "{{ h.opens }}", "closes": "{{ h.closes }}" }{% if not loop.last %},{% endif %}
      {% endfor %}
    ],
    "sameAs": ["{{ site.instagramUrl }}", "https://www.treatwell.co.uk/place/by-hannah-beauty/"]
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="logo" href="/">By Hannah <span>Beauty</span></a>
    <nav aria-label="Main">
      <a href="/nails/">Nails</a>
      <a href="/pedicures/">Pedicures</a>
      <a href="/brows-lashes/">Brows &amp; Lashes</a>
      <a href="/waxing/">Waxing</a>
      <a href="/packages/">Packages</a>
      <a href="/gallery/">Gallery</a>
      <a href="/about/">Find us</a>
    </nav>
    <a class="btn btn-book" href="{{ site.bookingUrl }}" rel="noopener">Book on Treatwell</a>
  </header>

  <main id="main">{{ content | safe }}</main>

  <footer class="site-footer">
    <address>{{ site.name }}, {{ site.address.venue }}, {{ site.address.street }}, {{ site.address.area }}, {{ site.address.city }} {{ site.address.postcode }}</address>
    <p>Mon, Tue, Fri, Sat 10am to 2pm · Wed 10am to 5pm · Thu and Sun closed</p>
    <p><a href="{{ site.instagramUrl }}" rel="noopener">Instagram</a> · <a href="{{ site.bookingUrl }}" rel="noopener">Treatwell</a> · <a href="/mummy-and-me/">Mummy &amp; Me</a></p>
    <p class="small">© 2026 By Hannah Beauty · Website by <a href="https://www.l9digital.co.uk/" rel="noopener">L9 Digital</a></p>
  </footer>

  <a class="book-bar" href="{{ site.bookingUrl }}" rel="noopener">Book on Treatwell</a>
</body>
</html>
```

No AggregateRating in the schema: Google does not show review stars for ratings a business marks up about itself from a third-party site. The rating appears as visible text only.

- [ ] **Step 3: Update the CSS tokens and add the new components**

In `src/assets/css/style.css`, add a deeper blue for anything that carries white text or sits on white as text, and stop using white text on `--blue`:

```css
:root {
  --blue: #8B9FDE;        /* brand background only */
  --blue-deep: #5567B8;   /* buttons, links, prices: 5.2:1 with white */
  --navy: #1C1C3A;        /* text on --blue: 6.5:1 */
}

.hero, .hero .tagline, .hero .location, .brand-by { color: var(--navy); }
.btn-primary, .btn-fill-blue, .btn-book { background: var(--blue-deep); color: #fff; }
.package-meta strong, .service-price strong, .services-note a { color: var(--blue-deep); }
.package-badge { background: var(--navy); color: #fff; }
body { font-weight: 400; }  /* drop the 300 weight body text */

.site-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; flex-wrap: wrap; }
.site-header nav { display: flex; gap: 18px; overflow-x: auto; }
.site-header nav a { color: var(--navy); text-decoration: none; padding: 12px 0; white-space: nowrap; }
.skip-link { position: absolute; left: -999px; }
.skip-link:focus { left: 8px; top: 8px; background: #fff; padding: 8px; }
a:focus-visible, .btn:focus-visible { outline: 3px solid var(--navy); outline-offset: 2px; }

.book-bar { display: none; }
@media (max-width: 600px) {
  .site-header .btn-book { display: none; }
  .book-bar { display: block; position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 10; padding: 16px; border-radius: 50px; text-align: center; background: var(--blue-deep); color: #fff; font-weight: 600; text-decoration: none; box-shadow: 0 4px 16px rgba(28,28,58,.3); }
  body { padding-bottom: 84px; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

On mobile the nav scrolls sideways in one row. No hamburger menu and no JavaScript.

- [ ] **Step 4: Check both viewports in the browser and commit**

Run: `npm run dev`, open http://localhost:8080 at 375px and 1280px. Confirm the hero text is navy on periwinkle, the book bar is fixed at the bottom on mobile only, and tabbing shows a visible focus ring.

```bash
git add -A && git commit -m "Add shared layout, navigation, sticky book bar and contrast fixes"
```

---

### Task 4: Service pages generated from the price list

**Files:**
- Create: `src/service.njk`, `src/_includes/price-table.njk`

- [ ] **Step 1: Write `src/_includes/price-table.njk`**

```njk
{% for group in groups %}
<h2>{{ group.heading }}</h2>
<table class="price-table">
  <tbody>
  {% for item in group.items %}
    <tr><th scope="row">{{ item.name }}</th><td>{{ item.duration }}</td><td class="price">{{ item.price }}</td></tr>
  {% endfor %}
  </tbody>
</table>
{% endfor %}
```

- [ ] **Step 2: Write `src/service.njk`**

```njk
---
layout: base.njk
pagination:
  data: services
  size: 1
  alias: service
permalink: "/{{ service.slug }}/"
eleventyComputed:
  title: "{{ service.title }}"
  description: "{{ service.description }}"
---
<section class="page-hero">
  <h1>{{ service.h1 }}</h1>
  <p>{{ service.intro }}</p>
  <p class="rating">Rated {{ site.rating.value }} from {{ site.rating.count }} reviews on Treatwell</p>
  <a class="btn btn-primary" href="{{ site.bookingUrl }}" rel="noopener">Book {{ service.name | lower }} on Treatwell</a>
</section>

{% if service.video %}
<video class="loop" src="/assets/video/{{ service.video }}.mp4" poster="/assets/video/{{ service.video }}.jpg" autoplay muted loop playsinline width="720" height="1280"></video>
{% endif %}

<section class="work">
  {% for img in service.images %}
  <img src="/assets/img/{{ img.file }}" alt="{{ img.alt }}" width="{{ img.w }}" height="{{ img.h }}" loading="lazy">
  {% endfor %}
</section>

<section class="prices">
  {% set groups = service.groups %}{% include "price-table.njk" %}
</section>

<section class="faqs">
  <h2>{{ service.name }} questions</h2>
  {% for f in service.faqs %}
  <details><summary>{{ f.q }}</summary><p>{{ f.a }}</p></details>
  {% endfor %}
</section>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "{{ service.name }}",
  "areaServed": ["Walton", "Orrell Park", "Aintree", "Liverpool"],
  "provider": { "@id": "{{ site.url }}/#salon" },
  "url": "{{ site.url }}/{{ service.slug }}/"
}
</script>
```

Add price table and gallery grid styles to `style.css`: table full width, price column right-aligned in `--blue-deep` at weight 600, `.work` as a 2-column grid on mobile and 3 on desktop with `aspect-ratio: 4/5; object-fit: cover`.

- [ ] **Step 3: Run and commit**

Run: `npm run build && ls _site`. Expected: folders `nails`, `pedicures`, `brows-lashes`, `waxing`, `mummy-and-me`.

```bash
git add -A && git commit -m "Generate service pages from the price list"
```

---

### Task 5: Home page

**Files:**
- Modify: `src/index.njk`

- [ ] **Step 1: Write the page**

Front matter:

```yaml
---
layout: base.njk
title: "By Hannah Beauty | Nails, Brows, Lashes & Waxing in Walton, Liverpool"
description: "Gel nails, BIAB, brows, lashes and waxing at The Cosmetic Suites, 485 Rice Lane, Walton L9. Rated 5.0 on Treatwell. Book online."
---
```

Sections, in order:

1. Hero. Keep the periwinkle, polka dots and brand lockup. H1 stays "By Hannah Beauty" with a visible line under it: "Nails, brows, lashes and waxing in Walton, Liverpool". One photo of Hannah's work beside it on desktop, below it on mobile. Buttons: "Book on Treatwell" (primary) and "See prices" (links to `#services`).
2. Rating strip: "5.0 from 34 Treatwell reviews", then three quoted reviews with first names, then a link to all reviews on Treatwell.
3. Services (`id="services"`): five links generated with `{% for s in services %}`, each showing a photo, the name and its lowest price, linking to `/{{ s.slug }}/`. Photos replace the emoji.
4. Packages teaser: the three holiday bundles with a link to `/packages/`.
5. Find us: address, hours table, "Orrell Park station is around the corner, free parking", link to `/about/`.

Left-align body copy and the services list; keep only the hero centred.

- [ ] **Step 2: Check in the browser at both sizes and commit**

```bash
git add -A && git commit -m "Rebuild home page with photos, reviews and service links"
```

---

### Task 6: Packages, Gallery and About pages

**Files:**
- Create: `src/packages.njk`, `src/gallery.njk`, `src/about.njk`

- [ ] **Step 1: `src/packages.njk`**

Title: `Holiday & Prom Beauty Packages in Liverpool | By Hannah Beauty`. Permalink `/packages/`. Lists each bundle with what is included, duration and price from Task 0. Holiday bundles link to Treatwell. Prom packages say what each includes and link to `{{ site.instagramDmUrl }}` with the label "Message Hannah on Instagram".

- [ ] **Step 2: `src/gallery.njk`**

Title: `Nail Art & Beauty Gallery | By Hannah Beauty, Liverpool`. A grid of every photo with descriptive alt text ("Pink chrome BIAB with French tip", not "nails 3"), `loading="lazy"` and explicit width and height. Ends with a link to Instagram for more.

- [ ] **Step 3: `src/about.njk`**

Title: `Find By Hannah Beauty | 485 Rice Lane, Walton, Liverpool L9 8AP`. Contains Hannah's short bio and photo, the full address, the hours table, the note that evening appointments can be arranged over Instagram, transport and parking, and a map.

For the map use a static image linked to Google Maps directions, so no third-party cookies load:

```html
<a href="https://www.google.com/maps/dir/?api=1&destination=485+Rice+Lane+Liverpool+L9+8AP" rel="noopener">
  <img src="/assets/img/map.webp" alt="Map showing By Hannah Beauty at 485 Rice Lane, near Orrell Park station" width="900" height="500" loading="lazy">
</a>
```

- [ ] **Step 4: Run the tests and commit**

Run: `npm test`. Expected: the Task 3 page test now passes for all 9 URLs.

```bash
git add -A && git commit -m "Add packages, gallery and about pages"
```

---

### Task 7: Photos, video loops, social image and favicon

**Files:**
- Create: files under `src/assets/img/` and `src/assets/video/`

- [ ] **Step 1: Convert photos to WebP at 1200px wide**

```bash
brew install webp ffmpeg
for f in originals/*.jpg; do cwebp -q 78 -resize 1200 0 "$f" -o "src/assets/img/$(basename "${f%.*}").webp"; done
```

Name files by content (`biab-french-tip.webp`). Record each file's name, width, height and alt text in `services.json`.

- [ ] **Step 2: Compress the four 15-second videos**

The source files in the project root are about 7MB each. Target under 1.2MB, no audio:

```bash
for n in nails pedicure brows-lashes waxing; do
  ffmpeg -i "by-hannah-$n-15s.mp4" -an -vf "scale=720:-2" -c:v libx264 -crf 30 -preset slow -movflags +faststart "src/assets/video/$n.mp4"
  ffmpeg -i "src/assets/video/$n.mp4" -frames:v 1 -q:v 4 "src/assets/video/$n.jpg"
done
```

Rename `pedicure` to `pedicures` to match the slug. Run `ls -la src/assets/video` and confirm each mp4 is under 1.2MB; raise `-crf` to 32 if not.

- [ ] **Step 3: Social image and favicon**

`src/assets/img/og-image.jpg` at 1200×630: periwinkle background, brand lockup, one work photo. `src/assets/img/favicon.svg`: the bow mark on periwinkle.

- [ ] **Step 4: Add an asset test and commit**

```js
test('assets exist and are real files', async () => {
  for (const p of ['/assets/img/og-image.jpg', '/assets/img/favicon.svg', '/assets/css/style.css']) {
    const res = await fetch(`${base}${p}`);
    assert.strictEqual(res.status, 200, p);
    assert.doesNotMatch(res.headers.get('content-type'), /text\/html/, p);
  }
});
```

```bash
git add -A && git commit -m "Add photos, video loops, social image and favicon"
```

---

### Task 8: Sitemap, robots and llms.txt

**Files:**
- Create: `src/sitemap.njk`, `src/robots.njk`, `src/llms.njk`
- Delete: `public/`, root `robots.txt`, root `llms.txt`

- [ ] **Step 1: Write the failing test**

```js
test('sitemap is XML and lists every page', async () => {
  const res = await fetch(`${base}/sitemap.xml`);
  assert.match(res.headers.get('content-type'), /xml/);
  const xml = await res.text();
  for (const p of PAGES) assert.ok(xml.includes(`<loc>https://www.byhannahbeauty.co.uk${p}</loc>`), p);
  assert.ok(!xml.includes('404'));
});
```

- [ ] **Step 2: Write the templates**

`src/sitemap.njk`:

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for item in collections.all %}
  <url><loc>{{ site.url }}{{ item.url }}</loc><lastmod>{{ item.date.toISOString().slice(0, 10) }}</lastmod></url>
{%- endfor %}
</urlset>
```

`src/robots.njk`:

```njk
---
permalink: /robots.txt
eleventyExcludeFromCollections: true
---
User-agent: *
Allow: /

Sitemap: {{ site.url }}/sitemap.xml
```

`src/llms.njk` (permalink `/llms.txt`, excluded from collections): business name, address with postcode, hours, the 9 page URLs with one line each, booking link. Remove the old line that says the site has no sub-pages.

- [ ] **Step 3: Run the tests and commit**

Run: `npm test`. Expected: all passing.

```bash
git rm -r public robots.txt llms.txt && git add -A && git commit -m "Generate sitemap, robots and llms.txt from the build"
```

---

### Task 9: Launch

- [ ] **Step 1: Validate before deploying.** Run `npm test`. Paste the built home page and `/nails/` HTML into https://validator.schema.org and confirm no errors. Check every page at 375px and 1280px.
- [ ] **Step 2: Deploy.** Push the branch and open a PR. Railway runs `npm run build` then `npm start`; confirm in the deploy log that Eleventy wrote 13 files (9 pages, 404, sitemap, robots, llms).
- [ ] **Step 3: Check production.** `curl -s -o /dev/null -w "%{http_code}\n" https://www.byhannahbeauty.co.uk/no-such-page` prints `404`. `/sitemap.xml` returns XML.
- [ ] **Step 4: Search Console.** Verify the domain property, submit `/sitemap.xml`, request indexing for the home page and the five service pages.
- [ ] **Step 5: Google Business Profile.** Create or claim it. Use the exact name, `485 Rice Lane, Liverpool L9 8AP`, the same hours, the website URL and the Treatwell booking link. Upload the same photos. Ask recent clients for Google reviews.
- [ ] **Step 6: Treatwell and Instagram.** Put the website URL in both profiles.

## Out of scope

- A blog. Worth revisiting once the service pages are indexed and Search Console shows which searches bring impressions.
- Separate pages for each suburb. Thin area pages risk being treated as doorway pages; the areas are named in page copy instead.
- On-site booking or a contact form. Treatwell and Instagram stay as the only routes.
