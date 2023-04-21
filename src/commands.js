import 'dotenv/config';
import { Collection, SlashCommandBuilder } from 'discord.js';
import { createApi, transfer } from 'avail-js-api';

export const commands = new Collection();

commands.set('ping', {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute: async (interaction) => {
    console.log('Received ping. Responding with pong.');
    await interaction.reply({ content: "Pong!", ephemeral: true });
  }
});

commands.set('deposit', {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposits tokens into an account')
    .addStringOption(option =>
      option.setName('address')
	.setDescription('The address to deposit into.')
	.setRequired(true)),
  execute: async (interaction) => {
    // Ack the request and give ourselves more time
    await interaction.deferReply({ ephemeral: true });
    try {
      // Submit the transfer transaction
      const dest = interaction.options.get('address', true).value;
      console.log(`Received deposit request for ${dest}`);
      const api = await createApi('testnet');
      const hash = await transfer(api, process.env.SEED_PHRASE, dest, 1)
      interaction.followUp({ 
        content: `Transferred 1 AVL to ${dest} using tx hash ${hash}`,
        ephemeral: true 
      });
      console.log(`Transferred 1 AVL to ${dest} using tx hash ${hash}`);
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem transferring to ${dest}. Kindly report to the Avail Team.`,
        ephemeral: true
      });
    }

    // Let the user know it's pending
    // interaction.followUp({ content: "Status: Pending", ephemeral: true });
  }
});

export const commandsJSON =
  [...commands]
  .map(([name, cmd]) => cmd.data.toJSON());
