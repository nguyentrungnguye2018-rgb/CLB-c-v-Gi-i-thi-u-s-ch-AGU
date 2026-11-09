import * as serverModule from '../server.js';

export default async function handler(req, res) {
  // Chờ tối đa 3 giây cho server.js chạy ngầm khởi tạo xong
  for (let i = 0; i < 30; i++) {
    const app = globalThis.__expressApp || serverModule.default || serverModule.app;
    if (typeof app === 'function') {
      return app(req, res);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return res.status(500).json({
    error: "Backend router chưa sẵn sàng",
    details: "Không tìm thấy express app instance"
  });
}
