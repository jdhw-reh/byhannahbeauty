module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');
  // Interim: keep serving the existing robots.txt and llms.txt until they are generated from templates.
  eleventyConfig.addPassthroughCopy({ 'public/robots.txt': 'robots.txt', 'public/llms.txt': 'llms.txt' });
  return { dir: { input: 'src', output: '_site' } };
};
