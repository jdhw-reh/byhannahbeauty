module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');
  eleventyConfig.addFilter('forService', (reviews, slug) => reviews.filter((r) => r.services.includes(slug)));
  // The headline starting price is set by hand in services.json (`from`), not worked out from the cheapest row.
  eleventyConfig.addFilter('fromPrice', (service) => service.from);
  eleventyConfig.addFilter('featured', (reviews) => reviews.filter((r) => r.featured));
  return { dir: { input: 'src', output: '_site' } };
};
