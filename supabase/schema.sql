-- BurgaBet Duomenų Bazės Schema

-- Išvalome senus objektus, jei jie egzistuoja (leidžia skriptą paleisti pakartotinai)
drop table if exists public.transactions cascade;
drop table if exists public.positions cascade;
drop table if exists public.markets cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop trigger if exists on_auth_user_created on auth.users cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.place_bet(uuid, text, numeric) cascade;
drop function if exists public.sell_shares(uuid, text, numeric) cascade;
drop function if exists public.resolve_market(uuid, text) cascade;
drop function if exists public.check_profile_updates() cascade;

-- Aktyvuojame UUID plėtinį, jei jis dar neįjungtas
create extension if not exists "uuid-ossp";

-- 1. VARTOTOJŲ PROFILIAI (susieti su auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    full_name text,
    avatar_url text,
    token_balance numeric not null default 1000.0 check (token_balance >= 0),
    is_admin boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Įgaliname Row Level Security (RLS) profiliams
alter table public.profiles enable row level security;

-- 2. KATEGORIJOS
create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    color text not null default 'zinc', -- Tailwind spalvos pavadinimas (emerald, blue, amber, violet, rose, etc.)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Įgaliname RLS kategorijoms
alter table public.categories enable row level security;

-- 3. SPĖJIMŲ RINKOS
create table public.markets (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    description text,
    yes_reserves numeric not null default 100.0 check (yes_reserves > 0),
    no_reserves numeric not null default 100.0 check (no_reserves > 0),
    status text not null default 'active' check (status in ('active', 'resolved', 'cancelled')),
    outcome text check (outcome in ('YES', 'NO', null)),
    category_id uuid references public.categories(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    resolved_at timestamp with time zone,
    creator_id uuid references public.profiles(id)
);

-- Įgaliname RLS rinkoms
alter table public.markets enable row level security;

-- 4. VARTOTOJŲ POZICIJOS (kiek YES/NO akcijų turi kiekvienoje rinkoje)
create table public.positions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    market_id uuid references public.markets(id) on delete cascade not null,
    yes_shares numeric not null default 0.0 check (yes_shares >= 0),
    no_shares numeric not null default 0.0 check (no_shares >= 0),
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, market_id)
);

-- Įgaliname RLS pozicijoms
alter table public.positions enable row level security;

-- 5. TRANSAKCIJŲ ŽURNALAS
create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    market_id uuid references public.markets(id) on delete cascade not null,
    type text not null check (type in ('buy_yes', 'buy_no', 'sell_yes', 'sell_no', 'payout')),
    token_amount numeric not null,
    share_amount numeric not null,
    price_per_share numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Įgaliname RLS transakcijoms
alter table public.transactions enable row level security;


-- =========================================================================
-- RLS POLITIKOS (Row Level Security Policies)
-- =========================================================================

