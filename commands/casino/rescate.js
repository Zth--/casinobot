const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db/database.js');

async function isUserBetting(userId) {
	const activeEvent = await db.getActiveEvent()
	if (!activeEvent) {
		return false
	}
	const currentBets = await db.getEventBets(activeEvent.event_id);
	const userBets = currentBets.filter(bet => bet.user_id === userId)
	return userBets.length > 0
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rescate')
		.setDescription('Te quedaste sin puntos, petazo?'),
	async execute(interaction) {
		const userId = interaction.user.id;
		try {
			const userBalance = await db.getUserBalance(userId);
			if (userBalance == null) {
				return interaction.reply("No sos un jugador, tomatelassss")
			}
			if (userBalance > 0) {
				return interaction.reply("Cuando tengas balance 0 hablamos")
			}
			if (await isUserBetting(userId)) {
				return interaction.reply("Cuando vos fuiste yo ya fui y vine 20 veces.\n No podés pedir rescate mientras apostás, gil de cuarta.\n Vas a tener que pensar mejor si querés hacer trampa.")
			}
			const lastResurrection = await db.getLastResurrection(userId);
			const canClaimResurrection = userBalance === 0 && (!lastResurrection || new Date() - new Date(lastResurrection.last_claimed) >= 86400000);

			if (canClaimResurrection) {
				await db.resurrectUser(userId);
				await interaction.reply('Tomá pibe, 100 puntitos. Nos vemos mañana cuando los pierdas.');
			} else {
				await interaction.reply('Una resurrección por día, pibe, cuidá mejor los puntos.');
			}
		} catch (error) {
			console.error('Error in rescue command:', error);
			await interaction.reply('No te pude rescatar pibe, hay un problema en el código o la db.');
		}
	},
}
