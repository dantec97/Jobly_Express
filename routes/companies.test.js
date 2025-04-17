"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");
jest.setTimeout(10000); // Set timeout to 1 second
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u2Token, // Non-admin token
} = require("./_testCommon");
const { adminToken } = require("../models/_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("works for admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${adminToken}`); // Admin token
      console.log("U1TOKENNNNNN:", adminToken);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u2Token}`); // Non-admin token
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    console.log("**********Response bodyyy:***********", resp.body);
    expect(resp.body).toEqual({
      //create job in this test 
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("works: no filters", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.companies.length).toBeGreaterThan(0);
  });

  test("fails: invalid filter field", async function () {
    const resp = await request(app).get("/companies?invalidField=true");
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual("Invalid filter fields: invalidField");
  });

  test("fails: minEmployees > maxEmployees", async function () {
    const resp = await request(app).get("/companies?minEmployees=10&maxEmployees=5");
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual("minEmployees cannot be greater than maxEmployees");
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for a company with jobs", async function () {
    // Manually insert jobs for the company
    await db.query(`
      INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES 
        ('Job1', 50000, '0.01', 'c1'),
        ('Job2', 60000, '0', 'c1')
    `);

    // Query the database to confirm the jobs were inserted
    const jobs = await db.query("SELECT id, title, salary, equity, company_handle FROM jobs WHERE company_handle = 'c1'");
    console.log("Jobs in DB for company 'c1':", jobs.rows);

    // Make the GET request to fetch the company with jobs
    const resp = await request(app).get(`/companies/c1`);
    console.log("Response body:", resp.body);

    // Assert the response includes the jobs
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            id: expect.any(Number),
            title: "Job1",
            salary: 50000,
            equity: "0.01",
          },
          {
            id: expect.any(Number),
            title: "Job2",
            salary: 60000,
            equity: "0",
          },
        ],
      },
    });
  });

  test("works for a company with no jobs", async function () {
    const resp = await request(app).get(`/companies/c3`);
    expect(resp.body).toEqual({
      company: {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
        jobs: [],
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

  // test("works for a company with jobs", async function () {
  //   //this test is failing idk why, but i can confirm it works manually with insomnia???
  //   const resp = await request(app).get(`/companies`);
  //   console.log("########Response body in test:", resp.body);

  //   expect(resp.body).toEqual({
  //     company: {
  //       handle: "c1",
  //       name: "C1",
  //       description: "Desc1",
  //       numEmployees: 1,
  //       logoUrl: "http://c1.img",
  //       jobs: [
  //         {
  //           id: expect.any(Number),
  //           title: "Job1",
  //           salary: 50000,
  //           equity: "0.01",
  //         },
  //         {
  //           id: expect.any(Number),
  //           title: "Job2",
  //           salary: 60000,
  //           equity: "0",
  //         },
  //       ],
  //     },
  //   });
  // });

  test("works for a company with jobs", async function () {
    // Manually insert jobs for the company
    await db.query(`
      INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES 
        ('Job1', 50000, '0.01', 'c1'),
        ('Job2', 60000, '0', 'c1')
    `);
  
    // Query the database to confirm the jobs were inserted
    const jobs = await db.query("SELECT id, title, salary, equity, company_handle FROM jobs WHERE company_handle = 'c1'");
    console.log("Jobs in DB for company 'c1':", jobs.rows);
  
    // Make the GET request to fetch the company with jobs
    const resp = await request(app).get(`/companies/c1`);
    console.log("Response body:", resp.body);
  
    // Assert the response includes the jobs
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            id: expect.any(Number),
            title: "Job1",
            salary: 50000,
            equity: "0.01",
          },
          {
            id: expect.any(Number),
            title: "Job2",
            salary: 60000,
            equity: "0",
          },
        ],
      },
    });
  });

  test("works for a company with no jobs", async function () {
    const resp = await request(app).get(`/companies/c3`);
    expect(resp.body).toEqual({
      company: {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
        jobs: [],
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });


/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u2Token}`); // Non-admin token
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u2Token}`); // Non-admin token
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(404);
  });
});