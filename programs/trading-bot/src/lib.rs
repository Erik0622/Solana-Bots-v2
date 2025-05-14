use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use solana_program::program::invoke;
use solana_program::system_instruction;

declare_id!("YOUR_PROGRAM_ID");

#[program]
pub mod trading_bot {
    use super::*;

    pub fn initialize_bot(
        ctx: Context<InitializeBot>,
        risk_percentage: u8,
        strategy_type: u8,
    ) -> Result<()> {
        let bot = &mut ctx.accounts.bot;
        bot.owner = ctx.accounts.owner.key();
        bot.risk_percentage = risk_percentage;
        bot.strategy_type = strategy_type;
        bot.is_active = false;
        bot.total_trades = 0;
        bot.successful_trades = 0;
        bot.total_profit = 0;
        Ok(())
    }

    pub fn activate_bot(ctx: Context<ActivateBot>) -> Result<()> {
        let bot = &mut ctx.accounts.bot;
        require!(!bot.is_active, BotError::AlreadyActive);
        bot.is_active = true;
        Ok(())
    }

    pub fn deactivate_bot(ctx: Context<DeactivateBot>) -> Result<()> {
        let bot = &mut ctx.accounts.bot;
        require!(bot.is_active, BotError::NotActive);
        bot.is_active = false;
        Ok(())
    }

    pub fn execute_trade(
        ctx: Context<ExecuteTrade>,
        amount: u64,
        is_buy: bool,
    ) -> Result<()> {
        let bot = &mut ctx.accounts.bot;
        require!(bot.is_active, BotError::NotActive);

        // Berechne das Handelsvolumen basierend auf dem Risikoprozentsatz
        let trade_amount = (amount as f64 * (bot.risk_percentage as f64 / 100.0)) as u64;

        // Führe den Trade aus
        if is_buy {
            // Transfer von SOL zum Market
            invoke(
                &system_instruction::transfer(
                    &ctx.accounts.owner.key(),
                    &ctx.accounts.market.key(),
                    trade_amount,
                ),
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.market.to_account_info(),
                ],
            )?;
        } else {
            // Verkaufs-Logik hier
            // ...
        }

        // Aktualisiere Bot-Statistiken
        bot.total_trades += 1;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeBot<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 1 + 1 + 1 + 8 + 8 + 8
    )]
    pub bot: Account<'info, Bot>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ActivateBot<'info> {
    #[account(
        mut,
        has_one = owner,
    )]
    pub bot: Account<'info, Bot>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateBot<'info> {
    #[account(
        mut,
        has_one = owner,
    )]
    pub bot: Account<'info, Bot>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    #[account(
        mut,
        has_one = owner,
    )]
    pub bot: Account<'info, Bot>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: Market account wird extern validiert
    #[account(mut)]
    pub market: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Bot {
    pub owner: Pubkey,
    pub risk_percentage: u8,
    pub strategy_type: u8,
    pub is_active: bool,
    pub total_trades: u64,
    pub successful_trades: u64,
    pub total_profit: i64,
}

#[error_code]
pub enum BotError {
    #[msg("Bot ist bereits aktiv")]
    AlreadyActive,
    #[msg("Bot ist nicht aktiv")]
    NotActive,
} 