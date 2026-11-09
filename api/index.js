import { app } from '../server.js';
import * as fullServer from '../server.js';

let expressApp = null;

async function resolveApp() {
  if (expressApp) return expressApp;
  
  // Đợi server.js nạp dữ liệu đĩa và gán router vào app
  for (let i = 0; i < 20; i++) {
    const candidate = app || fullServer.app || fullServer.default;
    if (typeof candidate === 'function') {
      expressApp = candidate;
      return expressApp;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

export default async function handler(req, res) {
  const handlerApp = await resolveApp();
  if (typeof handlerApp === 'function') {
    return handlerApp(req, res);
  }
  return res.status(500).json({
    error: "Backend router chưa sẵn sàng",
    details: "Không tìm thấy thể hiện Express sau thời gian chờ"
  });
}
