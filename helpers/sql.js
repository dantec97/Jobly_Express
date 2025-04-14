const { BadRequestError } = require("../expressError");

  /** Dynamically create SQL query string for partial updates.
   *
   * It is designed to handle partial updates, where only the fields provided in `dataToUpdate`
   * are updated, and it uses parameterized queries to prevent SQL injection.
   * 
   **/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
