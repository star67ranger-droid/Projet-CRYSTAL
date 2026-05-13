import {
    Client,
    GatewayIntentBits,
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActivityType,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
} from 'discord.js';
import dotenv from 'dotenv';
import { createCanvas, loadImage } from 'canvas';
// [CORRECT] Les fichiers sont bien dans src/ d'après la structure du projet
import { execute } from './src/messagecreate.js';
import { getUser, updateCrystals, updateMineStreak, updateLastMessageTime, getUserRank, getLeaderboard, getTotalCrystals, getTotalUsers, getRichestUser, claimCode, getCodes, addCode, removeCode, registerDrop, claimDrop, transferCrystalsAtomic, claimDropAndAwardCrystalsAtomic, addCrystalsAtomic, removeCrystalsAtomic } from './src/database.js';
import { formatNumber, getMineCrystals } from './src/messagecreate.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const crystalIcon = await loadImage(join(__dirname, 'assets', 'Crystals_logo_nobg.png'));


const COOLDOWN_24_HOURS = 86400000;
// CORRECTIF #1 : COOLDOWN n'était jamais défini mais était utilisé dans /mine et /profil → crash garanti
const COOLDOWN = COOLDOWN_24_HOURS;
const STREAK_WINDOW_HOURS = 48;
const DEVELOPER_ID = '1102675129927991331';
const version = '1.2.3';

// ─── Cooldown global et cache d'optimisation ───────────────────────────────────
const GLOBAL_COMMAND_COOLDOWN = 1500; // 1.5 secondes par utilisateur
const userCommandCooldowns = new Map(); // Cooldown par utilisateur

// Cache utilisateur simple (TTL de 5 minutes pour moins de load BD)
const userCache = new Map();
const CACHE_TTL = 300000;

function getCachedUser(userId) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.user;
    }
    userCache.delete(userId);
    return null;
}

function setCachedUser(userId, userData) {
    userCache.set(userId, { user: userData, timestamp: Date.now() });
    return userData;
}

function getUserOptimized(userId) {
    const cached = getCachedUser(userId);
    if (cached) return cached;
    return setCachedUser(userId, getUser(userId));
}

// Cooldown transfert : stocké par utilisateur pour 30 minutes
const transferCooldowns = new Map();

// Cache pour les stats économiques (TTL de 10 secondes)
let economyCache = null;
let economyCacheTime = 0;
const ECONOMY_CACHE_TTL = 10000;

function getEconomyStats() {
    const now = Date.now();
    if (economyCache && (now - economyCacheTime) < ECONOMY_CACHE_TTL) {
        return economyCache;
    }
    economyCache = {
        total: getTotalCrystals(),
        users: getTotalUsers(),
        richest: getRichestUser()
    };
    economyCacheTime = now;
    return economyCache;
}

// Wrapper pour updateCrystals qui invalide le cache
function updateCrystalsOptimized(userId, crystals, crystalsToday) {
    userCache.delete(userId);
    economyCache = null;
    updateCrystals(userId, crystals, crystalsToday);
}

// Config du bot (métadonnées)
const BOT_CONFIG = {
    activityTexts: [
        '/help | /suggestion',
        '.gg/empire-production',
        'Hébergé par NotFromServer',
        'Créé par PIKEO',
    ],
    guildLink: 'https://discord.gg/wTgUpmtK5A',
    creatorLink: 'https://portfolio-pikeo.vercel.app',
    hostingLink: 'https://notfromservers.sumupstore.com',
    accentColor: 0x57F287
};

let currentActivityIndex = 0;

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});



// ─── Commandes de bot générales ────────────────────────────────────────────────

const pingCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test de latence du bot'),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const sent = await interaction.fetchReply();
        const latenceBot = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = client.ws.ping === -1 ? 'En attente... *(merci de refaire la commande)*' : `${client.ws.ping}ms`;

        const container = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## <a:51047animatedarrowwhite:1483033113134239827> Pong! <:discotoolsxyzicon16:1496223650490089754>')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> **Latence API** : ${apiLatency}`),
                new TextDisplayBuilder().setContent(`> **Latence Bot** : ${latenceBot}ms`),
                new TextDisplayBuilder().setContent(`> **Uptime** : <t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`)
            );
        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    }
};

const botinfoCommand = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Affiche des infos sur le bot'),
    async execute(interaction) {
        const container = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## <a:51047animatedarrowwhite:1483033113134239827> Informations sur le bot ${client.user.username} <:discotoolsxyzicon18:1496223647025725622>`)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ format: 'png', size: 512 }))
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> **Nom** : ${client.user.username} <:dfgvdfgvxdfgvx9:1496538747594870936>`),
                new TextDisplayBuilder().setContent(`> **ID** : ${client.user.id} <:discotoolsxyzicon15:1496223652411080884>`),
                new TextDisplayBuilder().setContent(`> **Créateur** : Tortue Normande <:discotoolsxyzicon19:1496223644911931563>`),
                new TextDisplayBuilder().setContent(`> **Hébergement** : [NotFromServer](https://notfromservers.sumupstore.com) <:dfgvdfgvxdfgvx10:1496538748729423360>`),
                new TextDisplayBuilder().setContent(`> **Langage de programmation** : JavaScript (discord.js) <:19915discordjs:1483039713702055946>`),
                new TextDisplayBuilder().setContent(`> **Version** : ${version} <:discotoolsxyzicon6:1496223667464442018>`)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('https://i.postimg.cc/YSznnjg8/CRYSTALBOT.png')
                )
            );

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    }
};


