"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");
const Job = require("../models/job"); // Import the Job model

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - name
 * - minEmployees
 * - maxEmployees
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const { name, minEmployees, maxEmployees, ...invalidFilters } = req.query;

    // Reject invalid filtering fields
    if (Object.keys(invalidFilters).length > 0) {
      throw new BadRequestError(`Invalid filter fields: ${Object.keys(invalidFilters).join(", ")}`);
    }

    // Validate that minEmployees is not greater than maxEmployees
    if (minEmployees !== undefined && maxEmployees !== undefined) {
      if (parseInt(minEmployees) > parseInt(maxEmployees)) {
        throw new BadRequestError("minEmployees cannot be greater than maxEmployees");
      }
    }

    // Pass valid filters to the model
    const companies = await Company.findAll({ name, minEmployees, maxEmployees });
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    // Fetch the company data
    const company = await Company.get(req.params.handle);

    // Fetch the jobs associated with the company
    const jobs = await Job.findAll({ companyHandle: req.params.handle });

    // Combine the company data with the jobs
    company.jobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      salary: job.salary,
      equity: job.equity,
    }));
    // Return the combined data
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: admin
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: admin
 */

router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
