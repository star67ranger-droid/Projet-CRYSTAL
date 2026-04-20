import betterSqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new betterSqlite3(path.join(__dirname, 'database.db'));

function migrateDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            crystals INTEGER NOT NULL DEFAULT 0,
            crystalsToday INTEGER NOT NULL DEFAULT 0,
            lastMessageTime INTEGER NOT NULL DEFAULT 0,
            lastMineTime INTEGER NOT NULL DEFAULT 0,
            mineStreak INTEGER NOT NULL DEFAULT 0,
            codes_redeemed TEXT NOT NULL DEFAULT ''
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS codes (
            code TEXT PRIMARY KEY,
            reward INTEGER NOT NULL DEFAULT 100,
            limite INTEGER NOT NULL DEFAULT 0,
            used_count INTEGER NOT NULL DEFAULT 0
        );
    `);

    const userCols = db.pragma('table_info(users)').map(c => c.name);
    const requiredUserCols = {
        crystals: 'INTEGER NOT NULL DEFAULT 0',
        crystalsToday: 'INTEGER NOT NULL DEFAULT 0',
        lastMessageTime: 'INTEGER NOT NULL DEFAULT 0',
        lastMineTime: 'INTEGER NOT NULL DEFAULT 0',
        mineStreak: 'INTEGER NOT NULL DEFAULT 0',
        codes_redeemed: "TEXT NOT NULL DEFAULT ''",
    };
    for (const [col, def] of Object.entries(requiredUserCols)) {
        if (!userCols.includes(col)) {
            db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
        }
    }

    const codeCols = db.pragma('table_info(codes)').map(c => c.name);
    if (!codeCols.includes('limite'))     db.exec(`ALTER TABLE codes ADD COLUMN limite INTEGER NOT NULL DEFAULT 0`);
    if (!codeCols.includes('used_count')) db.exec(`ALTER TABLE codes ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0`);
}

migrateDatabase();

// ─── utilidateurs ────────────────────────────────────────────────────────────────────

const getStmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
const insertStmt = db.prepare(`
    INSERT INTO users (user_id, crystals, crystalsToday, lastMessageTime, lastMineTime, mineStreak)
    VALUES (?, 0, 0, 0, 0, 0)
`);

function getUser(userId) {
    let user = getStmt.get(userId);
    if (!user) {
        insertStmt.run(userId);
        user = getStmt.get(userId);
    }
    return user;
}

const updateCrystalsStmt = db.prepare(`
    UPDATE users SET crystals = ?, crystalsToday = ? WHERE user_id = ?
`);

function updateCrystals(userId, crystals, crystalsToday) {
    updateCrystalsStmt.run(crystals, crystalsToday, userId);
}

const updateLastMessageTimeStmt = db.prepare('UPDATE users SET lastMessageTime = ? WHERE user_id = ?');
function updateLastMessageTime(userId, time) {
    updateLastMessageTimeStmt.run(time, userId);
}

const updateMineStreakStmt = db.prepare('UPDATE users SET lastMineTime = ?, mineStreak = ? WHERE user_id = ?');
function updateMineStreak(userId, lastMineTime, streak) {
    updateMineStreakStmt.run(lastMineTime, streak, userId);
}

const getTotalCrystalsStmt = db.prepare('SELECT SUM(crystals) as total FROM users');
function getTotalCrystals() {
    return getTotalCrystalsStmt.get().total || 0;
}

const getTotalUsersStmt = db.prepare('SELECT COUNT(*) as total FROM users');
function getTotalUsers() {
    return getTotalUsersStmt.get().total || 0;
}

const getRichestUserStmt = db.prepare('SELECT user_id as id, crystals FROM users ORDER BY crystals DESC LIMIT 1');
function getRichestUser() {
    return getRichestUserStmt.get() || { id: 'Unknown', crystals: 0 };
}

const getLeaderboardStmt = db.prepare(
    'SELECT user_id as id, crystals FROM users ORDER BY crystals DESC LIMIT 10'
);
function getLeaderboard() {
    return getLeaderboardStmt.all();
}

function getUserRank(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) + 1 as rank FROM users 
        WHERE crystals > (SELECT crystals FROM users WHERE user_id = ?)
        AND crystals > 0
    `).get(userId);
    return result?.rank || null;
}

// ─── Codes ────────────────────────────────────────────────────────────────────

function getCodes() {
    return db.prepare('SELECT code, reward, limite, used_count FROM codes').all();
}

function addCode(code, reward = 100, limite = 0) {
    const exists = db.prepare('SELECT code FROM codes WHERE code = ?').get(code);
    if (exists) return { success: false, message: 'Ce code existe déjà.' };
    db.prepare('INSERT INTO codes (code, reward, limite, used_count) VALUES (?, ?, ?, 0)').run(code, reward, limite);
    return { success: true, message: `Code **${code}** ajouté avec succès (récompense : ${reward} CRYSTALs, limite : ${limite === 0 ? 'illimitée' : limite}).` };
}

function removeCode(code) {
    const exists = db.prepare('SELECT code FROM codes WHERE code = ?').get(code);
    if (!exists) return { success: false, message: "Ce code n'existe pas." };
    db.prepare('DELETE FROM codes WHERE code = ?').run(code);
    return { success: true, message: `Code **${code}** supprimé avec succès.` };
}

function claimCode(code, userId) {
    const user = getUser(userId);
    const redeemedList = user.codes_redeemed ? user.codes_redeemed.split(',').filter(Boolean) : [];

    if (redeemedList.includes(code)) {
        return { success: false, message: 'Tu as déjà utilisé ce code.' };
    }

    const codeRow = db.prepare('SELECT reward, limite, used_count FROM codes WHERE code = ?').get(code);
    if (!codeRow) {
        return { success: false, message: 'Code invalide.' };
    }

    if (codeRow.limite > 0 && codeRow.used_count >= codeRow.limite) {
        return { success: false, message: "Ce code a atteint sa limite d'utilisation." };
    }

    const newCrystals = user.crystals + codeRow.reward;
    updateCrystals(userId, newCrystals, user.crystalsToday);

    const updatedCodes = [...redeemedList, code].join(',');
    db.prepare('UPDATE users SET codes_redeemed = ? WHERE user_id = ?').run(updatedCodes, userId);
    db.prepare('UPDATE codes SET used_count = used_count + 1 WHERE code = ?').run(code);

    const remaining = codeRow.limite > 0 ? codeRow.limite - codeRow.used_count - 1 : null;

    return {
        success: true,
        message: `Code réclamé ! Tu as reçu **${codeRow.reward}** CRYSTALs.`,
        reward: codeRow.reward,
        limite: codeRow.limite,
        remaining,
    };
}

export {
    getUser,
    updateCrystals,
    updateLastMessageTime,
    updateMineStreak,
    getTotalCrystals,
    getTotalUsers,
    getRichestUser,
    getCodes,
    addCode,
    removeCode,
    claimCode,
    getLeaderboard,
    getUserRank,
};