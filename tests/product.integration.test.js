const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const baseURL = process.env.API_URL;

if (!baseURL) {
  throw new Error("Can khai bao API_URL cua API dung de kiem thu");
}

async function request(path, method = "GET", body) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

test("Healthcheck: API ket noi MongoDB", async () => {
  const result = await request("/health");

  assert.equal(result.status, 200);
  assert.equal(result.data.status, "healthy");
  assert.equal(result.data.database, "connected");
});

test("CRUD Product va kiem tra du lieu", async (t) => {
  const pid = `CI-${randomUUID()}`;
  const path = `/api/products/${pid}`;

  const product = {
    pid,
    pname: "Ban phim",
    price: 250000,
    quantity: 10,
  };

  // Don san pham kiem thu neu mot buoc ben duoi bi loi.
  t.after(async () => {
    await request(path, "DELETE");
  });

  // CREATE
  const created = await request("/api/products", "POST", product);

  assert.equal(created.status, 201);
  assert.equal(created.data.pid, pid);
  assert.equal(created.data.pname, product.pname);
  assert.equal(created.data.price, product.price);
  assert.equal(created.data.quantity, product.quantity);

  // Khong cho phep trung pid.
  const duplicate = await request("/api/products", "POST", product);
  assert.equal(duplicate.status, 409);

  // READ: doc mot san pham.
  const detail = await request(path);

  assert.equal(detail.status, 200);
  assert.equal(detail.data.pid, pid);
  assert.equal(detail.data.price, 250000);

  // READ: danh sach phai chua san pham vua tao.
  const list = await request("/api/products");

  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.data));
  assert.ok(list.data.some((item) => item.pid === pid));

  // UPDATE
  const updatedProduct = {
    pid,
    pname: "Ban phim co",
    price: 450000,
    quantity: 5,
  };

  const updated = await request(path, "PUT", updatedProduct);

  assert.equal(updated.status, 200);
  assert.equal(updated.data.pname, "Ban phim co");
  assert.equal(updated.data.price, 450000);
  assert.equal(updated.data.quantity, 5);

  // Doc lai de kiem tra thay doi da duoc luu.
  const saved = await request(path);

  assert.equal(saved.status, 200);
  assert.equal(saved.data.pname, "Ban phim co");
  assert.equal(saved.data.price, 450000);
  assert.equal(saved.data.quantity, 5);

  // Du lieu sai phai bi tu choi.
  const invalid = await request(path, "PUT", {
    ...updatedProduct,
    price: -1,
  });

  assert.equal(invalid.status, 400);

  // Gia hop le truoc do van duoc giu nguyen.
  const unchanged = await request(path);

  assert.equal(unchanged.status, 200);
  assert.equal(unchanged.data.price, 450000);

  // DELETE
  const deleted = await request(path, "DELETE");
  assert.equal(deleted.status, 200);

  // San pham da xoa phai tra ve 404.
  const missing = await request(path);
  assert.equal(missing.status, 404);
});