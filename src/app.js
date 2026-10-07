const mongoose = require("mongoose");
const express = require("express");
const Product = require("./product");

const app = express();

app.use(express.json());

// Kiem tra API va ket noi MongoDB
app.get("/health", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
      });
    }

    await mongoose.connection.db.admin().command(
      { ping: 1 },
      { timeoutMS: 2000 }
    );

    res.status(200).json({
      status: "healthy",
      database: "connected",
    });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      database: "unavailable",
    });
  }
});

// Kiem tra du lieu cho POST va PUT
function validateProduct(req, res, next) {
  const { pid, pname, price, quantity } = req.body || {};

  if (
    typeof pid !== "string" ||
    !pid.trim() ||
    typeof pname !== "string" ||
    !pname.trim() ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0
  ) {
    return res.status(400).json({
      message:
        "Can pid, pname khong rong; price la so >= 0; quantity la so nguyen >= 0",
    });
  }

  req.productData = {
    pid: pid.trim(),
    pname: pname.trim(),
    price,
    quantity,
  };

  next();
}

// Trang kiem tra phien ban CD
app.get("/", (req, res) => {
  res.json({
    message: "Product API - CD tu dong thanh cong",
  });
});

// CREATE: Them san pham
app.post("/api/products", validateProduct, async (req, res) => {
  const product = await Product.create(req.productData);
  res.status(201).json(product);
});

// READ: Xem danh sach
app.get("/api/products", async (req, res) => {
  const products = await Product.find().sort({ pid: 1 });
  res.json(products);
});

// READ: Xem mot san pham theo pid
app.get("/api/products/:pid", async (req, res) => {
  const product = await Product.findOne({ pid: req.params.pid });

  if (!product) {
    return res.status(404).json({
      message: "Khong tim thay san pham",
    });
  }

  res.json(product);
});

// UPDATE: Cap nhat day du san pham, giu nguyen pid
app.put("/api/products/:pid", validateProduct, async (req, res) => {
  if (req.productData.pid !== req.params.pid) {
    return res.status(400).json({
      message: "pid trong body phai trung voi pid tren URL",
    });
  }

  const product = await Product.findOneAndUpdate(
    { pid: req.params.pid },
    { $set: req.productData },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      message: "Khong tim thay san pham",
    });
  }

  res.json(product);
});

// DELETE: Xoa san pham theo pid
app.delete("/api/products/:pid", async (req, res) => {
  const product = await Product.findOneAndDelete({
    pid: req.params.pid,
  });

  if (!product) {
    return res.status(404).json({
      message: "Khong tim thay san pham",
    });
  }

  res.json({
    message: "Da xoa san pham",
    pid: product.pid,
  });
});

// URL khong ton tai
app.use((req, res) => {
  res.status(404).json({
    message: "API khong ton tai",
  });
});

// Xu ly loi tap trung
app.use((err, req, res, next) => {
  if (err.code === 11000) {
    return res.status(409).json({
      message: "pid da ton tai",
    });
  }

  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({
      message: err.message,
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "JSON khong hop le",
    });
  }

  console.error(err);

  res.status(500).json({
    message: "Loi may chu",
  });
});

module.exports = app;