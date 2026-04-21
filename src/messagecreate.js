import { getUser, updateCrystals, updateLastMessageTime } from './database.js';


export function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toString();
}

// Crystals gagnés par message 
export function getMessageCrystals() {
    return 8;
}

// Crystals gagnés par mine quotidienne avec bonus streak
export function getMineCrystals(streak = 0) {
    const base = 800;
    const streakBonus = Math.min(streak * 0.05, 0.25); // +5% par jour, max +25%
    return Math.floor(base * (1 + streakBonus));
}

export const name = 'messageCreate';

export function execute(message) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const user   = getUser(userId);

    const COOLDOWN = 30000;
    if (Date.now() - (user.lastMessageTime || 0) < COOLDOWN) return;

    const crystalsToAdd    = getMessageCrystals();
    const newCrystals      = user.crystals + crystalsToAdd;
    const newCrystalsToday = user.crystalsToday + crystalsToAdd;

    updateCrystals(userId, newCrystals, newCrystalsToday);
    updateLastMessageTime(userId, Date.now());
}