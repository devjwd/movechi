module movechi::main {
    use std::signer;
    use std::vector;
    use std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::object::{Self, Object};
    use aptos_token_objects::token::Token;
    use aptos_token_objects::collection::{Collection};
    use aptos_std::table::{Self, Table};
    use std::hash;

    // ERROR CODES
    const E_NOT_ADMIN: u64 = 100;
    const E_GAME_PAUSED: u64 = 101;
    const E_SEASON_NOT_ENDED: u64 = 102;
    const E_SEASON_ALREADY_STARTED: u64 = 103;
    const E_SEASON_NOT_ACTIVE: u64 = 104;
    const E_DAILY_PAID_LIMIT: u64 = 200;
    const E_DAILY_FREE_LIMIT: u64 = 201;
    const E_NO_STAKED_NFTS: u64 = 202;
    const E_ALREADY_CLAIMED_TODAY: u64 = 203; 
    const E_NOT_OWNER: u64 = 300;
    const E_WRONG_COLLECTION: u64 = 301;
    const E_STAKE_LOCKED_24H: u64 = 302; 
    const E_NOT_STAKED: u64 = 303;
    const E_SPONSOR_BROKE: u64 = 400; 
    const E_NOTHING_TO_CLAIM: u64 = 401; 
    const E_REWARD_VAULT_EMPTY: u64 = 402; 
    const E_INVALID_VAULT: u64 = 403;
    // NEW ERROR CODES FOR LOGIC
    const E_CLAIM_WINDOW_CLOSED: u64 = 404;
    const E_CLAIM_WINDOW_ACTIVE: u64 = 405; 
    const E_WINDOW_NOT_FINISHED: u64 = 406;
    const E_BATCH_TOO_LARGE: u64 = 501;

    // CONFIG
    const SECONDS_PER_DAY: u64 = 86400;
    const XP_PER_NFT_PER_DAY: u64 = 5; 
    const MAX_UNSTAKE_BATCH: u64 = 20;

    struct AdminCap has key, store, drop {}

    struct GameConfig has store, drop, copy {
        cost_per_spin: u64,
        max_paid_spins_daily: u64,
        chance_jackpot: u64, 
        chance_ticket: u64,  
        jackpot_min: u64,
        jackpot_max: u64,
    }

    struct GameState has key {
        admin: address,
        paused: bool,
        config: GameConfig,
        whitelist_collection: address, 
        
        // --- NEW SEASON & WINDOW LOGIC ---
        season_started: bool,
        season_end_time: u64,      
        claim_window_active: bool, 
        claim_end_time: u64,       
        
        total_tickets: u64,
        total_global_xp: u128, 
        current_season_id: u64,    
        
        // --- FRONTEND DISPLAY ---
        last_season_winner: address,
        last_season_payout: u64,
        last_season_timestamp: u64,
        
        ticket_ledger: Table<TicketKey, address>, 
        staking_ledger: Table<address, address>, 
        
        // --- NEW: GLOBAL REGISTRY FOR LEADERBOARD ---
        active_players: vector<address>, // <--- ADDED THIS

        instant_cap: SignerCapability,  
        seasonal_cap: SignerCapability, 
        sponsor_cap: SignerCapability,  
        reward_cap: SignerCapability,   
        events: event::EventHandle<GameEvent>,
    }

    struct TicketKey has copy, drop, store {
        season: u64,
        ticket_id: u64,
    }

    struct UserProfile has key {
        nonce: u64,
        tickets: u64,
        lifetime_wins: u64,
        last_day_played: u64, 
        paid_spins_today: u64,
        free_spins_today: u64,
        staked_nfts: vector<address>,      
        stake_timestamps: Table<address, u64>, 
        last_day_claimed: u64, 
        accumulated_xp: u128,  
        last_season_played: u64,
        // --- NEW: TIMESTAMP FOR UI ---
        last_active_timestamp: u64, // <--- ADDED THIS
    }

    struct GameEvent has drop, store {
        user: address,
        event_type: u8,
        amount: u64,
        meta: u64,      
        timestamp: u64,
    }

    fun init_module(admin: &signer) {
        move_to(admin, AdminCap {});
        
        let (i_s, i_c) = account::create_resource_account(admin, b"instant");
        let (s_s, s_c) = account::create_resource_account(admin, b"seasonal");
        let (p_s, p_c) = account::create_resource_account(admin, b"sponsor");
        let (r_s, r_c) = account::create_resource_account(admin, b"reward");
        
        coin::register<AptosCoin>(&i_s);
        coin::register<AptosCoin>(&s_s);
        coin::register<AptosCoin>(&p_s);
        coin::register<AptosCoin>(&r_s);
        coin::register<AptosCoin>(admin);

        let default_col = @0x4c28d9362f440dedec5013742fb21fd4693b56add430e9a5874b220b681053ae;

        move_to(admin, GameState {
            admin: signer::address_of(admin),
            paused: false,
            whitelist_collection: default_col,
                config: GameConfig {
                cost_per_spin: 100_000_000, 
                max_paid_spins_daily: 1,
                chance_jackpot: 9, 
                chance_ticket: 46,
                jackpot_min: 200_000_000,
                jackpot_max: 450_000_000,
            },
            season_started: false,
            season_end_time: 0, 
            claim_window_active: false,
            claim_end_time: 0,
            total_tickets: 0,
            total_global_xp: 0,
            current_season_id: 1, 
            last_season_winner: @0x0,
            last_season_payout: 0,
            last_season_timestamp: 0,
            ticket_ledger: table::new<TicketKey, address>(),
            staking_ledger: table::new(),
            active_players: vector::empty(), // <--- INITIALIZED EMPTY LIST
            instant_cap: i_c, seasonal_cap: s_c, sponsor_cap: p_c, reward_cap: r_c,
            events: account::new_event_handle<GameEvent>(admin),
        });
    }

    // ==========================================
    // ADMIN WORKFLOW
    // ==========================================

    public entry fun start_season(admin: &signer, duration_seconds: u64) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        
        assert!(!game.season_started, E_SEASON_ALREADY_STARTED);
        assert!(!game.claim_window_active, E_CLAIM_WINDOW_ACTIVE); 

        let now = timestamp::now_seconds();
        game.season_started = true;
        game.season_end_time = now + duration_seconds;
    }

    public entry fun draw_seasonal_winner(admin: &signer, claim_duration_seconds: u64) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        
        // 1. Pay Jackpot Winner
        if (game.total_tickets > 0) {
            let seed = timestamp::now_microseconds();
            let winning_ticket_id = (seed % game.total_tickets) + 1;
            let winner_key = TicketKey { season: game.current_season_id, ticket_id: winning_ticket_id };
            let winner_addr = *table::borrow(&game.ticket_ledger, winner_key);
            
            let s_cap = account::create_signer_with_capability(&game.seasonal_cap);
            let balance = coin::balance<AptosCoin>(signer::address_of(&s_cap));
            
            game.last_season_winner = winner_addr;
            game.last_season_payout = balance;
            game.last_season_timestamp = timestamp::now_seconds();
            
            if (balance > 0) {
                coin::transfer<AptosCoin>(&s_cap, winner_addr, balance);
            };
            emit(game, winner_addr, 7, balance, winning_ticket_id);
        };
        
        // 2. Open Claim Window
        game.season_started = false; 
        game.claim_window_active = true;
        game.claim_end_time = timestamp::now_seconds() + claim_duration_seconds;
    }

    public entry fun finalize_season(admin: &signer) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        
        assert!(game.claim_window_active, E_SEASON_NOT_ACTIVE); 
        assert!(timestamp::now_seconds() >= game.claim_end_time, E_WINDOW_NOT_FINISHED); 

        // 1. Rollback Funds to Admin
        let admin_addr = signer::address_of(admin);
        let r_cap = account::create_signer_with_capability(&game.reward_cap);
        let r_bal = coin::balance<AptosCoin>(signer::address_of(&r_cap));
        if (r_bal > 0) { coin::transfer<AptosCoin>(&r_cap, admin_addr, r_bal); };

        let p_cap = account::create_signer_with_capability(&game.sponsor_cap);
        let p_bal = coin::balance<AptosCoin>(signer::address_of(&p_cap));
        if (p_bal > 0) { coin::transfer<AptosCoin>(&p_cap, admin_addr, p_bal); };

        let s_cap = account::create_signer_with_capability(&game.seasonal_cap);
        let s_bal = coin::balance<AptosCoin>(signer::address_of(&s_cap));
        if (s_bal > 0) { coin::transfer<AptosCoin>(&s_cap, admin_addr, s_bal); };

        // 2. Reset Global Stats
        game.total_global_xp = 0;
        game.total_tickets = 0;
        
        // 3. Increment Season ID
        game.current_season_id = game.current_season_id + 1;
        game.claim_window_active = false;
    }

    // --- NEW: UPDATE CONFIG FUNCTION ---
    public entry fun update_config(
        admin: &signer, 
        new_cost: u64, 
        new_jackpot_chance: u64,
        new_ticket_chance: u64,
        new_jackpot_min: u64,
        new_jackpot_max: u64
    ) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        
        game.config.cost_per_spin = new_cost;
        game.config.chance_jackpot = new_jackpot_chance;
        game.config.chance_ticket = new_ticket_chance;
        game.config.jackpot_min = new_jackpot_min;
        game.config.jackpot_max = new_jackpot_max;
    }

    // --- NEW: NFT RESCUE FUNCTION ---
    public entry fun admin_rescue_nft(
        admin: &signer, 
        nft_object: Object<Token>, 
        recipient: address
    ) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        
        let vault_signer = account::create_signer_with_capability(&game.instant_cap);
        assert!(object::is_owner(nft_object, signer::address_of(&vault_signer)), E_NOT_OWNER);
        object::transfer(&vault_signer, nft_object, recipient);
    }

    // --- NEW: GRANT ADMIN FUNCTION ---
    public entry fun grant_admin(existing_admin: &signer, new_admin: &signer) {
        assert!(exists<AdminCap>(signer::address_of(existing_admin)), E_NOT_ADMIN);
        move_to(new_admin, AdminCap {});
    }

    // --- NEW: UPDATE NFT COLLECTION FUNCTION ---
    public entry fun set_whitelist_collection(admin: &signer, new_col: address) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        game.whitelist_collection = new_col;
    }

    // ==========================================
    // USER ACTIONS
    // ==========================================

    public entry fun claim_season_rewards(user: &signer) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        let user_addr = signer::address_of(user);
        ensure_profile(user, game); // Pass GameState to register user
        let profile = borrow_global_mut<UserProfile>(user_addr);
        
        assert!(game.claim_window_active, E_CLAIM_WINDOW_CLOSED);
        assert!(timestamp::now_seconds() <= game.claim_end_time, E_CLAIM_WINDOW_CLOSED);
        assert!(profile.last_season_played == game.current_season_id, E_NOTHING_TO_CLAIM);

        let user_xp = profile.accumulated_xp;
        assert!(user_xp > 0, E_NOTHING_TO_CLAIM);
        assert!(game.total_global_xp > 0, E_NOTHING_TO_CLAIM);
        
        let r_cap = account::create_signer_with_capability(&game.reward_cap);
        let vault_bal = coin::balance<AptosCoin>(signer::address_of(&r_cap)) as u128;
        assert!(vault_bal > 0, E_REWARD_VAULT_EMPTY);
        
        let share = (user_xp * vault_bal) / game.total_global_xp;
        let payout = share as u64;
        
        game.total_global_xp = game.total_global_xp - user_xp;
        profile.accumulated_xp = 0; 
        profile.last_active_timestamp = timestamp::now_seconds(); // Update Timestamp
        
        if (payout > 0) {
            coin::transfer<AptosCoin>(&r_cap, user_addr, payout);
        };
        emit(game, user_addr, 5, payout, 0);
    }

    public entry fun claim_daily_xp(user: &signer) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        let user_addr = signer::address_of(user);
        ensure_profile(user, game); 
        let profile = borrow_global_mut<UserProfile>(user_addr);
        
        check_and_reset_season(game, profile);

        assert!(game.season_started, E_SEASON_NOT_ACTIVE);
        let now = timestamp::now_seconds();
        assert!(now <= game.season_end_time, E_SEASON_NOT_ACTIVE);
        
        let current_day = now / SECONDS_PER_DAY;
        assert!(profile.last_day_claimed < current_day, E_ALREADY_CLAIMED_TODAY);
        
        let count = vector::length(&profile.staked_nfts);
        assert!(count > 0, E_NO_STAKED_NFTS);
        let earned = (count * XP_PER_NFT_PER_DAY) as u128;
        
        profile.accumulated_xp = profile.accumulated_xp + earned;
        game.total_global_xp = game.total_global_xp + earned;
        profile.last_day_claimed = current_day;
        profile.last_active_timestamp = timestamp::now_seconds(); // Update Timestamp
        
        emit(game, user_addr, 6, earned as u64, current_day);
    }

    public entry fun stake_nfts(user: &signer, nft_objects: vector<Object<Token>>) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        assert!(!game.paused, E_GAME_PAUSED);
        let user_addr = signer::address_of(user);
        ensure_profile(user, game);
        let profile = borrow_global_mut<UserProfile>(user_addr);
        check_and_reset_season(game, profile);

        let len = vector::length(&nft_objects);
        let now = timestamp::now_seconds();
        let allowed_col = object::address_to_object<Collection>(game.whitelist_collection);
        let vault_addr = account::get_signer_capability_address(&game.instant_cap);
        
        let i = 0;
        while (i < len) {
            let nft = *vector::borrow(&nft_objects, i);
            let nft_addr = object::object_address(&nft);
            let col = aptos_token_objects::token::collection_object(nft);
            assert!(col == allowed_col, E_WRONG_COLLECTION);
            assert!(object::is_owner(nft, user_addr), E_NOT_OWNER);
            object::transfer(user, nft, vault_addr);
            vector::push_back(&mut profile.staked_nfts, nft_addr);
            table::add(&mut profile.stake_timestamps, nft_addr, now);
            table::add(&mut game.staking_ledger, nft_addr, user_addr);
            i = i + 1;
        };
        profile.last_active_timestamp = now; // Update Timestamp
        emit(game, user_addr, 3, len as u64, 0);
    }

    public entry fun unstake_nfts(user: &signer, nft_objects: vector<Object<Token>>) acquires GameState, UserProfile {
        assert!(vector::length(&nft_objects) <= MAX_UNSTAKE_BATCH, E_BATCH_TOO_LARGE);
        let game = borrow_global_mut<GameState>(@movechi);
        let game_signer = account::create_signer_with_capability(&game.instant_cap);
        let user_addr = signer::address_of(user);
        // Note: No ensure_profile here because user must exist to unstake
        let profile = borrow_global_mut<UserProfile>(user_addr);
        let len = vector::length(&nft_objects);
        let now = timestamp::now_seconds();
        
        let i = 0;
        while (i < len) {
            let nft = *vector::borrow(&nft_objects, i);
            let nft_addr = object::object_address(&nft);
            assert!(table::contains(&profile.stake_timestamps, nft_addr), E_NOT_STAKED);
            let staked_at = *table::borrow(&profile.stake_timestamps, nft_addr);
            assert!(now >= staked_at + SECONDS_PER_DAY, E_STAKE_LOCKED_24H);
            
            let (found, index) = vector::index_of(&profile.staked_nfts, &nft_addr);
            if (found) { 
                vector::remove(&mut profile.staked_nfts, index); 
            };
            table::remove(&mut profile.stake_timestamps, nft_addr);
            table::remove(&mut game.staking_ledger, nft_addr);
            object::transfer(&game_signer, nft, user_addr);
            i = i + 1;
        };
        profile.last_active_timestamp = now; // Update Timestamp
        emit(game, user_addr, 4, len as u64, 0);
    }

    public entry fun spin_paid(user: &signer) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        assert!(!game.paused, E_GAME_PAUSED);
        assert!(game.season_started, E_SEASON_NOT_ACTIVE);
        let now = timestamp::now_seconds();
        assert!(now <= game.season_end_time, E_SEASON_NOT_ACTIVE);
        let user_addr = signer::address_of(user);
        ensure_profile(user, game);
        let profile = borrow_global_mut<UserProfile>(user_addr);
        
        check_and_reset_season(game, profile);
        
        let current_day = now / SECONDS_PER_DAY;
        if (profile.last_day_played < current_day) {
            profile.last_day_played = current_day;
            profile.paid_spins_today = 0;
            profile.free_spins_today = 0;
        };
 
        assert!(profile.paid_spins_today < game.config.max_paid_spins_daily, E_DAILY_PAID_LIMIT);
        let payment = coin::withdraw<AptosCoin>(user, game.config.cost_per_spin);
        distribute_funds(game, payment);
        profile.paid_spins_today = profile.paid_spins_today + 1;
        profile.last_active_timestamp = now; // Update Timestamp
        execute_spin(game, user_addr, profile);
    }

    public entry fun spin_free_staker(user: &signer) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        assert!(!game.paused, E_GAME_PAUSED);
        assert!(game.season_started, E_SEASON_NOT_ACTIVE);
        let now = timestamp::now_seconds();
        assert!(now <= game.season_end_time, E_SEASON_NOT_ACTIVE);
        let user_addr = signer::address_of(user);
        ensure_profile(user, game);
        let profile = borrow_global_mut<UserProfile>(user_addr);
        
        check_and_reset_season(game, profile);
        
        let current_day = now / SECONDS_PER_DAY;
        if (profile.last_day_played < current_day) {
            profile.last_day_played = current_day;
            profile.paid_spins_today = 0;
            profile.free_spins_today = 0;
        };

        let staked_count = vector::length(&profile.staked_nfts);
        let allowed_spins = if (staked_count >= 10) { 3 }
        else if (staked_count >= 5) { 2 }
        else if (staked_count >= 1) { 1 }
        else { 0 };
        
        assert!(allowed_spins > 0, E_NO_STAKED_NFTS);
        assert!(profile.free_spins_today < allowed_spins, E_DAILY_FREE_LIMIT);
        
        let s_cap = account::create_signer_with_capability(&game.sponsor_cap);
        assert!(coin::balance<AptosCoin>(signer::address_of(&s_cap)) >= game.config.cost_per_spin, E_SPONSOR_BROKE);
        let subsidy = coin::withdraw<AptosCoin>(&s_cap, game.config.cost_per_spin);
        distribute_funds(game, subsidy);
        profile.free_spins_today = profile.free_spins_today + 1;
        profile.last_active_timestamp = now; // Update Timestamp
        execute_spin(game, user_addr, profile);
    }

    // ==========================================
    // UTILS
    // ==========================================

    fun check_and_reset_season(game: &GameState, profile: &mut UserProfile) {
        if (profile.last_season_played < game.current_season_id) {
            profile.accumulated_xp = 0;
            profile.tickets = 0;
            profile.last_season_played = game.current_season_id;
        }
    }

    // UPDATED UTILITY: Now registers user in Global Registry and init timestamp
    fun ensure_profile(user: &signer, game: &mut GameState) {
        let addr = signer::address_of(user);
        if (!exists<UserProfile>(addr)) {
            let today = timestamp::now_seconds() / SECONDS_PER_DAY;
            move_to(user, UserProfile {
                nonce: 0, tickets: 0, lifetime_wins: 0,
                last_day_played: today, paid_spins_today: 0, free_spins_today: 0,
                staked_nfts: vector::empty(),
                stake_timestamps: table::new(),
                last_day_claimed: today - 1, 
                accumulated_xp: 0,
                last_season_played: game.current_season_id,
                last_active_timestamp: timestamp::now_seconds(), // Init Timestamp
            });

            // Register in Global List
            if (!vector::contains(&game.active_players, &addr)) {
                vector::push_back(&mut game.active_players, addr);
            };
        };
    }

    fun distribute_funds(game: &mut GameState, payment: Coin<AptosCoin>) {
        let total = coin::value<AptosCoin>(&payment);
        let team_share = total * 10 / 100;
        let instant_share = total * 35 / 100;
        let seasonal_share = total * 35 / 100;
        let team_coin = coin::extract<AptosCoin>(&mut payment, team_share);
        let instant_coin = coin::extract<AptosCoin>(&mut payment, instant_share);
        let seasonal_coin = coin::extract<AptosCoin>(&mut payment, seasonal_share);

        coin::deposit<AptosCoin>(game.admin, team_coin);
        coin::deposit<AptosCoin>(account::get_signer_capability_address(&game.instant_cap), instant_coin);
        coin::deposit<AptosCoin>(account::get_signer_capability_address(&game.seasonal_cap), seasonal_coin);
        coin::deposit<AptosCoin>(account::get_signer_capability_address(&game.reward_cap), payment);
    }

    public entry fun admin_emergency_withdraw(admin: &signer, amount: u64, from_vault: u8) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        let vault_signer = if (from_vault == 0) { account::create_signer_with_capability(&game.instant_cap) } 
        else if (from_vault == 1) { account::create_signer_with_capability(&game.seasonal_cap) } 
        else if (from_vault == 2) { account::create_signer_with_capability(&game.sponsor_cap) } 
        else if (from_vault == 3) { account::create_signer_with_capability(&game.reward_cap) } 
        else { abort E_INVALID_VAULT };
        let coins = coin::withdraw<AptosCoin>(&vault_signer, amount);
        coin::deposit<AptosCoin>(signer::address_of(admin), coins);
    }

    fun reset_daily_limits(p: &mut UserProfile) {
        let current_day = timestamp::now_seconds() / SECONDS_PER_DAY;
        if (p.last_day_played < current_day) {
            p.last_day_played = current_day;
            p.paid_spins_today = 0;
            p.free_spins_today = 0;
        };
    }

    fun execute_spin(game: &mut GameState, user: address, p: &mut UserProfile) {
        p.nonce = p.nonce + 1;
        let roll = generate_random(user, p.nonce); 
        if (roll < game.config.chance_jackpot) {
            let win_seed = generate_random_u64(user, p.nonce + 999);
            let range = game.config.jackpot_max - game.config.jackpot_min + 1;
            let win_amt = game.config.jackpot_min + (win_seed % range);
            let s = account::create_signer_with_capability(&game.instant_cap);
            if (coin::balance<AptosCoin>(signer::address_of(&s)) >= win_amt) {
                coin::transfer<AptosCoin>(&s, user, win_amt);
                p.lifetime_wins = p.lifetime_wins + win_amt;
                emit(game, user, 2, win_amt, roll);
            } else {
                p.accumulated_xp = p.accumulated_xp + 100;
                game.total_global_xp = game.total_global_xp + 100;
                emit(game, user, 1, 100, roll); 
            };
        } 
        else if (roll < (game.config.chance_jackpot + game.config.chance_ticket)) {
            game.total_tickets = game.total_tickets + 1;
            p.tickets = p.tickets + 1;
            let t_key = TicketKey { season: game.current_season_id, ticket_id: game.total_tickets };
            table::add(&mut game.ticket_ledger, t_key, user);
            emit(game, user, 1, 0, roll); 
        } 
        else {
            p.accumulated_xp = p.accumulated_xp + 100;
            game.total_global_xp = game.total_global_xp + 100;
            emit(game, user, 1, 100, roll);
        };
    }

    public entry fun set_whitelist_collection(admin: &signer, new_col: address) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        game.whitelist_collection = new_col;
    }

    public entry fun set_pause(admin: &signer, paused: bool) acquires GameState {
        assert!(exists<AdminCap>(signer::address_of(admin)), E_NOT_ADMIN);
        let game = borrow_global_mut<GameState>(@movechi);
        game.paused = paused;
    }

    public fun get_user_status(user: address): (u64, u64, u64, u128, u64) acquires UserProfile {
        if (!exists<UserProfile>(user)) { return (0, 0, 0, 0, 0) };
        let p = borrow_global<UserProfile>(user);
        (p.paid_spins_today, p.free_spins_today, p.tickets, p.accumulated_xp, vector::length(&p.staked_nfts))
    }

    public fun is_checked_in_today(user: address): bool acquires UserProfile {
        if (!exists<UserProfile>(user)) return false;
        let p = borrow_global<UserProfile>(user);
        let current_day = timestamp::now_seconds() / SECONDS_PER_DAY;
        p.last_day_claimed == current_day
    }

    #[view]
    public fun get_last_season_result(): (address, u64, u64) acquires GameState {
        let game = borrow_global<GameState>(@movechi);
        (game.last_season_winner, game.last_season_payout, game.last_season_timestamp)
    }

    // --- NEW: VIEW FUNCTION FOR LEADERBOARD ---
    #[view]
    public fun get_all_players(): vector<address> acquires GameState {
        let game = borrow_global<GameState>(@movechi);
        game.active_players
    }

    fun generate_random(addr: address, nonce: u64): u64 {
        let bytes = bcs::to_bytes(&timestamp::now_microseconds());
        vector::append(&mut bytes, bcs::to_bytes(&addr));
        vector::append(&mut bytes, bcs::to_bytes(&nonce));
        let hash = hash::sha2_256(bytes);
        let res: u64 = 0;
        let i = 0;
        while (i < 8) {
            let b = *vector::borrow(&hash, i);
            res = (res << 8) | (b as u64);
            i = i + 1;
        };
        res % 100
    }

    fun generate_random_u64(addr: address, nonce: u64): u64 {
        let bytes = bcs::to_bytes(&timestamp::now_microseconds());
        vector::append(&mut bytes, bcs::to_bytes(&addr));
        vector::append(&mut bytes, bcs::to_bytes(&nonce));
        let hash = hash::sha2_256(bytes);
        let res: u64 = 0;
        let i = 0;
        while (i < 8) {
            let b = *vector::borrow(&hash, i);
            res = (res << 8) | (b as u64);
            i = i + 1;
        };
        res
    }

    fun emit(game: &mut GameState, u: address, t: u8, a: u64, m: u64) {
        event::emit_event<GameEvent>(&mut game.events, GameEvent { 
            user: u, event_type: t, amount: a, meta: m, timestamp: timestamp::now_seconds(),
        });
    }

    // ==========================================
    // TEST HELPERS (test-only)
    // ==========================================
    #[test_only]
    public fun test_init(framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(framework);
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100000);
        init_module(admin);
    }

    #[test_only]
    public fun test_get_state_flags(): (bool, bool, u64) acquires GameState {
        let game = borrow_global<GameState>(@movechi);
        (game.season_started, game.claim_window_active, game.current_season_id)
    }

    #[test_only]
    public fun test_force_season_active(duration: u64) acquires GameState {
        let game = borrow_global_mut<GameState>(@movechi);
        let now = timestamp::now_seconds();
        game.season_started = true;
        game.claim_window_active = false;
        game.season_end_time = now + duration;
    }

    #[test_only]
    public fun test_open_claim_window(delta: u64) acquires GameState {
        let game = borrow_global_mut<GameState>(@movechi);
        game.season_started = false;
        game.claim_window_active = true;
        game.claim_end_time = timestamp::now_seconds() + delta;
    }

    #[test_only]
    public fun test_set_totals(user: &signer, user_xp: u128, total_xp: u128) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        game.total_global_xp = total_xp;
        ensure_profile(user, game);
        let profile = borrow_global_mut<UserProfile>(signer::address_of(user));
        profile.accumulated_xp = user_xp;
        profile.last_season_played = game.current_season_id;
    }

    #[test_only]
    public fun test_seed_profile_with_stake(user: &signer, count: u64, last_day_claimed: u64) acquires GameState, UserProfile {
        let game = borrow_global_mut<GameState>(@movechi);
        ensure_profile(user, game);
        let profile = borrow_global_mut<UserProfile>(signer::address_of(user));
        vector::push_back(&mut profile.staked_nfts, @0x1);
        table::add(&mut profile.stake_timestamps, @0x1, timestamp::now_seconds());
        if (count > 1) {
            vector::push_back(&mut profile.staked_nfts, @0x2);
            table::add(&mut profile.stake_timestamps, @0x2, timestamp::now_seconds());
        };
        profile.last_day_claimed = last_day_claimed;
    }

    #[test_only]
    public fun test_get_user_accumulated_xp(user: address): u128 acquires UserProfile {
        if (!exists<UserProfile>(user)) return 0;
        let p = borrow_global<UserProfile>(user);
        p.accumulated_xp
    }

    #[test_only]
    public fun test_get_total_global_xp(): u128 acquires GameState {
        let game = borrow_global<GameState>(@movechi);
        game.total_global_xp
    }
}