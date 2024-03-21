import {
  isValidAddress,
  initialize,
  disconnect,
  getKeyringFromSeed,
  getDecimals,
  formatNumberToBalance,
} from "avail-js-sdk";
import "@polkadot/api-augment";
import BN from "bn.js";
import axios, { AxiosResponse } from "axios";
import { logger } from "./logger";
let apiInstance = null;
import { db, db5, dispence_array } from "./db.js";
import tracer from "./metrics.js";

export const getApiInstance = async () => {
  if (apiInstance) {
    console.log("Using existing API instance");
    if (apiInstance.isConnected) {
      console.log("API instance is connected");
      return apiInstance;
    } else {
      try {
        console.log("API instance is not connected");
        apiInstance = await initialize(process.env.WS_URL);
        return apiInstance;
      } catch (e) {
        logger.error(`Api connection failed ${e}`);
      }
    }
  } else {
    try {
      console.log("Initializing new API instance");
      apiInstance = await initialize(process.env.WS_URL);
      return apiInstance;
    } catch (e) {
      logger.error(`Api connection failed ${e}`);
    }
  }
};

export const createApiInstance = async () => {
  console.log("creating new API instance");
  let api = await initialize(process.env.WS_URL);
  return api;
};

export const disApi = async (api) => {
  if (api.isConnected) {
    console.log("Disconnecting new API instance");
    await api.disconnect();
  }
};

export const disconnectApi = async () => {
  if (apiInstance) {
    await disconnect();
    apiInstance = null;
    console.log("API instance disconnected");
  }
};

function toUnit(balance) {
  let decimals = 18;
  let base = new BN(10).pow(new BN(decimals));
  let dm = new BN(balance).divmod(base);
  return parseFloat(dm.div.toString() + "." + dm.mod.toString());
}

export const transferAccount = async (userId, to, mnemonic) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isValidAddress(to)) {
        throw new Error("Invalid address");
      }
      let api = await createApiInstance();
      const decimals = getDecimals(api);
      let dest_value = 0;
      let index = 0;
      const tokenmapInfo = await db5
        .collection("tokenInfo")
        .findOne({ userId });
      if (tokenmapInfo) {
        let { tokenIndex } = tokenmapInfo;
        if (tokenIndex > dispence_array.length - 1) {
          tokenIndex = 3;
        }
        index = tokenIndex;
        dest_value = dispence_array[tokenIndex];
      } else {
        dest_value = dispence_array[0];
      }
      const value = formatNumberToBalance(dest_value, decimals);
      const options = { app_id: 0, nonce: -1 };
      const keyring = getKeyringFromSeed(mnemonic);
      let from_Add = keyring.address;
      const { data: balance } = await api.query.system.account(from_Add);
      let free_bal = toUnit(balance.free);
      logger.info(`Balance of ${from_Add} is ${free_bal}`);
      tracer.dogstatsd.gauge("faucet.balance", Number(free_bal));
      if (free_bal < 5000) {
        logger.info(`balance is low ${free_bal}`);
        // sendAlert(`Balance is getting low ${free_bal}`);
      }
      const transfer = api.tx.balances.transfer(to, value);
      const DailydepositInfo = await db
        .collection("depositInfo")
        .findOne({ userId });
      if (DailydepositInfo) {
        let { tokens } = DailydepositInfo;
        let depositupdate = await db
          .collection("depositInfo")
          .updateOne({ userId }, { $set: { tokens: tokens + dest_value } });
        logger.info(`depositInfo Update for ${userId}`);
      }
      let tokenupdate = await db5
        .collection("tokenInfo")
        .updateOne({ userId }, { $set: { tokenIndex: index + 1 } });
      logger.info(`tokenInfo update for ${userId}`);
      const hash = await transfer.signAndSend(
        keyring,
        options,
        async ({ status, txHash }) => {
          logger.info(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            logger.info(`transferred ${dest_value} AVL to ${to}`);
            logger.info(`Transaction hash ${txHash.toHex()}`);
            logger.info(
              `Transaction included at blockHash ${status.asFinalized}`
            );
            await disApi(api);
            resolve([status.asFinalized, dest_value]); // Resolve the promise with the block hash
          }
        }
      );
    } catch (e) {
      logger.warn(`error transferring tokens ${e}`);
      reject(e); // Reject the promise if there is an error
    }
  });
};

function sendAlert(message) {
  const url = process.env.SLACK_TOKEN;
  const data = {
    text: "*Faucet Alert ⚠️❌*: " + message,
  };
  axios
    .post(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      logger.log("Response:" + JSON.stringify(response.data));
    })
    .catch((error) => {
      logger.warn(`Error in sending slack alert: ${error}`);
    });
}
