import math

def get_spot_price(yes_reserves: float, no_reserves: float, outcome: str) -> float:
    total = yes_reserves + no_reserves
    if total == 0:
        return 50.0
    if outcome == 'YES':
        return (no_reserves / total) * 100
    else:
        return (yes_reserves / total) * 100

def calculate_buy_shares(yes_reserves: float, no_reserves: float, outcome: str, bet_amount: float) -> float:
    M = bet_amount / 100.0
    if outcome == 'YES':
        shares = M * (1.0 + yes_reserves / (no_reserves + M))
    else:
        shares = M * (1.0 + no_reserves / (yes_reserves + M))
    return shares

def calculate_sell_refund(yes_reserves: float, no_reserves: float, outcome: str, shares_to_sell: float) -> float:
    S = shares_to_sell
    B = -(yes_reserves + no_reserves + S)
    C_quad = S * no_reserves if outcome == 'YES' else S * yes_reserves
    
    D = B * B - 4.0 * C_quad
    if D < 0:
        return 0.0
    
    M = (-B - math.sqrt(D)) / 2.0
    return M * 100.0

def run_simulation():
    print("=" * 60)
    print("BURGA BET AMM (CPMM) SIMULIATORIUS & VERIFIKAVIMAS")
    print("=" * 60)
    
    # Pradiniai rezervai (100 YES ir 100 NO kontraktų)
    R_y = 100.0
    R_n = 100.0
    k_initial = R_y * R_n
    
    print(f"Pradiniai rezervai: YES={R_y}, NO={R_n}")
    print(f"Konstanta k = Ry * Rn = {k_initial}")
    print(f"YES spot kaina: {get_spot_price(R_y, R_n, 'YES'):.2f} žetonų")
    print(f"NO spot kaina: {get_spot_price(R_y, R_n, 'NO'):.2f} žetonų")
    print("-" * 60)
    
    # Naudotojas stato 250 žetonų už YES
    bet_amount = 250.0
    print(f"Naudotojas perka YES už {bet_amount} žetonus")
    
    # Skaičiuojame gautas akcijas
    shares_bought = calculate_buy_shares(R_y, R_n, 'YES', bet_amount)
    avg_price = bet_amount / shares_bought
    print(f"Gautos YES akcijos (shares): {shares_bought:.4f}")
    print(f"Vidutinė sumokėta kaina už akcija: {avg_price:.2f} žetonų")
    
    # Atnaujiname rezervus po pirkimo
    M = bet_amount / 100.0
    R_y_new = R_y + M - shares_bought
    R_n_new = R_n + M
    k_after_buy = R_y_new * R_n_new
    
    print(f"Nauji rezervai po pirkimo: YES={R_y_new:.4f}, NO={R_n_new:.4f}")
    print(f"Konstanta k po pirkimo = {k_after_buy:.4f}")
    print(f"Nauja YES spot kaina: {get_spot_price(R_y_new, R_n_new, 'YES'):.2f} žetonų")
    print(f"Paklaida k (turi būti 0): {abs(k_after_buy - k_initial):.10f}")
    print("-" * 60)
    
    # Simuliuojame to paties akcijų kiekio pardavimą iškart
    print(f"Naudotojas iškart parduoda turimas {shares_bought:.4f} YES akcijas atgal rinkai")
    refund = calculate_sell_refund(R_y_new, R_n_new, 'YES', shares_bought)
    print(f"Grąžinta žetonų suma: {refund:.2f} (Tikėtasi: {bet_amount})")
    
    # Atnaujiname rezervus po pardavimo
    S = shares_bought
    B = -(R_y_new + R_n_new + S)
    C_quad = S * R_n_new
    D = B * B - 4.0 * C_quad
    M_sell = (-B - math.sqrt(D)) / 2.0
    
    R_y_final = R_y_new + S - M_sell
    R_n_final = R_n_new - M_sell
    k_final = R_y_final * R_n_final
    
    print(f"Galutiniai rezervai po pardavimo: YES={R_y_final:.4f}, NO={R_n_final:.4f}")
    print(f"Galutinė konstanta k = {k_final:.4f}")
    print(f"Paklaida balanso atžvilgiu: {abs(refund - bet_amount):.10f}")
    print(f"Paklaida rezervų atžvilgiu (lyginant su pradiniais): YES={abs(R_y_final - R_y):.10f}, NO={abs(R_n_final - R_n):.10f}")
    
    # Tikriname validumą
    success = abs(refund - bet_amount) < 1e-9 and abs(k_final - k_initial) < 1e-9
    if success:
        print("\n[OK] VERIFIKAVIMAS SEKMINGAS! AMM veikia be nuostoliu (zero-arbitrage / invariant-preserving).")
    else:
        print("\n[X] VERIFIKAVIMAS nepavyko! Rastos matematines paklaidos.")
    print("=" * 60)

if __name__ == "__main__":
    run_simulation()
