const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { createToken } = require("../helpers/tokens");

// Tokens for testing
const adminToken = createToken({ username: "u1", isAdmin: true });
const nonAdminToken = createToken({ username: "u2", isAdmin: false });
const freshAdminToken = createToken({ username: "u1", isAdmin: true });

console.log("Admin token payload:", jwt.decode(adminToken));
console.log("Non-admin token payload:", jwt.decode(nonAdminToken));
console.log("USE THIS ADMIN TOKEN:", adminToken);

let jobId1;
let jobId2;

async function commonBeforeAll() {
  // Clean out tables and reset ID sequence
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM jobs");
  await db.query("DELETE FROM applications");
  await db.query("ALTER SEQUENCE jobs_id_seq RESTART WITH 1");

  // Add sample companies
  await db.query(`
    INSERT INTO companies (handle, name, num_employees, description, logo_url)
    VALUES 
      ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
      ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
      ('c3', 'C3', 3, 'Desc3', 'http://c3.img')
  `);

  // Add sample users (admin and non-admin)
  const hashedPasswords = await Promise.all([
    bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
    bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
  ]);

  await db.query(`
    INSERT INTO users (username, password, first_name, last_name, email, is_admin)
    VALUES 
      ('u1', $1, 'U1F', 'U1L', 'u1@email.com', true),
      ('u2', $2, 'U2F', 'U2L', 'u2@email.com', false)
  `, hashedPasswords);

  // Add sample jobs
  await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES 
      ('Job1', 50000, '0.01', 'c1'),
      ('Job2', 60000, '0', 'c1')
  `);
  

  // Log current DB state (for debugging)
  const companies = await db.query("SELECT * FROM companies");
  const jobs = await db.query("SELECT * FROM jobs");
  const users = await db.query("SELECT username, is_admin FROM users");

  console.log("Companies in DB after setup:", companies.rows);
  console.log("Jobs in DB after setup:", jobs.rows);
  console.log("Users in DB:", users.rows);

  // Store job IDs for tests
  const jobResults = await db.query("SELECT id FROM jobs");
  jobId1 = jobResults.rows[0]?.id;
  jobId2 = jobResults.rows[1]?.id;

  console.log("Job IDs:", jobId1, jobId2);
}


async function commonBeforeEach() {
  console.log("Starting DB transaction");
  await db.query("BEGIN");
}

async function commonAfterEach() {
  console.log("Rolling back DB transaction");
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
