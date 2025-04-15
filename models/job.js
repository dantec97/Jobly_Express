"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if companyHandle does not exist.
   */
  static async create({ title, salary, equity, companyHandle }) {
    const companyCheck = await db.query(
      `SELECT handle
       FROM companies
       WHERE handle = $1`,
      [companyHandle]
    );

    if (!companyCheck.rows[0]) {
      throw new BadRequestError(`Invalid company handle: ${companyHandle}`);
    }

    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );

    return result.rows[0];
  }

  /** Find all jobs (optionally filtered by title, minSalary, hasEquity).
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   */
  static async findAll(filters = {}) {
    const { title, minSalary, hasEquity } = filters;
    let query = `
      SELECT id,
             title,
             salary,
             equity,
             company_handle AS "companyHandle"
      FROM jobs`;
    const whereClauses = [];
    const queryValues = [];

    if (title) {
      queryValues.push(`%${title}%`);
      whereClauses.push(`title ILIKE $${queryValues.length}`);
    }

    if (minSalary !== undefined) {
      queryValues.push(minSalary);
      whereClauses.push(`salary >= $${queryValues.length}`);
    }

    if (hasEquity) {
      whereClauses.push(`equity > 0`);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY title";

    const jobsRes = await db.query(query, queryValues);
    return jobsRes.rows;
  }

  /** Given a job ID, return data about the job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if job not found.
   */
  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
       FROM jobs
       WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the fields.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                      SET ${setCols}
                      WHERE id = ${idVarIdx}
                      RETURNING id,
                                title,
                                salary,
                                equity,
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   */
  static async remove(id) {
    const result = await db.query(
      `DELETE
       FROM jobs
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;