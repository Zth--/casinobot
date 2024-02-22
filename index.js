const fs = require('node:fs');
const path = require('node:path');
const { processBet } = require('./commands/casino/bet.js')
const { token } = require('./config.json')
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const db = require('./db/database.js')
const addFeedbackModal = require('./service/quejas_modal.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

async function processModal(interaction) {
	if (interaction.customId === 'feedbackModal') {
		const feedback = interaction.fields.getTextInputValue('feedbackInput');
		const userId = interaction.user.id;

		await db.saveFeedback(userId, feedback);
		await interaction.reply({ content: 'Tu queja fue recibida ;)!', ephemeral: true });
	}
}

async function processButton(interaction) {
	const customId = interaction.customId;
	switch (customId) {
		case 'bet_radiant':
			await processBet(interaction, 100, 'radiant')
			break
		case 'bet_dire':
			await processBet(interaction, 100, 'dire')
			break
		case 'cancel_new_bet':
			await cancelOngoingBet(interaction)
			break
		case 'quejas':
			await addFeedbackModal(interaction)
			break
	}
}
// Replace 'ADMIN_ROLE_NAME' with the actual role name for your server's admins
const ADMIN_ROLE_NAME = 'admin'

// Stores user balances
let balances = {}

// Stores active bets. Structure: { betID: { description: String, options: [String], bets: { userID: { option: String, amount: Number } } } }
let activeBets = {}

// Initializes user balances
client.on('guildMemberAdd', member => {
	balances[member.id] = 1000 // Start each user with 1000 points
})

// Command listener
client.on('message', message => {
	if (message.author.bot) return

	console.log(message.author)

	// Helper function to check if the member is an admin
	const isAdmin = message.member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME)
})

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isButton()) {
		await processButton(interaction)
		return
	}
	if (interaction.isModalSubmit()) {
		await processModal(interaction)
		return
	}
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		console.log('q pasa', {interaction})
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(token)
