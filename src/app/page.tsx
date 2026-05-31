import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      <Dashboard />
    </main>
  );
}
