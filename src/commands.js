import "dotenv/config";
import { Collection, SlashCommandBuilder, hyperlink } from "discord.js";
import {
  getDecimals,
  initialize,
  formatNumberToBalance,
  getKeyringFromSeed,
  isValidAddress,
} from "avail-js-sdk";
import { db, db2, db3, db4, db5, dispence_array } from "./db.js";
import { transferAccount } from "./api.js";
import { logger } from "./logger.js";

export const commands = new Collection();

commands.set("ping", {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  execute: async (interaction) => {
    logger.info("Received ping. Responding with pong.");
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
      // Let the user know it's pending
      interaction.followUp({ content: "Status: Sending", ephemeral: true });
      // Submit the transfer transaction
      const userId = interaction.user.id;
      const dest = interaction.options.get("address", true).value;
      if (!isValidAddress(dest)) {
        return interaction.reply({
          content: `Not valid Address used. Please check your request again`,
          ephemeral: true,
        });
      }
      logger.info(
        `Received deposit request with address ${dest} for userId ${userId}`
      );
      const mnemonic = process.env.SEED_PHRASE;
      const http_url = process.env.HTTP_URL;
      try {
        // const amount = formatNumberToBalance(dest_value, decimals);
        let returnValue = await transferAccount(userId, dest, mnemonic);
        let hash = returnValue[0];
        const link = http_url + "#/explorer/query/" + hash;
        interaction.followUp({
          content: `Status: Complete
    Amount:  ${returnValue[1]} AVL
    Block Hash: ${hash}
    🌐 ${hyperlink("View in explorer", link)}`,
        });
      } catch (error) {
        console.log(error);
        logger.warn(`Transaction failed for ${dest}, trying backup`);
        interaction.followUp({
          content: `Retrying transaction with backup`,
          ephemeral: true,
        });
        try {
          let backup_mnemonic = process.env.BACKUP_SEED_PHRASE;
          let hash = await transferAccount(userId, dest, backup_mnemonic);
          const link = http_url + "#/explorer/query/" + hash;
          interaction.followUp({
            content: `Status: Complete
      Amount:  ${dest_value} AVL
      Block Hash: ${hash}
      🌐 ${hyperlink("View in explorer", link)}`,
          });
        } catch (error) {
          logger.warn(`Transaction failed for ${dest}`);
          interaction.followUp({
            content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
        ephemeral: true,
      });
    }
  },
});
const override_user = false;
if (override_user) {
  commands.set("deposit-rollup", {
    data: new SlashCommandBuilder()
      .setName("deposit-rollup")
      .setDescription("Deposits tokens into an rollup account")
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
        // Let the user know it's pending
        interaction.followUp({ content: "Status: Sending", ephemeral: true });
        const userId = interaction.user.id;
        const dest = interaction.options.get("address", true).value;
        if (!isValidAddress(dest)) {
          return interaction.reply({
            content: `Not valid Address used. Please check your request again`,
            ephemeral: true,
          });
        }
        logger.info(`Received deposit request for ${dest}`);
        const mnemonic = process.env.ROLLUP_SEED_PHRASE;
        const ws_url = process.env.WS_URL;
        const http_url = process.env.HTTP_URL;
        const api = await initialize(ws_url);
        // const api = await createApi('local');
        // const keyring = getKeyringFromSeed(mnemonic);
        // const options = { app_id: 0, nonce: -1 };
        // const decimals = getDecimals(api);
        const dest_value = 5;

        // const amount = formatNumberToBalance(dest_value, decimals);
        try {
          // const amount = formatNumberToBalance(dest_value, decimals);
          let hash = await transferAccount(dest, dest_value, mnemonic);
          const link = http_url + "#/explorer/query/" + hash;
          interaction.followUp({
            content: `Status: Complete
    Amount:  ${dest_value} AVL
    Block Hash: ${hash}
    🌐 ${hyperlink("View in explorer", link)}`,
          });
        } catch (error) {
          console.error(error);
          interaction.followUp({
            content: `testing it out!`,
            ephemeral: true,
          });
          try {
            // const amount = formatNumberToBalance(dest_value, decimals);
            let backup_mnemonic = process.env.BACKUP_SEED_PHRASE;
            let hash = await transferAccount(dest, dest_value, backup_mnemonic);
            const link = http_url + "#/explorer/query/" + hash;
            interaction.followUp({
              content: `Status: Complete
      Amount:  ${dest_value} AVL
      Block Hash: ${hash}
      🌐 ${hyperlink("View in explorer", link)}`,
            });
          } catch (error) {
            console.error(error);
            interaction.followUp({
              content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
              ephemeral: true,
            });
          }
        }
        const WeeklydepositInfo = await db
          .collection("WeeklyRollupdepositInfo")
          .findOne({ userId });
        const DailydepositInfo = await db
          .collection("DailyRollupdepositInfo")
          .findOne({ userId });
        if (WeeklydepositInfo) {
          let { tokens } = WeeklydepositInfo;
          await db
            .collection("WeeklyRollupdepositInfo")
            .updateOne({ userId }, { $set: { tokens: tokens + dest_value } });
        }
        if (DailydepositInfo) {
          let { tokens } = DailydepositInfo;
          await db
            .collection("DailyRollupdepositInfo")
            .updateOne({ userId }, { $set: { tokens: tokens + dest_value } });
        }
      } catch (error) {
        console.error(error);
        interaction.followUp({
          content: `There was a problem with the transfer. Kindly report to the Avail Team.`,
          ephemeral: true,
        });
      }
    },
  });
}

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
      logger.info(`does not have the bypass role ${interaction.user.id}`);
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
          { $set: { endDate: Date.now() + 3 * 60 * 1000 } }
        );
      await db3
        .collection("addressInfo")
        .updateOne({ address }, { $set: { storedId: userId } });
      await db3
        .collection("addressInfo")
        .updateOne(
          { address },
          { $set: { endDate: Date.now() + 3 * 60 * 1000 } }
        );
      await interaction.reply({
        content: `User address overriden by admin for user ${userId} to ${address}`,
        ephemeral: true,
      });
    }
  },
});

