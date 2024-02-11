import {
  isValidAddress,
  initialize,
  disconnect,
  getKeyringFromSeed,
  getDecimals,
  formatNumberToBalance,
} from "avail-js-sdk";
import "@polkadot/api-augment";

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

export const transferAccount = async (to, amount, mnemonic) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isValidAddress(to)) {
        throw new Error("Invalid address");
      }
      const http_url = process.env.HTTP_URL;
      let api = await createApiInstance();
      const decimals = getDecimals(api);
      const value = formatNumberToBalance(amount, decimals);
      const from = "5D5L2sbWNMGPzTrR58GbWuiV8gVkhHqR7815zmyqPynWVP7J";
      const { nonce } = await api.query.system.account(from);
      const nonce1 = (await api.rpc.system.accountNextIndex(from)).toNumber();
      console.log(nonce1);
      console.log(nonce.toNumber());
      const options = { app_id: 0, nonce: -1 };
      const keyring = getKeyringFromSeed(mnemonic);
      const transfer = api.tx.balances.transfer(to, value);
      let blockHash = null;
      const hash = await transfer.signAndSend(
        keyring,
        options,
        async ({ status, txHash }) => {
          console.log(`Transaction status: ${status.type}`);
          if (status.isFinalized) {
            blockHash = status.asFinalized;
            console.log(`transferred ${value} AVL to ${to}`);
            console.log(`Transaction hash ${txHash.toHex()}`);
            console.log(
              `Transaction included at blockHash ${status.asFinalized}`
            );

            await disApi(api);
            resolve(blockHash); // Resolve the promise with the block hash
          }
        }
      );
    } catch (e) {
      console.log(e);
      reject(e); // Reject the promise if there is an error
    }
  });
};
