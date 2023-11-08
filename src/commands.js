import "dotenv/config";
import { Collection, SlashCommandBuilder, hyperlink } from "discord.js";
import {
  getDecimals,
  initialize,
  formatNumberToBalance,
  getKeyringFromSeed,
  isValidAddress,
} from "avail-js-sdk";
import { db, db2, db3 } from "./db";

export const commands = new Collection();

commands.set("ping", {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  execute: async (interaction) => {
    console.log("Received ping. Responding with pong.");
    await interaction.reply({ content: "Pong!", ephemeral: true });
  },
});

commands.set("deposit", {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposits tokens into an account")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("The address to deposit into.")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    // Ack the request and give ourselves more time
    await interaction.deferReply({ ephemeral: true });

    try {
      // Submit the transfer transaction
      const dest = interaction.options.get("address", true).value;
      if (!isValidAddress(dest)) throw new Error("Invalid Recipient");
      console.log(`Received deposit request for ${dest}`);
      const mnemonic = process.env.SEED_PHRASE;
      const ws_url = process.env.WS_URL;
      const http_url = process.env.HTTP_URL;
      const api = await initialize(ws_url);
      // const api = await createApi('local');
      const keyring = getKeyringFromSeed(mnemonic);
      const options = { app_id: 0, nonce: -1 };
      const decimals = getDecimals(api);
      const amount = formatNumberToBalance(11, decimals);
      await api.tx.balances
        .transfer(dest, amount)
        .signAndSend(keyring, options, ({ status, txHash }) => {
          console.log(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            const blockHash = status.asFinalized;
            const link = http_url + "#/explorer/query/" + blockHash;
            console.log(`transferred 11 AVL to ${dest}`);
            console.log(`Transaction hash ${txHash.toHex()}`);
            console.log(
              `Transaction included at blockHash ${status.asFinalized}`
            );
            interaction.followUp({
              content: `Status: Complete
            Amount:  11 AVL
            Txn Hash: ${txHash}
            Block Hash: ${blockHash}
            🌐 ${hyperlink("View in explorer", link)}`,
            });
          }
        });
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
        ephemeral: true,
      });
    }

    // Let the user know it's pending
    interaction.followUp({ content: "Status: Pending", ephemeral: true });
  },
});

commands.set("override", {
  data: new SlashCommandBuilder()
    .setName("override")
    .setDescription("Deposits tokens into an account")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("UserId to update the address")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("New address to be added")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    const userId = interaction.options.get("id", true).value;
    const address = interaction.options.get("address", true).value;
    const userRoles = interaction.member.roles.cache; // Get the roles of the user
    const bypassRole = "1085873829362016256";
    const hasBypassRole = userRoles.has(bypassRole);
    if (!hasBypassRole) {
      console.log(`does not have the bypass role ${interaction.user.id}`);
      return interaction.reply({
        content: `You do not have the required role to use this command.`,
        ephemeral: true,
      });
    } else {
      await db2
        .collection("userInfo")
        .updateOne({ userId }, { $set: { storedaddr: address } });
      await db2
        .collection("userInfo")
        .updateOne(
          { userId },
          { $set: { endDate: Date.now() + 3 * 24 * 60 * 60 * 1000 } }
        );
      await db3
        .collection("addressInfo")
        .updateOne({ address }, { $set: { storedId: userId } });
      await db3
        .collection("addressInfo")
        .updateOne(
          { address },
          { $set: { endDate: Date.now() + 3 * 24 * 60 * 60 * 1000 } }
        );
      await interaction.reply({
        content: `User address overriden by admin for user ${userId} to ${address}`,
        ephemeral: true,
      });
    }
  },
});

commands.set("balance", {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Balance of a given address")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("Address to check balance of.")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    // Ack the request and give ourselves more time
    await interaction.deferReply({ ephemeral: true });

    try {
      // Submit the transfer transaction
      const address = interaction.options.get("address", true).value;
      if (!isValidAddress(address)) throw new Error("Invalid Recipient");
      console.log(`Received balance request for ${address}`);
      const mnemonic = process.env.SEED_PHRASE;
      const url = process.env.WS_URL;
      const api = await initialize(url);
      // const api = await createApi('local');
      const decimals = getDecimals(api);
      let {
        data: { free: currentFree },
      } = await api.query.system.account(address);
      // Retrieve the account balance system module
      const { data: balance } = await api.query.system.account(address);
      let decimal_amount = balance.free / Math.pow(10, 18);
      console.log(`balance of ${address} is ${decimal_amount} `);

      interaction.followUp({
        content: `Status: Complete
        Balance:  ${decimal_amount}`,
      });
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem with the checking balance. Kindly report to the Avail Team.`,
        ephemeral: true,
      });
    }

    // Let the user know it's pending
    // interaction.followUp({ content: "Status: Pending", ephemeral: true });
  },
});

const override_user = false;
if (override_user) {
  commands.set("force-transfer", {
    data: new SlashCommandBuilder()
      .setName("force-transfer")
      .setDescription("Deposits tokens into an account")
      .addStringOption((option) =>
        option
          .setName("address")
          .setDescription("The address to deposit into.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("Amount to deposit")
          .setRequired(true)
      ),
    execute: async (interaction) => {
      // Ack the request and give ourselves more time
      await interaction.deferReply({ ephemeral: true });

      try {
        // Submit the transfer transaction
        const dest = interaction.options.get("address", true).value;
        const token_to_sent = interaction.options.get("amount", true).value;
        if (!isValidAddress(dest)) throw new Error("Invalid Recipient");
        console.log(`Received deposit request for ${dest}`);
        const mnemonic = process.env.SEED_PHRASE;
        const api = await initialize("wss://dymension-devnet.avail.tools/ws");
        // const api = await createApi('local');
        const keyring = getKeyringFromSeed(mnemonic);
        const options = { app_id: 0, nonce: -1 };
        const decimals = getDecimals(api);
        const amount = formatNumberToBalance(token_to_sent, decimals);
        await api.tx.balances
          .transfer(dest, amount)
          .signAndSend(keyring, options, ({ status, txHash }) => {
            console.log(`Transaction status: ${status.type}`);
            if (status.isFinalized) {
              const blockHash = status.asFinalized;
              const link =
                "https://dymension-devnet.avail.tools/#/explorer/query/" +
                blockHash;
              console.log(`transferred ${token_to_sent} AVL to ${dest}`);
              console.log(`Transaction hash ${txHash.toHex()}`);
              console.log(
                `Transaction included at blockHash ${status.asFinalized}`
              );
              interaction.followUp({
                content: `Status: Complete
            Amount:  ${token_to_sent} AVL
            Txn Hash: ${txHash}
            Block Hash: ${blockHash}
            🌐 ${hyperlink("View in explorer", link)}`,
              });
            }
          });
      } catch (error) {
        console.error(error);
        interaction.followUp({
          content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
          ephemeral: true,
        });
      }

      // Let the user know it's pending
      interaction.followUp({ content: "Status: Pending", ephemeral: true });
    },
  });
}

export const commandsJSON = [...commands].map(([name, cmd]) =>
  cmd.data.toJSON()
);
