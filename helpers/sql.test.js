const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
  test("works: single field update", function () {
    const dataToUpdate = { firstName: "Aliya" };
    const jsToSql = { firstName: "first_name" };

    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result).toEqual({
      setCols: '"first_name"=$1',
      values: ["Aliya"],
    });
  });

  test("works: multiple fields update", function () {
    const dataToUpdate = { firstName: "Aliya", age: 32 };
    const jsToSql = { firstName: "first_name", age: "age" };

    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });

  test("works: no jsToSql mapping provided", function () {
    const dataToUpdate = { firstName: "Aliya", age: 32 };
    const jsToSql = {}; // No mapping provided

    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result).toEqual({
      setCols: '"firstName"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });

  test("throws BadRequestError if no data provided", function () {
    const dataToUpdate = {};
    const jsToSql = { firstName: "first_name" };

    expect(() => sqlForPartialUpdate(dataToUpdate, jsToSql)).toThrow(BadRequestError);
  });
});