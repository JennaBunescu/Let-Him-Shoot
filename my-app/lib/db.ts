import sqlite3 from "sqlite3";
import path from "path";

// Use absolute path to ensure consistency
const dbPath = path.resolve(process.cwd(), "./ncaamb_data.db");
const db = new sqlite3.Database(dbPath);

export default db;
