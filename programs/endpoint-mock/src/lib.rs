pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("9YXQtsM8d89kTFVdEZQERPQbfphYtdVA4eehFX5QFfEJ");

pub const OAPP_SEED: &[u8] = b"OApp";

#[program]
pub mod endpoint {
    use super::*;

    pub fn register_oapp(mut ctx: Context<RegisterOApp>, params: RegisterOAppParams) -> Result<()> {
        RegisterOApp::apply(&mut ctx, &params)
    }
}
