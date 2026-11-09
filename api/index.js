import * as serverModule from '../server.js';

let appHandler = null;

async function getHandler() {
  if (appHandler) return appHandler;
  
  // Tìm kiếm hàm app trong mọi trường hợp export
  const mod = serverModule;
  const candidate = mod.default || mod.app || mod.server || mod;
  
  // Nếu có promise khởi động thì đợi
  if (mod.serverReadyPromise) {
    try {
      await mod.serverReadyPromise;
    } catch (e) {
      console.warn("serverReadyPromise warn:", e);
    }
  }

  appHandler = typeof candidate === 'function' ? candidate : (candidate.default || null);
  return appHandler;
}

export default async function handler(req, res) {
  try {
    const app = await getHandler();
    if (typeof app === 'function') {
      return app(req, res);
    }
    return res.status(500).json({
      error: "Không tìm thấy app express",
      exports: Object.keys(serverModule)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
