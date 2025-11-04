use anchor_lang::prelude::*;

declare_id!("TODO_REPLACE_WITH_PROGRAM_ID");

pub const MAX_METADATA_URI_LEN: usize = 200;

#[program]
pub mod battle_core {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, params: InitializePlatformParams) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.bump = ctx.bumps.platform;
        platform.next_pet_id = 0;
        platform.next_battle_id = 0;
        platform.payout_vault = params.payout_vault;
        emit!(PlatformInitialized {
            authority: platform.authority,
            payout_vault: params.payout_vault,
        });
        Ok(())
    }

    pub fn register_pet(ctx: Context<RegisterPet>, params: RegisterPetParams) -> Result<()> {
        require!(
            params.metadata_uri.len() <= MAX_METADATA_URI_LEN,
            BattleError::MetadataUriTooLong
        );
        params.stats.validate()?;
        let now = Clock::get()?.unix_timestamp;
        let platform = &mut ctx.accounts.platform;
        let pet = &mut ctx.accounts.pet;
        pet.owner = ctx.accounts.owner.key();
        pet.platform = platform.key();
        pet.pet_id = platform.next_pet_id;
        pet.bump = ctx.bumps.pet;
        pet.stats = params.stats;
        pet.metadata_uri = params.metadata_uri;
        pet.created_at = now;
        pet.last_battle_id = None;
        emit!(PetRegistered {
            owner: pet.owner,
            pet: pet.key(),
            pet_id: pet.pet_id,
        });
        platform.next_pet_id = platform
            .next_pet_id
            .checked_add(1)
            .ok_or(BattleError::Overflow)?;
        Ok(())
    }

    pub fn create_battle(ctx: Context<CreateBattle>, params: CreateBattleParams) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        let host_pet = &mut ctx.accounts.host_pet;
        require_keys_eq!(
            host_pet.owner,
            ctx.accounts.host.key(),
            BattleError::PetOwnershipMismatch
        );
        require!(
            host_pet.is_available_for_battle(),
            BattleError::PetUnavailable
        );
        let battle = &mut ctx.accounts.battle;
        let battle_id = platform.next_battle_id;
        battle.platform = platform.key();
        battle.battle_id = battle_id;
        battle.bump = ctx.bumps.battle;
        battle.host = ctx.accounts.host.key();
        battle.host_pet = host_pet.key();
        battle.challenger = None;
        battle.challenger_pet = None;
        battle.status = BattleStatus::Waiting;
        battle.turn_index = 0;
        battle.host_submission = None;
        battle.challenger_submission = None;
        battle.winner = None;
        battle.created_at = Clock::get()?.unix_timestamp;
        battle.resolved_at = None;
        battle.vault_lock = params.lock_intent;
        host_pet.last_battle_id = Some(battle_id);
        host_pet.mark_committed();
        emit!(BattleCreated {
            battle: battle.key(),
            battle_id,
            host: battle.host,
            host_pet: battle.host_pet,
        });
        platform.next_battle_id = platform
            .next_battle_id
            .checked_add(1)
            .ok_or(BattleError::Overflow)?;
        // TODO(battle_core -> payout_vault integration): Lock wager via CPI into [`payout_vault`](../payout_vault/src/lib.rs) once vault flows are stabilised.
        Ok(())
    }

    pub fn join_battle(ctx: Context<JoinBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(
            battle.status == BattleStatus::Waiting,
            BattleError::BattleNotWaiting
        );
        require!(
            battle.host != ctx.accounts.challenger.key(),
            BattleError::DuplicateParticipant
        );
        let challenger_pet = &mut ctx.accounts.challenger_pet;
        require_keys_eq!(
            challenger_pet.owner,
            ctx.accounts.challenger.key(),
            BattleError::PetOwnershipMismatch
        );
        require!(
            challenger_pet.is_available_for_battle(),
            BattleError::PetUnavailable
        );
        battle.challenger = Some(ctx.accounts.challenger.key());
        battle.challenger_pet = Some(challenger_pet.key());
        battle.status = BattleStatus::Active;
        battle.turn_index = 0;
        battle.host_submission = None;
        battle.challenger_submission = None;
        challenger_pet.last_battle_id = Some(battle.battle_id);
        challenger_pet.mark_committed();
        emit!(BattleJoined {
            battle: battle.key(),
            battle_id: battle.battle_id,
            challenger: ctx.accounts.challenger.key(),
            challenger_pet: challenger_pet.key(),
        });
        Ok(())
    }

    pub fn submit_turn(ctx: Context<SubmitTurn>, params: SubmitTurnParams) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(
            battle.status == BattleStatus::Active,
            BattleError::BattleNotActive
        );
        require!(
            battle.challenger.is_some(),
            BattleError::BattleMissingChallenger
        );
        let now = ctx.accounts.clock.unix_timestamp;
        let player = ctx.accounts.player.key();
        let submission = TurnSubmission {
            move_type: params.move_type,
            submitted_by: player,
            submitted_at: now,
        };
        if player == battle.host {
            require!(
                battle.host_submission.is_none(),
                BattleError::DuplicateTurnSubmission
            );
            battle.host_submission = Some(submission);
        } else if Some(player) == battle.challenger {
            require!(
                battle.challenger_submission.is_none(),
                BattleError::DuplicateTurnSubmission
            );
            battle.challenger_submission = Some(submission);
        } else {
            return Err(BattleError::Unauthorized.into());
        }
        emit!(TurnSubmitted {
            battle: battle.key(),
            battle_id: battle.battle_id,
            submitter: player,
            round: battle.turn_index,
            move_type: params.move_type,
        });
        Ok(())
    }

    pub fn resolve_battle(ctx: Context<ResolveBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(
            battle.status == BattleStatus::Active,
            BattleError::BattleNotActive
        );
        let host_submission = battle
            .host_submission
            .ok_or(BattleError::TurnsIncomplete)?;
        let challenger_submission = battle
            .challenger_submission
            .ok_or(BattleError::TurnsIncomplete)?;
        let challenger_key = battle
            .challenger
            .ok_or(BattleError::BattleMissingChallenger)?;
        let challenger_pet_key = battle
            .challenger_pet
            .ok_or(BattleError::BattleMissingChallenger)?;
        require_keys_eq!(ctx.accounts.host_pet.key(), battle.host_pet, BattleError::PetMismatch);
        require_keys_eq!(ctx.accounts.challenger_pet.key(), challenger_pet_key, BattleError::PetMismatch);
        require!(
            ctx.accounts.challenger_pet.owner == challenger_key,
            BattleError::PetOwnershipMismatch
        );
        let host_score =
            calculate_power_score(&ctx.accounts.host_pet.stats, host_submission.move_type);
        let challenger_score = calculate_power_score(
            &ctx.accounts.challenger_pet.stats,
            challenger_submission.move_type,
        );
        let now = ctx.accounts.clock.unix_timestamp;
        battle.status = BattleStatus::Completed;
        battle.turn_index = battle.turn_index.saturating_add(1);
        battle.resolved_at = Some(now);
        battle.host_submission = None;
        battle.challenger_submission = None;
        battle.winner = match host_score.cmp(&challenger_score) {
            std::cmp::Ordering::Greater => Some(battle.host),
            std::cmp::Ordering::Less => Some(challenger_key),
            std::cmp::Ordering::Equal => None,
        };
        ctx.accounts.host_pet.clear_battle_lock();
        ctx.accounts.challenger_pet.clear_battle_lock();
        emit!(BattleResolved {
            battle: battle.key(),
            battle_id: battle.battle_id,
            winner: battle.winner,
            host_score,
            challenger_score,
        });
        // TODO(battle_core randomness): Replace deterministic scoring with on-chain VRF integration when available.
        // TODO(battle_core -> payout_vault integration): Trigger settlement CPI against [`payout_vault`](../payout_vault/src/lib.rs) when vault logic is live.
        Ok(())
    }

    pub fn force_settle(ctx: Context<ForceSettle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        if battle.status != BattleStatus::Completed {
            battle.status = BattleStatus::Completed;
            battle.resolved_at = Some(Clock::get()?.unix_timestamp);
            battle.host_submission = None;
            battle.challenger_submission = None;
            battle.winner = None;
        }
        let host_pet = &mut ctx.accounts.host_pet;
        require_keys_eq!(host_pet.key(), battle.host_pet, BattleError::PetMismatch);
        host_pet.clear_battle_lock();

        match (battle.challenger_pet, ctx.accounts.challenger_pet.as_mut()) {
            (Some(expected_key), Some(challenger_pet)) => {
                require_keys_eq!(challenger_pet.key(), expected_key, BattleError::PetMismatch);
                let challenger_owner = battle
                    .challenger
                    .ok_or(BattleError::BattleMissingChallenger)?;
                require_keys_eq!(
                    challenger_pet.owner,
                    challenger_owner,
                    BattleError::PetOwnershipMismatch
                );
                challenger_pet.clear_battle_lock();
            }
            (Some(_), None) => return Err(BattleError::PetMismatch.into()),
            (None, Some(_)) => return Err(BattleError::PetMismatch.into()),
            (None, None) => {}
        }
        emit!(BattleForceSettled {
            battle: battle.key(),
            authority: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializePlatformParams {
    pub payout_vault: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegisterPetParams {
    pub stats: PetStats,
    pub metadata_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateBattleParams {
    pub lock_intent: Option<PayoutLockContext>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct SubmitTurnParams {
    pub move_type: PetMove,
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [PlatformState::SEED],
        bump,
        space = PlatformState::space()
    )]
    pub platform: Account<'info, PlatformState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterPet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        init,
        payer = owner,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &platform.next_pet_id.to_le_bytes()
        ],
        bump,
        space = PetState::space()
    )]
    pub pet: Account<'info, PetState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBattle<'info> {
    #[account(mut)]
    pub host: Signer<'info>,
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &host_pet.pet_id.to_le_bytes()
        ],
        bump = host_pet.bump
    )]
    pub host_pet: Account<'info, PetState>,
    #[account(
        init,
        payer = host,
        seeds = [
            BattleState::SEED,
            platform.key().as_ref(),
            &platform.next_battle_id.to_le_bytes()
        ],
        bump,
        space = BattleState::space()
    )]
    pub battle: Account<'info, BattleState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinBattle<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [
            BattleState::SEED,
            platform.key().as_ref(),
            &battle.battle_id.to_le_bytes()
        ],
        bump = battle.bump
    )]
    pub battle: Account<'info, BattleState>,
    #[account(
        mut,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &challenger_pet.pet_id.to_le_bytes()
        ],
        bump = challenger_pet.bump
    )]
    pub challenger_pet: Account<'info, PetState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitTurn<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [
            BattleState::SEED,
            platform.key().as_ref(),
            &battle.battle_id.to_le_bytes()
        ],
        bump = battle.bump
    )]
    pub battle: Account<'info, BattleState>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct ResolveBattle<'info> {
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [
            BattleState::SEED,
            platform.key().as_ref(),
            &battle.battle_id.to_le_bytes()
        ],
        bump = battle.bump
    )]
    pub battle: Account<'info, BattleState>,
    #[account(
        mut,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &host_pet.pet_id.to_le_bytes()
        ],
        bump = host_pet.bump
    )]
    pub host_pet: Account<'info, PetState>,
    #[account(
        mut,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &challenger_pet.pet_id.to_le_bytes()
        ],
        bump = challenger_pet.bump
    )]
    pub challenger_pet: Account<'info, PetState>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct ForceSettle<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform.bump,
        has_one = authority @ BattleError::Unauthorized
    )]
    pub platform: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [
            BattleState::SEED,
            platform.key().as_ref(),
            &battle.battle_id.to_le_bytes()
        ],
        bump = battle.bump
    )]
    pub battle: Account<'info, BattleState>,
    #[account(
        mut,
        seeds = [
            PetState::SEED,
            platform.key().as_ref(),
            &host_pet.pet_id.to_le_bytes()
        ],
        bump = host_pet.bump,
        constraint = host_pet.owner == battle.host @ BattleError::PetOwnershipMismatch
    )]
    pub host_pet: Account<'info, PetState>,
    /// Optional challenger pet account; only required if the challenger joined.
    #[account(mut)]
    pub challenger_pet: Option<Account<'info, PetState>>,
}

