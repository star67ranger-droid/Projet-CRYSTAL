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
    EmbedBuilder,

} from 'discord.js';
import dotenv from 'dotenv';
import { createCanvas, loadImage } from 'canvas';
import { execute } from './src/messagecreate.js';
import { getUser, updateCrystals, updateMineStreak, updateLastMessageTime, getUserRank, getLeaderboard, getTotalCrystals, getTotalUsers, getRichestUser, claimCode, getCodes, addCode, removeCode, registerDrop, claimDrop } from './src/database.js';
import { formatNumber, getMineCrystals } from './src/messagecreate.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const crystalIcon = await loadImage(join(__dirname, 'assets', 'Crystals_logo_nobg.png'));



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
                new TextDisplayBuilder().setContent(`> **ID** : ${client.user.id} <:dfgvdfgvxdfgvx8:1496538744527325440>`),
                new TextDisplayBuilder().setContent(`> **Créateur** : Tortue Normande <@1482698332462776360> <:1483039713702055946:1483039713702055946>`),
                new TextDisplayBuilder().setContent(`> **Langage de programmation** : JavaScript (discord.js) <:19915discordjs:1483039713702055946>`),
                new TextDisplayBuilder().setContent(`> **Version** : 1.0.0 <:discotoolsxyzicon6:1496223667464442018>`)
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

const helpCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Liste rapide des commandes'),
    async execute(interaction) {
        const container = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## <a:51047animatedarrowwhite:1483033113134239827> Commandes disponibles <:discotoolsxyzicon9:1496223663895216138>')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> **</profil:1482698332462776360> [utilisateur]** : Voir ton profil CRYSTAL'),
                new TextDisplayBuilder().setContent('> **</mine:1486446312709947464>** : Miner des CRYSTALs, max 1 fois/24h'),
                new TextDisplayBuilder().setContent('> **</pay_crystal:1485964356687499346> [utilisateur] [montant]** : Payer un autre joueur'),
                new TextDisplayBuilder().setContent('> **</ping:1486462852352053499>** : Tester la latence du bot'),
                new TextDisplayBuilder().setContent('> **</botinfo:1486462852352053500>** : Infos générales du bot'),
                new TextDisplayBuilder().setContent('> **</help:1486655907097215066>** : Afficher ce menu'),
                new TextDisplayBuilder().setContent('> **</top_crystals:1487382097449586761>** : Afficher le classement des utilisateurs les plus riches'),
                new TextDisplayBuilder().setContent('> **</suggestion:1487497763234250975>** : Soumettre une suggestion pour améliorer le bot'),
                new TextDisplayBuilder().setContent('> **</report:1487499249913692352>** : Signaler un bug ou un problème au créateur du bot')

            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );

        if (interaction.member.permissions.has('Administrator')) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> **</add_crystal:1485707133877092362> [utilisateur] [montant]** : [ADMIN] Ajoute des CRYSTALs à un utilisateur.'),
                new TextDisplayBuilder().setContent('> **</remove_crystal:1485714758454870037> [utilisateur] [montant]** : [ADMIN] Retire des CRYSTALs à un utilisateur.'),
                new TextDisplayBuilder().setContent('> **</drop_crystal:1485933253096509440> [montant] [salon]** : [ADMIN] Fait tomber des CRYSTALs, le premier qui clique les gagne.'),
                new TextDisplayBuilder().setContent('> **</reset_crystal:1486386894530150430> [utilisateur]** : [ADMIN] Réinitialise les CRYSTALs d\'un utilisateur.'),
                new TextDisplayBuilder().setContent('> **</tracker_economie:1486629718487728169>** : Affiche les statistiques économiques du serveur.'),
                new TextDisplayBuilder().setContent('> **</settings:1487054861383241841>** : Gérer les paramètres du bot (codes de récompense, etc.)')
            );
        }

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

        try {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${members[i].avatar}.png?size=128`;
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(PADDING + 80 * SCALE, y + ROW_H / 2, 22 * SCALE, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, PADDING + 58 * SCALE, y + ROW_H / 2 - 22 * SCALE, 44 * SCALE, 44 * SCALE);
            ctx.restore();
        } catch {
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
}const leaderboardCommand = {
    data: new SlashCommandBuilder()
        .setName('top_crystals')
        .setDescription('Afficher le classement des utilisateurs les plus riches'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const rows = getLeaderboard();

            const members = (await Promise.all(rows.map(async (row) => {
                try {
                    const member = await interaction.guild.members.fetch(row.id);
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

            const userCrystals = getUser(interaction.user.id).crystals;
            const userRankInTop = members.findIndex(m => m.id === interaction.user.id);
            const userRank = userRankInTop >= 0 ? userRankInTop + 1 : getUserRank(interaction.user.id);
            const rankText = userRank
                ? `> Tu es top **${userRank}** sur **${getTotalUsers()}** joueurs avec **${formatNumber(userCrystals)}** CRYSTALs !`
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

        const user = getUser(userId);
        const COOLDOWN = 86400000;
        const now = Date.now();
        const nextMine = user.lastMineTime && (now - user.lastMineTime < COOLDOWN)
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
        const user = getUser(userId);
        const COOLDOWN = 86400000;
        const now = Date.now();

        if (now - (user.lastMineTime || 0) < COOLDOWN) {
            const remainingMs = COOLDOWN - (now - user.lastMineTime);
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
        // Fenêtre de 48h — évite de perdre sa série pour 2 minutes de décalage
        const hoursSinceLastMine = (now - lastMineTime) / 3600000;

        let streak = user.mineStreak || 0;
        if (lastMineTime === 0) {
            streak = 1; // tout premier mine
        } else if (hoursSinceLastMine <= 48) {
            streak += 1; // dans la fenêtre — streak continue
        } else {
            streak = 1; // plus de 48h — streak cassé
        }

        const streakCapped = Math.min(streak, 5);
        const streakBonusPercentage = streakCapped * 5;
        const crystalsToAdd = getMineCrystals(streakCapped);
        const newCrystals = user.crystals + crystalsToAdd;

        const streakBonus = streakCapped > 0 ? ` (+${streakBonusPercentage}% de bonus streak)` : '';
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
                new TextDisplayBuilder().setContent(`> **STREAK** : ${streak} jour(s) <:dfgvdfgvxdfgvx6:1496538740800360549>`),
                new TextDisplayBuilder().setContent(`> **Prochain minage** : <t:${Math.floor((now + COOLDOWN) / 1000)}:R>`)
            );

        updateCrystals(userId, newCrystals, user.crystalsToday);
        updateMineStreak(userId, now, streak);

        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};

const paycrystal = {
    data: new SlashCommandBuilder()
        .setName('pay_crystal')
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

        const sender = getUser(senderId);
        if (sender.crystals < amount) {
            return interaction.reply({
                content: `<a:51047animatedarrowwhite:1483033113134239827> Tu n'as que **${formatNumber(sender.crystals)}** CRYSTALs, tu ne peux pas en envoyer **${formatNumber(amount)}**.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const recipientUser = getUser(recipient.id);
        updateCrystals(senderId, sender.crystals - amount, sender.crystalsToday);
        updateCrystals(recipient.id, recipientUser.crystals + amount, recipientUser.crystalsToday);

        return interaction.reply({
            content: `Tu as envoyé **${formatNumber(amount)}** CRYSTALs à <@${recipient.id}> <:dfgvdfgvxdfgvx10:1496538750308581559>`,
            flags: MessageFlags.Ephemeral
        });
    }
};

