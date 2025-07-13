const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: "mad",
  host: "localhost",
  database: "osidang",
  password: "gjrhkdrl123", // Make sure to set your password if you have one.
  port: 5432,
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from osidang-backend!");
});

// Example route to test database connection
app.get("/test-db", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error connecting to the database");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
