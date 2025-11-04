// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { BattleCore } from "../target/types/battle_core";

const PLATFORM_SEED = Buffer.from("platform");
const PET_SEED = Buffer.from("pet");
const BATTLE_SEED = Buffer.from("battle");

describe("battle_core program", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.BattleCore as Program<BattleCore>;
  const host = provider.wallet.publicKey;

  const derivePetPda = (platform: PublicKey, id: number) =>
    PublicKey.findProgramAddressSync(
      [PET_SEED, platform.toBuffer(), new anchor.BN(id).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

  const deriveBattlePda = (platform: PublicKey, id: number) =>
    PublicKey.findProgramAddressSync(
      [BATTLE_SEED, platform.toBuffer(), new anchor.BN(id).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

  it("initializes platform, registers pets, runs a deterministic battle resolution", async () => {
    const [platformPda] = PublicKey.findProgramAddressSync([PLATFORM_SEED], program.programId);

    await program.methods
      .initializePlatform({ payoutVault: null })
      .accounts({
        authority: host,
        platform: platformPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const platformAccount = await program.account.platformState.fetch(platformPda);
    expect(platformAccount.authority.toBase58()).to.equal(host.toBase58());
    expect(platformAccount.nextPetId.toNumber()).to.equal(0);
    expect(platformAccount.nextBattleId.toNumber()).to.equal(0);

    const hostPetStats = {
      health: 12,
      attack: 8,
      defense: 5,
      speed: 4,
    };

    const [hostPetPda] = derivePetPda(platformPda, 0);
    await program.methods
      .registerPet({
        stats: hostPetStats,
        metadataUri: "https://example.com/pets/host.json",
      })
      .accounts({
        owner: host,
        platform: platformPda,
        pet: hostPetPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const challenger = Keypair.generate();
    const airdropSignature = await provider.connection.requestAirdrop(challenger.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSignature, "confirmed");

    const challengerPetStats = {
      health: 10,
      attack: 5,
      defense: 6,
      speed: 3,
    };
    const [challengerPetPda] = derivePetPda(platformPda, 1);
    await program.methods
      .registerPet({
        stats: challengerPetStats,
        metadataUri: "https://example.com/pets/challenger.json",
      })
      .accounts({
        owner: challenger.publicKey,
        platform: platformPda,
        pet: challengerPetPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([challenger])
      .rpc();

    const [battlePda] = deriveBattlePda(platformPda, 0);
    await program.methods
      .createBattle({ lockIntent: null })
      .accounts({
        host,
        platform: platformPda,
        hostPet: hostPetPda,
        battle: battlePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .joinBattle()
      .accounts({
        challenger: challenger.publicKey,
        platform: platformPda,
        battle: battlePda,
        challengerPet: challengerPetPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([challenger])
      .rpc();

    await program.methods
      .submitTurn({ moveType: { strike: {} } })
      .accounts({
        player: host,
        platform: platformPda,
        battle: battlePda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    await program.methods
      .submitTurn({ moveType: { guard: {} } })
      .accounts({
        player: challenger.publicKey,
        platform: platformPda,
        battle: battlePda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([challenger])
      .rpc();

    await program.methods
      .resolveBattle()
      .accounts({
        platform: platformPda,
        battle: battlePda,
        hostPet: hostPetPda,
        challengerPet: challengerPetPda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const battleAccount = await program.account.battleState.fetch(battlePda);
    expect("completed" in battleAccount.status).to.be.true;
    expect(battleAccount.winner?.toBase58()).to.equal(host.toBase58());
    expect(battleAccount.resolvedAt).to.not.be.null;

    const hostPetAccount = await program.account.petState.fetch(hostPetPda);
    const challengerPetAccount = await program.account.petState.fetch(challengerPetPda);
    expect(hostPetAccount.committed).to.be.false;
    expect(challengerPetAccount.committed).to.be.false;

    // TODO(battle_core tests): verify future payout vault CPI hooks and randomness integrations once implemented.
  });
});