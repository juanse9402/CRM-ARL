import app from './api/index.js';

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
