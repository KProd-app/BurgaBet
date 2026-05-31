'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as AMM from '@/lib/amm';
import { 
  Coins, 
  Award, 
  TrendingUp, 
  Settings, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  Info, 
  ArrowUpDown, 
  Sparkles, 
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react';

// DB schemas atitikmenys TypeScript
interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  token_balance: number;
  is_admin: boolean;
}

interface Market {
  id: string;
  question: string;
  description: string | null;
  yes_reserves: number;
  no_reserves: number;
  status: 'active' | 'resolved' | 'cancelled';
  outcome: 'YES' | 'NO' | null;
  created_at: string;
  resolved_at: string | null;
  creator_id: string | null;
}

interface Position {
  id: string;
  user_id: string;
  market_id: string;
  yes_shares: number;
  no_shares: number;
  updated_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  market_id: string;
  type: 'buy_yes' | 'buy_no' | 'sell_yes' | 'sell_no' | 'payout';
  token_amount: number;
  share_amount: number;
  price_per_share: number;
  created_at: string;
}

export default function Dashboard() {
  // Režimo būsena (ar sukonfigūruotas Supabase)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio' | 'admin'>('markets');
  
  // Duomenų bazės būsenos
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Greitojo pirkimo būsenos
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betOutcome, setBetOutcome] = useState<'YES' | 'NO'>('YES');
  const [betAmount, setBetAmount] = useState<string>('50');
  const [betLoading, setBetLoading] = useState<boolean>(false);
  const [betMessage, setBetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Akcijų pardavimo būsenos
  const [sellLoading, setSellLoading] = useState<string | null>(null);

  // Naujos rinkos kūrimo būsenos (Admin)
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newLiquidity, setNewLiquidity] = useState<string>('100');
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Tikriname Supabase aplinkos kintamuosius
  useEffect(() => {
    const hasKeys = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setIsDemoMode(!hasKeys);
    
    loadInitialData(!hasKeys);
  }, []);

  // Pradinių duomenų krovimas (Supabase arba LocalStorage)
  const loadInitialData = async (demo: boolean) => {
    setLoading(true);
    if (demo) {
      // 1. Įkrauname duomenis iš LocalStorage arba sugeneruojame pradinius duomenis
      let localProfiles: Profile[] = [];
      let localMarkets: Market[] = [];
      let localPositions: Position[] = [];
      let localTransactions: Transaction[] = [];

      try {
        localProfiles = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
        localMarkets = JSON.parse(localStorage.getItem('bb_markets') || '[]');
        localPositions = JSON.parse(localStorage.getItem('bb_positions') || '[]');
        localTransactions = JSON.parse(localStorage.getItem('bb_transactions') || '[]');
      } catch (e) {
        console.error("Klaida nuskaitant LocalStorage, perrašomi duomenys", e);
      }

      // Sukuriame pradinius vartotojus, jei jų nėra
      if (localProfiles.length === 0) {
        localProfiles = [
          { id: 'u1', email: 'andrius@burgabet.lt', full_name: 'Andrius Gamyba', avatar_url: null, token_balance: 1000, is_admin: false },
          { id: 'u2', email: 'ainius@burgabet.lt', full_name: 'Ainius Integracija', avatar_url: null, token_balance: 1250, is_admin: false },
          { id: 'u3', email: 'einoras@burgabet.lt', full_name: 'Einoras Integracija', avatar_url: null, token_balance: 850, is_admin: false },
          { id: 'u4', email: 'tomas@burgabet.lt', full_name: 'Tomas Fotografija', avatar_url: null, token_balance: 1100, is_admin: false },
          { id: 'admin', email: 'admin@burgabet.lt', full_name: 'Tomas Admin (Vadyba)', avatar_url: null, token_balance: 9999, is_admin: true }
        ];
        localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
      }

      // Sukuriame pradinį prisijungusį vartotoją (Andrius)
      let me = localProfiles.find(p => p.id === 'u1') || localProfiles[0];
      setCurrentUser(me);

      // Sukuriame pradines rinkas, jei jų nėra
      if (localMarkets.length === 0) {
        localMarkets = [
          {
            id: 'm1',
            question: 'Ar Andrius pasieks gamybos normą šią savaitę?',
            description: 'Vertinama pagal gamybos departamento kassavaitinę ataskaitą, teikiamą penktadienį iki 17:00.',
            yes_reserves: 120,
            no_reserves: 80,
            status: 'active',
            outcome: null,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            resolved_at: null,
            creator_id: 'admin'
          },
          {
            id: 'm2',
            question: 'Ar Ainius ir Einoras užbaigs integraciją iki penktadienio?',
            description: 'Integracija laikoma užbaigta, kai kodas patvirtinamas ir sujungiamas į master šaką iki penktadienio 23:59.',
            yes_reserves: 100,
            no_reserves: 100,
            status: 'active',
            outcome: null,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            resolved_at: null,
            creator_id: 'admin'
          },
          {
            id: 'm3',
            question: 'Ar Tomas įkels naujas projekto nuotraukas į sistemą iki mėnesio galo?',
            description: 'Reikia įkelti bent 5 kokybiškas naujo objekto nuotraukas į bendrą galeriją.',
            yes_reserves: 90,
            no_reserves: 110,
            status: 'active',
            outcome: null,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            resolved_at: null,
            creator_id: 'admin'
          }
        ];
        localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      }

      // Išsaugome būseną
      setMarkets(localMarkets);
      setPositions(localPositions.filter(p => p.user_id === me.id));
      setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));
      setTransactions(localTransactions.filter(t => t.user_id === me.id));

    } else {
      // 2. Realus Supabase krovimas
      try {
        // Tikriname sesiją
        const { data: { session } } = await supabase.auth.getSession();
        
        let userId = session?.user?.id;
        
        // Jei nesame prisijungę realiai, sukurkime laikiną vartotoją Supabase lentelėje
        if (!userId) {
          // Naudojame dummy vartotoją iš seed duomenų
          userId = '00000000-0000-0000-0000-000000000002'; // Andrius
        }

        // Nuskaitome profilį
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          setCurrentUser(profile);
        } else {
          // Jei profilio nėra, sukuriam dummy
          setCurrentUser({
            id: userId,
            email: 'user@burgabet.lt',
            full_name: 'Darbuotojas',
            avatar_url: null,
            token_balance: 1000,
            is_admin: false
          });
        }

        // Nuskaitome rinkas
        const { data: dbMarkets } = await supabase
          .from('markets')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (dbMarkets) setMarkets(dbMarkets);

        // Nuskaitome pozicijas
        const { data: dbPositions } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId);
        
        if (dbPositions) setPositions(dbPositions);

        // Lyderių lentelė
        const { data: dbLeaderboard } = await supabase
          .from('profiles')
          .select('*')
          .order('token_balance', { ascending: false });
        
        if (dbLeaderboard) setLeaderboard(dbLeaderboard);

        // Transakcijos
        const { data: dbTrans } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (dbTrans) setTransactions(dbTrans);

      } catch (err) {
        console.error("Supabase krovimo klaida, automatiškai perjungiamas Demo režimas:", err);
        setIsDemoMode(true);
        loadInitialData(true);
        return;
      }
    }
    setLoading(false);
  };

  // Vykdyti statymą (Pirkti YES/NO shares)
  const handlePlaceBet = async () => {
    if (!selectedMarket || !currentUser) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetMessage({ type: 'error', text: 'Prašome įvesti teisingą žetonų kiekį.' });
      return;
    }

    if (currentUser.token_balance < amount) {
      setBetMessage({ type: 'error', text: 'Nepakanka žetonų balanso!' });
      return;
    }

    setBetLoading(true);
    setBetMessage(null);

    if (isDemoMode) {
      // --- DEMO REŽIMAS (LOCALSTORAGE) ---
      setTimeout(() => {
        const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
        const localProfiles: Profile[] = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
        const localPositions: Position[] = JSON.parse(localStorage.getItem('bb_positions') || '[]');
        const localTransactions: Transaction[] = JSON.parse(localStorage.getItem('bb_transactions') || '[]');

        const marketIdx = localMarkets.findIndex(m => m.id === selectedMarket.id);
        const userIdx = localProfiles.findIndex(p => p.id === currentUser.id);

        if (marketIdx === -1 || userIdx === -1) {
          setBetMessage({ type: 'error', text: 'Rinka arba vartotojas nerastas.' });
          setBetLoading(false);
          return;
        }

        const market = localMarkets[marketIdx];
        const user = localProfiles[userIdx];

        // Skaičiuojame gautas akcijas pagal AMM formulę
        const shares = AMM.calculateBuyShares(market.yes_reserves, market.no_reserves, betOutcome, amount);
        const newReserves = AMM.getExpectedNewReserves(market.yes_reserves, market.no_reserves, betOutcome, amount);

        // Atnaujiname rezervus ir balansus
        market.yes_reserves = newReserves.yesReserves;
        market.no_reserves = newReserves.noReserves;
        user.token_balance -= amount;

        // Atnaujiname vartotojo poziciją
        let posIdx = localPositions.findIndex(p => p.user_id === user.id && p.market_id === market.id);
        if (posIdx === -1) {
          const newPos: Position = {
            id: 'pos_' + Date.now(),
            user_id: user.id,
            market_id: market.id,
            yes_shares: betOutcome === 'YES' ? shares : 0,
            no_shares: betOutcome === 'NO' ? shares : 0,
            updated_at: new Date().toISOString()
          };
          localPositions.push(newPos);
        } else {
          if (betOutcome === 'YES') {
            localPositions[posIdx].yes_shares += shares;
          } else {
            localPositions[posIdx].no_shares += shares;
          }
          localPositions[posIdx].updated_at = new Date().toISOString();
        }

        // Įrašome naują transakciją
        const newTx: Transaction = {
          id: 'tx_' + Date.now(),
          user_id: user.id,
          market_id: market.id,
          type: betOutcome === 'YES' ? 'buy_yes' : 'buy_no',
          token_amount: amount,
          share_amount: shares,
          price_per_share: amount / shares,
          created_at: new Date().toISOString()
        };
        localTransactions.push(newTx);

        // Išsaugome atgal į LocalStorage
        localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
        localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
        localStorage.setItem('bb_positions', JSON.stringify(localPositions));
        localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

        // Atnaujiname UI būsenas
        setCurrentUser({ ...user });
        setMarkets(localMarkets);
        setPositions(localPositions.filter(p => p.user_id === user.id));
        setTransactions(localTransactions.filter(t => t.user_id === user.id));
        setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));

        // Atnaujiname šiuo metu pasirinktą rinką
        setSelectedMarket({ ...market });
        setBetMessage({ 
          type: 'success', 
          text: `Sėkmingai atliktas statymas! Įsigijote ${shares.toFixed(2)} ${betOutcome} akcijų.` 
        });
        setBetLoading(false);
      }, 800);

    } else {
      // --- REALUS SUPABASE REŽIMAS ---
      try {
        // Iškviečiame saugią PostgreSQL RPC funkciją
        const { data: shares, error } = await supabase.rpc('place_bet', {
          p_market_id: selectedMarket.id,
          p_outcome: betOutcome,
          p_bet_amount: amount
        });

        if (error) throw error;

        setBetMessage({ 
          type: 'success', 
          text: `Sėkmingai atliktas statymas! Įsigijote ${Number(shares).toFixed(2)} ${betOutcome} akcijų.` 
        });
        
        // Perkrauname duomenis iš DB, kad atnaujintume balansus ir rezervus
        await loadInitialData(false);
        
        // Atnaujiname pasirinktą rinką modaliniame lange
        const updatedMarket = markets.find(m => m.id === selectedMarket.id);
        if (updatedMarket) setSelectedMarket(updatedMarket);

      } catch (err: any) {
        setBetMessage({ type: 'error', text: err.message || 'Klaida atliekant statymą Supabase.' });
      } finally {
        setBetLoading(false);
      }
    }
  };

  // Parduoti turimas akcijas anksčiau laiko
  const handleSellShares = async (marketId: string, outcome: 'YES' | 'NO', sharesCount: number) => {
    if (!currentUser) return;
    setSellLoading(marketId + '_' + outcome);

    if (isDemoMode) {
      // --- DEMO REŽIMAS ---
      setTimeout(() => {
        const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
        const localProfiles: Profile[] = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
        const localPositions: Position[] = JSON.parse(localStorage.getItem('bb_positions') || '[]');
        const localTransactions: Transaction[] = JSON.parse(localStorage.getItem('bb_transactions') || '[]');

        const marketIdx = localMarkets.findIndex(m => m.id === marketId);
        const userIdx = localProfiles.findIndex(p => p.id === currentUser.id);
        const posIdx = localPositions.findIndex(p => p.user_id === currentUser.id && p.market_id === marketId);

        if (marketIdx === -1 || userIdx === -1 || posIdx === -1) {
          alert('Klaida parduodant akcijas: objektai nerasti.');
          setSellLoading(null);
          return;
        }

        const market = localMarkets[marketIdx];
        const user = localProfiles[userIdx];
        const position = localPositions[posIdx];

        // Skaičiuojame atgalinį AMM algoritmą
        const refundTokens = AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, outcome, sharesCount);
        
        // Atnaujiname rezervus pardavimui
        const S = sharesCount;
        const B = -(market.yes_reserves + market.no_reserves + S);
        const C_quad = outcome === 'YES' ? S * market.no_reserves : S * market.yes_reserves;
        const D = B * B - 4 * C_quad;
        const M = (-B - Math.sqrt(D)) / 2;

        if (outcome === 'YES') {
          market.yes_reserves = market.yes_reserves + S - M;
          market.no_reserves = market.no_reserves - M;
          position.yes_shares -= S;
        } else {
          market.yes_reserves = market.yes_reserves - M;
          market.no_reserves = market.no_reserves + S - M;
          position.no_shares -= S;
        }

        user.token_balance += refundTokens;

        // Pridedame transakciją (neigiama suma, nes gaunami pinigai)
        const newTx: Transaction = {
          id: 'tx_' + Date.now(),
          user_id: user.id,
          market_id: market.id,
          type: outcome === 'YES' ? 'sell_yes' : 'sell_no',
          token_amount: -refundTokens,
          share_amount: sharesCount,
          price_per_share: refundTokens / sharesCount,
          created_at: new Date().toISOString()
        };
        localTransactions.push(newTx);

        // Jei nebeliko akcijų, ištriname poziciją
        if (position.yes_shares <= 0 && position.no_shares <= 0) {
          localPositions.splice(posIdx, 1);
        }

        // Išsaugome atgal
        localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
        localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
        localStorage.setItem('bb_positions', JSON.stringify(localPositions));
        localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

        // Atnaujiname UI
        setCurrentUser({ ...user });
        setMarkets(localMarkets);
        setPositions(localPositions.filter(p => p.user_id === user.id));
        setTransactions(localTransactions.filter(t => t.user_id === user.id));
        setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));
        
        setSellLoading(null);
        alert(`Parduota! Susigrąžinote ${refundTokens.toFixed(2)} žetonų.`);
      }, 800);
    } else {
      // --- REALUS SUPABASE REŽIMAS ---
      try {
        const { data: refund, error } = await supabase.rpc('sell_shares', {
          p_market_id: marketId,
          p_outcome: outcome,
          p_shares_to_sell: sharesCount
        });

        if (error) throw error;

        alert(`Parduota! Susigrąžinote ${Number(refund).toFixed(2)} žetonų.`);
        await loadInitialData(false);
      } catch (err: any) {
        alert(err.message || 'Klaida parduodant akcijas Supabase.');
      } finally {
        setSellLoading(null);
      }
    }
  };

  // Kurti naują rinką (Admin)
  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      setAdminMessage({ type: 'error', text: 'Klausimas negali būti tuščias.' });
      return;
    }

    const liquidity = parseFloat(newLiquidity);
    if (isNaN(liquidity) || liquidity < 10) {
      setAdminMessage({ type: 'error', text: 'Pradinis likvidumas turi būti bent 10 kontraktų.' });
      return;
    }

    setAdminMessage(null);

    if (isDemoMode) {
      const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
      const newMarket: Market = {
        id: 'm_' + Date.now(),
        question: newQuestion,
        description: newDescription || null,
        yes_reserves: liquidity,
        no_reserves: liquidity,
        status: 'active',
        outcome: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
        creator_id: currentUser?.id || 'admin'
      };

      localMarkets.unshift(newMarket);
      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      setMarkets(localMarkets);

      setNewQuestion('');
      setNewDescription('');
      setAdminMessage({ type: 'success', text: 'Nauja spėjimų rinka sėkmingai sukurta!' });
    } else {
      try {
        // Tikram Supabase įrašome rinką (RLS leis tik jei esame admin)
        const { error } = await supabase.from('markets').insert({
          question: newQuestion,
          description: newDescription || null,
          yes_reserves: liquidity,
          no_reserves: liquidity,
          creator_id: currentUser?.id
        });

        if (error) throw error;

        setNewQuestion('');
        setNewDescription('');
        setAdminMessage({ type: 'success', text: 'Rinka sėkmingai sukurta Supabase duomenų bazėje!' });
        await loadInitialData(false);
      } catch (err: any) {
        setAdminMessage({ type: 'error', text: err.message || 'Klaida kuriant rinką Supabase.' });
      }
    }
  };

  // Išspręsti rinką (Admin)
  const handleResolveMarket = async (marketId: string, winningOutcome: 'YES' | 'NO') => {
    if (!confirm(`Ar tikrai norite uždaryti šią rinką su rezultatu ${winningOutcome}? Šis veiksmas išdalins žetonus laimėtojams ir negali būti atšauktas.`)) {
      return;
    }

    if (isDemoMode) {
      // --- DEMO REŽIMAS ---
      const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
      const localProfiles: Profile[] = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
      const localPositions: Position[] = JSON.parse(localStorage.getItem('bb_positions') || '[]');
      const localTransactions: Transaction[] = JSON.parse(localStorage.getItem('bb_transactions') || '[]');

      const mIdx = localMarkets.findIndex(m => m.id === marketId);
      if (mIdx === -1) return;

      const market = localMarkets[mIdx];
      market.status = 'resolved';
      market.outcome = winningOutcome;
      market.resolved_at = new Date().toISOString();

      // Išmokėjimai vartotojams
      localPositions.forEach(pos => {
        if (pos.market_id === marketId) {
          const shares = winningOutcome === 'YES' ? pos.yes_shares : pos.no_shares;
          if (shares > 0) {
            const payout = shares * 100;
            const profile = localProfiles.find(p => p.id === pos.user_id);
            if (profile) {
              profile.token_balance += payout;
              
              // Pridedame payout transakciją
              localTransactions.push({
                id: 'tx_pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
                user_id: pos.user_id,
                market_id: marketId,
                type: 'payout',
                token_amount: -payout,
                share_amount: shares,
                price_per_share: 100,
                created_at: new Date().toISOString()
              });
            }
          }
        }
      });

      // Išsaugome
      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
      localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

      // Atnaujiname UI
      setMarkets(localMarkets);
      if (currentUser) {
        const myProfile = localProfiles.find(p => p.id === currentUser.id);
        if (myProfile) setCurrentUser({ ...myProfile });
      }
      setPositions(localPositions.filter(p => p.user_id === currentUser?.id));
      setTransactions(localTransactions.filter(t => t.user_id === currentUser?.id));
      setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));

      alert('Rinka sėkmingai uždaryta, laimėjimai pervesti darbuotojams!');
    } else {
      // --- REALUS SUPABASE REŽIMAS ---
      try {
        const { error } = await supabase.rpc('resolve_market', {
          p_market_id: marketId,
          p_winning_outcome: winningOutcome
        });

        if (error) throw error;

        alert('Rinka uždaryta Supabase duomenų bazėje!');
        await loadInitialData(false);
      } catch (err: any) {
        alert(err.message || 'Klaida uždarant rinką.');
      }
    }
  };

  // Skaičiuojame atviros pozicijos vertę
  const calculatePositionValue = (pos: Position, market: Market) => {
    let value = 0;
    if (pos.yes_shares > 0) {
      value += AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, 'YES', pos.yes_shares);
    }
    if (pos.no_shares > 0) {
      value += AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, 'NO', pos.no_shares);
    }
    return Math.round(value * 100) / 100;
  };

  // Vartotojo bendras kapitalas (Balansas + Pozicijų vertė)
  const getUserNetWorth = (profile: Profile) => {
    let worth = profile.token_balance;
    if (profile.id === currentUser?.id) {
      positions.forEach(pos => {
        const market = markets.find(m => m.id === pos.market_id);
        if (market && market.status === 'active') {
          worth += calculatePositionValue(pos, market);
        }
      });
    }
    return Math.round(worth);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[70vh] text-zinc-400">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-lg">Kraunama BurgaBet sistema...</p>
      </div>
    );
  }

  // Pre-calculations statymų langui
  const currentSpotPrice = selectedMarket 
    ? AMM.getSpotPrice(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome)
    : 0;
  
  const estimatedShares = selectedMarket && betAmount
    ? AMM.calculateBuyShares(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome, parseFloat(betAmount) || 0)
    : 0;

  const estimatedSlippage = selectedMarket && betAmount
    ? AMM.calculateSlippage(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome, parseFloat(betAmount) || 0)
    : 0;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 text-zinc-100 font-sans">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              BurgaBet
            </h1>
            <p className="text-sm text-zinc-400">Vidaus rinkos ir milestones prognozavimas</p>
          </div>
        </div>

        {/* PROFILE SUMMARY */}
        <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-emerald-400 font-bold uppercase">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="text-sm font-semibold">{currentUser?.full_name}</div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-base">
              <Coins className="w-4 h-4" />
              <span>{currentUser?.token_balance.toFixed(1)} žetonai</span>
            </div>
          </div>
          
          <button 
            onClick={() => loadInitialData(isDemoMode)} 
            className="p-2 ml-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Atnaujinti duomenis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BENDRAS PRANEŠIMAS APIE REŽIMĄ */}
      <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          {isDemoMode ? (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-amber-400 font-medium">Demo Režimas (Nėra Supabase kintamųjų)</span>
              <span className="text-zinc-500 hidden sm:inline">| Duomenys saugomi naršyklės LocalStorage. Galite laisvai testuoti sistemą.</span>
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">Supabase Prijungtas</span>
              <span className="text-zinc-500 hidden sm:inline">| Veikia realiu laiku su Postgres duomenų baze ir RLS apsauga.</span>
            </>
          )}
        </div>
        {isDemoMode && (
          <button 
            onClick={() => {
              // Simuliuojame admin teisių perjungimą demo režime
              if (currentUser) {
                const toggled = !currentUser.is_admin;
                const localProfiles = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
                const idx = localProfiles.findIndex((p: Profile) => p.id === currentUser.id);
                if (idx !== -1) {
                  localProfiles[idx].is_admin = toggled;
                  localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
                }
                setCurrentUser({ ...currentUser, is_admin: toggled });
              }
            }}
            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-2 py-1 rounded"
          >
            {currentUser?.is_admin ? 'Atsisakyti Admin teisių' : 'Tapti Admin (Demo)'}
          </button>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <nav className="flex gap-2 mt-6">
        <button
          onClick={() => { setActiveTab('markets'); setSelectedMarket(null); setBetMessage(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'markets'
              ? 'bg-zinc-800 text-white shadow-md border-b-2 border-emerald-500'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rinkos
        </button>
        
        <button
          onClick={() => { setActiveTab('portfolio'); setSelectedMarket(null); setBetMessage(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'portfolio'
              ? 'bg-zinc-800 text-white shadow-md border-b-2 border-emerald-500'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Portfelis ir Lyderiai
        </button>

        {currentUser?.is_admin && (
          <button
            onClick={() => { setActiveTab('admin'); setSelectedMarket(null); setBetMessage(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'admin'
                ? 'bg-zinc-800 text-white shadow-md border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Valdymas (Admin)
          </button>
        )}
      </nav>

      {/* MAIN TAB CONTENT */}
      <main className="mt-8">
        
        {/* TAB 1: ACTIVE MARKETS */}
        {activeTab === 'markets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* MARKETS GRID */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Aktyvios spėjimų rinkos
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-normal">
                  {markets.filter(m => m.status === 'active').length} gyvos
                </span>
              </h2>
              
              {markets.filter(m => m.status === 'active').length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  Nėra aktyvių prognozavimo rinkų.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {markets.filter(m => m.status === 'active').map((market) => {
                    const priceYes = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'YES');
                    const priceNo = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'NO');
                    const isUserPosition = positions.some(p => p.market_id === market.id);

                    return (
                      <div 
                        key={market.id} 
                        onClick={() => { setSelectedMarket(market); setBetMessage(null); }}
                        className={`flex flex-col justify-between p-6 rounded-2xl bg-zinc-900/50 border transition-all duration-300 cursor-pointer ${
                          selectedMarket?.id === market.id 
                            ? 'border-emerald-500 shadow-md shadow-emerald-500/5 bg-zinc-900' 
                            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              Live AMM
                            </span>
                            {isUserPosition && (
                              <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                                Turite poziciją
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-base font-bold text-white line-clamp-2 leading-relaxed">
                            {market.question}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                            {market.description}
                          </p>
                        </div>

                        {/* ODDS / PROBABILITIES */}
                        <div className="mt-6 pt-4 border-t border-zinc-800/80">
                          <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
                            <span>YES tikimybė</span>
                            <span>NO tikimybė</span>
                          </div>
                          <div className="flex gap-2">
                            {/* YES BUTTON SIMULATOR */}
                            <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400">
                              <span className="font-semibold text-sm">YES</span>
                              <span className="font-bold text-base">{priceYes.toFixed(0)}%</span>
                            </div>
                            {/* NO BUTTON SIMULATOR */}
                            <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400">
                              <span className="font-semibold text-sm">NO</span>
                              <span className="font-bold text-base">{priceNo.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RESOLVED MARKETS SECTION */}
              <div className="pt-6">
                <h3 className="text-lg font-bold text-zinc-400 mb-4">Uždarytos / Išspręstos rinkos</h3>
                <div className="space-y-3">
                  {markets.filter(m => m.status === 'resolved').map((market) => (
                    <div key={market.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-sm">
                      <div className="max-w-[70%]">
                        <h4 className="font-semibold text-zinc-300 line-clamp-1">{market.question}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Išspręsta: {market.resolved_at ? new Date(market.resolved_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Laimėjo:</span>
                        <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                          market.outcome === 'YES' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {market.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                  {markets.filter(m => m.status === 'resolved').length === 0 && (
                    <p className="text-xs text-zinc-500">Dar nėra uždarytų rinkų.</p>
                  )}
                </div>
              </div>

            </div>

            {/* QUICK BET AREA (RIGHT PANEL) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4 text-white">
                  <Coins className="w-5 h-5 text-emerald-500" />
                  Statymo skaičiuoklė
                </h2>

                {selectedMarket ? (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Pasirinkta rinka</h3>
                      <p className="text-sm font-bold text-white mt-1 leading-snug">{selectedMarket.question}</p>
                    </div>

                    {/* CHOICE SELECTOR (YES/NO) */}
                    <div>
                      <span className="text-xs text-zinc-400 block mb-2 font-semibold">Pasirinkimas</span>
                      <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setBetOutcome('YES')}
                          className={`flex-1 py-2 text-center rounded-lg text-sm font-bold transition-all ${
                            betOutcome === 'YES' 
                              ? 'bg-emerald-600 text-white shadow-md' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setBetOutcome('NO')}
                          className={`flex-1 py-2 text-center rounded-lg text-sm font-bold transition-all ${
                            betOutcome === 'NO' 
                              ? 'bg-rose-600 text-white shadow-md' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    {/* INPUT AMOUNT */}
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-2">
                        <span className="font-semibold">Žetonų suma</span>
                        <span>Balansas: {currentUser?.token_balance.toFixed(0)}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Sum"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                          Tokenų
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {['10', '50', '100', '250'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBetAmount(val)}
                            className="text-[10px] font-bold bg-zinc-850 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md"
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* PREVIEW DETAILS */}
                    <div className="bg-zinc-950 rounded-xl p-4 text-xs space-y-2.5 border border-zinc-800/50">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Momentinė kaina (1 share):</span>
                        <span className="font-semibold">{currentSpotPrice.toFixed(2)} žetonų</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Prognozuojamas akcijų kiekis:</span>
                        <span className="font-semibold text-white">{estimatedShares.toFixed(2)} shares</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Kainos paslydimas (Slippage):</span>
                        <span className={`font-semibold ${estimatedSlippage > 5 ? 'text-amber-400' : 'text-zinc-300'}`}>
                          {estimatedSlippage}%
                        </span>
                      </div>
                      <div className="border-t border-zinc-800/80 pt-2.5 flex justify-between font-bold text-sm">
                        <span className="text-zinc-300">Išmoka teisingo spėjimo atveju:</span>
                        <span className="text-emerald-400">{(estimatedShares * 100).toFixed(0)} žetonų</span>
                      </div>
                    </div>

                    {/* MESSAGES */}
                    {betMessage && (
                      <div className={`p-3 rounded-xl text-xs flex gap-2 ${
                        betMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {betMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{betMessage.text}</span>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                      type="button"
                      onClick={handlePlaceBet}
                      disabled={betLoading || !betAmount || parseFloat(betAmount) <= 0}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                        betOutcome === 'YES'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {betLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Statymas vykdomas...
                        </>
                      ) : (
                        `Statyti ${betAmount || '0'} žetonų už ${betOutcome}`
                      )}
                    </button>

                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-sm">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    Pasirinkite spėjimų rinką kairėje, kad atliktumėte statymą.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PORTFOLIO & LEADERBOARD */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* PORTFOLIO (LEFT / 2 COLS) */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Mano atviros pozicijos
              </h2>

              {positions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500">
                  Neturite atvirų pozicijų. Atlikite spėjimą „Rinkos“ skiltyje!
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map(pos => {
                    const market = markets.find(m => m.id === pos.market_id);
                    if (!market) return null;

                    const type = pos.yes_shares > 0 ? 'YES' : 'NO';
                    const shares = pos.yes_shares > 0 ? pos.yes_shares : pos.no_shares;
                    const spotPrice = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, type);
                    const currentVal = calculatePositionValue(pos, market);
                    const potentialPayout = shares * 100;

                    return (
                      <div key={pos.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1.5 max-w-[60%]">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            type === 'YES' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {type} AKCIJOS
                          </span>
                          <h3 className="font-bold text-white text-base leading-snug">{market.question}</h3>
                          <div className="flex gap-4 text-xs text-zinc-400 pt-1">
                            <span>Akcijos: <strong className="text-white">{shares.toFixed(2)}</strong></span>
                            <span>Dabartinė kaina: <strong className="text-white">{spotPrice.toFixed(1)} žet.</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800">
                          <div className="text-right">
                            <span className="text-xs text-zinc-400 block">Dabartinė vertė</span>
                            <span className="font-bold text-emerald-400 text-lg">{currentVal.toFixed(1)} žet.</span>
                            <span className="text-[10px] text-zinc-500 block">Potenciali išmoka: {potentialPayout.toFixed(0)}</span>
                          </div>

                          {market.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleSellShares(market.id, type, shares)}
                              disabled={sellLoading === `${market.id}_${type}`}
                              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
                            >
                              {sellLoading === `${market.id}_${type}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Parduoti'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TRANSACTION HISTORY */}
              <div className="pt-6">
                <h3 className="text-lg font-bold text-zinc-300 mb-4">Statymų istorija</h3>
                <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden text-sm">
                  {transactions.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">Istorija tuščia.</div>
                  ) : (
                    <div className="divide-y divide-zinc-800/80">
                      {transactions.slice(0, 10).map((tx) => {
                        const market = markets.find(m => m.id === tx.market_id);
                        const isPayout = tx.type === 'payout';
                        const isBuy = tx.type.startsWith('buy');
                        const amount = Math.abs(tx.token_amount);

                        return (
                          <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isPayout 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : isBuy 
                                      ? 'bg-emerald-500/10 text-emerald-400' 
                                      : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {tx.type.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 mt-1 line-clamp-1">{market?.question || 'Nežinoma rinka'}</p>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${isBuy ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isBuy ? '-' : '+'}{amount.toFixed(1)} žet.
                              </span>
                              <span className="text-[10px] text-zinc-500 block">
                                {tx.share_amount.toFixed(1)} shares po {tx.price_per_share.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* LEADERBOARD (RIGHT COLUMN) */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Darbuotojų lyderių lentelė
              </h2>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 bg-zinc-950 border-b border-zinc-850 flex justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <span>Darbuotojas</span>
                  <span>Bendras kapitalas</span>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {leaderboard.map((user, idx) => {
                    const isMe = user.id === currentUser?.id;
                    const netWorth = getUserNetWorth(user);
                    const isLeader = idx === 0;

                    return (
                      <div key={user.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                        isMe ? 'bg-emerald-500/5' : 'hover:bg-zinc-900/50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center text-xs font-bold ${
                            isLeader ? 'text-yellow-400 text-sm' : isMe ? 'text-emerald-400' : 'text-zinc-500'
                          }`}>
                            {idx + 1}.
                          </span>
                          <div>
                            <span className={`text-sm font-semibold block ${isMe ? 'text-emerald-400' : 'text-zinc-200'}`}>
                              {user.full_name} {isMe && '(Aš)'}
                            </span>
                            <span className="text-[10px] text-zinc-500">{user.email}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-white flex items-center justify-end gap-1">
                            <Coins className="w-3.5 h-3.5 text-emerald-500" />
                            {netWorth}
                          </span>
                          <span className="text-[9px] text-zinc-500 block">Balansas: {user.token_balance.toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: ADMIN PANEL */}
        {activeTab === 'admin' && currentUser?.is_admin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* RESOLUTION ACTIONS (LEFT / 2 COLS) */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Prognozių rinkų uždarymas (Išmokos)
              </h2>

              <div className="space-y-4">
                {markets.filter(m => m.status === 'active').map(market => (
                  <div key={market.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-[65%]">
                      <h3 className="font-bold text-white text-base leading-snug">{market.question}</h3>
                      <p className="text-xs text-zinc-400 mt-1.5">{market.description}</p>
                      <div className="flex gap-3 text-[10px] text-zinc-500 mt-2">
                        <span>YES rezervas: {market.yes_reserves.toFixed(1)}</span>
                        <span>NO rezervas: {market.no_reserves.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleResolveMarket(market.id, 'YES')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Laimėjo YES
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleResolveMarket(market.id, 'NO')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Laimėjo NO
                      </button>
                    </div>
                  </div>
                ))}

                {markets.filter(m => m.status === 'active').length === 0 && (
                  <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500">
                    Nėra aktyvių rinkų, kurias reikėtų uždaryti.
                  </div>
                )}
              </div>
            </div>

            {/* CREATE MARKET FORM (RIGHT COLUMN) */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4 text-white">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  Sukurti naują rinką
                </h2>

                <form onSubmit={handleCreateMarket} className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Prognozės klausimas *</label>
                    <input
                      type="text"
                      required
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Pvz.: Ar užbaigsime ketvirčio tikslus laiku?"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Aprašymas / Taisyklės</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Pateikite taisykles, kaip rinka bus išspręsta..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Pradinis likvidumas (kontraktai) *</label>
                    <input
                      type="number"
                      required
                      value={newLiquidity}
                      onChange={(e) => setNewLiquidity(e.target.value)}
                      placeholder="Pvz.: 100"
                      min="10"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Kuo didesnis likvidumas, tuo didesnių statymų reikės kainos pakeitimui (mažesnis slippage).
                    </p>
                  </div>

                  {adminMessage && (
                    <div className={`p-3 rounded-xl text-xs flex gap-2 ${
                      adminMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {adminMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <span>{adminMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-600/10"
                  >
                    Sukurti rinką
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