// ─── Fonction d'aide avec menu ──────────────────────────────────────────────────

function createHelpContainer(category = 'accueil', interaction) {
    const member = interaction.member;

    const categories = {
        accueil: {
            title: ' 🏠 Accueil ',
            description: 'Bienvenue sur le panel d\'aide ! Utilisez le menu ci-dessous pour explorer les commandes disponibles.',
            commands: [
                `> 💎 ・**Type de bot** : Système d'économie Discord`,
                `> 🤖 ・**Version** : ${version}`,
                `> 👥 ・**Membres** : ${member.guild.memberCount}`,
            ],
            links: [
                '> 🌐 ・**Empire Du 🌍** : [Rejoin nous](https://discord.gg/wTgUpmtK5A)',
                '> 👨‍💻 ・**Créateur** : [Tortue Normande](https://portfolio-pikeo.vercel.app)',
                '> 💽 ・**Hébergement** : [Héberger par NotFromServer](https://notfromservers.sumupstore.com)'
            ],
        },
        utilitaires: {
            title: ' ✨ Commandes utilitaires ',
            description: 'Commandes générales pour gérer tes CRYSTALs et afficher des informations.',
            commands: [
                '> **</profil:1482698332462776360>** [utilisateur] — Affiche ton profil CRYSTAL avec tes CRYSTALs',
                '> **</mine:1486446312709947464>** — Miner des CRYSTALs (max 1 fois par 24h, bonus streak)',
                '> **</donner_crystal:1485964356687499346>** [utilisateur] [montant] — Envoyer des CRYSTALs à un autre joueur',
                '> **</top_crystals:1487382097449586761>** — Afficher le classement des joueurs les plus riches',
                '> **</ping:1486462852352053499>** — Affiche la latence du bot et de l\'API Discord',
                '> **</botinfo:1486462852352053500>** — Informations générales sur le bot',
                '> **</help:1486655907097215066>** — Affiche ce menu d\'aide',
            ],
            permissions_requises: 'Aucune permission requise',
        },
        communaute: {
            title: ' 💬 Commandes communauté ',
            description: 'Commandes pour interagir avec les créateurs et améliorer le bot.',
            commands: [
                '> **</suggestion:1487497763234250975>** — Soumettre une suggestion pour améliorer le bot',
                '> **</report:1487499249913692352>** — Signaler un bug ou un problème au développeur',
                '> **</settings:1487497763234250975>** — Afficher les codes de récompense disponibles',
            ],
            permissions_requises: 'Aucune permission requise',
        },
        administration: {
            title: ' ⚙️ Commandes d\'administration ',
            description: '[Only admin] Commandes réservées aux administrateurs pour gérer l\'économie.',
            commands: [
                '> **</add_crystal:1498602191387230250>** [utilisateur] [montant] — Ajouter des CRYSTALs à un utilisateur',
                '> **</remove_crystal:1498602191387230251>** [utilisateur] [montant] — Retirer des CRYSTALs à un utilisateur',
                '> **</drop_crystal:1498602191387230252>** [montant] [salon] — Créer un drop de CRYSTALs (premier qui clique gagne)',
                '> **</reset_crystal:1498602191387230253>** [utilisateur] — Réinitialiser les CRYSTALs d\'un joueur',
                '> **</tracker_economie:1498602191387230254>** — Afficher les statistiques économiques du serveur',
                '> **</settings:1498602191387230255>** — Gérer les codes de récompense (ajouter/supprimer)',
            ],
            permissions_requises: 'Administrator',
        },
    };

    if (category === 'administration' && !member.permissions.has(PermissionFlagsBits.Administrator) && member.id !== DEVELOPER_ID) {
        category = 'accueil';
    }

    const data = categories[category] || categories.accueil;

    const menuOptions = [
        new StringSelectMenuOptionBuilder()
            .setLabel('🏠 Accueil')
            .setDescription('Informations générales et liens utiles')
            .setValue('accueil'),
        new StringSelectMenuOptionBuilder()
            .setLabel('✨ Utilitaires')
            .setDescription('Commandes pour gérer tes CRYSTALs')
            .setValue('utilitaires'),
        new StringSelectMenuOptionBuilder()
            .setLabel('💬 Communauté')
            .setDescription('Suggestions, signalements et codes')
            .setValue('communaute'),
    ];

    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.id === DEVELOPER_ID) {
        menuOptions.push(
            new StringSelectMenuOptionBuilder()
                .setLabel('⚙️ Administration')
                .setDescription('[Only admin] Commandes d\'administration')
                .setValue('administration')
        );
    }

    const helpMenuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📂 Choisissez une catégorie...')
            .addOptions(menuOptions)
    );

    const permission = data.permissions_requises ? `\n**Permissions requises :** ${data.permissions_requises}` : '';
    const description = data.description + permission;

    const container = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## <a:51047animatedarrowwhite:1483033113134239827> ${data.title}`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

    data.commands.forEach(cmd => {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cmd));
    });

    if (category === 'accueil' && data.links) {
        container
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**🌐 Liens utiles :**')
            );
        data.links.forEach(link => {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(link));
        });
    }

    container
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(helpMenuRow);

    return container;
}

const helpCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Liste rapide des commandes'),
    async execute(interaction) {
        const container = createHelpContainer('accueil', interaction);
        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    }
};


const suggestionCommand = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Soumettre une suggestion pour le bot'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('suggestion_modal')
            .setTitle('Soumettre une suggestion <:dfgvdfgvxdfgvx12:1496538754045968505>')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('suggestion_input')
                        .setLabel('Ta suggestion pour améliorer le bot')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );
        await interaction.showModal(modal);
    }
};

const reportCommand = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Signaler un bug ou un problème au créateur du bot'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('report_modal')
            .setTitle('Signaler un problème <:discotoolsxyzicon17:1496223649244516572>')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('report_input')
                        .setLabel('Décris le problème que tu as rencontré')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );
        await interaction.showModal(modal);
    }
};



// ─── Commandes crystals ─────────────────────────────────────────────────────────

async function generateLeaderboardImage(members) {
    const SCALE = 2;
    const WIDTH = 800 * SCALE;
    const ROW_H = 64 * SCALE;
    const PADDING = 24 * SCALE;
    const GAP = 6 * SCALE;
    const RADIUS = 24 * SCALE;
    const HEADER_H = 80 * SCALE;
    const HEIGHT = HEADER_H + members.length * (ROW_H + GAP) + PADDING;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a2e00';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#00299b00';
    ctx.beginPath();
    ctx.roundRect(PADDING, PADDING / 2, WIDTH - PADDING * 2, HEADER_H - PADDING / 2, RADIUS);
    ctx.fill();

    ctx.fillStyle = '#57F287';
    ctx.font = `bold ${32 * SCALE}px Sans`;
    ctx.textAlign = 'center';
    ctx.fillText('🏆 CRYSTAL LEADERBOARD', WIDTH / 2, HEADER_H - 20 * SCALE);

    const avatarLoadPromises = members.map(async (member) => {
        try {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=128`;
            return { id: member.id, avatar: await loadImage(avatarUrl) };
        } catch {
            return { id: member.id, avatar: null };
        }
    });
    const loadedAvatars = await Promise.all(avatarLoadPromises);
    const avatarMap = new Map(loadedAvatars.map(a => [a.id, a.avatar]));

    for (let i = 0; i < members.length; i++) {
        const { id, crystals, username } = members[i];
        const y = HEADER_H + i * (ROW_H + GAP);

        ctx.fillStyle = i % 2 === 0 ? '#0f3460' : '#162447';
        ctx.beginPath();
        ctx.roundRect(PADDING, y, WIDTH - PADDING * 2, ROW_H, RADIUS);
        ctx.fill();

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        ctx.fillStyle = i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#888888';
        ctx.font = `bold ${i < 3 ? 22 * SCALE : 18 * SCALE}px Sans`;
        ctx.textAlign = 'left';
        ctx.fillText(medal, PADDING + 10 * SCALE, y + ROW_H / 2 + 8 * SCALE);

        const avatar = avatarMap.get(id);
        if (avatar) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(PADDING + 80 * SCALE, y + ROW_H / 2, 22 * SCALE, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, PADDING + 58 * SCALE, y + ROW_H / 2 - 22 * SCALE, 44 * SCALE, 44 * SCALE);
            ctx.restore();
        } else {
            ctx.fillStyle = '#57F287';
            ctx.beginPath();
            ctx.arc(PADDING + 80 * SCALE, y + ROW_H / 2, 22 * SCALE, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 * SCALE}px Sans`;
        ctx.textAlign = 'left';
        ctx.fillText(username, PADDING + 114 * SCALE, y + ROW_H / 2 + 6 * SCALE);

        const crystalSize = 28 * SCALE;
        const crystalText = formatNumber(crystals);
        ctx.font = `bold ${18 * SCALE}px Sans`;
        const textWidth = ctx.measureText(crystalText).width;
        const textX = WIDTH - PADDING - 10 * SCALE;

        const tempCanvas = createCanvas(crystalSize, crystalSize);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(crystalIcon, 0, 0, crystalSize, crystalSize);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = '#57F287';
        tempCtx.fillRect(0, 0, crystalSize, crystalSize);
        ctx.save();
        ctx.drawImage(tempCanvas, textX - textWidth - crystalSize - 4 * SCALE, y + ROW_H / 2 - crystalSize / 2, crystalSize, crystalSize);
        ctx.restore();

        ctx.fillStyle = '#57F287';
        ctx.textAlign = 'right';
        ctx.fillText(crystalText, textX, y + ROW_H / 2 + 6 * SCALE);
    }

    return canvas.toBuffer('image/png');
}

const leaderboardCommand = {
    data: new SlashCommandBuilder()
        .setName('top_crystals')
        .setDescription('Afficher le classement des utilisateurs les plus riches'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const rows = getLeaderboard();

            const members = (await Promise.all(rows.map(async (row) => {
                try {
                    let member = interaction.guild.members.cache.get(row.id);
                    if (!member) {
                        member = await interaction.guild.members.fetch(row.id);
                    }
                    if (member.user.bot) return null;
                    return {
                        ...row,
                        username: member.displayName,
                        avatar: member.user.avatar,
                    };
                } catch {
                    return null;
                }
            }))).filter(Boolean);

            const buffer = await generateLeaderboardImage(members);

            // CORRECTIF #4 : Promise.all avait 2 éléments mais destructurait 3 variables,
            // et les variables n'étaient pas utilisées (getEconomyStats() était appelé après de toute façon).
            // Simplifié en appels directs.
            const userData = getUserOptimized(interaction.user.id);
            const totalUsersData = getTotalUsers();
            const userIndexInLeaderboard = members.findIndex(m => m.id === interaction.user.id);
            let userRankData = userIndexInLeaderboard >= 0
                ? userIndexInLeaderboard + 1
                : getUserRank(interaction.user.id);
            
            // Si getUserRank retourne null, utiliser totalUsersData + 1
            if (userRankData === null) {
                userRankData = totalUsersData + 1;
            }

            const userCrystals = userData.crystals;
            const rankText = userCrystals > 0
                ? `> Tu es top **${userRankData}** sur **${totalUsersData}** joueurs avec **${formatNumber(userCrystals)}** CRYSTALs !`
                : `> Tu n'as pas encore de CRYSTALs.`;

            const container = new ContainerBuilder()
                .setAccentColor(0x57F287)
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL('attachment://leaderboard.png')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(rankText),
                    new TextDisplayBuilder().setContent(`-# Généré <t:${Math.floor(Date.now() / 1000)}:R>`)
                );

            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                files: [{ attachment: buffer, name: 'leaderboard.png' }],
            });

        } catch (error) {
            console.error('Erreur leaderboard :', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la génération du leaderboard.' });
        }
    }
};


