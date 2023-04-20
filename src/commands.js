import 'dotenv/config';
import { Collection, SlashCommandBuilder } from 'discord.js';
import { AvailApi } from './avail';

export const commands = new Collection();

commands.set('ping', {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute: async (interaction) => {
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
      const Avail = await AvailApi.create({ws:process.env.WS});
      const dest = interaction.options.get('address', true).value;
      const amount = 1 * Avail.Multiplier;
      await Avail.transfer({ dest, amount });
    } catch (error) {
      console.log('YYYYYYYYYYYYYYYY');
      console.error(error);
    }

    // Let the user know it's pending
    interaction.followUp({ content: "Status: Pending", ephemeral: true });
  }
});

export const commandsJSON =
  [...commands]
  .map(([name, cmd]) => cmd.data.toJSON());
