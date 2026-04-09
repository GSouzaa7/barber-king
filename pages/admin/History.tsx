import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';

const AdminHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sidebarItems = [
    { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
    { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
    { icon: 'group', label: 'Contatos', path: '/admin/clients' },
    { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
    { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
    { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
  ];

  const [historyData, setHistoryData] = useState<{
    id: string; client: string; service: string; professional: string;
    value: string; numericValue: number; date: string; status: string;
  }[]>([]);

  useEffect(() => {
    supabase
      .from('appointments')
      .select(`id, scheduled_at, status, clients(name), services(name, price), professionals(name)`)
      .order('scheduled_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) { console.error(error); return; }
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const statusMap: Record<string, string> = {
          done: 'Finalizado', cancelled: 'Cancelado',
          confirmed: 'Confirmado', pending: 'Agendado', in_progress: 'Em Atendimento',
        };
        setHistoryData((data ?? []).map((a: any) => {
          const dt = new Date(a.scheduled_at);
          const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateLabel = dt.toDateString() === today.toDateString()
            ? `Hoje, ${timeStr}`
            : dt.toDateString() === yesterday.toDateString()
            ? `Ontem, ${timeStr}`
            : `${dt.toLocaleDateString('pt-BR')}, ${timeStr}`;
          const price = a.services?.price ?? 0;
          return {
            id: a.id.substring(0, 6).toUpperCase(),
            client: a.clients?.name ?? 'Cliente Balcão',
            service: a.services?.name ?? '—',
            professional: a.professionals?.name ?? 'Recepção',
            numericValue: price,
            value: `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            date: dateLabel,
            status: statusMap[a.status] ?? a.status,
          };
        }));
      });
  }, []);

  const filteredHistory = historyData.filter(item => 
      item.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.includes(searchTerm)
  );

  const totalAtendimentos = filteredHistory.filter(i => i.status === 'Finalizado').length;
  const faturamentoBruto = filteredHistory.filter(i => i.status === 'Finalizado').reduce((acc, curr) => acc + curr.numericValue, 0);
  const ticketMedio = totalAtendimentos > 0 ? (faturamentoBruto / totalAtendimentos) : 0;

  const exportToCSV = () => {
      const headers = ['Comanda', 'Cliente', 'Servico', 'Profissional', 'DataHora', 'Valor', 'Status'];
      const rows = filteredHistory.map(r => [r.id, r.client, r.service, r.professional, `"${r.date}"`, r.value, r.status]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `historico-atendimentos.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const exportToExcel = () => {
      const headers = ['Comanda', 'Cliente', 'Servico', 'Profissional', 'DataHora', 'Valor', 'Status'];
      const rows = filteredHistory.map(r => `<tr><td>${r.id}</td><td>${r.client}</td><td>${r.service}</td><td>${r.professional}</td><td>${r.date}</td><td>${r.value}</td><td>${r.status}</td></tr>`);
      const tableHTML = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
         <head><meta charset="UTF-8" /></head>
         <body>
             <table>
                 <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                 <tbody>${rows.join("")}</tbody>
             </table>
         </body>
      </html>`;
      const uri = 'data:application/vnd.ms-excel;base64,' + btoa(unescape(encodeURIComponent(tableHTML)));
      const link = document.createElement("a");
      link.setAttribute("href", uri);
      link.setAttribute("download", `historico-atendimentos.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  // Lista única de clientes para o campo de busca
  const uniqueClients = Array.from(new Set<string>(historyData.map(d => d.client)));

  return (
    <div className="flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors py-0 min-h-screen relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen mix-blend-normal opacity-50 dark:opacity-100 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100"></div>
      
      <Sidebar items={sidebarItems} portalName="KINGK" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-[2rem] font-medium text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-4xl">history</span>
              Histórico de Atendimentos
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">Acompanhe todas as comandas finalizadas, vendas de produtos e serviços prestados.</p>
          </div>

          <div ref={searchRef} className="relative flex flex-col w-full md:w-auto z-40">
            <div className={`flex bg-[#111111] border rounded-xl overflow-hidden w-full md:w-72 transition-all ${isSearchFocused ? 'border-red-500 ring-1 ring-red-500/30' : 'border-white/10'}`}>
              <span className="material-symbols-outlined text-slate-500 p-3 bg-transparent flex items-center justify-center">search</span>
              <input 
                type="text" 
                placeholder="Buscar por cliente, id ou serviço..." 
                className="bg-transparent border-none outline-none text-slate-900 dark:text-white px-2 py-3 w-full placeholder:text-slate-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
            </div>
            
            {/* Auto-complete Clientes Cadastrados */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 shadow-xl rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto animate-fadeIn w-full">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500 text-sm">person_search</span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Clientes Cadastrados</span>
                </div>
                {uniqueClients.map(client => (
                    <button 
                        key={client}
                        onClick={() => {
                            setSearchTerm(client);
                            setIsSearchFocused(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-xs font-bold uppercase">
                            {client.substring(0,2)}
                        </div>
                        <div>
                            <p className="text-slate-900 dark:text-white text-sm font-bold">{client}</p>
                            <p className="text-slate-500 text-[10px]">Preencher busca</p>
                        </div>
                    </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fadeIn relative z-40">
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#25D366]/5 rounded-full blur-2xl"></div>
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 mb-1">QTD Atendimentos</h3>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalAtendimentos}</span>
            </div>
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#259af4]/5 rounded-full blur-2xl"></div>
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 mb-1">Ticket Médio</h3>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">R$ {ticketMedio.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 mb-1">Faturamento (Lista)</h3>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">R$ {faturamentoBruto.toFixed(2).replace('.', ',')}</span>
            </div>
            <div ref={exportRef} className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 relative overflow-visible flex items-center justify-center">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                  className={`flex items-center gap-2 transition-colors font-medium text-sm w-full h-full justify-center ${isExportMenuOpen ? 'text-red-500' : 'text-slate-900 dark:text-slate-400 hover:text-red-500'}`}
                >
                    <span className="material-symbols-outlined">download</span> Exportar Relatório
                    <span className={`material-symbols-outlined text-sm transition-transform ${isExportMenuOpen ? 'rotate-180 text-red-500' : ''}`}>expand_more</span>
                </button>

                {isExportMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 shadow-xl rounded-2xl shadow-2xl z-50 animate-fadeIn overflow-hidden flex flex-col p-1 w-full mx-auto min-w-[200px]">
                        <button 
                            onClick={() => { exportToCSV(); setIsExportMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 rounded-xl transition-colors group"
                        >
                            <span className="material-symbols-outlined text-[#25D366] group-hover:scale-110 transition-transform">description</span>
                            <div>
                                <h4 className="text-slate-900 dark:text-white font-bold text-sm">Gerar CSV</h4>
                                <p className="text-slate-500 text-[10px] leading-tight">Texto formatado padrão</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => { exportToExcel(); setIsExportMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 rounded-xl transition-colors group"
                        >
                            <span className="material-symbols-outlined text-red-500 group-hover:scale-110 transition-transform">table_view</span>
                            <div>
                                <h4 className="text-slate-900 dark:text-white font-bold text-sm">Gerar EXCEL</h4>
                                <p className="text-slate-500 text-[10px] leading-tight">Planilha clássica (.xls)</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Histórico Table */}
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden animate-fadeIn" style={{animationDelay: '0.1s'}}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-border-subtle">
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Comanda</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Cliente</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Serviço/Produto</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Profissional</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Data e Hora</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Valor</th>
                            <th className="py-4 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {filteredHistory.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="py-4 px-6">
                                    <span className="text-slate-400 font-bold text-sm">#{row.id}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-slate-900 dark:text-white font-bold text-sm">{row.client}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-slate-300 font-medium text-sm">{row.service}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-slate-400 text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">content_cut</span>
                                        {row.professional}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-slate-400 text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        {row.date}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-[#25D366] font-bold text-sm tracking-wide">{row.value}</span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide
                                        ${row.status === 'Finalizado' ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' : 
                                        'bg-danger-red/10 text-danger-red border border-danger-red/20'}`}
                                    >
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {filteredHistory.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">search_off</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum resultado encontrado</h3>
                    <p className="text-slate-500">Sua busca por "{searchTerm}" não retornou atendimentos.</p>
                </div>
            )}
        </div>

      </main>
    </div>
  );
};

export default AdminHistory;