#[account]
pub struct PlatformState {
    pub authority: Pubkey,
    pub bump: u8,
    pub next_pet_id: u64,
    pub next_battle_id: u64,
    pub payout_vault: Option<Pubkey>,
}

impl PlatformState {
    pub const SEED: &'static [u8] = b"platform";

    pub fn space() -> usize {
        8 + 32 + 1 + 8 + 8 + 1 + 32
    }
}

#[account]
pub struct PetState {
    pub owner: Pubkey,
    pub platform: Pubkey,
    pub pet_id: u64,
    pub bump: u8,
    pub stats: PetStats,
    pub metadata_uri: String,
    pub created_at: i64,
    pub last_battle_id: Option<u64>,
    pub committed: bool,
}

impl PetState {
    pub const SEED: &'static [u8] = b"pet";

    pub fn space() -> usize {
        8 + 32 + 32 + 8 + 1 + PetStats::space() + 4 + MAX_METADATA_URI_LEN + 8 + 1 + 8 + 1
    }

    pub fn is_available_for_battle(&self) -> bool {
        !self.committed
    }

    pub fn mark_committed(&mut self) {
        self.committed = true;
    }

    pub fn clear_battle_lock(&mut self) {
        self.committed = false;
        self.last_battle_id = None;
    }
}

