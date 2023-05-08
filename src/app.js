import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { commands } from './commands';

// Discord.js Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Collection();

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
    if (interaction.commandName == 'deposit') {
      const userId = interaction.user.id;
      const now = Date.now();
      const cooldownAmount = 3 * 60 * 1000;
      if (!cooldowns.has(userId)) {
        cooldowns.set(userId, now)
      }
      else {
        const expirationTime = cooldowns.get(userId) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the command.`, ephemeral: true });
        }

        cooldowns.set(userId, now);
      }
    }
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
