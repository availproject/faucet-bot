import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands';

// Discord.js Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ClientReady event fires once after successful Discord login
client.once(Events.ClientReady, event => {
	console.log(`Ready! Logged in as ${event.user.tag}`);
});

// InteractionCreate event fires when the user invokes a slash command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Get the command definition for the invoked command
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    // Run the command, passing along the interaction
    await command.execute(interaction);

  } catch (error) {
    // Something went wrong -- log error and reply to not leave the client hanging
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!', ephemeral: true 
      });
    } else {
      await interaction.reply({ 
        content: 'There was an error while executing this command!', ephemeral: true 
      });
    }
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
