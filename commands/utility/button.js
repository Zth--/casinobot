const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('button')
		.setDescription('Test, no toques'),
	async execute(interaction) {
		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm Ban')
			.setStyle(ButtonStyle.Danger)

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('<t:1699419510:R>')
			.setStyle(ButtonStyle.Secondary)
		const row = new ActionRowBuilder()
			.addComponents(cancel, confirm)

		await interaction.reply({
			content: `ola?`,
			components: [row],
		});
	},
};