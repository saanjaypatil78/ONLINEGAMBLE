use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("PytVlt1111111111111111111111111111111111111111");

#[program]
pub mod payout_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, params: InitializeVaultParams) -> Result<()> {
        let vault = &mut ctx.accounts.vault_state;
        vault.authority = ctx.accounts.authority.key();
        vault.bump = ctx.bumps.vault_state;
        vault.paused = false;
        vault.total_deposited = 0;
        vault.total_locked = 0;
        vault.total_settled = 0;
        vault.matka_token_mint = params.matka_token_mint;
        emit!(VaultInitialized {
            vault: vault.key(),
            authority: vault.authority,
        });
        // TODO(payout_vault MATKA): Wire up SPL MATKA token mint tracking once tokenomics settle.
        Ok(())
    }

    pub fn deposit_treasury(ctx: Context<DepositTreasury>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        let vault = &mut ctx.accounts.vault_state;
        let from = ctx.accounts.treasury_funder.to_account_info();
        let to = ctx.accounts.vault_state.to_account_info();
        let cpi_accounts = system_program::Transfer { from: from.clone(), to: to.clone() };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
        system_program::transfer(cpi_ctx, amount)?;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        emit!(TreasuryDeposited {
            vault: vault.key(),
            funder: ctx.accounts.treasury_funder.key(),
            amount,
        });
        Ok(())
    }

    pub fn lock_wager(ctx: Context<LockWager>, params: LockWagerParams) -> Result<()> {
        require!(!ctx.accounts.vault_state.paused, VaultError::VaultPaused);
        require!(params.amount > 0, VaultError::InvalidAmount);
        let vault = &mut ctx.accounts.vault_state;
        let available = vault.available_funds(ctx.accounts.vault_state.to_account_info())?;
        require!(available >= params.amount, VaultError::InsufficientVaultBalance);

        let wager = &mut ctx.accounts.wager_state;
        wager.vault = vault.key();
        wager.battle = ctx.accounts.battle.key();
        wager.bump = ctx.bumps.wager_state;
        wager.locked_amount = params.amount;
        wager.recipient_primary = params.primary_recipient;
        wager.recipient_secondary = params.secondary_recipient;
        wager.locked_at = Clock::get()?.unix_timestamp;
        wager.settled_at = None;
        wager.settled = false;

        vault.total_locked = vault
            .total_locked
            .checked_add(params.amount)
            .ok_or(VaultError::Overflow)?;

        emit!(WagerLocked {
            vault: vault.key(),
            battle: wager.battle,
            amount: params.amount,
            primary_recipient: params.primary_recipient,
            secondary_recipient: params.secondary_recipient,
        });

        Ok(())
    }

    pub fn settle_payout(ctx: Context<SettlePayout>, params: SettlePayoutParams) -> Result<()> {
        require!(!ctx.accounts.vault_state.paused, VaultError::VaultPaused);
        let authority_key = ctx.accounts.authority.key();
        require_keys_eq!(authority_key, ctx.accounts.vault_state.authority, VaultError::Unauthorized);

        let vault = &mut ctx.accounts.vault_state;
        let wager = &mut ctx.accounts.wager_state;
        require!(!wager.settled, VaultError::WagerAlreadySettled);

        let secondary_amount = params.secondary_amount.unwrap_or(0);
        let total_payout = params
            .primary_amount
            .checked_add(secondary_amount)
            .ok_or(VaultError::Overflow)?;
        require!(total_payout <= wager.locked_amount, VaultError::SettlementExceedsLock);

        let vault_ai = ctx.accounts.vault_state.to_account_info();
        let seeds = &[VaultState::SEED, &[vault.bump]];
        let signer_seeds = &[&seeds[..]];

        // Primary payout
        require_keys_eq!(
            ctx.accounts.primary_recipient.key(),
            wager.recipient_primary,
            VaultError::InvalidRecipient
        );
        if params.primary_amount > 0 {
            let cpi_accounts = system_program::Transfer {
                from: vault_ai.clone(),
                to: ctx.accounts.primary_recipient.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );
            system_program::transfer(cpi_ctx, params.primary_amount)?;
        }

        // Secondary payout (optional)
        if let Some(recipient) = ctx.accounts.secondary_recipient.as_ref() {
            let stored_secondary = wager
                .recipient_secondary
                .ok_or(VaultError::InvalidRecipient)?;
            require_keys_eq!(recipient.key(), stored_secondary, VaultError::InvalidRecipient);
            if secondary_amount > 0 {
                let cpi_accounts = system_program::Transfer {
                    from: vault_ai.clone(),
                    to: recipient.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                );
                system_program::transfer(cpi_ctx, secondary_amount)?;
            }
        } else {
            require!(wager.recipient_secondary.is_none(), VaultError::InvalidRecipient);
            require!(secondary_amount == 0, VaultError::SettlementSecondaryMismatch);
        }

        wager.settled = true;
        wager.settled_at = Some(Clock::get()?.unix_timestamp);

        vault.total_locked = vault
            .total_locked
            .checked_sub(wager.locked_amount)
            .ok_or(VaultError::Overflow)?;
        vault.total_settled = vault
            .total_settled
            .checked_add(total_payout)
            .ok_or(VaultError::Overflow)?;

        emit!(PayoutSettled {
            vault: vault.key(),
            battle: wager.battle,
            primary_amount: params.primary_amount,
            secondary_amount,
        });

        Ok(())
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        let vault = &mut ctx.accounts.vault_state;
        require_keys_eq!(ctx.accounts.authority.key(), vault.authority, VaultError::Unauthorized);

        let available = vault.available_funds(ctx.accounts.vault_state.to_account_info())?;
        require!(amount <= available, VaultError::InsufficientVaultBalance);

        let vault_ai = ctx.accounts.vault_state.to_account_info();
        let seeds = &[VaultState::SEED, &[vault.bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = system_program::Transfer {
            from: vault_ai.clone(),
            to: ctx.accounts.destination.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, amount)?;

        emit!(EmergencyWithdrawal {
            vault: vault.key(),
            authority: ctx.accounts.authority.key(),
            amount,
        });

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeVaultParams {
    pub matka_token_mint: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LockWagerParams {
    pub amount: u64,
    pub primary_recipient: Pubkey,
    pub secondary_recipient: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SettlePayoutParams {
    pub primary_amount: u64,
    pub secondary_amount: Option<u64>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [VaultState::SEED],
        bump,
        space = VaultState::space()
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositTreasury<'info> {
    #[account(mut)]
    pub treasury_funder: Signer<'info>,
    #[account(
        mut,
        seeds = [VaultState::SEED],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockWager<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [VaultState::SEED],
        bump = vault_state.bump,
        constraint = vault_state.authority == authority.key() @ VaultError::Unauthorized
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(
        init,
        payer = authority,
        seeds = [
            WagerState::SEED,
            vault_state.key().as_ref(),
            battle.key().as_ref()
        ],
        bump,
        space = WagerState::space()
    )]
    pub wager_state: Account<'info, WagerState>,
    /// CHECK: Battle account is stored for reference and PDA seeding; verification occurs off-chain.
    pub battle: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePayout<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [VaultState::SEED],
        bump = vault_state.bump,
        constraint = vault_state.authority == authority.key() @ VaultError::Unauthorized
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(
        mut,
        seeds = [
            WagerState::SEED,
            vault_state.key().as_ref(),
            wager_state.battle.as_ref()
        ],
        bump = wager_state.bump,
        close = authority
    )]
    pub wager_state: Account<'info, WagerState>,
    /// CHECK: Recipient validation occurs against stored keys before transfers.
    #[account(mut)]
    pub primary_recipient: UncheckedAccount<'info>,
    /// CHECK: Secondary recipient is optional; validated if provided.
    #[account(mut)]
    pub secondary_recipient: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [VaultState::SEED],
        bump = vault_state.bump,
        constraint = vault_state.authority == authority.key() @ VaultError::Unauthorized
    )]
    pub vault_state: Account<'info, VaultState>,
    /// CHECK: Destination can be any system account controlled by the authority.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub bump: u8,
    pub paused: bool,
    pub total_deposited: u64,
    pub total_locked: u64,
    pub total_settled: u64,
    pub matka_token_mint: Option<Pubkey>,
}

impl VaultState {
    pub const SEED: &'static [u8] = b"vault-state";

    pub fn space() -> usize {
        8 + 32 + 1 + 1 + 8 + 8 + 8 + 1 + 32
    }

    pub fn available_funds(&self, vault_account: AccountInfo<'_>) -> Result<u64> {
        let rent = Rent::get()?.minimum_balance(Self::space());
        let balance = vault_account
            .lamports()
            .saturating_sub(rent);
        Ok(balance.saturating_sub(self.total_locked))
    }
}

#[account]
pub struct WagerState {
    pub vault: Pubkey,
    pub battle: Pubkey,
    pub bump: u8,
    pub locked_amount: u64,
    pub recipient_primary: Pubkey,
    pub recipient_secondary: Option<Pubkey>,
    pub locked_at: i64,
    pub settled_at: Option<i64>,
    pub settled: bool,
}

impl WagerState {
    pub const SEED: &'static [u8] = b"wager-state";

    pub fn space() -> usize {
        8
            + 32
            + 32
            + 1
            + 8
            + 32
            + (1 + 32)
            + 8
            + (1 + 8)
            + 1
    }
}

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct TreasuryDeposited {
    pub vault: Pubkey,
    pub funder: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WagerLocked {
    pub vault: Pubkey,
    pub battle: Pubkey,
    pub amount: u64,
    pub primary_recipient: Pubkey,
    pub secondary_recipient: Option<Pubkey>,
}

#[event]
pub struct PayoutSettled {
    pub vault: Pubkey,
    pub battle: Pubkey,
    pub primary_amount: u64,
    pub secondary_amount: u64,
}

#[event]
pub struct EmergencyWithdrawal {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("The caller is not authorised to perform this action")]
    Unauthorized,
    #[msg("Provided amount must be greater than zero")]
    InvalidAmount,
    #[msg("Requested action would overflow tracked totals")]
    Overflow,
    #[msg("Vault is currently paused")]
    VaultPaused,
    #[msg("Vault does not contain sufficient available funds")]
    InsufficientVaultBalance,
    #[msg("Secondary payout parameters do not match stored recipients")]
    InvalidRecipient,
    #[msg("Wager has already been settled")]
    WagerAlreadySettled,
    #[msg("Payout exceeds locked amount for this wager")]
    SettlementExceedsLock,
    #[msg("Secondary payout amount must be zero when no secondary recipient is stored")]
    SettlementSecondaryMismatch,
}