// ─── Settings ─────────────────────────────────────────────────────────────────

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
        if (!interaction.member.permissions.has('Administrator')) {
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
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const amount = Math.floor(interaction.options.getNumber('montant'));

        if (targetUser.bot) return interaction.reply({ content: 'Tu ne peux pas ajouter des CRYSTALs à un bot.', flags: MessageFlags.Ephemeral });

        const user = getUser(targetUser.id);
        updateCrystals(targetUser.id, user.crystals + amount, user.crystalsToday);

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
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const amount = Math.floor(interaction.options.getNumber('montant'));

        if (targetUser.bot) return interaction.reply({ content: 'Tu ne peux pas retirer des CRYSTALs à un bot.', flags: MessageFlags.Ephemeral });

        const user = getUser(targetUser.id);
        if (user.crystals < amount) {
            return interaction.reply({ content: `<@${targetUser.id}> n'a que **${formatNumber(user.crystals)}** CRYSTALs.`, flags: MessageFlags.Ephemeral });
        }

        updateCrystals(targetUser.id, user.crystals - amount, user.crystalsToday);
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
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const amount = interaction.options.getInteger('montant');
        const channel = interaction.options.getChannel('salon') || interaction.channel;

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Le salon doit être un salon textuel.', flags: MessageFlags.Ephemeral });
        }

        const dropId = `drop_crystal_button_${amount}_${Date.now()}`;

        // On enregistre le drop en BDD dès maintenant — claimed_by = NULL
        registerDrop(dropId);

        const container = new ContainerBuilder()
            .setAccentColor(0x57F287)
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

        await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        return interaction.reply({ content: `Drop de **${formatNumber(amount)}** CRYSTALs envoyé dans <#${channel.id}> !`, flags: MessageFlags.Ephemeral });
    }
};

const resetcrystal = {
    data: new SlashCommandBuilder()
        .setName('reset_crystal')
        .setDescription('[ADMIN] Réinitialiser les CRYSTALs d\'un joueur')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        if (targetUser.bot) return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu ne peux pas réinitialiser un bot.', flags: MessageFlags.Ephemeral });

        updateCrystals(targetUser.id, 0, 0);
        await interaction.channel.send(`<a:15770animatedarrowyellow:1483033107472056320> Les CRYSTALs de <@${targetUser.id}> ont été réinitialisés <:discotoolsxyzicon15:1496223652411080884>.`);
        return interaction.reply({ content: `<a:51047animatedarrowwhite:1483033113134239827> Les CRYSTALs de <@${targetUser.id}> ont été réinitialisés <:discotoolsxyzicon15:1496223652411080884>.`, flags: MessageFlags.Ephemeral });
    }
};

function buildTrackerContainer(totalCrystals, totalUsers, richestUser, interactionUserId) {
    const averageCrystals = totalUsers > 0 ? Math.floor(totalCrystals / totalUsers) : 0;

    return new ContainerBuilder()
        .setAccentColor(0x57F287)
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
                    new TextDisplayBuilder().setContent(`> **Utilisateur le plus riche** : <@${richestUser.id}> avec **${formatNumber(richestUser.crystals)}** CRYSTALs`),
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
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        }

        const container = buildTrackerContainer(getTotalCrystals(), getTotalUsers(), getRichestUser(), interaction.user.id);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};

