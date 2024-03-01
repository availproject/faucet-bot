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

export const getApiInstance = async () => {
  if (apiInstance) {
    console.log("Using existing API instance");
    if (apiInstance.isConnected) {
      console.log("API instance is connected");
      return apiInstance;
    } else {
      console.log("API instance is not connected");
      apiInstance = await initialize(process.env.WS_URL);
      return apiInstance;
    }
  } else {
    console.log("Initializing new API instance");
    apiInstance = await initialize(process.env.WS_URL);
    return apiInstance;
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

export const transferAccount = async (to, amount, mnemonic) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isValidAddress(to)) {
        throw new Error("Invalid address");
      }
      let api = await createApiInstance();
      const decimals = getDecimals(api);
      const value = formatNumberToBalance(amount, decimals);
      const options = { app_id: 0, nonce: -1 };
      const keyring = getKeyringFromSeed(mnemonic);
      let from_Add = keyring.address;
      const { data: balance } = await api.query.system.account(from_Add);
      let free_bal = toUnit(balance.free);
      logger.info(`Balance of ${from_Add} is ${free_bal}`);
      if (free_bal < 5000) {
        logger.info(`balance is low ${free_bal}`);
        sendAlert(`Balance is getting low ${free_bal}`);
      }
      const transfer = api.tx.balances.transfer(to, value);
      let blockHash = null;
      const hash = await transfer.signAndSend(
        keyring,
        options,
        async ({ status, txHash }) => {
          logger.info(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            blockHash = status.asFinalized;
            logger.info(`transferred ${amount} AVL to ${to}`);
            logger.info(`Transaction hash ${txHash.toHex()}`);
            logger.info(
              `Transaction included at blockHash ${status.asFinalized}`
            );

            await disApi(api);
            resolve(blockHash); // Resolve the promise with the block hash
          }
        }
      );
    } catch (e) {
      logger.error(`error transferring tokens ${e}`);
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
      logger.error(`Error in sending slack alert: ${error}`);
    });
}
