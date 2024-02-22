const { SlashCommandBuilder, userMention } = require('discord.js');
const db = require('../../db/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('donar')
		.setDescription('Donar a un petazo')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('Selecciona al pete')
				.setRequired(true)
		)
		.addIntegerOption(option =>
			option.setName('cantidad')
				.setDescription('La cantidad de puntos a donar')
				.setRequired(true)),
	async execute(interaction) {
		const targetUser = interaction.options.getUser('target')
		const donateAmount = interaction.options.getInteger('cantidad')
		const sourceUserId = interaction.user.id

		try {
			// Check if source user has enough points
			const sourceBalance = await db.getUserBalance(sourceUserId);
			if (sourceBalance < donateAmount) {
				return interaction.reply('No tenes puntos suficientes puntos para donar.')
			}
			if (donateAmount < 1) {
				return interaction.reply('El mínimo es 1 punto.')
			}
			await db.transferPoints(sourceUserId, targetUser.id, donateAmount);
			return interaction.reply(`Donaste **${donateAmount}** puntos a ${userMention(targetUser.id)}.`);
		} catch (error) {
			console.error('Error al donar puntos:', error);
			return interaction.reply('Ocurrió un error al procesar tu donación.');
		}
	},
};