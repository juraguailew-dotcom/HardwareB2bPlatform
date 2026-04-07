require('dotenv').config();
const pool = require('./database/db');

const U = (id, id2) => {
    const base = 'https://images.unsplash.com/photo-';
    const q = '?auto=format&fit=crop&w=600&q=80';
    return id2
        ? [`${base}${id}${q}`, `${base}${id2}${q}`]
        : [`${base}${id}${q}`];
};

// All IDs verified 200 OK
const HAMMER      = '1586864387967-d02ef85d93e8';
const DRILL       = '1504148455328-c376907d081c';
const SAW         = '1530124566582-a618bc2615dc';
const TOOLS       = '1572981779307-38b8cabb2407';
const WRENCH      = '1558618666-fcd25c85cd64';
const LUMBER      = '1541123437800-1bb1317badc2';
const CEMENT      = '1504307651254-35680f356dfd';
const PAINT       = '1589939705384-5185137a7f0f';
const PAINTBRUSH  = '1562259949-e8e7689d7828';
const SAFETY      = '1559827260-dc66d52bef19';
const GLOVES      = '1584308666744-24d5c474f2ae';
const BOOTS       = '1542291026-7eec264c27ff';
const ELECTRICAL  = '1621905251189-08b45d6a269e';
const PLUMBING    = '1584622650111-993a426fbf0a';
const COFFEE      = '1495474472287-4d71bcdd2085';
const LAPTOP      = '1496181133206-80ce9b88a853';
const LIGHT       = '1565814329452-e1efa11c5b89';
const MOP         = '1563453392212-326f5e854473';
const MIRROR      = '1618220179428-22790b461013';
const TABLE       = '1555041469-a586c61ea9bc';
const AIRCON      = '1585771724684-38269d6639fd';

const imageMap = [
    // TOOLS
    { match: /hammer/i,                         imgs: U(HAMMER, TOOLS) },
    { match: /power\s*drill|drill/i,             imgs: U(DRILL, TOOLS) },
    { match: /circular\s*saw|saw/i,              imgs: U(SAW, TOOLS) },
    { match: /screw\s*driver|screwdriver|crew\s*driver/i, imgs: U(TOOLS, WRENCH) },
    { match: /wrench|spanner/i,                  imgs: U(WRENCH, TOOLS) },
    { match: /grinder/i,                         imgs: U(SAW, TOOLS) },
    { match: /plier/i,                           imgs: U(TOOLS, WRENCH) },
    { match: /tape\s*measure/i,                  imgs: U(TOOLS, WRENCH) },
    { match: /hand\s*tool/i,                     imgs: U(TOOLS, HAMMER) },
    { match: /air\s*con.*gas/i,                  imgs: U(AIRCON) },

    // MATERIALS
    { match: /lumber|2x4|timber|sawn/i,          imgs: U(LUMBER, CEMENT) },
    { match: /drywall/i,                         imgs: U(CEMENT, LUMBER) },
    { match: /cement|concrete/i,                 imgs: U(CEMENT, LUMBER) },
    { match: /plywood/i,                         imgs: U(LUMBER, CEMENT) },
    { match: /fastener|screw|nail/i,             imgs: U(TOOLS, WRENCH) },
    { match: /mirror/i,                          imgs: U(MIRROR) },
    { match: /dinner\s*table|table/i,            imgs: U(TABLE) },
    { match: /window\s*frame/i,                  imgs: U(CEMENT, LUMBER) },
    { match: /building\s*block/i,                imgs: U(CEMENT, LUMBER) },

    // PAINT
    { match: /paint\s*brush|roller/i,            imgs: U(PAINTBRUSH, PAINT) },
    { match: /paint|emulsion/i,                  imgs: U(PAINT, PAINTBRUSH) },

    // SAFETY
    { match: /safety\s*glove|glove/i,            imgs: U(GLOVES, SAFETY) },
    { match: /safety\s*vest|vest/i,              imgs: U(SAFETY, GLOVES) },
    { match: /safety\s*boot|boot/i,              imgs: U(BOOTS, SAFETY) },
    { match: /hard\s*hat|helmet/i,               imgs: U(SAFETY, GLOVES) },

    // ELECTRICAL
    { match: /circuit\s*breaker/i,               imgs: U(ELECTRICAL, WRENCH) },
    { match: /light\s*switch|socket/i,           imgs: U(ELECTRICAL, LIGHT) },
    { match: /extension\s*lead/i,                imgs: U(ELECTRICAL, WRENCH) },
    { match: /flood\s*light|light/i,             imgs: U(LIGHT, ELECTRICAL) },
    { match: /air\s*con.*fan|fan\s*blade/i,      imgs: U(AIRCON) },
    { match: /air\s*con.*filter/i,               imgs: U(AIRCON) },
    { match: /air\s*con.*cover/i,                imgs: U(AIRCON) },
    { match: /phase\s*meter|meter/i,             imgs: U(ELECTRICAL, WRENCH) },

    // PLUMBING
    { match: /toilet\s*sit|toilet\s*seat/i,      imgs: U(PLUMBING) },
    { match: /toilet\s*plunger|plunger/i,        imgs: U(PLUMBING) },
    { match: /pipe|tubing|pex|copper/i,          imgs: U(WRENCH, PLUMBING) },
    { match: /sink|faucet/i,                     imgs: U(PLUMBING) },
    { match: /mop/i,                             imgs: U(MOP) },

    // LUMBER
    { match: /hardwood|kwila|rosewood/i,         imgs: U(LUMBER, CEMENT) },

    // HARDWARE
    { match: /coffee\s*machine/i,                imgs: U(COFFEE) },
    { match: /laptop/i,                          imgs: U(LAPTOP) },
    { match: /door|frame/i,                      imgs: U(CEMENT, LUMBER) },
    { match: /hardware|fastener|fixing/i,        imgs: U(TOOLS, WRENCH) },
];

const categoryFallback = {
    tools:      U(TOOLS, HAMMER),
    materials:  U(LUMBER, CEMENT),
    paint:      U(PAINT, PAINTBRUSH),
    safety:     U(SAFETY, GLOVES),
    electrical: U(ELECTRICAL, LIGHT),
    plumbing:   U(PLUMBING, WRENCH),
    lumber:     U(LUMBER, CEMENT),
    hardware:   U(TOOLS, WRENCH),
};

function resolveImages(name, category) {
    for (const entry of imageMap) {
        if (entry.match.test(name)) return entry.imgs;
    }
    return categoryFallback[category] || U(TOOLS, HAMMER);
}

async function run() {
    const { rows } = await pool.query('SELECT id, name, category FROM products ORDER BY id');
    let updated = 0;
    for (const p of rows) {
        const imgs = resolveImages(p.name, p.category);
        await pool.query('UPDATE products SET images = $1 WHERE id = $2', [imgs, p.id]);
        console.log(`✅ #${p.id} ${p.name}`);
        updated++;
    }
    console.log(`\nDone — ${updated} products updated.`);
    await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
