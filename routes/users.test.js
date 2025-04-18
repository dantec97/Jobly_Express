"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

const { nonAdminToken, adminToken, freshAdminToken } = require("../models/_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for admins: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${freshAdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  test("works for admins: create admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${freshAdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      },
      token: expect.any(String),
    });
  });

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "not-an-email",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** POST /users/:username/jobs/:id */

describe("POST /users/:username/jobs/:id", function () {
  beforeEach(async function () {
    // Manually insert jobs into the database
    await db.query("ALTER SEQUENCE jobs_id_seq RESTART WITH 1");
    await db.query(`
      INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES 
        ('Job1', 50000, '0.01', 'c1'),
        ('Job2', 60000, '0', 'c1')
    `);

    // Log the jobs to confirm they were inserted
    const jobs = await db.query("SELECT id, title FROM jobs");
  });

  test("works for admin", async function () {
    const jobs = await db.query("SELECT id, title FROM jobs");
    expect(jobs.rows).toEqual([
      { id: 1, title: "Job1" },
      { id: 2, title: "Job2" },
    ]);

    const users = await db.query("SELECT username FROM users");
    expect(users.rows).toEqual([
      { username: "u1" },
      { username: "u2" },
      { username: "u3" },
    ]);

    const resp = await request(app)
      .post(`/users/u1/jobs/1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ applied: 1 });
  });

  test("works for correct user", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/2`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ applied: 2 });

    const result = await db.query(
      `SELECT username, job_id
       FROM applications
       WHERE username = 'u2' AND job_id = $1`,
      [2]
    );
    expect(result.rows).toEqual([{ username: "u2", job_id: 2 }]);
  });

  test("unauth for other users", async function () {
    const resp = await request(app)
      .post(`/users/u1/jobs/1`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).post(`/users/u1/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user does not exist", async function () {
    const resp = await request(app)
      .post(`/users/nope/jobs/1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("not found if job does not exist", async function () {
    const resp = await request(app)
      .post(`/users/u1/jobs/999999`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
        },

        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
        },
      ],
    });
  });

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).get("/users");
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** GET /users/:username */
let jobId1;
let jobId2;
describe("GET /users/:username", function () {
  beforeEach(async function () {
    const jobRes = await db.query(`
      INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES 
        ('Job1', 50000, '0.01', 'c1'),
        ('Job2', 60000, '0', 'c1')
      RETURNING id
    `);
  
    jobId1 = jobRes.rows[0].id; // Use this in your test
    jobId2 = jobRes.rows[1].id; // Use this in your test
  });
  
  test("works for admin: user with applications", async function () {
    await db.query(
      `INSERT INTO applications (username, job_id)
       VALUES ('u1', $1)`,
      [jobId1]
    );
  
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
  
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        jobs: [jobId1],
      },
    });
  });


  test("works for admin: user with applications", async function () {
    await db.query(
      `INSERT INTO applications (username, job_id)
       VALUES ('u2', $1)`,
      [jobId2]
    );
  
    const resp = await request(app)
      .get(`/users/u2`)
      .set("authorization", `Bearer ${nonAdminToken}`);
  
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "user2@user.com",
        isAdmin: false,
        jobs: [jobId2],
      },
    });
  });

  

  test("works for correct user: user with no applications", async function () {
    const resp = await request(app)
      .get(`/users/u2`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "user2@user.com",
        isAdmin: false,
       
      },
    });
  });

  test("unauth for other users", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
      .get(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "New" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("works for correct user", async function () {
    const resp = await request(app)
      .patch(`/users/u2`)
      .send({ firstName: "New" })
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u2",
        firstName: "New",
        lastName: "U2L",
        email: "user2@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for other users", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "New" })
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "New" });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({ firstName: "Nope" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: 42 })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: set new password", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ password: "new-password" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("works for correct user", async function () {
    const resp = await request(app)
      .delete(`/users/u2`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.body).toEqual({ deleted: "u2" });
  });

  test("unauth for other users", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${nonAdminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

