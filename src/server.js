require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const Product = require("./product");

async function start() {
  const { PORT, MONGO_URI } = process.env;
  const port = Number(PORT);

  if (
    !MONGO_URI ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Kiem tra PORT va MONGO_URI trong .env");
  }

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  // Cho chi muc unique cua pid duoc tao xong
  await Product.init();

  console.log("Da ket noi MongoDB");

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Product API dang chay tai http://localhost:${port}`);
  });

  server.on("error", (err) => {
    console.error("Khong the mo cong API:", err.message);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("Khoi dong that bai:", err.message);
  process.exit(1);
}); 