const profilCommand = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Afficher ton profil CRYSTAL')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Affiche le profil d\'un autre utilisateur')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const targetMember = interaction.options.getMember('utilisateur') || interaction.member;
        const userId = targetUser.id;

        const gallery = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL('https://i.postimg.cc/YSznnjg8/CRYSTALBOT.png')
        );

        if (targetUser.bot) {
            const container = new ContainerBuilder()
                .setAccentColor(targetMember?.displayColor || 0x57F287)
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## <a:51047animatedarrowwhite:1483033113134239827> Profil du BOT <@' + userId + '> <:discotoolsxyzicon18:1496223647025725622>')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('<a:51047animatedarrowwhite:1483033113134239827> Un bot n\'a pas de CRYSTALs.'),
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ format: 'png', size: 512 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addMediaGalleryComponents(gallery);

            return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

        const user = getUserOptimized(userId);
        const now = Date.now();
        // CORRECTIF #1 : COOLDOWN était utilisé ici mais non défini — maintenant = COOLDOWN_24_HOURS
        const nextMine = user.lastMineTime && (now - user.lastMineTime < COOLDOWN_24_HOURS)
            ? `<t:${Math.floor((user.lastMineTime + COOLDOWN) / 1000)}:R>`
            : '**Disponible maintenant !**';

        const container = new ContainerBuilder()
            .setAccentColor(targetMember?.displayColor || 0x57F287)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## <a:51047animatedarrowwhite:1483033113134239827> Profil de <@' + userId + '> <:dfgvdfgvxdfgvx14:1496538757120262145>')
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '<a:51047animatedarrowwhite:1483033113134239827> Nombre de CRYSTALs : **' + formatNumber(user.crystals) + '**\n' +
                            '<a:51047animatedarrowwhite:1483033113134239827> Prochain mine : ' + nextMine
                        ),
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ format: 'png', size: 512 }))
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addMediaGalleryComponents(gallery)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> **Codes redeem :**`)
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`redeem_code_${interaction.user.id}`)
                            .setLabel('Redeem Code')
                            .setStyle(ButtonStyle.Primary)
                    )
            );

        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};

const mine = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des CRYSTALs (1 fois par 24h, streak bonus)'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const user = getUserOptimized(userId);
        const now = Date.now();

        if (now - (user.lastMineTime || 0) < COOLDOWN_24_HOURS) {
            const remainingMs = COOLDOWN_24_HOURS - (now - user.lastMineTime);
            const remainingSec = Math.ceil(remainingMs / 1000);
            const hours = Math.floor(remainingSec / 3600);
            const minutes = Math.floor((remainingSec % 3600) / 60);
            const seconds = remainingSec % 60;
            return interaction.reply({
                content: `<a:51047animatedarrowwhite:1483033113134239827> Tu es en cooldown ! Attends encore **${hours}h ${minutes}m ${seconds}s** avant de miner à nouveau. <:discotoolsxyzicon15:1496223652411080884>`,
                flags: MessageFlags.Ephemeral
            });
        }

        const lastMineTime = user.lastMineTime || 0;
        const hoursSinceLastMine = (now - lastMineTime) / 3600000;

        let streak = user.mineStreak || 0;
        if (lastMineTime === 0) {
            streak = 1;
        } else if (hoursSinceLastMine <= STREAK_WINDOW_HOURS) {
            streak += 1;
        } else {
            streak = 1;
        }

        const streakCapped = Math.min(streak, 5);
        const streakBonusPercentage = streakCapped * 5;
        const crystalsToAdd = getMineCrystals(streakCapped);
        const newCrystals = user.crystals + crystalsToAdd;
        const newCrystalsToday = (user.crystalsToday || 0) + crystalsToAdd;

        const streakBonus = streakCapped > 0 ? ` (+${streakCapped * 5}% de bonus streak)` : '';
        const description = `- Tu as miné **${formatNumber(crystalsToAdd)}** CRYSTALs !${streakBonus}\n- Tu as maintenant **${formatNumber(newCrystals)}** CRYSTALs.`;

        const container = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## <:pioche:1496545139575881818> Minage de CRYSTALs')
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(description)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ format: 'png', size: 512 }))
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> **STREAK** : ${streakCapped} jour(s) (max 5) <:dfgvdfgvxdfgvx6:1496538740800360549>`),
                new TextDisplayBuilder().setContent(`> **Prochain minage** : <t:${Math.floor((now + COOLDOWN_24_HOURS) / 1000)}:R>`)
            );

        updateCrystalsOptimized(userId, newCrystals, newCrystalsToday);
        updateMineStreak(userId, now, streak);

        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};

