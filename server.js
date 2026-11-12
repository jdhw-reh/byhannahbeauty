const express = require('express');
const path = require('path');

const app = express();
const SITE = path.join(__dirname, '_site');

app.use(express.static(SITE));

// Anything that is not a built file is a real 404, not the home page.
app.use((req, res) => res.status(404).sendFile(path.join(SITE, '404.html')));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`By Hannah Beauty running on port ${PORT}`));
}

module.exports = app;
