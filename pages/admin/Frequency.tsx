import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

const AdminFrequency: React.FC = () => {
  const { selectedMatriz } = useMatriz();
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);

  const sidebarItems = [
    { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
    { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
    { icon: 'group', label: 'Contatos', path: '/admin/clients' },
    { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
    { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
    { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
  ];

  // Fetch all non-cancelled appointments with client + service info
  useEffect(() => {
    if (!selectedMatriz) return;
    supabase
      .from('appointments')
      .select('id, scheduled_at, status, client_id, clients(name, phone), services(price)')
      .eq('matriz_id', selectedMatriz.id)
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true })
      .then(({ data }) => { if (data) setRawAppointments(data); });
  }, [selectedMatriz]);

  // Build per-client stats map
  const clientStats = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; visits: Date[]; totalSpend: number }>();
    rawAppointments.forEach(a => {
      const id = a.client_id ?? 'unknown';
      const name = (a.clients as any)?.name ?? '—';
      const phone = (a.clients as any)?.phone ?? '';
      const price = Number((a.services as any)?.price ?? 0);
      if (!map.has(id)) map.set(id, { name, phone, visits: [], totalSpend: 0 });
      const c = map.get(id)!;
      c.visits.push(new Date(a.scheduled_at));
      c.totalSpend += price;
    });
    return map;
  }, [rawAppointments]);

  // Average days between visits (global)
  const avgReturnDays = useMemo(() => {
    let totalGap = 0, gapCount = 0;
    clientStats.forEach(c => {
      const sorted = [...c.visits].sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < sorted.length; i++) {
        totalGap += (sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000;
        gapCount++;
      }
    });
    return gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
  }, [clientStats]);

  // % clients who returned at least once (have ≥2 visits)
  const retentionRate = useMemo(() => {
    let returning = 0;
    clientStats.forEach(c => { if (c.visits.length >= 2) returning++; });
    return clientStats.size > 0 ? Math.round((returning / clientStats.size) * 100) : 0;
  }, [clientStats]);

  const today = useMemo(() => new Date(), []);

  // Clients past their expected return date but < 90 days (yellow alert)
  const atRiskClients = useMemo(() => {
    if (avgReturnDays === 0) return [];
    const results: { name: string; phone: string; daysLate: number }[] = [];
    clientStats.forEach(c => {
      const lastVisit = [...c.visits].sort((a, b) => b.getTime() - a.getTime())[0];
      const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / 86400000);
      if (daysSince > avgReturnDays && daysSince < 90) {
        results.push({ name: c.name, phone: c.phone, daysLate: daysSince - avgReturnDays });
      }
    });
    return results.sort((a, b) => b.daysLate - a.daysLate).slice(0, 5);
  }, [clientStats, avgReturnDays, today]);

  // Clients not seen for 90+ days (win-back)
  const winbackClients = useMemo(() => {
    const results: { name: string; phone: string; daysSince: number }[] = [];
    clientStats.forEach(c => {
      const lastVisit = [...c.visits].sort((a, b) => b.getTime() - a.getTime())[0];
      const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / 86400000);
      if (daysSince >= 90) results.push({ name: c.name, phone: c.phone, daysSince });
    });
    return results.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
  }, [clientStats, today]);

  // Top VIPs: most visits in last 6 months
  const vipClients = useMemo(() => {
    const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(today.getMonth() - 6);
    const results: { name: string; phone: string; count: number; ticketMedio: number }[] = [];
    clientStats.forEach(c => {
      const recentVisits = c.visits.filter(v => v >= sixMonthsAgo);
      if (recentVisits.length > 0) {
        const ticketMedio = c.visits.length > 0 ? c.totalSpend / c.visits.length : 0;
        results.push({ name: c.name, phone: c.phone, count: recentVisits.length, ticketMedio });
      }
    });
    return results.sort((a, b) => b.count - a.count || b.ticketMedio - a.ticketMedio).slice(0, 4);
  }, [clientStats, today]);

  const handleWhatsApp = (name: string, phone: string, type: 'churn' | 'winback') => {
    const firstName = name.split(' ')[0];
    const msg = type === 'churn'
      ? `Fala ${firstName}, tudo bom? Viemos aqui lembrar que faz um tempinho que você não aparece! Bora agendar aquele talento essa semana? ✂️💈`
      : `Saudades ${firstName}! Preparamos um presente pra você voltar: 20% OFF no seu próximo corte! Vamos agendar? 🚀`;
    const digits = phone?.replace(/\D/g, '') ?? '';
    const url = digits
      ? `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const toInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();

  return (
    <div className="flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 min-h-screen relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen mix-blend-normal opacity-50 dark:opacity-100 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100"></div>
      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-[2rem] font-medium text-slate-900 dark:text-white uppercase tracking-tight pt-1 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-500 text-4xl">monitoring</span>
              Frequência de Clientes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">Análise de retenção, risco de evasão e recuperação baseada nos agendamentos reais da filial.</p>
          </div>
          <ThemeToggle />
        </header>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fadeIn">
          {/* Média de Retorno */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative">
              <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-500">
                <span className="material-symbols-outlined">restart_alt</span>
              </div>
            </div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-1 relative">Média de Retorno</h3>
            <div className="flex items-end gap-2 relative">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">
                {avgReturnDays > 0 ? avgReturnDays : '—'}
              </span>
              {avgReturnDays > 0 && <span className="text-slate-500 font-medium mb-1">dias</span>}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 relative font-medium">Tempo médio que seus clientes levam para voltar e cortar novamente.</p>
          </div>

          {/* Taxa de Retenção */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/5 rounded-full blur-3xl group-hover:bg-[#25D366]/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative">
              <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366]">
                <span className="material-symbols-outlined">verified</span>
              </div>
            </div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-1 relative">Taxa de Retenção</h3>
            <div className="flex items-end gap-2 relative">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">{retentionRate}</span>
              <span className="text-slate-500 font-medium mb-1">%</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 relative font-medium">Clientes que retornaram para um segundo agendamento.</p>
          </div>

          {/* Clientes em Risco */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-1 relative">Clientes em Risco</h3>
            <div className="flex items-end gap-2 relative">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">{atRiskClients.length}</span>
              <span className="text-slate-500 font-medium mb-1">clientes</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 relative font-medium">Pessoas que já passaram do tempo médio de retorno e ainda não agendaram.</p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fadeIn" style={{ animationDelay: '0.1s' }}>

          {/* Sinal Amarelo — Evasão Iminente */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                Sinal Amarelo (Evasão Iminente)
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
              Clientes que já ultrapassaram o tempo médio de retorno ({avgReturnDays > 0 ? avgReturnDays : '?'} dias) e ainda não agendaram.
            </p>
            <div className="space-y-4 flex-1">
              {atRiskClients.length > 0 ? atRiskClients.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-border-subtle shadow-inner hover:border-amber-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">
                      {toInitials(c.name)}
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-medium">{c.name}</h4>
                      <p className="text-xs text-amber-500">Atrasado há {c.daysLate} dia{c.daysLate !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleWhatsApp(c.name, c.phone, 'churn')}
                    className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                    title="Enviar mensagem no WhatsApp"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                  </button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-40">check_circle</span>
                  <p className="text-sm font-medium">Nenhum cliente em risco no momento.</p>
                </div>
              )}
            </div>
          </div>

          {/* Win-back — Recuperação 90+ dias */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-danger-red">heart_broken</span>
                Recuperação (90+ dias)
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
              Clientes perdidos que não aparecem há mais de 3 meses. Envie uma oferta irresistível para reativá-los.
            </p>
            <div className="space-y-4 flex-1">
              {winbackClients.length > 0 ? winbackClients.map((c, idx) => {
                const months = Math.floor(c.daysSince / 30);
                const label = months >= 2 ? `Visto há ${months} meses` : `Visto há ${c.daysSince} dias`;
                return (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-border-subtle shadow-inner hover:border-danger-red/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-sm">
                        {toInitials(c.name)}
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-medium">{c.name}</h4>
                        <p className="text-xs text-danger-red">{label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleWhatsApp(c.name, c.phone, 'winback')}
                      className="px-4 py-3 rounded-xl bg-danger-red/10 text-danger-red font-medium tracking-[0.2em] uppercase text-[10px] hover:bg-danger-red hover:text-white transition-all leading-none"
                    >
                      Enviar Promoção
                    </button>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-40">sentiment_satisfied</span>
                  <p className="text-sm font-medium">Nenhum cliente inativo há 90+ dias.</p>
                </div>
              )}
            </div>
          </div>

          {/* Top VIPs */}
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col h-full xl:col-span-2 mt-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#25D366]">diamond</span>
                Top VIPs (Últimos 6 Meses)
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium w-2/3">
              Clientes com maior frequência nos últimos 6 meses. Eles sustentam a barbearia — mime essas pessoas!
            </p>
            {vipClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {vipClients.map((c, idx) => (
                  <div key={idx} className="relative p-5 rounded-2xl bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-border-subtle shadow-inner hover:border-[#25D366]/50 transition-all group overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-8xl text-black/5 dark:text-white/5 font-extrabold italic select-none">{idx + 1}</div>
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold text-sm mb-3 relative">
                      {toInitials(c.name)}
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-medium relative truncate">{c.name}</h4>
                    <p className="text-xs text-[#25D366] font-bold mt-1 relative">{c.count} visita{c.count !== 1 ? 's' : ''} no período</p>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center relative">
                      <span className="text-xs text-slate-500">Ticket Médio</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {c.ticketMedio > 0 ? `R$ ${c.ticketMedio.toFixed(2).replace('.', ',')}` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-40">person_search</span>
                <p className="text-sm font-medium">Nenhum agendamento registrado nos últimos 6 meses.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminFrequency;