// ─── Evenements ──────────────────────────────────────────────────

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
    client.user.setActivity('/help | /suggestion', { type: ActivityType.Watching });
    await client.application.commands.set(commands);
    console.log('Commandes slash enregistrées.');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        try {
            if (interaction.commandName === 'profil')          await profilCommand.execute(interaction);
            if (interaction.commandName === 'add_crystal')     await addcrystal.execute(interaction);
            if (interaction.commandName === 'remove_crystal')  await removecrystal.execute(interaction);
            if (interaction.commandName === 'drop_crystal')    await dropcrystal.execute(interaction);
            if (interaction.commandName === 'pay_crystal')     await paycrystal.execute(interaction);
            if (interaction.commandName === 'reset_crystal')   await resetcrystal.execute(interaction);
            if (interaction.commandName === 'mine')            await mine.execute(interaction);
            if (interaction.commandName === 'ping')            await pingCommand.execute(interaction);
            if (interaction.commandName === 'botinfo')         await botinfoCommand.execute(interaction);
            if (interaction.commandName === 'tracker_economie') await trackereconomyCommand.execute(interaction);
            if (interaction.commandName === 'help')            await helpCommand.execute(interaction);
            if (interaction.commandName === 'settings')        await settingsCommand.execute(interaction);
            if (interaction.commandName === 'top_crystals')     await leaderboardCommand.execute(interaction);
            if (interaction.commandName === 'suggestion')         await suggestionCommand.execute(interaction);
            if (interaction.commandName === 'report')      await reportCommand.execute(interaction);
            

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
            const amount = parseInt(customId.split('_')[3]);
            const userId = interaction.user.id;

            // Tentative de claim atomique — si quelqu'un a déjà cliqué, claimDrop retourne false
            const success = claimDrop(customId, userId);
            if (!success) {
                return interaction.reply({
                    content: '<a:51047animatedarrowwhite:1483033113134239827> Trop tard, quelqu\'un a déjà récupéré ce drop !',
                    flags: MessageFlags.Ephemeral
                });
            }

            const user = getUser(userId);
            updateCrystals(userId, user.crystals + amount, user.crystalsToday);

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

            await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [disabledContainer] });
        }

        // ─── Tracker refresh ───
        if (customId === 'tracker_economie_refresh') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
            }
            const updatedContainer = buildTrackerContainer(getTotalCrystals(), getTotalUsers(), getRichestUser(), interaction.user.id);
            return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [updatedContainer] });
        }

        // ─── Add / remove code (admin) ───
        if (customId === 'add_code' || customId === 'remove_code') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '<a:51047animatedarrowwhite:1483033113134239827> Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
            }

            const isAdd = customId === 'add_code';
            const modal = new ModalBuilder()
                .setCustomId(isAdd ? 'code_modal_add' : 'code_modal_remove')
                .setTitle(isAdd ? 'Ajouter un code <:discotoolsxyzicon11:1496223660325736559>' : 'Supprimer un code <:discotoolsxyzicon12:1496223659029823709>')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('code_input').setLabel('Code').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );

            if (isAdd) {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('reward_input').setLabel('Récompense en CRYSTALs').setStyle(TextInputStyle.Short).setPlaceholder('100').setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('limite_input').setLabel('Limite d\'utilisation (0 pour illimité)').setStyle(TextInputStyle.Short).setPlaceholder('0').setRequired(true)
                    )
                );
            }

            await interaction.showModal(modal);

            interaction.awaitModalSubmit({ filter: i => i.customId === modal.data.custom_id && i.user.id === interaction.user.id, time: 60000 })
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
                        new TextInputBuilder().setCustomId('code_input').setLabel('Code à réclamer').setStyle(TextInputStyle.Short).setRequired(true)
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
        const mp = await client.users.fetch('1102675129927991331').catch(() => null);
        if (mp) await mp.send({ content: `Nouvelle suggestion de <@${interaction.user.id}> :\n\n\`\`\`${suggestion}\`\`\`` });
        await interaction.reply({ content: 'Merci pour ta suggestion !', flags: MessageFlags.Ephemeral });
    }
    
    if (interaction.customId === 'report_modal') {
        const report = interaction.fields.getTextInputValue('report_input').trim();
        const mp = await client.users.fetch('1102675129927991331').catch(() => null);
        if (mp) await mp.send({ content: `Nouveau signalement de <@${interaction.user.id}> :\n\n\`\`\`${report}\`\`\`` });
        await interaction.reply({ content: 'Merci pour ton signalement !', flags: MessageFlags.Ephemeral });
    }
    }
});

client.on('messageCreate', execute);

client.login(process.env.TOKEN);  