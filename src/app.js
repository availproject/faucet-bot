import "dotenv/config";
import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import { commands } from "./commands.js";
import {
  isValidAddress,
  initialize,
  disconnect,
  isConnected,
} from "avail-js-sdk";
import "@polkadot/api-augment";
import BN from "bn.js";
// Discord.js Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Collection();
const rollupUserCd = new Collection();
import { db, db2, db3, db4, db5, dispence_array } from "./db.js";
import { getApiInstance, disconnectApi } from "./api.js";
// ClientReady event fires once after successful Discord login
client.once(Events.ClientReady, async (event) => {
  console.log(`Ready! Logged in as ${event.user.tag}`);
  // Set up the interval with an anonymous function
  setInterval(() => {
    // Call your asynchronous function here
    checkBalance().catch(console.error);
  }, 20 * 1000); // Check balance every 20 minutes
});

// InteractionCreate event fires when the user invokes a slash command
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const bannedMap = await db.collection("bannedmap").findOne({ userId });

  if (bannedMap) {
    return interaction.reply({
      content: `You are banned from using the faucet. Please contact the team for further assistance`,
      ephemeral: true,
    });
  }

  // Get the command definition for the invoked command
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    // Run the command, passing along the interaction
    if (interaction.commandName == "deposit") {
      const userId = interaction.user.id;
      const address = interaction.options.get("address", true).value;
      const userRoles = interaction.member.roles.cache; // Get the roles of the user
      const bypassRole = "1174943621875761153";
      const hasBypassRole = true;
      if (!hasBypassRole) {
        console.log(`no access to faucet ${interaction.user.id}`);
        return interaction.reply({
          content: `You do not have the required role to use this command.`,
          ephemeral: true,
        });
      }
      if (!isValidAddress(address)) {
        return interaction.reply({
          content: `Not valid Address used. Please check your request again`,
          ephemeral: true,
        });
      }
      const moment = new Date();
      const now = moment.getTime();

      console.log(`userId: ${userId} logged now: ${moment}`);
      let endTime = now + 3 * 24 * 60 * 60 * 1000;
      let addresstime = new Date(endTime);

      // Check if the user has exceeded the deposit limit
      const depositInfo = await db
        .collection("depositInfo")
        .findOne({ userId });
      const usermapInfo = await db2.collection("userInfo").findOne({ userId });
      const addressmapInfo = await db3
        .collection("addressInfo")
        .findOne({ address });

      const tokenmapInfo = await db5
        .collection("tokenInfo")
        .findOne({ userId });
      const bannedInfo = await db4.collection("bannedInfo").findOne({ userId });
      if (bannedInfo) {
        console.log(`user ${userId} banned is attempting to use faucet`);
        return interaction.reply({
          content: `You are banned from using the faucet, contact the team for assistance`,
          ephemeral: true,
        });
      }

      if (addressmapInfo) {
        const { storedId, endDate } = addressmapInfo;
        if (userId != storedId && now < endDate) {
          console.log(
            `Address ${address} has a different address ${userId} than stored one ${storedId}`
          );
          return interaction.reply({
            content: `The address you provided doesn't match with the userId`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log(
            `Address for the userId ${userId} has been updated to ${address} after 3 day period`
          );
          console.log(
            `updating address mapping to ID after 3 day timeout for userId ${userId} to the address ${address} till the date ${addresstime}`
          );
          await db3
            .collection("addressInfo")
            .updateOne({ address }, { $set: { storedId: userId } });
          await db3
            .collection("addressInfo")
            .updateOne({ address }, { $set: { endDate: endTime } });
        }
      } else {
        if (usermapInfo) {
          const { storedaddr, endDate } = usermapInfo;
          console.log(storedaddr);
          if (address != storedaddr && now < endDate) {
            console.log(
              `userId ${userId} has a different address ${address} than stored one ${storedaddr}`
            );
            return interaction.reply({
              content: `The userId doesn't match with the address`,
              ephemeral: true,
            });
          }
        }
        const newuserInfo = {
          address,
          storedId: userId,
          endDate: endTime,
        };
        console.log(
          `address mapping to ID for userId ${userId} to the address ${address} till the date ${addresstime}`
        );
        await db3.collection("addressInfo").insertOne(newuserInfo);
      }

      if (usermapInfo) {
        const { storedaddr, endDate } = usermapInfo;
        if (address != storedaddr && now < endDate) {
          console.log(
            `userId ${userId} has a different address ${address} than stored one ${storedaddr}`
          );
          //update the timer to 30mins as penalty
          return interaction.reply({
            content: `The userId doesn't match with the address`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log(
            `updating User mapping to address after 3 day timeout for userId ${userId} to the address ${address} till the date ${addresstime}`
          );
          await db2
            .collection("userInfo")
            .updateOne({ userId }, { $set: { storedaddr: address } });
          await db2
            .collection("userInfo")
            .updateOne({ userId }, { $set: { endDate: endTime } });
        }
      } else {
        const newuserInfo = {
          userId,
          storedaddr: address,
          endDate: endTime,
        };
        console.log(
          `User mapping to address for userId ${userId} to the address ${address} till the date ${addresstime}`
        );
        await db2.collection("userInfo").insertOne(newuserInfo);
      }

      if (tokenmapInfo) {
        const { tokenIndex, endDate } = tokenmapInfo;
        if (Date.now() < endDate) {
          if (tokenIndex > dispence_array.length - 1) {
            await db5
              .collection("tokenInfo")
              .updateOne({ userId }, { $set: { tokenIndex: 3 } });
          }
        } else {
          await db5
            .collection("tokenInfo")
            .updateOne({ userId }, { $set: { tokenIndex: 0 } });
          await db5
            .collection("tokenInfo")
            .updateOne(
              { userId },
              { $set: { endDate: Date.now() + 7 * 24 * 60 * 60 * 1000 } }
            );
        }
      }

      if (!tokenmapInfo) {
        const newtokenInfo = {
          userId,
          tokenIndex: 0,
          endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        await db5.collection("tokenInfo").insertOne(newtokenInfo);
      }

      if (depositInfo) {
        const { tokens, endDate } = depositInfo;
        console.log(`tokens: ${tokens} endDate: ${endDate} now: ${now}`);

        if (tokens > 99 && Date.now() < endDate) {
          const remainingDays = Math.ceil(
            (endDate - now) / (24 * 60 * 60 * 1000)
          );
          return interaction.reply({
            content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`,
            ephemeral: true,
          });
        }
      } else {
        // If no deposit info exists for the user, create a new entry
        const newDepositInfo = {
          userId,
          tokens: 0,
          endDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
        };
        await db.collection("depositInfo").insertOne(newDepositInfo);
      }

      // Proceed with the deposit logic here
      // Update the user's token balance and perform the transfer
      // Add the deposited amount to the existing balance
      const existTokenInfo = await db5
        .collection("tokenInfo")
        .findOne({ userId });
      const { tokenIndex } = existTokenInfo;
      const depositedAmount = dispence_array[tokenIndex];
      const existingDepositInfo = await db
        .collection("depositInfo")
        .findOne({ userId });
      const { tokens, endDate } = existingDepositInfo;

      // Check if the user has reached the deposit limit
      if (tokens >= 100 && Date.now() < endDate) {
        const remainingDays = Math.ceil(
          (endDate - Date.now()) / (24 * 60 * 60 * 1000)
        );
        return interaction.reply({
          content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`,
          ephemeral: true,
        });
      }

      // Calculate the total tokens after the deposit
      const totalTokens = tokens + depositedAmount;

      // Check if the total tokens exceed the deposit limit
      if (totalTokens > 100) {
        const remainingTokens = 100 - tokens;
        const remainingDays = Math.ceil(
          (endDate - Date.now()) / (24 * 60 * 60 * 1000)
        );
        return interaction.reply({
          content: `You can deposit a maximum of 100 tokens. Please wait ${remainingDays} day(s) before depositing again.`,
          ephemeral: true,
        });
      }

      // Update the user's deposit information and perform the transfer
      await db
        .collection("depositInfo")
        .updateOne({ userId }, { $set: { tokens: totalTokens } });

      //3 hours of cooldown
      // let cooldownAmount = 3 * 60 * 60 * 1000;
      // if (!cooldowns.has(userId)) {
      //   cooldowns.set(userId, now);
      // } else {
      //   const expirationTime = cooldowns.get(userId) + cooldownAmount;

      //   if (now < expirationTime) {
      //     const timeLeft = Math.ceil((expirationTime - now) / (1 * 60 * 1000));
      //     console.log(`timeLeft: ${timeLeft} for user ${userId}`);
      //     return interaction.reply({
      //       content: `Please wait ${timeLeft} more minutes(s) before reusing the command.`,
      //       ephemeral: true,
      //     });
      //   }

      //   cooldowns.set(userId, now);
      // }
    }

    if (interaction.commandName == "deposit-rollup") {
      const userId = interaction.user.id;
      const address = interaction.options.get("address", true).value;
      const userRoles = interaction.member.roles.cache; // Get the roles of the user
      const hasRole = userRoles.has("1199836359288967168");
      if (!hasRole) {
        console.log(`no access to faucet ${interaction.user.id}`);
        return interaction.reply({
          content: `You do not have the required role to use this command.`,
          ephemeral: true,
        });
      }
      if (!isValidAddress(address)) {
        return interaction.reply({
          content: `Not valid Address used. Please check your request again`,
          ephemeral: true,
        });
      }
      const moment = new Date();
      const now = moment.getTime();
      console.log(`rollup user: ${userId} logged now: ${moment}`);
      let endTime = now + 3 * 24 * 60 * 60 * 1000;
      let addresstime = new Date(endTime);
      const WeeklydepositInfo = await db
        .collection("WeeklyRollupdepositInfo")
        .findOne({ userId });
      const DailydepositInfo = await db
        .collection("DailyRollupdepositInfo")
        .findOne({ userId });
      const usermapInfo = await db2.collection("userInfo").findOne({ userId });
      const addressmapInfo = await db3
        .collection("addressInfo")
        .findOne({ address });

      if (addressmapInfo) {
        const { storedId, endDate } = addressmapInfo;
        if (userId != storedId && now < endDate) {
          console.log(
            `Address ${address} has a different address ${userId} than stored one ${storedId}`
          );
          return interaction.reply({
            content: `The address you provided doesn't match with the userId`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log(
            `Address for the userId ${userId} has been updated to ${address} after 3 day period`
          );
          console.log(
            `updating address mapping to ID after 3 day timeout for userId ${userId} to the address ${address} till the date ${addresstime}`
          );
          await db3
            .collection("addressInfo")
            .updateOne({ address }, { $set: { storedId: userId } });
          await db3
            .collection("addressInfo")
            .updateOne({ address }, { $set: { endDate: endTime } });
        }
      } else {
        if (usermapInfo) {
          const { storedaddr, endDate } = usermapInfo;
          console.log(storedaddr);
          if (address != storedaddr && now < endDate) {
            console.log(
              `userId ${userId} has a different address ${address} than stored one ${storedaddr}`
            );
            return interaction.reply({
              content: `The userId doesn't match with the address`,
              ephemeral: true,
            });
          }
        }
        const newuserInfo = {
          address,
          storedId: userId,
          endDate: endTime,
        };
        console.log(
          `address mapping to ID for userId ${userId} to the address ${address} till the date ${addresstime}`
        );
        await db3.collection("addressInfo").insertOne(newuserInfo);
      }

      if (usermapInfo) {
        const { storedaddr, endDate } = usermapInfo;
        if (address != storedaddr && now < endDate) {
          console.log(
            `userId ${userId} has a different address ${address} than stored one ${storedaddr}`
          );
          //update the timer to 30mins as penalty
          return interaction.reply({
            content: `The userId doesn't match with the address`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log(
            `updating User mapping to address after 3 day timeout for userId ${userId} to the address ${address} till the date ${addresstime}`
          );
          await db2
            .collection("userInfo")
            .updateOne({ userId }, { $set: { storedaddr: address } });
          await db2
            .collection("userInfo")
            .updateOne({ userId }, { $set: { endDate: endTime } });
        }
      } else {
        const newuserInfo = {
          userId,
          storedaddr: address,
          endDate: endTime,
        };
        console.log(
          `User mapping to address for userId ${userId} to the address ${address} till the date ${addresstime}`
        );
        await db2.collection("userInfo").insertOne(newuserInfo);
      }

      if (WeeklydepositInfo) {
        const { tokens, endDate } = WeeklydepositInfo;
        console.log(`tokens: ${tokens} endDate: ${endDate} now: ${now}`);

        if (tokens >= 200 && now < endDate) {
          const remainingDays = Math.ceil(
            (endDate - now) / (24 * 60 * 60 * 1000)
          );
          return interaction.reply({
            content: `You have reached the weekly deposit limit. Please wait ${remainingDays} day(s) before depositing again.`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log("updating weekly timing to 0");
          await db
            .collection("WeeklyRollupdepositInfo")
            .updateOne({ userId }, { $set: { tokens: 0 } });
        }
      } else {
        console.log(`creating new weekly deposit info for userID ${userId}`);
        let date = new Date();
        let endDate = date.setDate(moment.getDate() + 7);
        const newDepositInfo = {
          userId,
          tokens: 0,
          endDate: endDate,
        };
        await db
          .collection("WeeklyRollupdepositInfo")
          .insertOne(newDepositInfo);
      }

      if (DailydepositInfo) {
        const { tokens, endDate } = DailydepositInfo;
        console.log(`tokens: ${tokens} endDate: ${endDate} now: ${now}`);

        if (tokens >= 25 && now < endDate) {
          const remainingDays = Math.ceil(
            (endDate - now) / (24 * 60 * 60 * 1000)
          );
          return interaction.reply({
            content: `You have reached the daily deposit limit. Please wait ${remainingDays} day(s) before depositing again.`,
            ephemeral: true,
          });
        }
        if (now > endDate) {
          console.log("updating daily timing to 0");
          await db
            .collection("DailyRollupdepositInfo")
            .updateOne({ userId }, { $set: { tokens: 0 } });
        }
      } else {
        console.log(`creating new daily deposit info for userID ${userId}`);
        let date = new Date();
        let endDate = date.setDate(moment.getDate() + 1);
        console.log(date);
        const newDepositInfo = {
          userId,
          tokens: 0,
          endDate: endDate,
        };
        await db.collection("DailyRollupdepositInfo").insertOne(newDepositInfo);
      }

      // let cooldownTime = 60 * 60 * 1000;
      // if (!rollupUserCd.has(userId)) {
      //   rollupUserCd.set(userId, now);
      // } else {
      //   const expirationTime = rollupUserCd.get(userId) + cooldownTime;
      //   if (now < expirationTime) {
      //     const timeLeft = Math.ceil((expirationTime - now) / (1 * 60 * 1000));
      //     console.log(`timeLeft: ${timeLeft} for user ${userId}`);
      //     return interaction.reply({
      //       content: `Please wait ${timeLeft} more minutes(s) before reusing the command.`,
      //       ephemeral: true,
      //     });
      //   }
      //   rollupUserCd.set(userId, now);
      // }
      // const depositedAmount = 5;
      // const existingDepositInfo = await db
      //   .collection("RollupdepositInfo")
      //   .findOne({ userId });
      // const { tokens, endDate } = existingDepositInfo;
      // console.log(`tokens = ${tokens}`);
      // console.log(`enddate = ${endDate}`);

      // // Check if the user has reached the deposit limit
      // if (tokens >= 10 && moment.getDate() < endDate) {
      //   const remainingDays = Math.ceil(
      //     (endDate - Date.now()) / (24 * 60 * 60 * 1000)
      //   );
      //   return interaction.reply({
      //     content: `You have reached the deposit limit. Please wait ${remainingDays} day(s) before depositing again.`,
      //     ephemeral: true,
      //   });
      // }

      // // Calculate the total tokens after the deposit
      // const totalTokens = tokens + depositedAmount;
      // console.log(totalTokens);

      // // Check if the total tokens exceed the deposit limit
      // if (totalTokens > 10) {
      //   const remainingTokens = 100 - tokens;
      //   const remainingDays = Math.ceil(
      //     (endDate - Date.now()) / (24 * 60 * 60 * 1000)
      //   );
      //   console.log(endDate - Date.now());
      //   return interaction.reply({
      //     content: `You can deposit a maximum of 100 tokens. Please wait ${remainingDays} day(s) before depositing again. 2`,
      //     ephemeral: true,
      //   });
      // }

      // // Update the user's deposit information and perform the transfer
      // await db
      //   .collection("RollupdepositInfo")
      //   .updateOne({ userId }, { $set: { tokens: totalTokens } });
    }

    const override_user = false;
    if (override_user) {
      if (interaction.commandName == "force-transfer") {
        const userRoles = interaction.member.roles.cache; // Get the roles of the user
        const bypassRole = "1144103971116560465";
        const hasBypassRole = userRoles.has(bypassRole);

        if (!hasBypassRole) {
          console.log(`does not have the bypass role ${interaction.user.id}`);
          return interaction.reply({
            content: `You do not have the required role to use this command.`,
            ephemeral: true,
          });
        } else {
          console.log(
            `using the force transfer and hasBypassRole: ${hasBypassRole}`
          );
          const userId = interaction.user.id;
          const now = Date.now();

          //10 seconds of cooldown
          const cooldownAmount = 20 * 1000;
          if (!cooldowns.has(userId)) {
            cooldowns.set(userId, now);
          } else {
            const expirationTime = cooldowns.get(userId) + cooldownAmount;

            if (now < expirationTime) {
              const timeLeft = (expirationTime - now) / 1000;
              return interaction.reply({
                content: `Please wait ${timeLeft.toFixed(
                  1
                )} more second(s) before reusing the command.`,
                ephemeral: true,
              });
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
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
async function checkBalance() {
  const ADDRESS = "5D5L2sbWNMGPzTrR58GbWuiV8gVkhHqR7815zmyqPynWVP7J";
  try {
    let api = await getApiInstance();
    console.log(api.isConnected);
    const { data: balance } = await api.query.system.account(ADDRESS);
    console.log(`Balance of ${ADDRESS} is ${balance.free}`);
    let val = toUnit(balance.free);
    console.log(val);
    if (val > 100) {
      console.log("Balance is greater than 100");
    } else {
      console.log("Balance is less than 100");
      // disconnectApi(api);
    }
    // api.disconnect();
  } catch (err) {
    console.log("error fetching balance", err);
  }
}

function toUnit(balance) {
  let decimals = 18;
  let base = new BN(10).pow(new BN(decimals));
  let dm = new BN(balance).divmod(base);
  return parseFloat(dm.div.toString() + "." + dm.mod.toString());
}
