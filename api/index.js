import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let handlerApp;

export default async function handler(req, res) {
  if (!handlerApp) {
    try {
      const serverModule = await import('../server.js');
      handlerApp = serverModule.default || serverModule;
    } catch (e) {
      try {
        handlerApp = require('../server.js');
      } catch (err) {
        console.error("Không thể load server.js:", err);
        return res.status(500).json({
          error: "Không thể khởi động server backend",
          details: err.message
        });
      }
    }
  }

  const app = handlerApp.default || handlerApp;
  if (typeof app === 'function') {
    return app(req, res);
  }
  return res.status(500).json({ error: "server.js không xuất ra hàm app Express hợp lệ" });
}
