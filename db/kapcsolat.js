const mysql = require("mysql2");

const kapcsolatDb = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "kapcsolat"
});

module.exports = kapcsolatDb;
