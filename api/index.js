import * as serverModule from '../server.js';

const handler = serverModule.default || serverModule.app || serverModule;

export default function (req, res) {
  if (typeof handler === 'function') {
    return handler(req, res);
  }
  return res.status(500).json({ 
    error: "Không tìm thấy instance express app trong server.js" 
  });
}