#[account]
pub struct BattleState {
    pub platform: Pubkey,
    pub battle_id: u64,
    pub bump: u8,
    pub host: Pubkey,
    pub host_pet: Pubkey,
    pub challenger: Option<Pubkey>,
    pub challenger_pet: Option<Pubkey>,
    pub status: BattleStatus,
    pub turn_index: u8,
    pub host_submission: Option<TurnSubmission>,
    pub challenger_submission: Option<TurnSubmission>,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub vault_lock: Option<PayoutLockContext>,
}

impl BattleState {
    pub const SEED: &'static [u8] = b"battle";

    pub fn space() -> usize {
        8
            + 32
            + 8
            + 1
            + 32
            + 32
            + (1 + 32)
            + (1 + 32)
            + 1
            + 1
            + (1 + TurnSubmission::space())
            + (1 + TurnSubmission::space())
            + (1 + 32)
            + 8
            + (1 + 8)
            + (1 + PayoutLockContext::space())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum BattleStatus {
    Waiting,
    Active,
    Completed,
}

impl Default for BattleStatus {
    fn default() -> Self {
        Self::Waiting
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PetMove {
    Strike,
    Guard,
    Blitz,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct TurnSubmission {
    pub move_type: PetMove,
    pub submitted_by: Pubkey,
    pub submitted_at: i64,
}

impl TurnSubmission {
    pub const fn space() -> usize {
        1 + 32 + 8
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct PayoutLockContext {
    pub vault_program: Pubkey,
    pub vault_account: Pubkey,
    pub locked_amount: u64,
}

impl PayoutLockContext {
    pub const fn space() -> usize {
        32 + 32 + 8
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct PetStats {
    pub health: u16,
    pub attack: u16,
    pub defense: u16,
    pub speed: u16,
}

impl PetStats {
    pub const fn space() -> usize {
        2 + 2 + 2 + 2
    }

    pub fn validate(&self) -> Result<()> {
        require!(self.health > 0, BattleError::InvalidStats);
        require!(self.attack > 0, BattleError::InvalidStats);
        require!(self.defense > 0, BattleError::InvalidStats);
        require!(self.speed > 0, BattleError::InvalidStats);
        Ok(())
    }
}

pub fn calculate_power_score(stats: &PetStats, move_type: PetMove) -> u64 {
    let base = stats.attack as u64 + stats.defense as u64 + stats.speed as u64;
    let bonus = match move_type {
        PetMove::Strike => (stats.attack as u64).saturating_mul(2),
        PetMove::Guard => (stats.defense as u64).saturating_mul(2),
        PetMove::Blitz => (stats.speed as u64).saturating_mul(2),
    };
    base + bonus + (stats.health as u64)
}

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub payout_vault: Option<Pubkey>,
}

#[event]
pub struct PetRegistered {
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub pet_id: u64,
}

#[event]
pub struct BattleCreated {
    pub battle: Pubkey,
    pub battle_id: u64,
    pub host: Pubkey,
    pub host_pet: Pubkey,
}

#[event]
pub struct BattleJoined {
    pub battle: Pubkey,
    pub battle_id: u64,
    pub challenger: Pubkey,
    pub challenger_pet: Pubkey,
}

#[event]
pub struct TurnSubmitted {
    pub battle: Pubkey,
    pub battle_id: u64,
    pub submitter: Pubkey,
    pub round: u8,
    pub move_type: PetMove,
}

#[event]
pub struct BattleResolved {
    pub battle: Pubkey,
    pub battle_id: u64,
    pub winner: Option<Pubkey>,
    pub host_score: u64,
    pub challenger_score: u64,
}

#[event]
pub struct BattleForceSettled {
    pub battle: Pubkey,
    pub authority: Pubkey,
}

#[error_code]
pub enum BattleError {
    #[msg("Provided metadata URI exceeds the maximum allowed length")]
    MetadataUriTooLong,
    #[msg("Provided pet statistics are invalid")]
    InvalidStats,
    #[msg("Arithmetic overflow detected")]
    Overflow,
    #[msg("Signer is not authorised for this action")]
    Unauthorized,
    #[msg("Pet is not owned by the signer")]
    PetOwnershipMismatch,
    #[msg("Pet is currently locked in another battle")]
    PetUnavailable,
    #[msg("Battle is not accepting challengers")]
    BattleNotWaiting,
    #[msg("Battle already contains this participant")]
    DuplicateParticipant,
    #[msg("Battle is not active")]
    BattleNotActive,
    #[msg("Battle is missing challenger data")]
    BattleMissingChallenger,
    #[msg("Turn already submitted for this round")]
    DuplicateTurnSubmission,
    #[msg("All turns must be submitted before resolution")]
    TurnsIncomplete,
    #[msg("Pet account does not match the battle record")]
    PetMismatch,
}