const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

async function addFeedbackModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('feedbackModal')
        .setTitle('Libro de quejas');

    const feedbackInput = new TextInputBuilder()
        .setCustomId('feedbackInput')
        .setLabel("Qué tenés para decir?")
        .setStyle(TextInputStyle.Paragraph);

    const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput);
    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
}

module.exports = addFeedbackModal