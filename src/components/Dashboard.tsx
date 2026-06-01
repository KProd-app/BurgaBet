'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  LogOut,
  UserPlus,
  LogIn,
  Search,
  Tag,
  Trash2,
  Edit3
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  token_balance: number;
  is_admin: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Market {
  id: string;
  question: string;
  description: string | null;
  yes_reserves: number;
  no_reserves: number;
  token_pool: number;
  status: 'active' | 'resolved' | 'cancelled';
  outcome: 'YES' | 'NO' | null;
  category_id: string | null;
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

// Statinis Tailwind spalvų žemėlapis kategorijų ženkliukams
export function getCategoryColorClasses(color: string): string {
  switch (color) {
    case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'blue': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'amber': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'violet': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
    case 'rose': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  }
}

export function getCategoryButtonActiveClasses(color: string): string {
  switch (color) {
    case 'emerald': return 'bg-emerald-600 text-white';
    case 'blue': return 'bg-blue-600 text-white';
    case 'amber': return 'bg-amber-600 text-white';
    case 'violet': return 'bg-violet-600 text-white';
    case 'rose': return 'bg-rose-600 text-white';
    case 'indigo': return 'bg-indigo-600 text-white';
    case 'cyan': return 'bg-cyan-600 text-white';
    default: return 'bg-zinc-600 text-white';
  }
}

export default function Dashboard() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [userLoading, setUserLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio' | 'admin'>('markets');
  
  // Duomenys
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  console.log("RENDER: Dashboard. currentUser =", currentUser ? currentUser.email : "null", "isDemoMode =", isDemoMode, "loading =", loading);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filtrai ir Paieška
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Autentifikacija
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Greitas statymas
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betOutcome, setBetOutcome] = useState<'YES' | 'NO'>('YES');
  const [betAmount, setBetAmount] = useState<string>('50');
  const [betLoading, setBetLoading] = useState<boolean>(false);
  const [betMessage, setBetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Akcijų pardavimas
  const [sellLoading, setSellLoading] = useState<string | null>(null);

  // Nauja rinka
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategorySelection, setNewCategorySelection] = useState<string>('none');
  const [newLiquidity, setNewLiquidity] = useState<number>(100);
  const [newInitialProb, setNewInitialProb] = useState<number>(50);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Nauja kategorija
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>('blue');
  const [catMessage, setCatMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Kategorijų redagavimas
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>('');
  const [editCategoryColor, setEditCategoryColor] = useState<string>('blue');
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState<boolean>(false);
  const [editCatMessage, setEditCatMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Rinkų redagavimas
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [editMarketQuestion, setEditMarketQuestion] = useState<string>('');
  const [editMarketDescription, setEditMarketDescription] = useState<string>('');
  const [editMarketCategoryId, setEditMarketCategoryId] = useState<string>('none');
  const [isEditMarketModalOpen, setIsEditMarketModalOpen] = useState<boolean>(false);
  const [editMarketMessage, setEditMarketMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Toast pranešimai
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info'; text: string }>>([]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const currentUserRef = useRef<Profile | null>(null);
  const isInitialLoadInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const hasKeys = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setIsDemoMode(!hasKeys);

    let isMounted = true;

    if (!hasKeys) {
      loadInitialData(true).then(() => {
        if (isMounted) setUserLoading(false);
      });
      return;
    }

    // 1. IŠKART krauname viešus duomenis (rinkas, kategorijas, lyderių lentelę)
    // Tai pažadina duomenų bazę ir vartotojas iškart mato turinį be laukimo
    console.log("Greitas viešų duomenų pakrovimas fone...");
    loadMarketsAndLeaderboard(false, null).then(() => {
      console.log("Vieši duomenys užkrauti!");
    });

    let authSubscription: any = null;
    let channel: any = null;

    // 2. Lygiagrečiai tikriname sesiją
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log(`Supabase Auth įvykis: ${event}, Sesija: ${session?.user?.email ?? 'nėra'}`);

      if (session) {
        if (currentUserRef.current?.id !== session.user.id && !isInitialLoadInProgressRef.current) {
          isInitialLoadInProgressRef.current = true;
          console.log("Aptiktas prisijungimas. Kraunami vartotojo duomenys...");
          try {
            // Greitas profilių + user duomenų pakrovimas lygiagrečiai
            const [profileRes, positionsRes, transactionsRes] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', session.user.id).single(),
              supabase.from('positions').select('*').eq('user_id', session.user.id),
              supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
            ]);

            if (!isMounted) return;

            if (profileRes.data) {
              setCurrentUser(profileRes.data);
            } else {
              // Profilio nėra – sukuriame naują
              const tempProfile = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Vartotojas',
                avatar_url: session.user.user_metadata?.avatar_url || null,
                token_balance: 1000.0,
                is_admin: session.user.email === 'admin@burgabet.wtf'
              };
              const { data: newProfile } = await supabase.from('profiles').insert([tempProfile]).select().single();
              if (isMounted) setCurrentUser(newProfile ?? tempProfile);
            }

            if (positionsRes.data) setPositions(positionsRes.data);
            if (transactionsRes.data) setTransactions(transactionsRes.data);

            // Atnaujiname lyderių lentelę su naujais balansais
            const { data: leaderboard } = await supabase.from('profiles').select('*').order('token_balance', { ascending: false });
            if (isMounted && leaderboard) setLeaderboard(leaderboard);
          } catch (err) {
            console.error("Klaida kraunant vartotojo duomenis:", err);
          } finally {
            isInitialLoadInProgressRef.current = false;
            if (isMounted) setUserLoading(false);
          }
        } else {
          if (isMounted) setUserLoading(false);
        }
      } else {
        // Vartotojas neprisijungęs
        setCurrentUser(null);
        setPositions([]);
        setTransactions([]);
        if (isMounted) setUserLoading(false);
      }
    });
    authSubscription = subscription;

    // 3. Realtime prenumerata
    channel = supabase
      .channel('db-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (isMounted) {
          loadMarketsAndLeaderboard(false, currentUserRef.current?.id || null);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Automatiškai uždaryti prisijungimo modalą, kai vartotojas sėkmingai prisijungia (pvz., po puslapio perkrovimo atstačius sesiją)
  useEffect(() => {
    if (currentUser) {
      setIsAuthModalOpen(false);
    }
  }, [currentUser]);

  // Tylus atnaujinimas (Be Loading ekranėlio)
  const loadMarketsAndLeaderboard = async (demo: boolean, userId: string | null) => {
    if (demo) return;
    try {
      console.log("loadMarketsAndLeaderboard: Pradedamas foninis lygiagretus krovimas...");
      const promises: any[] = [
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('markets').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('token_balance', { ascending: false })
      ];

      if (userId) {
        promises.push(supabase.from('profiles').select('*').eq('id', userId).single());
        promises.push(supabase.from('positions').select('*').eq('user_id', userId));
        promises.push(supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }));
      }

      const results = await Promise.all(promises);

      const dbCats = results[0].data;
      const dbMarkets = results[1].data;
      const dbLeaderboard = results[2].data;

      if (dbCats) setCategories(dbCats);
      if (dbMarkets) setMarkets(dbMarkets);
      if (dbLeaderboard) setLeaderboard(dbLeaderboard);

      if (userId && results.length >= 6) {
        const profile = results[3].data;
        const dbPositions = results[4].data;
        const dbTrans = results[5].data;

        if (profile) setCurrentUser(profile);
        if (dbPositions) setPositions(dbPositions);
        if (dbTrans) setTransactions(dbTrans);
      }
      console.log("loadMarketsAndLeaderboard: Foninis krovimas sėkmingai baigtas!");
    } catch (e) {
      console.error("Klaida sinchronizuojant DB fone:", e);
    }
  };

  const loadInitialData = async (demo: boolean, initialSession: any = null) => {
    console.log("loadInitialData: Pradėtas krovimas, demo =", demo);
    setLoading(true);
    try {
      if (demo) {
        let localProfiles: Profile[] = [];
        let localCategories: Category[] = [];
        let localMarkets: Market[] = [];
        let localPositions: Position[] = [];
        let localTransactions: Transaction[] = [];

        try {
          localProfiles = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
          localCategories = JSON.parse(localStorage.getItem('bb_categories') || '[]');
          localMarkets = JSON.parse(localStorage.getItem('bb_markets') || '[]');
          localPositions = JSON.parse(localStorage.getItem('bb_positions') || '[]');
          localTransactions = JSON.parse(localStorage.getItem('bb_transactions') || '[]');
        } catch (e) {
          console.error("Klaida skaitant LocalStorage", e);
        }

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

        let me = localProfiles.find(p => p.id === 'u1') || localProfiles[0];
        setCurrentUser(me);

        if (localCategories.length === 0) {
          localCategories = [
            { id: 'c1', name: 'Gamyba', color: 'emerald', created_at: new Date().toISOString() },
            { id: 'c2', name: 'Integracija', color: 'blue', created_at: new Date().toISOString() },
            { id: 'c3', name: 'Fotografija', color: 'amber', created_at: new Date().toISOString() },
            { id: 'c4', name: 'Biuras', color: 'violet', created_at: new Date().toISOString() }
          ];
          localStorage.setItem('bb_categories', JSON.stringify(localCategories));
        }

        if (localMarkets.length === 0) {
          localMarkets = [
            {
              id: 'm1',
              question: 'Ar Andrius pasieks gamybos normą šią savaitę?',
              description: 'Vertinama pagal gamybos departamento kassavaitinę ataskaitą, teikiamą penktadienį iki 17:00.',
              yes_reserves: 120,
              no_reserves: 80,
              token_pool: 0,
              status: 'active',
              outcome: null,
              category_id: 'c1',
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
              token_pool: 0,
              status: 'active',
              outcome: null,
              category_id: 'c2',
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
              token_pool: 0,
              status: 'active',
              outcome: null,
              category_id: 'c3',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              resolved_at: null,
              creator_id: 'admin'
            }
          ];
          localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
        }

        setCategories(localCategories);
        setMarkets(localMarkets);
        setPositions(localPositions.filter(p => p.user_id === me.id));
        setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));
        setTransactions(localTransactions.filter(t => t.user_id === me.id));
      } else {
        let session = initialSession;
        if (!session) {
          console.log("loadInitialData: initialSession neperduotas, nuskaitoma Supabase sesija...");
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          session = currentSession;
        }
        console.log("loadInitialData: Naudojama sesija:", session ? `Yra (${session.user.email})` : "Nėra");
        
        if (session) {
          const userId = session.user.id;
          
           // Apjungiame visus Supabase krovimo veiksmus ir apribojame bendru laiko limitu (timeout)
          const loadDataSteps = async () => {
            console.log("loadInitialData: Pradedamas lygiagretus duomenų krovimas iš Supabase vartotojui:", userId);
            
            const promises = [
              supabase.from('profiles').select('*').eq('id', userId).single(),
              supabase.from('categories').select('*').order('name', { ascending: true }),
              supabase.from('markets').select('*').order('created_at', { ascending: false }),
              supabase.from('profiles').select('*').order('token_balance', { ascending: false }),
              supabase.from('positions').select('*').eq('user_id', userId),
              supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
            ];

            const [
              profileRes,
              catsRes,
              marketsRes,
              leaderboardRes,
              positionsRes,
              transactionsRes
            ] = await Promise.all(promises);

            const profile = profileRes.data;
            const profileErr = profileRes.error;

            if (profileErr) {
              console.warn("loadInitialData: Nepavyko gauti profilio iš lentelės:", profileErr.message);
            }

            if (profile) {
              console.log("loadInitialData: Profilis sėkmingai rastas, nustatomas:", profile);
              setCurrentUser(profile);
            } else {
              console.log("loadInitialData: Profilio lentelėje nėra įrašo. Bandoma sukurti naują įrašą...");
              const tempProfile = {
                id: userId,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Vartotojas',
                avatar_url: session.user.user_metadata?.avatar_url || null,
                token_balance: 1000.0,
                is_admin: session.user.email === 'admin@burgabet.wtf'
              };

              try {
                const { data: newProfile, error: insertErr } = await supabase
                  .from('profiles')
                  .insert([tempProfile])
                  .select()
                  .single();

                if (insertErr) {
                  console.warn("loadInitialData: Nepavyko sukurti profilio įrašo duomenų bazėje:", insertErr.message);
                  setCurrentUser(tempProfile);
                } else if (newProfile) {
                  console.log("loadInitialData: Profilis sėkmingai sukurtas duomenų bazėje:", newProfile);
                  setCurrentUser(newProfile);
                } else {
                  setCurrentUser(tempProfile);
                }
              } catch (insertCatchErr) {
                console.error("loadInitialData: Išimtis bandant įrašyti profilį:", insertCatchErr);
                setCurrentUser(tempProfile);
              }
            }

            // Nustatome visus likusius duomenis, gautus lygiagrečiai
            if (catsRes.data) setCategories(catsRes.data);
            if (marketsRes.data) setMarkets(marketsRes.data);
            if (leaderboardRes.data) setLeaderboard(leaderboardRes.data);
            if (positionsRes.data) setPositions(positionsRes.data);
            if (transactionsRes.data) setTransactions(transactionsRes.data);
            console.log("loadInitialData: Lygiagretus krovimas sėkmingai baigtas!");
          };

          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("Duomenų krovimo iš Supabase laikas baigėsi (timeout)")), 45000)
          );

          await Promise.race([loadDataSteps(), timeoutPromise]);
        } else {
          setCurrentUser(null);
          await loadMarketsAndLeaderboard(false, null);
        }
      }
    } catch (err: any) {
      console.error("Užkrovimo klaida:", err);
      const hasKeys = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      if (!hasKeys) {
        setIsDemoMode(true);
        try {
          const localCats = JSON.parse(localStorage.getItem('bb_categories') || '[]');
          const localMarkets = JSON.parse(localStorage.getItem('bb_markets') || '[]');
          setCategories(localCats);
          setMarkets(localMarkets);
        } catch (e) {
          console.error("Klaida nuskaitant atsargines kategorijas iš LocalStorage:", e);
        }
      } else {
        // Jeigu turime raktus, pasiliekame Supabase režime, bet pranešame apie klaidą vartotojui
        showToast('error', 'Nepavyko užkrauti duomenų iš Supabase: ' + (err.message || 'Tinklo klaida'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Prašome užpildyti visus laukus.');
      return;
    }
    
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authEmail.split('@')[0]
            }
          }
        });
        if (error) throw error;
        showToast('success', 'Registracija sėkminga! Galite prisijungti.');
        setAuthMode('login');
        setAuthLoading(false);
        return;
      }
      
      setIsAuthModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Įvyko autentifikacijos klaida.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isDemoMode) {
      showToast('info', 'Google prisijungimas neveikia Demo režime. Suveskite Supabase raktus, kad aktyvuotumėte.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Klaida jungiantis su Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      showToast('info', 'Atsijungėte iš demo profilio.');
    } else {
      await supabase.auth.signOut();
    }
  };

  // Vykdyti statymą
  const handlePlaceBet = async () => {
    if (!currentUser) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedMarket) return;
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

        const shares = AMM.calculateBuyShares(market.yes_reserves, market.no_reserves, betOutcome, amount);
        const newReserves = AMM.getExpectedNewReserves(market.yes_reserves, market.no_reserves, betOutcome, amount);

        market.yes_reserves = newReserves.yesReserves;
        market.no_reserves = newReserves.noReserves;
        market.token_pool = (market.token_pool || 0) + amount;
        user.token_balance -= amount;

        let posIdx = localPositions.findIndex(p => p.user_id === user.id && p.market_id === market.id);
        if (posIdx === -1) {
          localPositions.push({
            id: 'pos_' + Date.now(),
            user_id: user.id,
            market_id: market.id,
            yes_shares: betOutcome === 'YES' ? shares : 0,
            no_shares: betOutcome === 'NO' ? shares : 0,
            updated_at: new Date().toISOString()
          });
        } else {
          if (betOutcome === 'YES') {
            localPositions[posIdx].yes_shares += shares;
          } else {
            localPositions[posIdx].no_shares += shares;
          }
          localPositions[posIdx].updated_at = new Date().toISOString();
        }

        localTransactions.push({
          id: 'tx_' + Date.now(),
          user_id: user.id,
          market_id: market.id,
          type: betOutcome === 'YES' ? 'buy_yes' : 'buy_no',
          token_amount: amount,
          share_amount: shares,
          price_per_share: amount / shares,
          created_at: new Date().toISOString()
        });

        localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
        localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
        localStorage.setItem('bb_positions', JSON.stringify(localPositions));
        localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

        setCurrentUser({ ...user });
        setMarkets(localMarkets);
        setPositions(localPositions.filter(p => p.user_id === user.id));
        setTransactions(localTransactions.filter(t => t.user_id === user.id));
        setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));

        setSelectedMarket({ ...market });
        setBetMessage({ 
          type: 'success', 
          text: `Sėkmingai atliktas statymas! Įsigijote ${shares.toFixed(2)} ${betOutcome} akcijų.` 
        });
        setBetLoading(false);
      }, 800);
    } else {
      try {
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
        
        await loadMarketsAndLeaderboard(false, currentUser.id);
        const updatedMarket = markets.find(m => m.id === selectedMarket.id);
        if (updatedMarket) setSelectedMarket(updatedMarket);
      } catch (err: any) {
        setBetMessage({ type: 'error', text: err.message || 'Klaida atliekant statymą Supabase.' });
      } finally {
        setBetLoading(false);
      }
    }
  };

  // Parduoti akcijas
  const handleSellShares = async (marketId: string, outcome: 'YES' | 'NO', sharesCount: number) => {
    if (!currentUser) return;
    setSellLoading(marketId + '_' + outcome);

    if (isDemoMode) {
      setTimeout(() => {
        const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
        const localProfiles: Profile[] = JSON.parse(localStorage.getItem('bb_profiles') || '[]');
        const localPositions: Position[] = JSON.parse(localStorage.getItem('bb_positions') || '[]');
        const localTransactions: Transaction[] = JSON.parse(localStorage.getItem('bb_transactions') || '[]');

        const marketIdx = localMarkets.findIndex(m => m.id === marketId);
        const userIdx = localProfiles.findIndex(p => p.id === currentUser.id);
        const posIdx = localPositions.findIndex(p => p.user_id === currentUser.id && p.market_id === marketId);

        if (marketIdx === -1 || userIdx === -1 || posIdx === -1) {
          showToast('error', 'Klaida parduodant akcijas.');
          setSellLoading(null);
          return;
        }

        const market = localMarkets[marketIdx];
        const user = localProfiles[userIdx];
        const position = localPositions[posIdx];

        const refundTokens = AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, outcome, sharesCount);
        
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

        market.token_pool = Math.max(0, (market.token_pool || 0) - refundTokens);
        user.token_balance += refundTokens;

        localTransactions.push({
          id: 'tx_' + Date.now(),
          user_id: user.id,
          market_id: market.id,
          type: outcome === 'YES' ? 'sell_yes' : 'sell_no',
          token_amount: -refundTokens,
          share_amount: sharesCount,
          price_per_share: refundTokens / sharesCount,
          created_at: new Date().toISOString()
        });

        if (position.yes_shares <= 0 && position.no_shares <= 0) {
          localPositions.splice(posIdx, 1);
        }

        localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
        localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
        localStorage.setItem('bb_positions', JSON.stringify(localPositions));
        localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

        setCurrentUser({ ...user });
        setMarkets(localMarkets);
        setPositions(localPositions.filter(p => p.user_id === user.id));
        setTransactions(localTransactions.filter(t => t.user_id === user.id));
        setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));
        
        setSellLoading(null);
        showToast('success', `Parduota! Susigrąžinote ${refundTokens.toFixed(2)} žetonų.`);
      }, 800);
    } else {
      try {
        const { data: refund, error } = await supabase.rpc('sell_shares', {
          p_market_id: marketId,
          p_outcome: outcome,
          p_shares_to_sell: sharesCount
        });

        if (error) throw error;

        showToast('success', `Parduota! Susigrąžinote ${Number(refund).toFixed(2)} žetonų.`);
        await loadMarketsAndLeaderboard(false, currentUser.id);
      } catch (err: any) {
        showToast('error', err.message || 'Klaida parduodant akcijas.');
      } finally {
        setSellLoading(null);
      }
    }
  };

  // Kurti naują spėjimą (Admin)
  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      setAdminMessage({ type: 'error', text: 'Klausimas negali būti tuščias.' });
      return;
    }
    if (newLiquidity < 10) {
      setAdminMessage({ type: 'error', text: 'Likvidumas turi būti bent 10 kontraktų.' });
      return;
    }

    setAdminMessage(null);

    const categoryId = newCategorySelection === 'none' ? null : newCategorySelection;
    const { yesReserves, noReserves } = AMM.getInitialReservesFromProb(newLiquidity, newInitialProb);

    if (isDemoMode) {
      const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
      const newMarket: Market = {
        id: 'm_' + Date.now(),
        question: newQuestion,
        description: newDescription || null,
        yes_reserves: yesReserves,
        no_reserves: noReserves,
        token_pool: 0,
        status: 'active',
        outcome: null,
        category_id: categoryId,
        created_at: new Date().toISOString(),
        resolved_at: null,
        creator_id: currentUser?.id || 'admin'
      };

      localMarkets.unshift(newMarket);
      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      setMarkets(localMarkets);

      setNewQuestion('');
      setNewDescription('');
      setAdminMessage({ type: 'success', text: `Rinka sukurta! Pradinė tikimybė YES: ${newInitialProb}%` });
    } else {
      try {
        const { error } = await supabase.from('markets').insert({
          question: newQuestion,
          description: newDescription || null,
          yes_reserves: yesReserves,
          no_reserves: noReserves,
          token_pool: 0,
          category_id: categoryId,
          creator_id: currentUser?.id
        });

        if (error) throw error;

        setNewQuestion('');
        setNewDescription('');
        setAdminMessage({ type: 'success', text: `Rinka sukurta Supabase! YES: ${newInitialProb}%` });
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        setAdminMessage({ type: 'error', text: err.message || 'Klaida kuriant rinką Supabase.' });
      }
    }
  };

  // Kurti naują kategoriją (Admin)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCatMessage({ type: 'error', text: 'Kategorijos pavadinimas negali būti tuščias.' });
      return;
    }

    setCatMessage(null);

    if (isDemoMode) {
      const localCats: Category[] = JSON.parse(localStorage.getItem('bb_categories') || '[]');
      if (localCats.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
        setCatMessage({ type: 'error', text: 'Kategorija tokiu pavadinimu jau egzistuoja.' });
        return;
      }

      const newCat: Category = {
        id: 'cat_' + Date.now(),
        name: newCategoryName.trim(),
        color: newCategoryColor,
        created_at: new Date().toISOString()
      };

      localCats.push(newCat);
      localStorage.setItem('bb_categories', JSON.stringify(localCats));
      setCategories(localCats);

      setNewCategoryName('');
      setCatMessage({ type: 'success', text: 'Kategorija sukurta!' });
    } else {
      try {
        const { error } = await supabase.from('categories').insert({
          name: newCategoryName.trim(),
          color: newCategoryColor
        });

        if (error) throw error;

        setNewCategoryName('');
        setCatMessage({ type: 'success', text: 'Kategorija sukurta Supabase!' });
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        setCatMessage({ type: 'error', text: err.message || 'Klaida kuriant kategoriją Supabase.' });
      }
    }
  };

  // Trinti kategoriją (Admin)
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Ar tikrai norite trinti šią kategoriją? Visos rinkos, kurios ją naudoja, bus paliktos be kategorijos.')) {
      return;
    }

    if (isDemoMode) {
      let localCats: Category[] = JSON.parse(localStorage.getItem('bb_categories') || '[]');
      let localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');

      localCats = localCats.filter(c => c.id !== catId);
      localMarkets = localMarkets.map(m => m.category_id === catId ? { ...m, category_id: null } : m);

      localStorage.setItem('bb_categories', JSON.stringify(localCats));
      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));

      setCategories(localCats);
      setMarkets(localMarkets);
      showToast('success', 'Kategorija ištrinta!');
    } else {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', catId);

        if (error) throw error;

        showToast('success', 'Kategorija ištrinta iš Supabase!');
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        showToast('error', err.message || 'Klaida trinant kategoriją.');
      }
    }
  };

  // Atnaujinti kategoriją (Admin)
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      setEditCatMessage({ type: 'error', text: 'Kategorijos pavadinimas negali būti tuščias.' });
      return;
    }

    setEditCatMessage(null);

    if (isDemoMode) {
      const localCats: Category[] = JSON.parse(localStorage.getItem('bb_categories') || '[]');
      const existIdx = localCats.findIndex(c => c.id === editingCategory.id);
      if (existIdx === -1) {
        setEditCatMessage({ type: 'error', text: 'Kategorija nerasta.' });
        return;
      }

      if (localCats.some(c => c.id !== editingCategory.id && c.name.toLowerCase() === editCategoryName.trim().toLowerCase())) {
        setEditCatMessage({ type: 'error', text: 'Kategorija tokiu pavadinimu jau egzistuoja.' });
        return;
      }

      localCats[existIdx] = {
        ...localCats[existIdx],
        name: editCategoryName.trim(),
        color: editCategoryColor
      };

      localStorage.setItem('bb_categories', JSON.stringify(localCats));
      setCategories(localCats);
      setEditingCategory(null);
      setIsEditCategoryModalOpen(false);
      showToast('success', 'Kategorija atnaujinta vietinėje atmintyje!');
    } else {
      try {
        const { error } = await supabase
          .from('categories')
          .update({
            name: editCategoryName.trim(),
            color: editCategoryColor
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        setEditingCategory(null);
        setIsEditCategoryModalOpen(false);
        showToast('success', 'Kategorija atnaujinta Supabase!');
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        setEditCatMessage({ type: 'error', text: err.message || 'Klaida atnaujinant kategoriją Supabase.' });
      }
    }
  };

  // Atnaujinti spėjimų rinką (Admin)
  const handleUpdateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMarket) return;
    if (!editMarketQuestion.trim()) {
      setEditMarketMessage({ type: 'error', text: 'Klausimas negali būti tuščias.' });
      return;
    }

    setEditMarketMessage(null);
    const categoryId = editMarketCategoryId === 'none' ? null : editMarketCategoryId;

    if (isDemoMode) {
      const localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
      const mIdx = localMarkets.findIndex(m => m.id === editingMarket.id);
      if (mIdx === -1) {
        setEditMarketMessage({ type: 'error', text: 'Rinka nerasta.' });
        return;
      }

      localMarkets[mIdx] = {
        ...localMarkets[mIdx],
        question: editMarketQuestion.trim(),
        description: editMarketDescription.trim() || null,
        category_id: categoryId
      };

      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      setMarkets(localMarkets);
      setEditingMarket(null);
      setIsEditMarketModalOpen(false);
      showToast('success', 'Prognozė atnaujinta vietinėje atmintyje!');
    } else {
      try {
        const { error } = await supabase
          .from('markets')
          .update({
            question: editMarketQuestion.trim(),
            description: editMarketDescription.trim() || null,
            category_id: categoryId
          })
          .eq('id', editingMarket.id);

        if (error) throw error;

        setEditingMarket(null);
        setIsEditMarketModalOpen(false);
        showToast('success', 'Prognozė atnaujinta Supabase!');
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        setEditMarketMessage({ type: 'error', text: err.message || 'Klaida atnaujinant rinką Supabase.' });
      }
    }
  };

  // Ištrinti spėjimų rinką (Admin)
  const handleDeleteMarket = async (marketId: string) => {
    if (!confirm('Ar tikrai norite trinti šią rinką? Visi vartotojų statymai ir transakcijos šioje rinkoje bus ištrinti. Šis veiksmas negrįžtamas!')) {
      return;
    }

    if (isDemoMode) {
      let localMarkets: Market[] = JSON.parse(localStorage.getItem('bb_markets') || '[]');
      let localPositions: Position[] = JSON.parse(localStorage.getItem('bb_positions') || '[]');
      let localTransactions: Transaction[] = JSON.parse(localStorage.getItem('bb_transactions') || '[]');

      localMarkets = localMarkets.filter(m => m.id !== marketId);
      localPositions = localPositions.filter(p => p.market_id !== marketId);
      localTransactions = localTransactions.filter(t => t.market_id !== marketId);

      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      localStorage.setItem('bb_positions', JSON.stringify(localPositions));
      localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

      setMarkets(localMarkets);
      setPositions(localPositions.filter(p => p.user_id === currentUser?.id));
      setTransactions(localTransactions.filter(t => t.user_id === currentUser?.id));
      showToast('success', 'Rinka ištrinta iš vietinės atminties!');
    } else {
      try {
        const { error } = await supabase
          .from('markets')
          .delete()
          .eq('id', marketId);

        if (error) throw error;

        showToast('success', 'Rinka sėkmingai ištrinta iš Supabase!');
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        showToast('error', err.message || 'Klaida trinant rinką.');
      }
    }
  };

  // Rinkos išsprendimas
  const handleResolveMarket = async (marketId: string, winningOutcome: 'YES' | 'NO') => {
    if (!confirm(`Ar tikrai norite uždaryti šią rinką su rezultatu ${winningOutcome}? Šis veiksmas išdalins žetonus laimėtojams.`)) {
      return;
    }

    if (isDemoMode) {
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

      const tokenPool = market.token_pool || 0;
      const allMarketPositions = localPositions.filter(p => p.market_id === marketId);
      const totalWinningShares = allMarketPositions.reduce((sum, pos) => {
        return sum + (winningOutcome === 'YES' ? pos.yes_shares : pos.no_shares);
      }, 0);
      const payoutPerShare = totalWinningShares > 0 && tokenPool > 0 ? tokenPool / totalWinningShares : 0;

      allMarketPositions.forEach(pos => {
        const shares = winningOutcome === 'YES' ? pos.yes_shares : pos.no_shares;
        if (shares > 0 && payoutPerShare > 0) {
          const payout = shares * payoutPerShare;
          const profile = localProfiles.find(p => p.id === pos.user_id);
          if (profile) {
            profile.token_balance += payout;
            localTransactions.push({
              id: 'tx_pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
              user_id: pos.user_id,
              market_id: marketId,
              type: 'payout',
              token_amount: payout,
              share_amount: shares,
              price_per_share: payoutPerShare,
              created_at: new Date().toISOString()
            });
          }
        }
      });

      localStorage.setItem('bb_markets', JSON.stringify(localMarkets));
      localStorage.setItem('bb_profiles', JSON.stringify(localProfiles));
      localStorage.setItem('bb_transactions', JSON.stringify(localTransactions));

      setMarkets(localMarkets);
      if (currentUser) {
        const myProfile = localProfiles.find(p => p.id === currentUser.id);
        if (myProfile) setCurrentUser({ ...myProfile });
      }
      setPositions(localPositions.filter(p => p.user_id === currentUser?.id));
      setTransactions(localTransactions.filter(t => t.user_id === currentUser?.id));
      setLeaderboard([...localProfiles].sort((a, b) => b.token_balance - a.token_balance));

      showToast('success', 'Rinka sėkmingai uždaryta!');
    } else {
      try {
        const { error } = await supabase.rpc('resolve_market', {
          p_market_id: marketId,
          p_winning_outcome: winningOutcome
        });

        if (error) throw error;

        showToast('success', 'Rinka uždaryta!');
        await loadMarketsAndLeaderboard(false, currentUser?.id || null);
      } catch (err: any) {
        showToast('error', err.message || 'Klaida uždarant rinką.');
      }
    }
  };

  // Pagalbinė funkcija pozicijos vertei skaičiuoti
  const calculatePositionValue = (pos: Position, market: Market): number => {
    if (pos.yes_shares > 0) {
      return AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, 'YES', pos.yes_shares);
    } else if (pos.no_shares > 0) {
      return AMM.calculateSellRefund(market.yes_reserves, market.no_reserves, 'NO', pos.no_shares);
    }
    return 0;
  };

  // Pagalbinė funkcija bendram vartotojo kapitalui skaičiuoti (Leaderboard'ui)
  const getUserNetWorth = (user: Profile): number => {
    const userPos = positions.filter(p => p.user_id === user.id);
    let posValue = 0;
    userPos.forEach(pos => {
      const market = markets.find(m => m.id === pos.market_id);
      if (market && market.status === 'active') {
        posValue += calculatePositionValue(pos, market);
      }
    });
    return Math.round((user.token_balance + posValue) * 10) / 10;
  };

  // Statymo skaičiuoklės skaičiavimai
  const currentSpotPrice = selectedMarket
    ? AMM.getSpotPrice(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome)
    : 0;

  const betAmountNum = parseFloat(betAmount) || 0;
  
  const estimatedShares = selectedMarket
    ? AMM.calculateBuyShares(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome, betAmountNum)
    : 0;

  const estimatedSlippage = selectedMarket
    ? AMM.calculateSlippage(selectedMarket.yes_reserves, selectedMarket.no_reserves, betOutcome, betAmountNum)
    : 0;

  // Filtravimo ir paieškos logika
  const filteredMarkets = markets.filter(market => {
    // 1. Kategorijos filtras
    if (selectedCategoryId !== 'all' && market.category_id !== selectedCategoryId) {
      return false;
    }
    // 2. Paieškos žodžio filtras
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const questionMatch = market.question.toLowerCase().includes(query);
      const descMatch = market.description?.toLowerCase().includes(query) || false;
      return questionMatch || descMatch;
    }
    return true;
  });



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

        {userLoading ? (
          <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl animate-pulse">
            <div className="w-10 h-10 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
          </div>
        ) : currentUser ? (
          <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-emerald-400 font-bold uppercase">
              {currentUser.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-sm font-semibold">{currentUser.full_name}</div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-base">
                <Coins className="w-4 h-4" />
                <span>{currentUser.token_balance.toFixed(1)} žetonai</span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-zinc-800 mx-1"></div>
            
            <button 
              onClick={handleLogout} 
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
              title="Atsijungti"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-sm font-bold rounded-xl transition-all"
            >
              <LogIn className="w-4 h-4" />
              Prisijungti
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/15"
            >
              <UserPlus className="w-4 h-4" />
              Registruotis
            </button>
          </div>
        )}
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
              <span className="text-zinc-500 hidden sm:inline">| Realaus laiko režimas su Postgres duomenų baze ir RLS apsauga.</span>
            </>
          )}
        </div>
        {isDemoMode && currentUser && (
          <button 
            onClick={() => {
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
            {currentUser.is_admin ? 'Atsisakyti Admin teisių' : 'Tapti Admin (Demo)'}
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
              
              {/* FILTERS & SEARCH ROW */}
              <div className="flex flex-col gap-4 p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ieškoti aktyvių spėjimų..."
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider shrink-0 mr-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Filtruoti:
                  </span>
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      selectedCategoryId === 'all'
                        ? 'bg-zinc-100 text-zinc-900 font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Visi spėjimai
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        selectedCategoryId === cat.id
                          ? getCategoryButtonActiveClasses(cat.color)
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-bold flex items-center gap-2">
                Aktyvios spėjimų rinkos
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-normal">
                  {filteredMarkets.filter(m => m.status === 'active').length} gyvos
                </span>
              </h2>
              
              {filteredMarkets.filter(m => m.status === 'active').length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  Nėra aktyvių rinkų, atitinkančių jūsų filtrus.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredMarkets.filter(m => m.status === 'active').map((market) => {
                    const priceYes = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'YES');
                    const priceNo = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'NO');
                    const isUserPosition = positions.some(p => p.market_id === market.id);
                    const marketCat = categories.find(c => c.id === market.category_id);

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
                            <div className="flex gap-1.5 items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                Live AMM
                              </span>
                              {marketCat && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getCategoryColorClasses(marketCat.color)}`}>
                                  {marketCat.name}
                                </span>
                              )}
                            </div>
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

                        <div className="mt-6 pt-4 border-t border-zinc-800/80">
                          <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
                            <span>YES tikimybė</span>
                            <span>NO tikimybė</span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400">
                              <span className="font-semibold text-sm">YES</span>
                              <span className="font-bold text-base">{priceYes.toFixed(0)}%</span>
                            </div>
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
                  {filteredMarkets.filter(m => m.status === 'resolved').map((market) => {
                    const marketCat = categories.find(c => c.id === market.category_id);
                    return (
                      <div key={market.id} className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="max-w-[75%] space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-zinc-300 leading-snug">{market.question}</h4>
                            {marketCat && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${getCategoryColorClasses(marketCat.color)}`}>
                                {marketCat.name}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            Išspręsta: {market.resolved_at ? new Date(market.resolved_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                    );
                  })}
                  {markets.filter(m => m.status === 'resolved').length === 0 && (
                    <p className="text-xs text-zinc-500">Dar nėra uždarytų rinkų.</p>
                  )}
                </div>
              </div>

            </div>

            {/* QUICK BET AREA */}
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

                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-2">
                        <span className="font-semibold">Žetonų suma</span>
                        <span>Balansas: {currentUser ? currentUser.token_balance.toFixed(0) : '0'}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Sum"
                          disabled={!currentUser}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                          Tokenų
                        </span>
                      </div>
                      {currentUser && (
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
                      )}
                    </div>

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
                      <div className="border-t border-zinc-800/80 pt-2.5 space-y-1.5">
                        <div className="flex justify-between font-bold text-sm">
                          <span className="text-zinc-300">Akcijų kiekis:</span>
                          <span className="text-emerald-400">{estimatedShares.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Bendras fondas dabar:</span>
                          <span>{((selectedMarket?.token_pool || 0) + betAmountNum).toFixed(0)} žetonų</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 pt-0.5">Galutinė išmoka priklauso nuo fondo dydžio uždarymo metu.</p>
                      </div>
                    </div>

                    {betMessage && (
                      <div className={`p-3 rounded-xl text-xs flex gap-2 ${
                        betMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {betMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{betMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handlePlaceBet}
                      disabled={betLoading || !!(currentUser && (!betAmount || parseFloat(betAmount) <= 0))}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                        !currentUser 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                          : betOutcome === 'YES'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10'
                      } disabled:opacity-50`}
                    >
                      {betLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Statymas...
                        </>
                      ) : !currentUser ? (
                        'Prisijunkite, kad statytumėte'
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
            
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Mano atviros pozicijos
              </h2>

              {!currentUser ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500">
                  Prisijunkite, kad pamatytumėte savo atviras pozicijas.
                </div>
              ) : positions.length === 0 ? (
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
                    const tokenPool = market.token_pool || 0;

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
                            <span className="text-[10px] text-zinc-500 block">Fondas: {tokenPool.toFixed(0)} žet.</span>
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
                  {!currentUser ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">Prisijunkite, kad pamatytumėte statymų istoriją.</div>
                  ) : transactions.length === 0 ? (
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

            {/* LEADERBOARD */}
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
                  {leaderboard.length === 0 && (
                    <div className="p-6 text-center text-zinc-500 text-xs">Vartotojų dar nėra. Užregistruokite pirmąjį!</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: ADMIN PANEL */}
        {activeTab === 'admin' && currentUser?.is_admin && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* LEFT: MARKET LIST + CATEGORY LIST */}
            <div className="lg:col-span-3 space-y-8">

              {/* ACTIVE MARKETS */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Aktyvios rinkos
                  <span className="text-xs font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                    {markets.filter(m => m.status === 'active').length} aktyvios
                  </span>
                </h2>

                {markets.filter(m => m.status === 'active').length === 0 && (
                  <div className="p-10 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 text-zinc-500 text-sm">
                    Nėra aktyvių rinkų. Sukurkite naują dešinėje.
                  </div>
                )}

                {markets.filter(m => m.status === 'active').map(market => {
                  const marketCat = categories.find(c => c.id === market.category_id);
                  const priceYes = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'YES');
                  const priceNo = AMM.getSpotPrice(market.yes_reserves, market.no_reserves, 'NO');
                  const pool = market.token_pool || 0;

                  return (
                    <div key={market.id} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                      {/* Top row: question + cat */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {marketCat && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getCategoryColorClasses(marketCat.color)}`}>
                                {marketCat.name}
                              </span>
                            )}
                            {pool === 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Nėra statymų
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-sm leading-snug">{market.question}</h3>
                          {market.description && (
                            <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{market.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMarket(market);
                              setEditMarketQuestion(market.question);
                              setEditMarketDescription(market.description || '');
                              setEditMarketCategoryId(market.category_id || 'none');
                              setIsEditMarketModalOpen(true);
                            }}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-700"
                            title="Redaguoti"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMarket(market.id)}
                            className="p-2 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors border border-zinc-700 hover:border-rose-900"
                            title="Trinti"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-2.5 text-center">
                          <div className="text-emerald-400 font-bold text-base">{priceYes.toFixed(0)}%</div>
                          <div className="text-zinc-500 text-[10px]">YES tikimybė</div>
                        </div>
                        <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-2.5 text-center">
                          <div className="text-rose-400 font-bold text-base">{priceNo.toFixed(0)}%</div>
                          <div className="text-zinc-500 text-[10px]">NO tikimybė</div>
                        </div>
                        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-2.5 text-center">
                          <div className="text-white font-bold text-base">{pool.toFixed(0)}</div>
                          <div className="text-zinc-500 text-[10px]">Žetonų fondas</div>
                        </div>
                      </div>

                      {/* Resolve row */}
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500 font-semibold mr-auto">Uždaryti rinką:</span>
                        <button
                          type="button"
                          onClick={() => handleResolveMarket(market.id, 'YES')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          YES laimėjo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveMarket(market.id, 'NO')}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-900/20"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          NO laimėjo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CATEGORIES */}
              <div className="pt-4 border-t border-zinc-800 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Tag className="w-5 h-5 text-emerald-500" />
                  Kategorijos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getCategoryColorClasses(cat.color)}`}>
                        {cat.name}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryName(cat.name);
                            setEditCategoryColor(cat.color);
                            setIsEditCategoryModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs text-zinc-500 col-span-3">Nėra sukurtų kategorijų.</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: CREATION FORMS */}
            <div className="lg:col-span-2 space-y-6">

              {/* FORM: CREATE MARKET */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-5">
                <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-800 pb-3 text-white">
                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                  Sukurti naują rinką
                </h2>

                <form onSubmit={handleCreateMarket} className="space-y-5">

                  {/* Question */}
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Prognozės klausimas *</label>
                    <input
                      type="text"
                      required
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Pvz.: Ar užbaigsime ketvirčio tikslus?"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Aprašymas / Rezoliucijos taisyklės</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Kada rinka bus laikoma laimėta? Kokiais kriterijais?"
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Category visual picker */}
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-2">Kategorija</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCategorySelection('none')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          newCategorySelection === 'none'
                            ? 'bg-zinc-600 text-white border-zinc-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        Be kategorijos
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setNewCategorySelection(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            newCategorySelection === cat.id
                              ? getCategoryButtonActiveClasses(cat.color)
                              : getCategoryColorClasses(cat.color) + ' hover:opacity-80'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Probability slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-zinc-400 font-semibold">Pradinė tikimybė</label>
                      <span className="text-xs text-zinc-500">
                        <span className="text-emerald-400 font-bold">{newInitialProb}% YES</span>
                        {' / '}
                        <span className="text-rose-400 font-bold">{100 - newInitialProb}% NO</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="5"
                      value={newInitialProb}
                      onChange={(e) => setNewInitialProb(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    {/* Visual probability bar */}
                    <div className="flex rounded-lg overflow-hidden h-6 mt-2 text-[10px] font-bold">
                      <div
                        className="bg-emerald-600 flex items-center justify-center text-white transition-all duration-200"
                        style={{ width: `${newInitialProb}%` }}
                      >
                        {newInitialProb >= 20 ? `YES ${newInitialProb}%` : ''}
                      </div>
                      <div
                        className="bg-rose-600 flex items-center justify-center text-white transition-all duration-200"
                        style={{ width: `${100 - newInitialProb}%` }}
                      >
                        {(100 - newInitialProb) >= 20 ? `NO ${100 - newInitialProb}%` : ''}
                      </div>
                    </div>
                    {/* Quick prob presets */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[
                        { label: '20% YES', val: 20 },
                        { label: '35% YES', val: 35 },
                        { label: '50/50', val: 50 },
                        { label: '65% YES', val: 65 },
                        { label: '80% YES', val: 80 },
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setNewInitialProb(preset.val)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                            newInitialProb === preset.val
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Liquidity presets */}
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-2">Pradinis likvidumas</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Žemas', val: 50, desc: '50' },
                        { label: 'Vidutinis', val: 100, desc: '100' },
                        { label: 'Aukštas', val: 250, desc: '250' },
                        { label: 'Labai aukštas', val: 500, desc: '500' },
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setNewLiquidity(preset.val)}
                          className={`py-2.5 px-1 rounded-xl text-center transition-all border ${
                            newLiquidity === preset.val
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{preset.desc}</div>
                          <div className="text-[9px] opacity-70 mt-0.5">{preset.label}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <input
                        type="number"
                        value={newLiquidity}
                        onChange={(e) => setNewLiquidity(Number(e.target.value))}
                        min="10"
                        placeholder="Arba įveskite tikslią reikšmę..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Live preview */}
                  {newQuestion.trim() && (
                    <div className="border border-zinc-700 rounded-2xl overflow-hidden">
                      <div className="px-3 py-1.5 bg-zinc-800/60 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        Peržiūra
                      </div>
                      <div className="p-4 bg-zinc-900/80 space-y-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Live AMM
                          </span>
                          {newCategorySelection !== 'none' && (() => {
                            const cat = categories.find(c => c.id === newCategorySelection);
                            return cat ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getCategoryColorClasses(cat.color)}`}>
                                {cat.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-sm font-bold text-white leading-snug">{newQuestion}</p>
                        {newDescription && (
                          <p className="text-xs text-zinc-400 line-clamp-2">{newDescription}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400">
                            <span className="font-semibold text-xs">YES</span>
                            <span className="font-bold">{newInitialProb}%</span>
                          </div>
                          <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400">
                            <span className="font-semibold text-xs">NO</span>
                            <span className="font-bold">{100 - newInitialProb}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminMessage && (
                    <div className={`p-2.5 rounded-xl text-xs flex gap-2 ${
                      adminMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {adminMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <span>{adminMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
                  >
                    Sukurti spėjimą
                  </button>
                </form>
              </div>

              {/* FORM: CREATE CATEGORY */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-800 pb-3 text-white">
                  <Tag className="w-4 h-4 text-emerald-500" />
                  Nauja kategorija
                </h2>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Pavadinimas *</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Pvz.: Biuras, Rinkodara..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Visual color picker */}
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-2">Spalva</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { val: 'emerald', label: 'Žalia' },
                        { val: 'blue', label: 'Mėlyna' },
                        { val: 'amber', label: 'Geltona' },
                        { val: 'violet', label: 'Violetinė' },
                        { val: 'rose', label: 'Raudona' },
                        { val: 'indigo', label: 'Indigo' },
                        { val: 'cyan', label: 'Žydra' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setNewCategoryColor(opt.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ring-2 ${
                            newCategoryColor === opt.val
                              ? getCategoryButtonActiveClasses(opt.val) + ' ring-white/30'
                              : getCategoryColorClasses(opt.val) + ' ring-transparent hover:ring-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Badge preview */}
                    {newCategoryName.trim() && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">Peržiūra:</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getCategoryColorClasses(newCategoryColor)}`}>
                          {newCategoryName}
                        </span>
                      </div>
                    )}
                  </div>

                  {catMessage && (
                    <div className={`p-2.5 rounded-xl text-xs flex gap-2 ${
                      catMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {catMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <span>{catMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    Sukurti kategoriją
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-855 rounded-lg text-zinc-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              {authMode === 'login' ? <LogIn className="w-5 h-5 text-emerald-500" /> : <UserPlus className="w-5 h-5 text-emerald-500" />}
              {authMode === 'login' ? 'Prisijungti prie BurgaBet' : 'Sukurti paskyrą'}
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              {authMode === 'login' 
                ? 'Prisijunkite prie sistemos naudodami savo įmonės el. paštą.' 
                : 'Užsiregistruokite įmonės el. paštu ir gausite 1000 nemokamų žetonų.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">El. paštas</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="vardas@imone.lt"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Slaptažodis</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs flex gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kraunama...
                  </>
                ) : authMode === 'login' ? (
                  'Prisijungti'
                ) : (
                  'Registruotis'
                )}
              </button>
            </form>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <span className="relative px-3 text-[10px] text-zinc-500 bg-zinc-900 uppercase font-bold">
                arba
              </span>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={authLoading}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 hover:bg-zinc-800/80 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Prisijungti su Google
            </button>

            <div className="mt-4 pt-4 border-t border-zinc-800 text-center text-xs">
              {authMode === 'login' ? (
                <span className="text-zinc-400">
                  Neturite paskyros?{' '}
                  <button
                    onClick={() => setAuthMode('signup')}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Registruotis
                  </button>
                </span>
              ) : (
                <span className="text-zinc-400">
                  Jau turite paskyrą?{' '}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Prisijungti
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isEditCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsEditCategoryModalOpen(false);
                setEditingCategory(null);
                setEditCatMessage(null);
              }}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" />
              Redaguoti kategoriją
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Pakeiskite kategorijos pavadinimą arba kortelės spalvą.
            </p>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Kategorijos pavadinimas *</label>
                <input
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder="Pvz.: Biuras, Rinkodara..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-2">Kortelės spalva *</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'emerald', label: 'Žalia' },
                    { val: 'blue', label: 'Mėlyna' },
                    { val: 'amber', label: 'Geltona' },
                    { val: 'violet', label: 'Violetinė' },
                    { val: 'rose', label: 'Raudona' },
                    { val: 'indigo', label: 'Indigo' },
                    { val: 'cyan', label: 'Žydra' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setEditCategoryColor(opt.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ring-2 ${
                        editCategoryColor === opt.val
                          ? getCategoryButtonActiveClasses(opt.val) + ' ring-white/30'
                          : getCategoryColorClasses(opt.val) + ' ring-transparent hover:ring-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {editCategoryName.trim() && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">Peržiūra:</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getCategoryColorClasses(editCategoryColor)}`}>
                      {editCategoryName}
                    </span>
                  </div>
                )}
              </div>

              {editCatMessage && (
                <div className={`p-2.5 rounded-xl text-xs flex gap-2 ${
                  editCatMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{editCatMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
              >
                Išsaugoti pakeitimus
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MARKET MODAL */}
      {isEditMarketModalOpen && editingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsEditMarketModalOpen(false);
                setEditingMarket(null);
                setEditMarketMessage(null);
              }}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-500" />
              Redaguoti prognozės rinką
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Pakeiskite prognozės klausimą, aprašymą ar priskirtą kategoriją.
            </p>

            <form onSubmit={handleUpdateMarket} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Prognozės klausimas *</label>
                <input
                  type="text"
                  required
                  value={editMarketQuestion}
                  onChange={(e) => setEditMarketQuestion(e.target.value)}
                  placeholder="Pvz.: Ar užbaigsime ketvirčio tikslus?"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Kategorija</label>
                <select
                  value={editMarketCategoryId}
                  onChange={(e) => setEditMarketCategoryId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="none">Be kategorijos</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1.5">Aprašymas / Taisyklės</label>
                <textarea
                  value={editMarketDescription}
                  onChange={(e) => setEditMarketDescription(e.target.value)}
                  placeholder="Pateikite taisykles, kaip rinka bus išspręsta..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              {editMarketMessage && (
                <div className={`p-2.5 rounded-xl text-xs flex gap-2 ${
                  editMarketMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{editMarketMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
              >
                Išsaugoti pakeitimus
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200 ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                : toast.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                  : 'bg-zinc-900/95 text-zinc-200 border-zinc-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-semibold">{toast.text}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
