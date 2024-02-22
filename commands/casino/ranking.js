const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')
const Decimal = require('decimal.js')
const db = require('../../db/database.js')

const resurrections =

	module.exports = {
		data: new SlashCommandBuilder()
			.setName('ranking')
			.setDescription('Ranking de petazos!'),
		async execute(interaction) {
			const users = await db.getRankedBalances()
			const promises = users.map(async (user) => {
				try {
					const member = await interaction.guild.members.fetch(user.user_id);
					let nickname = member.nickname || member.user.username;
					const resurrections = await db.getResurrectionCount(user.user_id);
					if (resurrections) { nickname += " " + ":cross:".repeat(resurrections) }
					return { name: nickname, value: String(user.balance) };
				} catch (error) {
					console.error(`Could not fetch member with ID ${user.user_id}:`, error);
					return { name: `User ID: ${user.user_id}`, value: String(user.balance) };
				}
			});
			const fields = await Promise.all(promises);
			const names = fields.map(field => field.name).join('\n')
			const points = fields.map(field => new Decimal(field.value).toString()).join('\n')
			const pos = Array.from({ length: fields.length }, (v, i) => i + 1).join('\n')
			const exampleEmbed = new EmbedBuilder()
				.setColor(0x35654D)
				.setTitle('Ranking de apuestas')
				.addFields(
					{ name: "Pos", value: pos, inline: true },
					{ name: "Nickname", value: names, inline: true },
					{ name: "Puntos", value: points, inline: true }
				)
				.setFooter({ text: 'Primer premio sponsoreado por el casa!!!', iconURL: 'https://www.cronica.com.ar/__export/1587242583231/sites/cronica/img/2020/04/18/agustin_casanova_portada_crop1587242502665.jpg_1318453242.jpg' })
				.setThumbnail('https://i.imgur.com/V2eofb5.png')
				.setTimestamp()

			const quejasButton = new ButtonBuilder()
				.setCustomId('quejas')
				.setLabel('Libro de quejas')
				.setStyle(ButtonStyle.Primary)
			const row = new ActionRowBuilder()
				.addComponents(quejasButton);
			await interaction.reply({
				embeds: [exampleEmbed], components: [row],
			});
		},
	};