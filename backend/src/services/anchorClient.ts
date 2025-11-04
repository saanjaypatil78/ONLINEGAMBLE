import { AnchorProvider, Program, setProvider, Wallet, Idl } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import battleCoreIdlJson from "../idl/battle_core.json";
import payoutVaultIdlJson from "../idl/payout_vault.json";
import { config } from "../config";
import { logger } from "../lib/logger";

type BattleCoreIdl = Idl & typeof battleCoreIdlJson;
type PayoutVaultIdl = Idl & typeof payoutVaultIdlJson;

const battleCoreIdl = battleCoreIdlJson as unknown as BattleCoreIdl;
const payoutVaultIdl = payoutVaultIdlJson as unknown as PayoutVaultIdl;

let cachedProvider: AnchorProvider | null = null;
let cachedBattleCore: Program<BattleCoreIdl> | null = null;
let cachedPayoutVault: Program<PayoutVaultIdl> | null = null;

// TODO: Replace ephemeral wallet with secure key management using configured keypair file.
const createEphemeralWallet = (): Wallet => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey,
    payer: keypair,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };
};

export const getProvider = (): AnchorProvider => {
  if (cachedProvider) {
    return cachedProvider;
  }

  const connection = new Connection(config.ANCHOR_PROVIDER_URL, "confirmed");
  const wallet = createEphemeralWallet();
  cachedProvider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  setProvider(cachedProvider);
  logger.debug({ url: config.ANCHOR_PROVIDER_URL }, "Initialized Anchor provider");

  return cachedProvider;
};

export const getBattleCoreProgram = (): Program<BattleCoreIdl> => {
  if (cachedBattleCore) {
    return cachedBattleCore;
  }

  const provider = getProvider();
  const programId = new PublicKey(config.ANCHOR_BATTLE_CORE_PROGRAM_ID);
  cachedBattleCore = new Program(battleCoreIdl, programId, provider);
  logger.debug({ programId: programId.toBase58() }, "Loaded battle_core program");

  return cachedBattleCore;
};

export const getPayoutVaultProgram = (): Program<PayoutVaultIdl> => {
  if (cachedPayoutVault) {
    return cachedPayoutVault;
  }

  const provider = getProvider();
  const programId = new PublicKey(config.ANCHOR_PAYOUT_VAULT_PROGRAM_ID);
  cachedPayoutVault = new Program(payoutVaultIdl, programId, provider);
  logger.debug({ programId: programId.toBase58() }, "Loaded payout_vault program");

  return cachedPayoutVault;
};

// TODO: Expose authenticated provider construction that leverages custody services for production writes.
