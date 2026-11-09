let cachedHandler = null;

export default async function (req, res) {
  if (!cachedHandler) {
    try {
      const serverModule = await import('../server.js');
      // Tìm hàm xử lý bất kể nó là default, app, hay server
      cachedHandler = serverModule.default || serverModule.app || serverModule.server || serverModule;
    } catch (err) {
      console.error("Lỗi khi load server.js:", err);
      return res.status(500).json({
        error: "Lỗi tải module backend",
        details: err.message
      });
    }
  }

  const app = cachedHandler.default || cachedHandler;
  if (typeof app === 'function') {
    return app(req, res);
  }
  return res.status(500).json({
    error: "server.js không xuất ra hàm Express app hợp lệ",
    availableKeys: Object.keys(cachedHandler || {})
  });
}