commands.set("ban-user", {
  data: new SlashCommandBuilder()
    .setName("ban-user")
    .setDescription("Deposits tokens into an account")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The address to deposit into.")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    const userId = interaction.options.get("id", true).value;
    const userRoles = interaction.member.roles.cache; // Get the roles of the user
    const bypassRole = "1085873829362016256";
    const hasBypassRole = userRoles.has(bypassRole);
    if (!hasBypassRole) {
      logger.info(`does not have the bypass role ${interaction.user.id}`);
      return interaction.reply({
        content: `You do not have the required role to use this command.`,
        ephemeral: true,
      });
    } else {
      await db4.collection("bannedmap").insertOne({ userId: userId });
      await interaction.reply({
        content: `User address banned by admin for user ${userId}`,
        ephemeral: true,
      });
    }
  },
});

commands.set("add-user", {
  data: new SlashCommandBuilder()
    .setName("add-user")
    .setDescription("add user to faucet")
    .addStringOption((option) =>
      option.setName("id").setDescription("addId to faucet").setRequired(true)
    ),
  execute: async (interaction) => {
    const userId = interaction.options.get("id", true).value;
    const userRoles = interaction.member.roles.cache; // Get the roles of the user
    const bypassRole = "1085873829362016256";
    const hasBypassRole = userRoles.has(bypassRole);
    if (!hasBypassRole) {
      logger.info(`does not have the bypass role ${interaction.user.id}`);
      return interaction.reply({
        content: `You do not have the required role to use this command.`,
        ephemeral: true,
      });
    } else {
      await db4.collection("bannedmap").deleteOne({ userId: userId });
      await interaction.reply({
        content: `UserId ${userId} added to the faucet by admin`,
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
      logger.info(`Received balance request for ${address}`);
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
      logger.info(`balance of ${address} is ${decimal_amount} `);

      interaction.followUp({
        content: `Status: Complete
        Balance:  ${decimal_amount}`,
      });
    } catch (error) {
      logger.warn({ error });
      interaction.followUp({
        content: `There was a problem with the checking balance. Kindly report to the Avail Team.`,
        ephemeral: true,
      });
    }

    // Let the user know it's pending
    // interaction.followUp({ content: "Status: Pending", ephemeral: true });
  },
});

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
        logger.info(`Received deposit request for ${dest}`);
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
            logger.info(`Transaction status: ${status.type}`);
            if (status.isFinalized) {
              const blockHash = status.asFinalized;
              const link =
                "https://dymension-devnet.avail.tools/#/explorer/query/" +
                blockHash;
              logger.info(`transferred ${token_to_sent} AVL to ${dest}`);
              logger.info(`Transaction hash ${txHash.toHex()}`);
              logger.info(
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
