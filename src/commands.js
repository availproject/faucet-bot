import { Collection, SlashCommandBuilder } from 'discord.js';

export const commands = new Collection();

commands.set('ping', {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute: async (interaction) => {
    interaction.reply({ content: "Pong!", ephemeral: true });
  }
});

commands.set('deposit', {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposits tokens into an account'),
  execute: async (interaction) => {
    interaction.reply({ content: "(not yet implemented)", ephemeral: true });
  }
});

export const commandsJSON =
  [...commands]
  .map(([name, cmd]) => cmd.data.toJSON());
