const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db/database.js');
const { calculateDynamicOdds } = require('../../service/dynamic_odds.js')

async function processBet(interaction, amount, side) {
	const sendMessage = async (msg, firstMessage = false) => {
		if (firstMessage) {
			await interaction.reply(msg)
		} else {
			await interaction.followUp(msg)
		}
	}
	const userId = interaction.user.id; // The ID of the user who used the command
	const betAmount = interaction.options ? interaction.options.getInteger('cantidad') : amount // Amount the user wants to bet
	const betSide = interaction.options ? interaction.options.getString('side') : side // The outcome the user wants to bet on
	let firstMessage = true
	if (betAmount < 0) {
		return interaction.reply("Buen intento imbecil")
	}
	// if (Number(betAmount) === betAmount && betAmount % 1 !== 0) {
	// 	return interaction.reply("Números enteros nomás, amiguito")
	// }

	try {
		let userBalance = await db.getUserBalance(userId);
		console.log(`[NEW BET] (${userId}): con balance ${userBalance} quiere hacer apuesta de ${betAmount} para ${betSide}`)
		if (userBalance == null) {
			userBalance = await db.createNewUserBalance(userId);
			await sendMessage("Bienvenido pibe! Tomá 1000 créditos para arrancar.", firstMessage);
			firstMessage = false
		}
		const activeEvent = await db.getOpenEvent();
		if (activeEvent) {
			if (userBalance < betAmount) {
				await interaction.reply("No tenés esa plata desubicado.");
				return;
			}
			// Fetch current bet pool for the active event to calculate dynamic odds
			const currentBets = await db.getEventBets(activeEvent.event_id);
			let betPool = currentBets.reduce((acc, bet) => {
				acc[bet.bet_on_outcome] = (acc[bet.bet_on_outcome] || 0) + bet.bet_amount;
				return acc;
			}, {});
			console.log(betPool)

			// Calculate odds before placing the new bet
			const oddsBefore = calculateDynamicOdds(betPool);

			// Place the bet
			await db.placeBet(activeEvent.event_id, userId, betAmount, betSide);

			// Update bet pool with the new bet and calculate odds again
			if (!betPool[betSide]) {
				betPool[betSide] = 0; // Initialize if not already set
			}
			betPool[betSide] += betAmount; // Add the new bet to the points
			console.log(betPool)
			const oddsAfter = calculateDynamicOdds(betPool);
			// Reply with updated odds to the user
			await sendMessage(`Listo pa, ${betAmount} a ${betSide}. Las cuotas son: ${JSON.stringify(oddsAfter)}`, firstMessage);
		} else {
			return await sendMessage('No hay apuestas corriendo', firstMessage)
		}
	} catch (error) {
		console.error(`Error handling bet command: ${error}`);
		await sendMessage(`Sorry pa hubo un error: ${error}`, firstMessage);
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bet')
		.setDescription('Apostá cagón!')
		.addIntegerOption(option =>
			option.setName('cantidad')
				.setDescription('Cuánto vas a apostar cagón?')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('side')
				.setDescription('A radiant?')
				.setRequired(true)
				.addChoices(
					{ name: 'Radiant', value: 'radiant' },
					{ name: 'Dire', value: 'dire' },
				))
	,
	async execute(interaction) {
		return await processBet(interaction)
	},
	processBet
};