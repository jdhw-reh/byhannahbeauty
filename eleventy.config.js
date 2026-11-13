module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');
  eleventyConfig.addFilter('forService', (reviews, slug) => reviews.filter((r) => r.services.includes(slug)));
  eleventyConfig.addFilter('fromPrice', (service) => {
    // The first group holds the main treatments; later groups are add-ons.
    const prices = service.groups[0].items.map((i) => parseFloat(i.price.replace(/[^0-9.]/g, '')));
    const min = Math.min(...prices);
    return '£' + (Number.isInteger(min) ? min : min.toFixed(2));
  });
  eleventyConfig.addFilter('featured', (reviews) => reviews.filter((r) => r.featured));
  return { dir: { input: 'src', output: '_site' } };
};
