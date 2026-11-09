import serverApp from '../server.js';

export default function handler(req, res) {
  const app = serverApp.default || serverApp;
  if (typeof app === 'function') {
    return app(req, res);
  }
  return res.status(500).json({ error: "Server app is not exported properly" });
}