const paycrystal = {
    data: new SlashCommandBuilder()
        .setName('donner_crystal')
        .setDescription('Envoyer des CRYSTALs à un autre joueur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à qui envoyer les CRYSTALs')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription('Le nombre de CRYSTALs à envoyer')
                .setMinValue(1)
                .setRequired(true)
        ),
    async execute(interaction) {
        const senderId = interaction.user.id;
        const recipient = interaction.options.getUser('utilisateur');
        const amount = interaction.options.getInteger('montant');

        if (recipient.bot) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu ne peux pas envoyer des CRYSTALs à un bot.', flags: MessageFlags.Ephemeral });
        }
        if (recipient.id === senderId) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu ne peux pas t\'envoyer des CRYSTALs à toi-même.', flags: MessageFlags.Ephemeral });
        }
        if (amount <= 0) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Le montant doit être supérieur à 0.', flags: MessageFlags.Ephemeral });
        }

        const result = transferCrystalsAtomic(senderId, recipient.id, amount);
        return interaction.reply({
            content: result.message,
            flags: MessageFlags.Ephemeral
        });
    }
};

// ─── Settings ────────────────────────────────────────────────────────────────

function buildSettingsContainer(interactionUserId) {
    const codes = getCodes();
    const codesDisplay = codes.length > 0
        ? codes.map(c => `> \`${c.code}\` → **${formatNumber(c.reward)}** CRYSTALs, limite : ${c.limite === 0 ? 'illimitée' : `**${c.limite}** utilisations`}`).join('\n')
        : '> Aucun code disponible.';

    return new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## <:dfgvdfgvxdfgvx5:1496538739030364260> Paramètres du bot')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Codes actifs :**'),
            new TextDisplayBuilder().setContent(codesDisplay)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Dernière mise à jour : <t:${Math.floor(Date.now() / 1000)}:R> par <@${interactionUserId}>`)
        );
}

const settingsCommand = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('[ADMIN] Gérer les paramètres du bot'),
    async execute(interaction) {
        // CORRECTIF #3 : || → && — avec ||, la condition bloquait tout le monde car
        // "(!admin) OU (!dev)" est vrai pour quasiment n'importe qui.
        // Correct : bloquer seulement si (!admin) ET (!dev)
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const container = buildSettingsContainer(interaction.user.id);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_code').setLabel('Ajouter un code').setEmoji({ id: '1483039721746599977' }).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('remove_code').setLabel('Supprimer un code').setEmoji({ id: '1487039519902400622' }).setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container, row] });
    }
};

// ─── Commandes admin ───────────────────────────────────────────────────────────

const addcrystal = {
    data: new SlashCommandBuilder()
        .setName('add_crystal')
        .setDescription('[ADMIN] Ajouter des CRYSTALs à un utilisateur')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible').setRequired(true))
        .addNumberOption(option => option.setName('montant').setDescription('Nombre de CRYSTALs à ajouter').setMinValue(1).setRequired(true)),
    async execute(interaction) {
        // CORRECTIF #3 : || → &&
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const amount = Math.floor(interaction.options.getNumber('montant'));

        if (targetUser.bot) return interaction.reply({ content: 'Tu ne peux pas ajouter des CRYSTALs à un bot.', flags: MessageFlags.Ephemeral });
        if (amount <= 0) return interaction.reply({ content: 'Le montant doit être supérieur à 0.', flags: MessageFlags.Ephemeral });

        const result = addCrystalsAtomic(targetUser.id, amount);
        return interaction.reply({ content: `Ajouté **${formatNumber(amount)}** CRYSTALs à <@${targetUser.id}> <:discotoolsxyzicon11:1496223660325736559>`, flags: MessageFlags.Ephemeral });
    }
};

const removecrystal = {
    data: new SlashCommandBuilder()
        .setName('remove_crystal')
        .setDescription('[ADMIN] Retirer des CRYSTALs à un utilisateur')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible').setRequired(true))
        .addNumberOption(option => option.setName('montant').setDescription('Nombre de CRYSTALs à retirer').setMinValue(1).setRequired(true)),
    async execute(interaction) {
        // CORRECTIF #3 : || → &&
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const amount = Math.floor(interaction.options.getNumber('montant'));

        if (targetUser.bot) return interaction.reply({ content: 'Tu ne peux pas retirer des CRYSTALs à un bot.', flags: MessageFlags.Ephemeral });
        if (amount <= 0) return interaction.reply({ content: 'Le montant doit être supérieur à 0.', flags: MessageFlags.Ephemeral });

        const result = removeCrystalsAtomic(targetUser.id, amount);
        if (!result.success) {
            return interaction.reply({ content: `<@${targetUser.id}> n'a que **${formatNumber(result.newCrystals)}** CRYSTALs.`, flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({ content: `Retiré **${formatNumber(amount)}** CRYSTALs à <@${targetUser.id}> <:discotoolsxyzicon12:1496223659029823709>`, flags: MessageFlags.Ephemeral });
    }
};

