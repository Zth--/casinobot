const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, time } = require('discord.js');

const db = require('../../db/database.js');
const isAdmin = require('../../utils/isAdmin');

const TIMER = 180000

async function newBet(interaction, components) {
	try {
		const cancelBet = new ButtonBuilder()
			.setCustomId('cancel_new_bet')
			.setLabel('Cancelar')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(true)
		const betRadiant = new ButtonBuilder()
			.setCustomId('bet_radiant')
			.setLabel('100 a Radiant')
			.setStyle(ButtonStyle.Primary)
		const betDire = new ButtonBuilder()
			.setCustomId('bet_dire')
			.setLabel('100 a Dire')
			.setStyle(ButtonStyle.Primary)
		const row = new ActionRowBuilder()
			.addComponents(betRadiant, betDire, cancelBet);
		let newEvent = await db.createBettingEvent()
		let expireAt = new Date();
		expireAt.setMinutes(expireAt.getMinutes() + 3);
		const relative = time(expireAt, 'R');
		await interaction.reply({
			content: `Arrancan las apuestas! **Cierra ${relative}**. Podes apostar usando /bet`,
			components: [row],
		})
		console.log(`Arranca el evento numero ${newEvent}`)
		return newEvent
	} catch (error) {
		console.error(`An error occurred: ${error.message}`);
		await interaction.reply(`Na hubo un error ${error.message}`)
		throw error
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('new_bet')
		.setDescription('Armamos una nueva partidita')
	,
	async execute(interaction) {
		if (!isAdmin(interaction.user.id)) {
			return interaction.reply('No tenés permisos pa. Solo arti y sebi pueden')
		}
		const ongoingBet = await db.getLastBetting()
		if (ongoingBet) {
			console.error("Can't do new betting, there's one in progress")
			await interaction.reply(`Ya hay una apuesta corriendo perrito: Numero ${JSON.stringify(ongoingBet)}`)
			return
		}
		const newEvent = await newBet(interaction)
		setTimeout(async () => {
			try {
				await db.closeEvent(newEvent)
				await interaction.followUp('Cerramos las apuestassss!');
			} catch (error) {
				console.error('Error sending the expire message:', error);
			}
		}, TIMER); // 120000 milliseconds = 2 minutes
	},
};