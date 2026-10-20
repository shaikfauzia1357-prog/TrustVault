
const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("Documents cannot be viewed without login", async () => {
  const response = await request(app).get("/documents");

  assert.equal(response.status, 401);
});

test("Audit logs cannot be viewed without login", async () => {
  const response = await request(app).get("/audit-logs");

  assert.equal(response.status, 401);
});

test("Documents cannot be downloaded without login", async () => {
  const response = await request(app).get("/download/1");

  assert.equal(response.status, 401);
});