const dropcrystal = {
    data: new SlashCommandBuilder()
        .setName('drop_crystal')
        .setDescription('[ADMIN] Lancer un drop CRYSTALs')
        .addIntegerOption(option => option.setName('montant').setDescription('Nombre de CRYSTALs').setMinValue(1).setRequired(true))
        .addChannelOption(option => option.setName('salon').setDescription('Salon cible (optionnel)').setRequired(false)),
    async execute(interaction) {
        // CORRECTIF #3 : || → &&
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const amount = interaction.options.getInteger('montant');
        const channel = interaction.options.getChannel('salon') || interaction.channel;

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Le salon doit être un salon textuel.', flags: MessageFlags.Ephemeral });
        }

        // Vérifier que le bot peut envoyer des messages dans le canal
        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            return interaction.reply({ content: 'Je n\'ai pas la permission d\'envoyer des messages dans ce salon.', flags: MessageFlags.Ephemeral });
        }

        const dropId = `drop_crystal_button_${amount}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            registerDrop(dropId);
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du drop:', error);
            return interaction.reply({ content: 'Erreur lors de la création du drop.', flags: MessageFlags.Ephemeral });
        }

        const container = new ContainerBuilder()
            .setAccentColor(BOT_CONFIG.accentColor)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <:discotoolsxyzicon16:1496223650490089754> CRYSTALS DROP'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**' + formatNumber(amount) + ' CRYSTALs** ont été drop par <@' + interaction.user.id + '> !'),
                        new TextDisplayBuilder().setContent('Clique sur le bouton ci-dessous pour les récupérer !')
                    )
                    .setButtonAccessory(
                        new ButtonBuilder().setCustomId(dropId).setEmoji({ id: '1485936515732476024' }).setStyle(ButtonStyle.Primary)
                    )
            );

        try {
            await channel.send({ components: [container] });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message du drop:', error);
            return interaction.reply({ content: 'Erreur lors de l\'envoi du drop dans le salon.', flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({ content: `Drop de **${formatNumber(amount)}** CRYSTALs envoyé dans <#${channel.id}> !`, flags: MessageFlags.Ephemeral });
    }
};

const resetcrystal = {
    data: new SlashCommandBuilder()
        .setName('reset_crystal')
        .setDescription('[ADMIN] Réinitialiser les CRYSTALs d\'un joueur')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible').setRequired(true)),
    async execute(interaction) {
        // CORRECTIF #3 : || → &&
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        if (targetUser.bot) return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu ne peux pas réinitialiser un bot.', flags: MessageFlags.Ephemeral });

        updateCrystalsOptimized(targetUser.id, 0, 0);
        const resetMsg = `<a:15770animatedarrowyellow:1483033107472056320> Les CRYSTALs de <@${targetUser.id}> ont été réinitialisés <:discotoolsxyzicon15:1496223652411080884>.`;
        await interaction.channel.send(resetMsg);
        return interaction.reply({ content: resetMsg, flags: MessageFlags.Ephemeral });
    }
};

function buildTrackerContainer(totalCrystals, totalUsers, richestUser, interactionUserId) {
    const averageCrystals = totalUsers > 0 ? Math.floor(totalCrystals / totalUsers) : 0;
    
    // Gestion du cas où il n'y a aucun utilisateur
    const richestUserDisplay = richestUser && richestUser.id 
        ? `<@${richestUser.id}> avec **${formatNumber(richestUser.crystals)}** CRYSTALs`
        : 'Aucun utilisateur';

    return new ContainerBuilder()
        .setAccentColor(BOT_CONFIG.accentColor)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## <:discotoolsxyzicon20:1496223642173047057> Statistiques économiques du serveur')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> **Total de CRYSTALs en circulation** : ${formatNumber(totalCrystals)}`),
            new TextDisplayBuilder().setContent(`> **Nombre total d'utilisateurs** : ${formatNumber(totalUsers)}`),
            new TextDisplayBuilder().setContent(`> **Moyenne de CRYSTALs par utilisateur** : ${formatNumber(averageCrystals)}`)
        )
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> **Utilisateur le plus riche** : ${richestUserDisplay}`),
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setEmoji({ id: '1485721082119065620' })
                        .setCustomId('tracker_economie_refresh')
                        .setLabel('Rafraîchir')
                        .setStyle(ButtonStyle.Secondary)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Dernière mise à jour : <t:${Math.floor(Date.now() / 1000)}:R> par <@${interactionUserId}>`)
        );
}

