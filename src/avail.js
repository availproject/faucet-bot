import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { crypto } from '@polkadot/util-crypto';

export class AvailApi {
  static Rpc = {
    kate: {
      blockLength: {
	description: "Get Block Length",
	params: [
          {
            name: 'at',
            type: 'Hash',
            isOptional: true
          }
	],
	type: 'BlockLength'
      },
      queryProof: {
	description: 'Generate the kate proof for the given `cells`',
	params: [
          {
            name: 'cells',
            type: 'Vec<Cell>'
          },
          {
            name: 'at',
            type: 'Hash',
            isOptional: true
          },
	],
	type: 'Vec<u8>'
      },
      queryDataProof: {
	description: 'Generate the data proof for the given `index`',
	params: [
          {
            name: 'data_index',
            type: 'u32'
          },
          {
            name: 'at',
            type: 'Hash',
            isOptional: true
          }
	],
	type: 'DataProof'
      }
    }
  };

  static Types = {
    AppId: 'Compact<u32>',
    DataLookupIndexItem: {
      appId: 'AppId',
      start: 'Compact<u32>'
    },
    DataLookup: {
      size: 'Compact<u32>',
      index: 'Vec<DataLookupIndexItem>'
    },
    KateCommitment: {
      rows: 'Compact<u16>',
      cols: 'Compact<u16>',
      dataRoot: 'H256',
      commitment: 'Vec<u8>'
    },
    V1HeaderExtension: {
      commitment: 'KateCommitment',
      appLookup: 'DataLookup'
    },
    VTHeaderExtension: {
      newField: 'Vec<u8>',
      commitment: 'KateCommitment',
      appLookup: 'DataLookup'
    },
    HeaderExtension: {
      _enum: {
	V1: 'V1HeaderExtension',
	VTest: 'VTHeaderExtension'
      }
    },
    DaHeader: {
      parentHash: 'Hash',
      number: 'Compact<BlockNumber>',
      stateRoot: 'Hash',
      extrinsicsRoot: 'Hash',
      digest: 'Digest',
      extension: 'HeaderExtension'
    },
    Header: 'DaHeader',
    CheckAppIdExtra: {
      appId: 'AppId'
    },
    CheckAppIdTypes: {},
    CheckAppId: {
      extra: 'CheckAppIdExtra',
      types: 'CheckAppIdTypes'
    },
    BlockLength: {
      max: 'PerDispatchClass',
      cols: 'Compact<u32>',
      rows: 'Compact<u32>',
      chunkSize: 'Compact<u32>'
    },
    PerDispatchClass: {
      normal: 'u32',
      operational: 'u32',
      mandatory: 'u32'
    },
    DataProof: {
      root: 'H256',
      proof: 'Vec<H256>',
      numberOfLeaves: 'Compact<u32>',
      leaf_index: 'Compact<u32>',
      leaf: 'H256'
    },
    Cell: {
      row: 'u32',
      col: 'u32',
    }
  };

  static SignedExtensions = {
    CheckAppId: {
      extrinsic: {
	appId: 'AppId'
      },
      payload: {}
    },
  };

  static Decimals = 18;
  static Multiplier = 1000000000000000000;

  /**
   * API Wrapper for Polkadot.js Api
   *
   * This constructor is private. New instances should be created via
   * the create static method so that we can perform async init
   * 
   * @private
   */
  constructor(api, { keyType = 'sr25519', defaultSource }) {
    this.api = api;
    this.keyring = new Keyring({ type: keyType });
    if (defaultSource) {
      this.defaultSource = this.keyFromUri(defaultSource)
    }
  }

  /**
   * Create a new AvailApi instance.
   *
   * This method is async.
   * Any additional options given will be passed through to Polkadot.js Api.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.ws -  WS URL endpoint (required)
   * @param {Object} [options.rpc] - RPC Description. Defaults to Avail values.
   * @param {Object} [options.types] - Type Descriptions. Defaults to Avail values.
   * @param {Object} [options.signedExtensions] - Signed Extension Description. Defaults to Avail values.
   * @param {string} [options.keyType] - Key type to use for built-in keychain. Defaults to sr25519.
   * @param {*} [options.defaultSource] - Key data to initialize source key. If set, transfers will default to using this key as the source account.
   * @returns Promise that resolves to AvailApi instance
   */
  static async create(options) {
    console.log(`Creating AvailApi for ws endpoint: ${options.ws}`);

    // Extract known non-api options and save for later
    let { keyType, defaultSource, ...apiOptions } = options;

    // Set defaults for ApiPromise.create options
    const { ws,
	    rpc = this.Rpc,
	    types = this.Types,
	    signedExtensions = this.SignedExtensions, ...otherOpts } = apiOptions;

    // create api async
    // TODO: pass through other opts?
    const api = await ApiPromise.create({
      ws: new WsProvider(ws), rpc, types, signedExtensions });

    // create and return new AvailApi instance
    const instance = new AvailApi(api, { keyType, defaultSource });
    return instance;
  }

  keyFromUri(data) {
    // TODO: add address check to prevent malformed addresses from being added
    return this.keyring.addFromUri(data);
  }

  async transfer({ source = this.defaultSource, dest, amount, callback }) {
    const transfer = api.tx.balances.transfer(dest, amount);
    if (callback) {
      return await transfer.signAndSend(source, {}, callback)
    } else {
      return await transfer.signAndSend(source)
    }
  }
}
