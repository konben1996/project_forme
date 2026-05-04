const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER || 'computer_store_user',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'computer_store_pass',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'computer_store',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  namedPlaceholders: false,
  dateStrings: true,
});

const tableColumnsCache = new Map();

const quoteIdentifier = (identifier) => `\`${String(identifier).replace(/`/g, '``')}\``;

const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

const execute = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const transaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      rollbackError.cause = error;
      throw rollbackError;
    }
    throw error;
  } finally {
    connection.release();
  }
};

const getTableColumns = async (tableName) => {
  if (!tableColumnsCache.has(tableName)) {
    const columnsPromise = pool
      .query(
        `SELECT
          COLUMN_NAME AS name,
          DATA_TYPE AS dataType,
          COLUMN_TYPE AS columnType,
          IS_NULLABLE AS isNullable,
          COLUMN_DEFAULT AS columnDefault,
          EXTRA AS extra,
          COLUMN_KEY AS columnKey
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [tableName],
      )
      .then(([rows]) => rows);

    tableColumnsCache.set(tableName, columnsPromise);
  }

  return tableColumnsCache.get(tableName);
};

const clearTableColumnsCache = () => {
  tableColumnsCache.clear();
};

module.exports = {
  pool,
  query,
  execute,
  transaction,
  getTableColumns,
  clearTableColumnsCache,
  quoteIdentifier,
};