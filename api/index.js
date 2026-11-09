module.exports = async (req, res) => {
  try {
    const mod = await import('../server.js');
    const app = mod.default || mod;
    return app(req, res);
  } catch (err) {
    console.error("Lỗi khởi tạo server:", err);
    return res.status(500).json({
      error: "Không thể khởi động server",
      details: err.message
    });
  }
};
