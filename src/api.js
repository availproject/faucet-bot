import { isValidAddress, initialize, disconnect } from "avail-js-sdk";
import "@polkadot/api-augment";

let apiInstance = null;

export const getApiInstance = async () => {
  if (apiInstance) {
    console.log("Using existing API instance");
    return apiInstance;
  } else {
    console.log("Initializing new API instance");
    apiInstance = await initialize(process.env.WS_URL);
    return apiInstance;
  }
};

export const disconnectApi = async () => {
  if (apiInstance) {
    await disconnect();
    apiInstance = null;
    console.log("API instance disconnected");
  }
};
