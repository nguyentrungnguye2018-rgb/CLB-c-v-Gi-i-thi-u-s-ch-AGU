let appInstance = null;
let initPromise = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const serverModule = await import('../server.js');
      const app = serverModule.default || serverModule.app || serverModule;
      // Chờ một nhịp nhỏ để server.js nạp xong database và router
      await new Promise((resolve) => setTimeout(resolve, 500));
      return typeof app === 'function' ? app : (app.default || null);
    })();
  }
  appInstance = await initPromise;
  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    if (typeof app === 'function') {
      return app(req, res);
    }
    return res.status(500).json({ 
      error: "Không tìm thấy router của server backend",
      details: "Express app instance is not callable"
    });
  } catch (err) {
    console.error("Lỗi thực thi serverless handler:", err);
    return res.status(500).json({ 
      error: "Lỗi nội bộ máy chủ", 
      details: err.message 
    });
  }
}