const trackereconomyCommand = {
    data: new SlashCommandBuilder()
        .setName('tracker_economie')
        .setDescription('Voir les stats économiques du serveur'),
    async execute(interaction) {
        // CORRECTIF #3 : || → &&
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        // CORRECTIF #4 : Promise.all inutile et mal formé (2 éléments, 3 variables destructurées,
        // résultats jamais utilisés). Remplacé par un simple appel à getEconomyStats() déjà prévu pour ça.
        const stats = getEconomyStats();
        const container = buildTrackerContainer(stats.total, stats.users, stats.richest, interaction.user.id);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};

client.once('ready', async () => {
    console.log('crystal connecté');
    const commands = [
        profilCommand.data.toJSON(),
        addcrystal.data.toJSON(),
        removecrystal.data.toJSON(),
        dropcrystal.data.toJSON(),
        paycrystal.data.toJSON(),
        resetcrystal.data.toJSON(),
        mine.data.toJSON(),
        pingCommand.data.toJSON(),
        botinfoCommand.data.toJSON(),
        trackereconomyCommand.data.toJSON(),
        helpCommand.data.toJSON(),
        settingsCommand.data.toJSON(),
        leaderboardCommand.data.toJSON(),
        suggestionCommand.data.toJSON(),
        reportCommand.data.toJSON()
    ];
    
    // Fonction pour changer le statut
    function rotateActivity() {
        const activity = BOT_CONFIG.activityTexts[currentActivityIndex];
        client.user.setActivity(activity, { type: ActivityType.Watching });
        currentActivityIndex = (currentActivityIndex + 1) % BOT_CONFIG.activityTexts.length;
    }
    
    // Changer l'activité immédiatement
    rotateActivity();
    
    // Changer l'activité toutes les 60 secondes
    setInterval(rotateActivity, 60000);
    
    await client.application.commands.set(commands);
    console.log('Commandes slash enregistrées.');
});

const commandsMap = new Map([
    ['profil', profilCommand],
    ['add_crystal', addcrystal],
    ['remove_crystal', removecrystal],
    ['drop_crystal', dropcrystal],
    // CORRECTIF #2 : clé était 'pay_crystal' → la commande s'appelle 'donner_crystal', donc introuvable dans la map
    ['donner_crystal', paycrystal],
    ['reset_crystal', resetcrystal],
    ['mine', mine],
    ['ping', pingCommand],
    ['botinfo', botinfoCommand],
    ['tracker_economie', trackereconomyCommand],
    ['help', helpCommand],
    ['settings', settingsCommand],
    ['top_crystals', leaderboardCommand],
    ['suggestion', suggestionCommand],
    ['report', reportCommand]
]);

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        try {
            const now = Date.now();
            const userId = interaction.user.id;
            const lastCommandUserTime = userCommandCooldowns.get(userId) || 0;
            const timeSinceLastCommand = now - lastCommandUserTime;

            if (timeSinceLastCommand < GLOBAL_COMMAND_COOLDOWN) {
                const remainingMs = GLOBAL_COMMAND_COOLDOWN - timeSinceLastCommand;
                return interaction.reply({
                    content: `<a:51047animatedarrowwhite:1483033113134239827> Tu dois attendre **${Math.ceil(remainingMs / 100) / 10}s** avant de relancer une commande.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            userCommandCooldowns.set(userId, now);

            const command = commandsMap.get(interaction.commandName);
            if (command) {
                await command.execute(interaction);
            } else {
                console.warn(`Commande inconnue: ${interaction.commandName}`);
                await interaction.reply({ content: 'Cette commande n\'existe pas.', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution d\'une commande :', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;

        // ─── Drop crystal ───
        if (customId.startsWith('drop_crystal_button_')) {
            const parts = customId.split('_');
            const amount = parseInt(parts[3]);
            const userId = interaction.user.id;

            const result = claimDropAndAwardCrystalsAtomic(customId, userId, amount);
            if (!result.success) {
                return interaction.reply({
                    content: result.message,
                    flags: MessageFlags.Ephemeral
                });
            }

            const disabledContainer = new ContainerBuilder()
                .setAccentColor(0x57F287)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <:discotoolsxyzicon16:1496223650490089754> CRYSTALS DROP'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('**' + formatNumber(amount) + ' CRYSTALs** ont été récupérés <:discotoolsxyzicon16:1496223650490089754> !'),
                            new TextDisplayBuilder().setContent('<@' + userId + '> a récupéré le drop !')
                        )
                        .setButtonAccessory(
                            new ButtonBuilder().setCustomId('drop_crystal_claimed').setLabel('Déjà récupéré !').setStyle(ButtonStyle.Secondary).setDisabled(true)
                        )
                );

            try {
                await interaction.update({ components: [disabledContainer] });
            } catch (error) {
                console.error('Erreur lors de la mise à jour du message du drop:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: result.message + ' (mais une erreur est survenue lors de la mise à jour).', flags: MessageFlags.Ephemeral });
                }
            }
        }

        // ─── Tracker refresh ───
        if (customId === 'tracker_economie_refresh') {
            if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
                return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
            }
            const stats = getEconomyStats();
            const updatedContainer = buildTrackerContainer(stats.total, stats.users, stats.richest, interaction.user.id);
            return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [updatedContainer] });
        }

        // ─── Add / remove code (admin) ───
        if (customId === 'add_code' || customId === 'remove_code') {
            if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== DEVELOPER_ID) {
                return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
            }

            const isAdd = customId === 'add_code';
            const modal = new ModalBuilder()
                .setCustomId(isAdd ? 'code_modal_add' : 'code_modal_remove')
                .setTitle(isAdd ? 'Ajouter un code <:discotoolsxyzicon11:1496223660325736559>' : 'Supprimer un code <:discotoolsxyzicon12:1496223659029823709>')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('code_input')
                            .setLabel('Code (ex: NOEL2024)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

            if (isAdd) {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reward_input')
                            .setLabel('Récompense en CRYSTALs')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ex: 500')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('limite_input')
                            .setLabel('Limite d\'utilisation (0 = illimité)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ex: 100 ou 0')
                            .setRequired(true)
                    )
                );
            }

            await interaction.showModal(modal);

            interaction.awaitModalSubmit({ 
                filter: i => i.customId === modal.data.custom_id && i.user.id === interaction.user.id && (i.member.permissions.has('Administrator') || i.user.id === DEVELOPER_ID), 
                time: 60000 
            })
                .then(async modalInteraction => {
                    const code = modalInteraction.fields.getTextInputValue('code_input').trim().toUpperCase();

                    if (isAdd) {
                        const reward = parseInt(modalInteraction.fields.getTextInputValue('reward_input').trim()) || 100;
                        const limite = parseInt(modalInteraction.fields.getTextInputValue('limite_input').trim()) || 0;
                        const result = addCode(code, reward, limite);
                        await modalInteraction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
                    } else {
                        const result = removeCode(code);
                        await modalInteraction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
                    }

                    const updatedContainer = buildSettingsContainer(interaction.user.id);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('add_code').setLabel('Ajouter un code').setEmoji({ id: '1483039721746599977' }).setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('remove_code').setLabel('Supprimer un code').setEmoji({ id: '1487039519902400622' }).setStyle(ButtonStyle.Danger)
                    );
                    await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [updatedContainer, row] });
                })
                .catch(() => {
                    interaction.reply({ content: 'Temps écoulé. Veuillez réessayer.', flags: MessageFlags.Ephemeral });
                });
        }

        // ─── Redeem code (joueur) ───
        if (customId.startsWith('redeem_code_')) {
            const targetUserId = customId.replace('redeem_code_', '');
            if (interaction.user.id !== targetUserId) {
                return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Ce profil n\'est pas pour toi.', flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder()
                .setCustomId('code_modal_claim')
                .setTitle('Réclamer un code <:dfgvdfgvxdfgvx10:1496538750308581559>')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('code_input')
                            .setLabel('Code à réclamer')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ex: NOEL2024')
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'code_modal_claim') {
            const code = interaction.fields.getTextInputValue('code_input').trim().toUpperCase();
            const result = claimCode(code, interaction.user.id);
            const limiteInfo = result.limite > 0 && result.remaining !== null
                ? ` (reste **${result.remaining}** utilisation${result.remaining > 1 ? 's' : ''})`
                : '';
            await interaction.reply({ content: result.message + limiteInfo, flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'suggestion_modal') {
            const suggestion = interaction.fields.getTextInputValue('suggestion_input').trim();
            const mp = await client.users.fetch(DEVELOPER_ID).catch(() => null);
            if (mp) await mp.send({ content: `Nouvelle suggestion de <@${interaction.user.id}> :\n\n\`\`\`${suggestion}\`\`\`` });
            await interaction.reply({ content: 'Merci pour ta suggestion !', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'report_modal') {
            const report = interaction.fields.getTextInputValue('report_input').trim();
            const mp = await client.users.fetch(DEVELOPER_ID).catch(() => null);
            if (mp) await mp.send({ content: `Nouveau signalement de <@${interaction.user.id}> :\n\n\`\`\`${report}\`\`\`` });
            await interaction.reply({ content: 'Merci pour ton signalement !', flags: MessageFlags.Ephemeral });
        }
    }

    // ─── StringSelectMenu Handler ───
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'help_menu') {
            const selectedCategory = interaction.values?.[0] || 'accueil';
            const container = createHelpContainer(selectedCategory, interaction);
            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            });
        }
    }
});

client.on('messageCreate', execute);

client.login(process.env.TOKEN);