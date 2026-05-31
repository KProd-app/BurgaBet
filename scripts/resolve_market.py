import os
import requests
from dotenv import load_dotenv

# Užkrauname aplinkos kintamuosius (nurodome kelią iki pagrindinio failo)
load_dotenv(dotenv_path="../.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
# PASTABA: Automatinėms foninėms užduotims rekomenduojama naudoti SUPABASE_SERVICE_ROLE_KEY,
# kadangi jis apeina Row Level Security (RLS) ir turi admin teises.
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def resolve_market_via_rpc(market_id: str, winning_outcome: str):
    """
    Iškviečia resolve_market PostgreSQL RPC funkciją per Supabase REST API.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Klaida: Nustatymuose nerastas NEXT_PUBLIC_SUPABASE_URL arba SUPABASE_SERVICE_ROLE_KEY!")
        print("Nustatykite juos savo .env.local faile.")
        return False
        
    url = f"{SUPABASE_URL}/rest/v1/rpc/resolve_market"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    payload = {
        "p_market_id": market_id,
        "p_winning_outcome": winning_outcome
    }
    
    print(f"Bandoma išspręsti rinką {market_id} su laimėtoju {winning_outcome}...")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200 or response.status_code == 204:
            print("Sėkmingai išspręsta! Vartotojų laimėjimai buvo išdalinti.")
            return True
        else:
            print(f"Klaida iškviečiant API: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Ryšio klaida: {e}")
        return False

if __name__ == "__main__":
    # Testavimo pavyzdys:
    # Nukopijuokite rinkos ID iš savo Supabase panelės
    TEST_MARKET_ID = "10000000-0000-0000-0000-000000000001"
    
    # Atkomentuokite eilutę žemiau, jei norite paleisti skriptą rankiniu būdu:
    # resolve_market_via_rpc(TEST_MARKET_ID, "YES")
    pass
