import axios from 'axios';

module.exports = async function () {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  axios.defaults.baseURL = `http://${host}:${port}`;
  // Let tests assert on 4xx/5xx responses directly instead of catching.
  axios.defaults.validateStatus = () => true;
};
