import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { commands } from './commands';

// Discord.js Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Collection();
const depositLimits = new Collection();

import { MongoClient } from 'mongodb';

const mongoUrl = 'mongodb://localhost:27017';
// Database name
const dbName = 'userdata';

// Connect to the MongoDB database
const dbclient = new MongoClient(mongoUrl);
dbclient.connect();
const db = dbclient.db(dbName);

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

      //10 seconds of cooldown
      const cooldownAmount = 20 * 1000;
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
      // Check if the user has exceeded the deposit limit
      const depositInfo = await db.collection('depositInfo').findOne({ userId });

      if (depositInfo) {
        const { tokens, endDate } = depositInfo;

        if (tokens > 22499 && Date.now() < endDate) {
          const remainingDays = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000));
          return interaction.reply({ content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`, ephemeral: true });
        }
      } else {
        // If no deposit info exists for the user, create a new entry
        const newDepositInfo = { userId, tokens: 0, endDate: Date.now() + (15 * 24 * 60 * 60 * 1000) };
        await db.collection('depositInfo').insertOne(newDepositInfo);
      }

      // Proceed with the deposit logic here
      // Update the user's token balance and perform the transfer
      // Add the deposited amount to the existing balance

      const depositedAmount = 1500; // Replace with the actual deposited amount
      const existingDepositInfo = await db.collection('depositInfo').findOne({ userId });
      const { tokens, endDate } = existingDepositInfo;

      // Check if the user has reached the deposit limit
      if (tokens >= 15000 && Date.now() < endDate) {
        const remainingDays = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000));
        return interaction.reply({ content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`, ephemeral: true });
      }

      // Calculate the total tokens after the deposit
      const totalTokens = tokens + depositedAmount;

      // Check if the total tokens exceed the deposit limit
      if (totalTokens > 15000) {
        const remainingTokens = 15000 - tokens;
        const remainingDays = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000));
        return interaction.reply({ content: `You can deposit a maximum of ${remainingTokens} tokens. Please wait ${remainingDays} day(s) before depositing again.`, ephemeral: true });
      }

      // Update the user's deposit information and perform the transfer
      await db.collection('depositInfo').updateOne({ userId }, { $set: { tokens: totalTokens } });

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
