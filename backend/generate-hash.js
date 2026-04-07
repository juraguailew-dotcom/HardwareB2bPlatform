// backend/generate-hash.js
async function generateHash() {
    const bcrypt = require('bcrypt');
    const password = process.env.ADMIN_PASSWORD || process.argv[2];
    if (!password) {
        console.error('Usage: ADMIN_PASSWORD=<password> node generate-hash.js  OR  node generate-hash.js <password>');
        process.exit(1);
    }
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hash:', hash);
}

generateHash();