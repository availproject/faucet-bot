import 'dotenv/config';
import { Collection, SlashCommandBuilder, hyperlink } from 'discord.js';
import { createApi, transfer } from './../avail-js'

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
      const mnemonic = process.env.SEED_PHRASE;
      await transfer({
        api, mnemonic, dest, amount: 1, onResult: (result) => {
          if (result.status.isInBlock) {
            const blockHash = result.status.asInBlock;
            const link = 'https://testnet.avail.tools/#/explorer/query/' + blockHash;
            interaction.followUp({
              content: `Status: Complete\nAmount:  1 AVL\nTxn Hash: ${result.txHash}\nBlock Hash: ${blockHash}\n🌐 ${hyperlink('View in explorer', link)}`
            });            
          }
        }
      });
      console.log(`transferred 1 AVL to ${dest}`)
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
        ephemeral: true
      });
    }

    // Let the user know it's pending
    interaction.followUp({ content: "Status: Pending", ephemeral: true });
  }
});

export const commandsJSON =
  [...commands]
    .map(([name, cmd]) => cmd.data.toJSON());
