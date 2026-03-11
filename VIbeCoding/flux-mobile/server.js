const express = require('express');
const path = require('path');
const { createRequestHandler } = require('@expo/server/adapter/express');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Serve the Frontend UI (CSS, Animations, Images)
app.use(express.static(path.join(__dirname, 'dist/client')));

// 2. Mount the Expo Serverless AI Routes
app.all(
  '*',
  createRequestHandler({
    build: path.join(__dirname, 'dist/server'),
  })
);

// 3. Ignite the Server
app.listen(PORT, () => {
  console.log(`Flux Command Center securely running on port ${PORT}`);
});
