import 'dotenv/config';
import { Collection, SlashCommandBuilder, hyperlink } from 'discord.js';
import { getDecimals, initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from "avail-js-sdk"

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
      if (!isValidAddress(dest)) throw new Error("Invalid Recipient");
      console.log(`Received deposit request for ${dest}`);
      const mnemonic = process.env.SEED_PHRASE;
      const api = await initialize("wss://kate.avail.tools/ws")
      // const api = await createApi('local');
      const keyring = getKeyringFromSeed(mnemonic)
      const options = { app_id: 0, nonce: -1 }
      const decimals = getDecimals(api)
      const amount = formatNumberToBalance(1, decimals)
      await api.tx.balances
        .transfer(dest, amount)
        .signAndSend(keyring, options, ({ status, txHash }) => {
          console.log(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            const blockHash = status.asFinalized;
            const link = 'https://kate.avail.tools/#/explorer/query/' + blockHash;
            console.log(`transferred 1 AVL to ${dest}`);
            console.log(`Transaction hash ${txHash.toHex()}`);
            console.log(`Transaction included at blockHash ${status.asFinalized}`);
            interaction.followUp({
              content: `Status: Complete
            Amount:  1 AVL
            Txn Hash: ${txHash}
            Block Hash: ${blockHash}
            🌐 ${hyperlink('View in explorer', link)}`
            });
          }
        });
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

commands.set('balance', {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Balance of a given address')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Address to check balance of.')
        .setRequired(true)),
  execute: async (interaction) => {
    // Ack the request and give ourselves more time
    await interaction.deferReply({ ephemeral: true });

    try {
      // Submit the transfer transaction
      const address = interaction.options.get('address', true).value;
      if (!isValidAddress(address)) throw new Error("Invalid Recipient");
      console.log(`Received balance request for ${address}`);
      const mnemonic = process.env.SEED_PHRASE;
      const api = await initialize("wss://kate.avail.tools/ws")
      // const api = await createApi('local');
      const decimals = getDecimals(api)
      let { data: { free: currentFree } } = await api.query.system.account(address);
      // Retrieve the account balance system module
      const {  data: balance } = await api.query.system.account(address);
      let decimal_amount = balance.free/Math.pow(10,18);
      console.log(`balance of ${address} is ${decimal_amount} `);

      interaction.followUp({
        content: `Status: Complete
        Balance:  ${decimal_amount}`
      });
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem with the checking balance. Kindly report to the Avail Team.`,
        ephemeral: true
      });
    }

    // Let the user know it's pending
    // interaction.followUp({ content: "Status: Pending", ephemeral: true });
  }
});

const override_user = false;
if (override_user) {
commands.set('force-transfer', {
  data: new SlashCommandBuilder()
    .setName('force-transfer')
    .setDescription('Deposits tokens into an account')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('The address to deposit into.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to deposit')
        .setRequired(true)),
  execute: async (interaction) => {
    // Ack the request and give ourselves more time
    await interaction.deferReply({ ephemeral: true });

    try {
      // Submit the transfer transaction
      const dest = interaction.options.get('address', true).value;
      const token_to_sent = interaction.options.get('amount', true).value;
      if (!isValidAddress(dest)) throw new Error("Invalid Recipient");
      console.log(`Received deposit request for ${dest}`);
      const mnemonic = process.env.SEED_PHRASE;
      const api = await initialize("wss://dymension-devnet.avail.tools/ws")
      // const api = await createApi('local');
      const keyring = getKeyringFromSeed(mnemonic)
      const options = { app_id: 0, nonce: -1 }
      const decimals = getDecimals(api)
      const amount = formatNumberToBalance(token_to_sent, decimals)
      await api.tx.balances
        .transfer(dest, amount)
        .signAndSend(keyring, options, ({ status, txHash }) => {
          console.log(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            const blockHash = status.asFinalized;
            const link = 'https://dymension-devnet.avail.tools/#/explorer/query/' + blockHash;
            console.log(`transferred ${token_to_sent} AVL to ${dest}`);
            console.log(`Transaction hash ${txHash.toHex()}`);
            console.log(`Transaction included at blockHash ${status.asFinalized}`);
            interaction.followUp({
              content: `Status: Complete
            Amount:  ${token_to_sent} AVL
            Txn Hash: ${txHash}
            Block Hash: ${blockHash}
            🌐 ${hyperlink('View in explorer', link)}`
            });
          }
        });
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
}

export const commandsJSON =
  [...commands]
    .map(([name, cmd]) => cmd.data.toJSON());
