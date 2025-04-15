const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { createToken } = require("../helpers/tokens");

const adminToken = createToken({ username: "u1", isAdmin: true });
const nonAdminToken = createToken({ username: "u2", isAdmin: false });

const freshAdminToken = createToken({ username: "u1", isAdmin: true });

console.log("adminToken payload:", jwt.decode(adminToken));
console.log("nonAdminToken payload:", jwt.decode(nonAdminToken));
console.log("USEEEEE THIS ADMIN TOKEN:", (adminToken));

let jobId1;
let jobId2;

async function commonBeforeAll() {
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM jobs");
  await db.query("ALTER SEQUENCE jobs_id_seq RESTART WITH 1"); // reset job ids, incrementing ids was messing up my tests 

  await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

  await db.query(`
    INSERT INTO users(username, password, first_name, last_name, email, is_admin)
    VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com', true), -- Admin user
           ('u2', $2, 'U2F', 'U2L', 'u2@email.com', false) -- Non-admin user
    RETURNING username`,
    [
      await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
    ]);

  await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Job1', 50000, '0.01', 'c1'),
           ('Job2', 60000, '0', 'c1')`);
  
  const result = await db.query("SELECT username, is_admin FROM users");
  console.log("Users in DB:", result.rows);

  const jobs = await db.query("SELECT * FROM jobs");
  console.log("Jobs in DB:", jobs.rows);
  jobId1 = jobs.rows[0].id;
  jobId2 = jobs.rows[1].id;
  console.log("Job IDs:", jobId1, jobId2);
} 

async function commonBeforeEach() {
  await db.query("BEGIN");
  
  
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  adminToken,
  nonAdminToken,
  freshAdminToken,
  jobId1,
  jobId2,
};