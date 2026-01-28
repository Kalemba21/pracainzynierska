const dotenv = require("dotenv");
const { createApp } = require("./app");

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend dziala na http://localhost:${PORT}`);
});
