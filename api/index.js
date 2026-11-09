import serverHandler from '../server.js';

export default async function handler(req, res) {
  return serverHandler(req, res);
}
