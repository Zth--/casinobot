const { SlashCommandBuilder } = require('discord.js');
const addFeedbackModal = require('../../service/quejas_modal.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quejas')
		.setDescription('Librito de quejas'),
	async execute(interaction) {
        await addFeedbackModal(interaction)
	},
};