-- Profiliai: visi mato profilius (Leaderboard'ui), bet keisti gali tik savo
create policy "Visi vartotojai gali matyti profilius" on public.profiles
    for select using (true); -- Leisti matyti visiems, net svečiams

create policy "Vartotojas gali atnaujinti tik savo profilio info" on public.profiles
    for update using (auth.uid() = id);

-- Apsaugome token_balance ir is_admin nuo tiesioginio modifikavimo iš kliento
create or replace function public.check_profile_updates()
returns trigger as $$
begin
    if (OLD.token_balance <> NEW.token_balance or OLD.is_admin <> NEW.is_admin) then
        -- Blokuojame tik tiesioginius atnaujinimus iš naršyklės (kurie naudoja 'authenticated' arba 'anon' roles)
        if current_user in ('authenticated', 'anon') then
            raise exception 'Negalima tiesiogiai keisti balanso ar administratoriaus teisių!';
        end if;
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger tr_check_profile_updates
    before update on public.profiles
    for each row execute function public.check_profile_updates();


-- Kategorijos: visi gali matyti, tik adminai gali valdyti
create policy "Visi prisijungę gali matyti kategorijas" on public.categories
    for select using (true);

create policy "Tik adminai gali valdyti kategorijas" on public.categories
    for all using (
        exists (
            select 1 from public.profiles 
            where profiles.id = auth.uid() and profiles.is_admin = true
        )
    );

-- Rinkos: visi mato rinkas, tik adminai gali jas kurti/modifikuoti
create policy "Visi prisijungę gali matyti rinkas" on public.markets
    for select using (true);

create policy "Tik adminai gali valdyti rinkas" on public.markets
    for all using (
        exists (
            select 1 from public.profiles 
            where profiles.id = auth.uid() and profiles.is_admin = true
        )
    );

-- Pozicijos: visi mato pozicijas (dėl skaidrumo), bet tiesiogiai rašyti negali
create policy "Visi prisijungę gali matyti pozicijas" on public.positions
    for select using (true);

-- Transakcijos: vartotojai mato savo transakcijas, tiesiogiai rašyti negali
create policy "Vartotojai gali matyti savo transakcijas" on public.transactions
    for select using (auth.uid() = user_id);


-- =========================================================================
-- ATOMINĖS TRANSAKCIJŲ FUNKCIJOS (RPC) - SECURITY DEFINER
-- =========================================================================

-- RPC 1: Statymo atlikimas (Shares pirkimas)
create or replace function public.place_bet(
    p_market_id uuid,
    p_outcome text,
    p_bet_amount numeric
)
returns numeric
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_user_balance numeric;
    v_yes_reserves numeric;
    v_no_reserves numeric;
    v_status text;
    v_m numeric; -- M = p_bet_amount / 100
    v_shares numeric;
    v_new_yes numeric;
    v_new_no numeric;
    v_avg_price numeric;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Naudotojas neautorizuotas!';
    end if;

    if p_bet_amount <= 0 then
        raise exception 'Statymo suma turi būti didesnė už 0!';
    end if;

    if p_outcome <> 'YES' and p_outcome <> 'NO' then
        raise exception 'Neteisinga baigtis! Turi būti YES arba NO.';
    end if;

    select token_balance into v_user_balance 
    from profiles 
    where id = v_user_id 
    for update;

    if v_user_balance < p_bet_amount then
        raise exception 'Nepakankamas žetonų balansas! Turite: %, bandote statyti: %', v_user_balance, p_bet_amount;
    end if;

    select yes_reserves, no_reserves, status into v_yes_reserves, v_no_reserves, v_status
    from markets
    where id = p_market_id
    for update;

    if v_status <> 'active' then
        raise exception 'Rinka nėra aktyvi!';
    end if;

    v_m := p_bet_amount / 100.0;
    
    if p_outcome = 'YES' then
        v_shares := v_m * (1.0 + (v_yes_reserves / (v_no_reserves + v_m)));
        v_new_yes := v_yes_reserves + v_m - v_shares;
        v_new_no := v_no_reserves + v_m;
    else
        v_shares := v_m * (1.0 + (v_no_reserves / (v_yes_reserves + v_m)));
        v_new_yes := v_yes_reserves + v_m;
        v_new_no := v_no_reserves + v_m - v_shares;
    end if;

    if v_new_yes <= 0 or v_new_no <= 0 then
        raise exception 'Klaida: rezervai negali tapti neigiami arba nuliniai!';
    end if;

    v_avg_price := p_bet_amount / v_shares;

    update profiles 
    set token_balance = token_balance - p_bet_amount 
    where id = v_user_id;

    update markets 
    set yes_reserves = v_new_yes, no_reserves = v_new_no 
    where id = p_market_id;

    insert into positions (user_id, market_id, yes_shares, no_shares, updated_at)
    values (
        v_user_id,
        p_market_id,
        case when p_outcome = 'YES' then v_shares else 0.0 end,
        case when p_outcome = 'NO' then v_shares else 0.0 end,
        now()
    )
    on conflict (user_id, market_id) do update set
        yes_shares = positions.yes_shares + case when p_outcome = 'YES' then v_shares else 0.0 end,
        no_shares = positions.no_shares + case when p_outcome = 'NO' then v_shares else 0.0 end,
        updated_at = now();

    insert into transactions (user_id, market_id, type, token_amount, share_amount, price_per_share, created_at)
    values (
        v_user_id,
        p_market_id,
        case when p_outcome = 'YES' then 'buy_yes'::text else 'buy_no'::text end,
        p_bet_amount,
        v_shares,
        v_avg_price,
        now()
    );

    return v_shares;
end;
$$ language plpgsql;


-- RPC 2: Akcijų pardavimas (Pozicijos uždarymas anksčiau laiko)
create or replace function public.sell_shares(
    p_market_id uuid,
    p_outcome text,
    p_shares_to_sell numeric
)
returns numeric
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_yes_shares numeric;
    v_no_shares numeric;
    v_yes_reserves numeric;
    v_no_reserves numeric;
    v_status text;
    
    v_b numeric;
    v_c_quad numeric;
    v_m numeric;
    v_refund_tokens numeric;
    
    v_new_yes numeric;
    v_new_no numeric;
    v_avg_price numeric;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Naudotojas neautorizuotas!';
    end if;

    if p_shares_to_sell <= 0 then
        raise exception 'Parduodamų akcijų kiekis turi būti didesnis už 0!';
    end if;

    if p_outcome <> 'YES' and p_outcome <> 'NO' then
        raise exception 'Neteisinga baigtis! Turi būti YES arba NO.';
    end if;

    select yes_shares, no_shares into v_yes_shares, v_no_shares 
    from positions 
    where user_id = v_user_id and market_id = p_market_id
    for update;

    if p_outcome = 'YES' and (v_yes_shares is null or v_yes_shares < p_shares_to_sell) then
        raise exception 'Nepakankamai YES akcijų! Turite: %, bandote parduoti: %', coalesce(v_yes_shares, 0), p_shares_to_sell;
    end if;

    if p_outcome = 'NO' and (v_no_shares is null or v_no_shares < p_shares_to_sell) then
        raise exception 'Nepakankamai NO akcijų! Turite: %, bandote parduoti: %', coalesce(v_no_shares, 0), p_shares_to_sell;
    end if;

    select yes_reserves, no_reserves, status into v_yes_reserves, v_no_reserves, v_status
    from markets
    where id = p_market_id
    for update;

    if v_status <> 'active' then
        raise exception 'Rinka nėra aktyvi!';
    end if;

    v_b := -(v_yes_reserves + v_no_reserves + p_shares_to_sell);
    
    if p_outcome = 'YES' then
        v_c_quad := p_shares_to_sell * v_no_reserves;
    else
        v_c_quad := p_shares_to_sell * v_yes_reserves;
    end if;

    v_m := (-v_b - sqrt(v_b * v_b - 4.0 * v_c_quad)) / 2.0;
    v_refund_tokens := v_m * 100.0;

    if v_refund_tokens <= 0 then
        raise exception 'Klaida skaičiuojant grąžinimą!';
    end if;

    if p_outcome = 'YES' then
        v_new_yes := v_yes_reserves + p_shares_to_sell - v_m;
        v_new_no := v_no_reserves - v_m;
    else
        v_new_yes := v_yes_reserves - v_m;
        v_new_no := v_no_reserves + p_shares_to_sell - v_m;
    end if;

    if v_new_yes <= 0 or v_new_no <= 0 then
        raise exception 'Klaida: rezervai negali tapti neigiami!';
    end if;

    v_avg_price := v_refund_tokens / p_shares_to_sell;

    update profiles 
    set token_balance = token_balance + v_refund_tokens 
    where id = v_user_id;

    update markets 
    set yes_reserves = v_new_yes, no_reserves = v_new_no 
    where id = p_market_id;

    update positions 
    set 
        yes_shares = yes_shares - case when p_outcome = 'YES' then p_shares_to_sell else 0.0 end,
        no_shares = no_shares - case when p_outcome = 'NO' then p_shares_to_sell else 0.0 end,
        updated_at = now()
    where user_id = v_user_id and market_id = p_market_id;

    insert into transactions (user_id, market_id, type, token_amount, share_amount, price_per_share, created_at)
    values (
        v_user_id,
        p_market_id,
        case when p_outcome = 'YES' then 'sell_yes'::text else 'sell_no'::text end,
        -v_refund_tokens,
        p_shares_to_sell,
        v_avg_price,
        now()
    );

    return v_refund_tokens;
end;
$$ language plpgsql;


-- RPC 3: Rinkos išsprendimas (Rezoliucija ir laimėjimų išmokėjimas)
create or replace function public.resolve_market(
    p_market_id uuid,
    p_winning_outcome text
)
returns void
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_is_admin boolean;
    v_status text;
    v_pos record;
    v_payout numeric;
begin
    v_user_id := auth.uid();
    select is_admin into v_is_admin from profiles where id = v_user_id;
    if v_is_admin is not null and v_is_admin = false then
        raise exception 'Tik administratorius gali išspręsti rinką!';
    end if;

    if p_winning_outcome <> 'YES' and p_winning_outcome <> 'NO' then
        raise exception 'Laimėtojo baigtis turi būti YES arba NO!';
    end if;

    select status into v_status from markets where id = p_market_id for update;
    if v_status <> 'active' then
        raise exception 'Rinka jau išspręsta arba atšaukta!';
    end if;

    for v_pos in 
        select user_id, yes_shares, no_shares 
        from positions 
        where market_id = p_market_id and (yes_shares > 0 or no_shares > 0)
    loop
        if p_winning_outcome = 'YES' then
            v_payout := v_pos.yes_shares * 100.0;
        else
            v_payout := v_pos.no_shares * 100.0;
        end if;

        if v_payout > 0 then
            update profiles 
            set token_balance = token_balance + v_payout 
            where id = v_pos.user_id;

            insert into transactions (user_id, market_id, type, token_amount, share_amount, price_per_share, created_at)
            values (
                v_pos.user_id,
                p_market_id,
                'payout'::text,
                -v_payout,
                case when p_winning_outcome = 'YES' then v_pos.yes_shares else v_pos.no_shares end,
                100.0,
                now()
            );
        end if;
    end loop;

    update markets 
    set 
        status = 'resolved',
        outcome = p_winning_outcome,
        resolved_at = now()
    where id = p_market_id;
end;
$$ language plpgsql;


-- =========================================================================
-- TRIGGERIAI INTEGRACIJAI SU SUPABASE AUTH
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url, token_balance, is_admin)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        1000.0, -- Pradinis balansas
        false   -- Ne admin
    );
    return new;
