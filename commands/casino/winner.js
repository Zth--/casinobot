const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('winner')
		.setDescription('Cerramos las apuestas')
		.addStringOption(option =>
			option.setName('side')
				.setDescription('¿Quién ganó?')
				.setRequired(true)
				.addChoices(
					{ name: 'Radiant', value: 'radiant' },
					{ name: 'Dire', value: 'dire' },
				)),
	async execute(interaction) {
		// Get the winning side from the interaction
		const winningSide = interaction.options.getString('side');

		// Retrieve the current active event
		const activeEvent = await db.getLastBetting();
		if (!activeEvent) {
			await interaction.reply('No hay eventos activos en este momento.');
			return;
		}
		try {
			const winners = await db.executeBets(activeEvent.event_id, winningSide);
			const winnerString = winners.map(winner => {
				const netWin = winner.amount - winner.betted
				return `<@${winner.user_id}> **ganaste ${netWin}** apostando ${winner.betted}`
			}).join('\n')
			await interaction.reply(`Las apuestas están cerradas. Ganadores del lado **${winningSide}** han sido pagados. \n${winnerString}\n Corran /ranking para ver cómo quedó`);
		} catch (error) {
			console.error('Error al cerrar las apuestas:', error);
			await interaction.reply('Hubo un problema al cerrar las apuestas.');
		}
	},
};