const { test } = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/product");

test("Chap nhan san pham hop le", () => {
  const product = new Product({
    pid: "P001",
    pname: "Ban phim",
    price: 250000,
    quantity: 10,
  });

  assert.equal(product.validateSync(), undefined);
});

test("Tu choi san pham thieu ten", () => {
  const product = new Product({
    pid: "P002",
    price: 250000,
    quantity: 10,
  });

  const error = product.validateSync();
  assert.ok(error?.errors.pname);
});

test("Tu choi gia am", () => {
  const product = new Product({
    pid: "P003",
    pname: "Chuot",
    price: -100,
    quantity: 10,
  });

  const error = product.validateSync();
  assert.ok(error?.errors.price);
});

test("Tu choi so luong am", () => {
  const product = new Product({
    pid: "P004",
    pname: "Man hinh",
    price: 2000000,
    quantity: -1,
  });

  const error = product.validateSync();
  assert.ok(error?.errors.quantity);
});

test("Tu choi so luong thap phan", () => {
  const product = new Product({
    pid: "P005",
    pname: "Tai nghe",
    price: 300000,
    quantity: 1.5,
  });

  const error = product.validateSync();
  assert.ok(error?.errors.quantity);
});