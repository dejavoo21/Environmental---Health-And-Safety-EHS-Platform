const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/analytics/summary?preset=last90',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU1Y2NhNC1hMjFiLTRhNDMtYWM1NS02NjIwOTgzMTdkNGIiLCJyb2xlIjoiYWRtaW4iLCJvcmdhbmlzYXRpb25JZCI6Ijc0NTUwOTJiLWMwZmUtNDU4Mi1hMmU4LTMwZWMzYTEwNDU4OSIsIm9yZ2FuaXNhdGlvblNsdWciOiJkZWZhdWx0LW9yZyIsImlhdCI6MTc3MDI5NTcyMiwiZXhwIjoxNzcwMzI0NTIyfQ.QIvdjxgnk2W5gRlK6ZHb7lZ8GEmSB8Sj8T4NqHtTG3A',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
