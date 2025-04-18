"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  adminToken,
  nonAdminToken,
  jobId1,
  jobId2,
} = require("../models/_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */
describe("POST /jobs", function () {
  const newJob = {
    title: "New Job",
    salary: 100000,
    equity: "0.05",
    companyHandle: "c1",
  };

  test("works for admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "New Job",
        salary: 100000,
        equity: "0.05",
        companyHandle: "c1",
      },
    });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "New Job",
        salary: -100000, // Invalid salary
        equity: "0.05",
        companyHandle: "c1",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("works for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "Job1",
          salary: 50000,
          equity: "0.01",
          companyHandle: "c1",
        },
        {
          id: expect.any(Number),
          title: "Job2",
          salary: 60000,
          equity: "0",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("works with filters", async function () {
    const resp = await request(app).get("/jobs?minSalary=50000&hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "Job1",
          salary: 50000,
          equity: "0.01",
          companyHandle: "c1",
        },
      ],
    });
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "Job1",
        salary: 50000,
        equity: "0.01",
        companyHandle: "c1",
      },
      
    });
    
  });
 
  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({ title: "Updated Job" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "Updated Job",
        salary: 50000,
        equity: "0.01",
        companyHandle: "c1",
      },
    });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({ title: "Updated Job" })
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/999`)
      .send({ title: "Updated Job" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "1" });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/999`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});