end;
$$ language plpgsql security definer;

-- Triggeris ant auth.users lentelės
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- =========================================================================
-- SEED DUOMENYS (Kategorijos ir Rinkos)
-- =========================================================================

-- Pradinės kategorijos
insert into public.categories (id, name, color)
values
    ('20000000-0000-0000-0000-000000000001', 'Gamyba', 'emerald'),
    ('20000000-0000-0000-0000-000000000002', 'Integracija', 'blue'),
    ('20000000-0000-0000-0000-000000000003', 'Fotografija', 'amber'),
    ('20000000-0000-0000-0000-000000000004', 'Biuras', 'violet')
on conflict (id) do nothing;

-- Įterpiame lietuviškas rinkas su atitinkamomis kategorijomis
insert into public.markets (id, question, description, yes_reserves, no_reserves, status, category_id, creator_id)
values
    (
        '10000000-0000-0000-0000-000000000001',
        'Ar Andrius pasieks gamybos normą šią savaitę?',
        'Rinka bus vertinama pagal gamybos skyriaus kassavaitinę ataskaitą, teikiamą penktadienį iki 17:00.',
        120.0, 80.0,
        'active',
        '20000000-0000-0000-0000-000000000001', -- Gamyba
        null
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Ar Ainius ir Einoras užbaigs integraciją iki penktadienio?',
        'Užduotis laikoma įvykdyta, jei iki penktadienio 23:59 PR (Pull Request) bus patvirtintas ir sujungtas į master šaką.',
        100.0, 100.0,
        'active',
        '20000000-0000-0000-0000-000000000002', -- Integracija
        null
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Ar Tomas įkels naujas projekto nuotraukas į sistemą iki mėnesio galo?',
        'Rinka bus išspręsta teigiamai, jei projekto galerijoje atsiras bent 5 naujos nuotraukos.',
        90.0, 110.0,
        'active',
        '20000000-0000-0000-0000-000000000003', -- Fotografija
        null
    )
on conflict (id) do nothing;


-- =========================================================================
-- REALAUS LAIKO TRANSLIACIJOS NUSTATYMAS (Supabase Realtime)
-- =========================================================================

-- Sukuriame arba įrašome lenteles į Supabase Realtime leidinį (publication)
do $$
begin
  alter publication supabase_realtime add table public.markets;
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.positions;
  alter publication supabase_realtime add table public.transactions;
  alter publication supabase_realtime add table public.categories;
exception
  when others then
    null;
end;
$$;
