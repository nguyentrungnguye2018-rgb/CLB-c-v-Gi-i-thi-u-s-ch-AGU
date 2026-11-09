let app;
try {
  const mod = require('../server.js');
  app = mod.default || mod;
} catch (e) {
  console.error("Failed to load server.js:", e);
}

module.exports = (req, res) => {
  if (app) {
    return app(req, res);
  }
  return res.status(500).json({ error: "Server module not initialized" });
};
