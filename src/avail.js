import 'dotenv/config';
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
  static Multiplier = 1_000_000_000_000_000_000n;

  /**
   * API Wrapper for Polkadot.js Api
   *
   * This constructor is private. New instances should be created via
   * the create static method so that we can perform async init
   * 
   * @private
   */
  constructor(api, { keyType = 'sr25519', defaultSenderSecret } = {}) {
    this.api = api;
    this.keyring = new Keyring({ type: keyType });
    if (defaultSenderSecret) {
      this.defaultSender = this.keyFromUri(defaultSenderSecret)
    }
  }

  /**
   * Create a new AvailApi instance.
   *
   * This method is async.
   * Any additional options given will be passed through to Polkadot.js Api.
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.provider] -  WS URL endpoint. Defaults to WS_PROVIDER env var
   * @param {Object} [options.rpc] - RPC Description. Defaults to Avail values.
   * @param {Object} [options.types] - Type Descriptions. Defaults to Avail values.
   * @param {Object} [options.signedExtensions] - Signed Extension Description. Defaults to Avail values.
   * @param {string} [options.keyType] - Key type to use for built-in keychain. Defaults to sr25519.
   * @param {*} [options.defaultSenderSecret] - Key data to initialize sender key. Defaults to SENDER_SECRET env var. If available, transfers will default to using this key as the sender account.
   * @returns Promise that resolves to AvailApi instance
   */
  static async create(options = {}) {
    // Extract known non-api options and save for later
    let { keyType = 'sr25519',
          defaultSenderSecret = process.env.SENDER_SECRET, ...apiOptions } = options;

    // Set defaults for ApiPromise.create options
    const { provider = process.env.WS_PROVIDER,
            rpc = AvailApi.Rpc,
            types = AvailApi.Types,
            signedExtensions = AvailApi.SignedExtensions, ...otherOpts } = apiOptions;

    // create api async
    // TODO: pass through other opts?
    const api = await ApiPromise.create({
      provider: new WsProvider(provider), rpc, types, signedExtensions });

    // create and return new AvailApi instance
    return new AvailApi(api, { keyType, defaultSenderSecret });
  }

  keyFromUri(data) {
    // TODO: add address check to prevent malformed addresses from being added
    return this.keyring.addFromUri(data);
  }

  async transfer({ sender = this.defaultSender, dest, amount, onResult }) {
    const nonce = await this.api.rpc.system.accountNextIndex(sender.address);
    const options = { app_id: 0, nonce };
    const amountInAVL = BigInt(amount) * AvailApi.Multiplier;
    const transfer = this.api.tx.balances.transfer(dest, amountInAVL);
    if (onResult) {
      return await transfer.signAndSend(sender, options, onResult)
    } else {
      return await transfer.signAndSend(sender, options)
    }
  }
}
