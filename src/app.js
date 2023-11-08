import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { commands } from './commands';

// Discord.js Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Collection();
const depositLimits = new Collection();
import { db, db2, db3 } from './db'

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
      const address = interaction.options.get("address", true).value;
      const now = Date.now();
      let d = Date(Date.now());

      // Converting the number of millisecond
      // in date string
      let a = d.toString()

      console.log(`userId: ${userId} now: ${a}`);

      // 3 hours of cooldown
      let cooldownAmount = 3 * 60 * 60 * 1000;
      if (!cooldowns.has(userId)) {
        cooldowns.set(userId, now)
      }
      else {
        const expirationTime = cooldowns.get(userId) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = Math.ceil(((expirationTime - now) / (1 * 60 * 1000)));
          console.log(`timeLeft: ${timeLeft}`);
          return interaction.reply({ content: `Please wait ${timeLeft} more minutes(s) before reusing the command.`, ephemeral: true });
        }

        cooldowns.set(userId, now);
      }

      // Check if the user has exceeded the deposit limit
      const depositInfo = await db.collection('depositInfo').findOne({ userId });
      const usermapInfo = await db2.collection('userInfo').findOne({ userId });
      const addressmapInfo = await db3.collection('addressInfo').findOne({ address });

      if (usermapInfo) {
        const { storedaddr, endDate } = usermapInfo;
        if (address != storedaddr && Date.now() < endDate) {
          console.log(`userId ${userId} has a different address ${address} than stored one ${storedaddr}`)
          //update the timer to 30mins as penalty
          return interaction.reply({ content: `The address you provided doesn't match with the userId`, ephemeral: true });
        }
        if (Date.now() > endDate) {
          console.log(`Address for the userId ${userId} has been updated to ${address} after 3 day period`)
          await db2.collection('userInfo').updateOne({ userId }, { $set: { storedaddr: address } });
          await db2.collection('userInfo').updateOne({ userId }, { $set: { endDate: Date.now() + (3 * 24 * 60 * 60 * 1000) } });

        }
      }
      else {
        const newuserInfo = { userId, storedaddr: address, endDate: Date.now() + (3 * 24 * 60 * 60 * 1000) }
        await db2.collection('userInfo').insertOne(newuserInfo);
      }

      if (addressmapInfo) {
        const { storedId, endDate } = addressmapInfo;
        if (userId != storedId && Date.now() < endDate) {
          console.log(`Address ${address} has a different address ${userId} than stored one ${storedId}`)
          //update the timer to 30mins as penalty
          cooldownAmount = 30 * 60 * 1000;
          return interaction.reply({ content: `The address you provided doesn't match with the userId`, ephemeral: true });
        }
        if (Date.now() > endDate) {
          console.log(`Address for the userId ${userId} has been updated to ${address} after 3 day period`)
          await db3.collection('addressInfo').updateOne({ address }, { $set: { storedId: userId } });
          await db3.collection('addressInfo').updateOne({ address }, { $set: { endDate: Date.now() + (3 * 24 * 60 * 60 * 1000) } });

        }
      }
      else {
        const newuserInfo = { address, storedId: userId, endDate: Date.now() + (3 * 24 * 60 * 60 * 1000) }
        await db2.collection('addressInfo').insertOne(newuserInfo);
      }

      if (depositInfo) {
        const { tokens, endDate } = depositInfo;
        console.log(`tokens: ${tokens} endDate: ${endDate} now: ${now}`);

        if (tokens > 99 && Date.now() < endDate) {
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

      const depositedAmount = 11; // Replace with the actual deposited amount
      const existingDepositInfo = await db.collection('depositInfo').findOne({ userId });
      const { tokens, endDate } = existingDepositInfo;

      // Check if the user has reached the deposit limit
      if (tokens >= 100 && Date.now() < endDate) {
        const remainingDays = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000));
        return interaction.reply({ content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`, ephemeral: true });
      }

      // Calculate the total tokens after the deposit
      const totalTokens = tokens + depositedAmount;

      // Check if the total tokens exceed the deposit limit
      if (totalTokens > 100) {
        const remainingTokens = 100 - tokens;
        const remainingDays = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000));
        return interaction.reply({ content: `You can deposit a maximum of 100 tokens. Please wait ${remainingDays} day(s) before depositing again.`, ephemeral: true });
      }

      // Update the user's deposit information and perform the transfer
      await db.collection('depositInfo').updateOne({ userId }, { $set: { tokens: totalTokens } });

    }

    const override_user = false;
    if (override_user) {
      if (interaction.commandName == 'force-transfer') {
        const userRoles = interaction.member.roles.cache; // Get the roles of the user
        const bypassRole = '1144103971116560465'
        const hasBypassRole = userRoles.has(bypassRole);

        if (!hasBypassRole) {
          console.log(`does not have the bypass role ${interaction.user.id}`)
          return interaction.reply({ content: `You do not have the required role to use this command.`, ephemeral: true });
        }
        else {
          console.log(`using the force transfer and hasBypassRole: ${hasBypassRole}`);
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
        }
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
