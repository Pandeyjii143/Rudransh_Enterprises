const http = require('http');
const data = JSON.stringify({ orderId: 1 });
const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/payment/create-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(body);
  });
});
req.on('error', (err) => console.error('err', err.message));
req.write(data);
req.end();
