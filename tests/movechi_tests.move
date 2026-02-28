module movechi_tests::movechi_tests {
    use movechi::main;
    use std::signer;

    #[test(framework = @0x1, admin = @movechi)]
    public entry fun season_lifecycle(framework: &signer, admin: &signer) {
        main::test_init(framework, admin);
        main::start_season(admin, 1);
        main::draw_seasonal_winner(admin, 0);
        main::finalize_season(admin);

        let (started, window, season_id) = main::test_get_state_flags();
        assert!(!started, 10001);
        assert!(!window, 10002);
        assert!(season_id == 2, 10003);
    }

    #[test(framework = @0x1, admin = @movechi, user = @0x2)]
    public entry fun daily_xp_accrues_with_stake(framework: &signer, admin: &signer, user: &signer) {
        main::test_init(framework, admin);
        main::test_force_season_active(1_000);
        main::test_seed_profile_with_stake(user, 2, 0);

        main::claim_daily_xp(user);
        let (_, _, _, xp, staked_len) = main::get_user_status(signer::address_of(user));
        assert!(staked_len == 2, 10010);
        assert!(xp == 10, 10011); // 2 NFTs * 5 XP each
    }

    #[test(framework = @0x1, admin = @movechi, user = @0x2)]
    #[expected_failure(abort_code = 402)]
    public entry fun claim_requires_funded_reward_vault(framework: &signer, admin: &signer, user: &signer) {
        main::test_init(framework, admin);
        main::test_open_claim_window(10);
        main::test_set_totals(user, 100, 100);

        // Should abort because reward vault is empty (E_REWARD_VAULT_EMPTY = 402)
        main::claim_season_rewards(user);
    }
}
