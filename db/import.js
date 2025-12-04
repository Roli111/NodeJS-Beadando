const fs = require("fs");
const pool = require("./pool");

// TXT beolvasás
async function readTxt(filename) {
    const raw = fs.readFileSync(filename, "utf8").trim();
    const lines = raw.split("\n");

    const header = lines[0].split("\t").map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split("\t");
        const obj = {};

        header.forEach((h, idx) => {
            obj[h] = cols[idx] ? cols[idx].trim() : null;
        });

        records.push(obj);
    }
    return records;
}

// Táblák automatikus létrehozása
async function createTables() {
    console.log("📌 Táblák ellenőrzése / létrehozása...");

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS np (
            id INT PRIMARY KEY,
            nev VARCHAR(255)
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS telepules (
            id INT PRIMARY KEY,
            nev VARCHAR(255),
            npid INT,
            FOREIGN KEY (npid) REFERENCES np(id)
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ut (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nev VARCHAR(255),
            hossz FLOAT,
            allomas INT,
            ido FLOAT,
            vezetes INT,
            telepulesid INT,
            FOREIGN KEY (telepulesid) REFERENCES telepules(id)
        )
    `);

    console.log("✔ Táblák készen állnak.");
}

async function run() {
    console.log("➡️ Indul az import folyamat...\n");

    // 1. Táblák létrehozása
    await createTables();

    // 2. Adatok beolvasása fájlokból
    const np = await readTxt("np.txt");
    const telepules = await readTxt("telepules.txt");
    const utak = await readTxt("ut.txt");

    // 3. Adatok törlése (opcionális – hogy mindig tiszta legyen)
    console.log("🧹 Régi adatok törlése...");
    await pool.execute("DELETE FROM ut");
    await pool.execute("DELETE FROM telepules");
    await pool.execute("DELETE FROM np");

    // 4. Insert-ek
    console.log("➡️ np importálása...");
    for (const row of np) {
        await pool.execute(
            "INSERT INTO np (id, nev) VALUES (?, ?)",
            [row.id, row.nev]
        );
    }

    console.log("➡️ telepules importálása...");
    for (const row of telepules) {
        await pool.execute(
            "INSERT INTO telepules (id, nev, npid) VALUES (?, ?, ?)",
            [row.id, row.nev, row.npid]
        );
    }

    console.log("➡️ ut importálása...");
    for (const row of utak) {
        await pool.execute(
            `INSERT INTO ut 
            (nev, hossz, allomas, ido, vezetes, telepulesid) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                row.nev,
                parseFloat(row.hossz),
                parseInt(row.allomas),
                parseFloat(row.ido),
                parseInt(row.vezetes),
                parseInt(row.telepulesid)
            ]
        );
    }

    console.log("\n✅ Import sikeresen befejezve!");

    process.exit();
}

run().catch(err => console.error(err));
