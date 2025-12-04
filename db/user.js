const mysql = require('mysql2/promise');

async function createUsersTable() {
    const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "user"
    });

    console.log("📌 Kapcsolódás a user adatbázishoz...");

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE,
            hash VARCHAR(255),
            isAdmin TINYINT(1) DEFAULT 0
        )
    `);

    console.log("✔ A 'users' tábla készen áll!");

    await connection.end();
}

createUsersTable().catch(err => {
    console.error(err);
});
