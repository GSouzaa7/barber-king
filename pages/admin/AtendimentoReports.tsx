import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ThemeToggle } from '../../components/ThemeToggle';

const ptBRMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ptBRDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const fmtDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const getDefaultRange = (): [string, string] => {
    const today = new Date();
    return [fmtDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), fmtDateStr(today)];
};

const CustomDatePicker = ({ startDate, endDate, onApply, onCancel }: any) => {
    // Assumes YYYY-MM-DD mapping. Default to current logic date if none.
    const getSafeDate = (dStr: string) => {
        if (!dStr) return null;
        const parts = dStr.split('-');
        if (parts.length !== 3) return null;
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const initialView = getSafeDate(startDate) || new Date();
    const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));
    const [selection, setSelection] = useState<[string | null, string | null]>([startDate || null, endDate || null]);

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayIndex = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const changeMonth = (inc: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + inc, 1));
    };

    const handleDayClick = (day: number) => {
        const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!selection[0] || (selection[0] && selection[1])) {
            setSelection([dStr, null]);
        } else {
            const d1 = getSafeDate(selection[0]);
            const d2 = getSafeDate(dStr);
            if (d1 && d2) {
                if (d2 < d1) setSelection([dStr, selection[0]]);
                else setSelection([selection[0], dStr]);
            }
        }
    };

    const renderDays = () => {
        let cells = [];
        for (let i = 0; i < firstDayIndex; i++) {
            cells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let isSelected = dStr === selection[0] || dStr === selection[1];
            let inRange = false;

            if (selection[0] && selection[1]) {
                const cur = getSafeDate(dStr);
                const d1 = getSafeDate(selection[0]);
                const d2 = getSafeDate(selection[1]);
                if (cur && d1 && d2 && cur > d1 && cur < d2) {
                    inRange = true;
                }
            }

            let bgClass = "hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg";
            if (isSelected) bgClass = "bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-600/30";
            else if (inRange) bgClass = "bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-md";

            cells.push(
                <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`w-8 h-8 flex items-center justify-center text-xs transition-colors ${bgClass}`}
                >
                    {day}
                </button>
            );
        }
        return cells;
    };

    return (
        <div className="absolute top-full right-0 sm:left-0 mt-3 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,1)] lg:shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-5 z-[100] w-[300px] animate-fadeIn transform-gpu will-change-transform isolate">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <div className="text-slate-900 dark:text-white font-bold text-sm capitalize">{ptBRMonths[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {ptBRDays.map(d => <div key={d} className="w-8 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-slate-500">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-5">
                {renderDays()}
            </div>
            <div className="flex gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
                <button onClick={onCancel} className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button
                    onClick={() => onApply(selection[0] || startDate, selection[1] || endDate)}
                    disabled={!selection[0]}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:brightness-110 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Aplicar
                </button>
            </div>
        </div>
    );
};

const AdminAtendimentoReports: React.FC = () => {
    const { selectedMatriz } = useMatriz();
    const [dateRange, setDateRange] = useState('Mensal');
    const [activeTab, setActiveTab] = useState('geral');
    const [rawAppointments, setRawAppointments] = useState<any[]>([]);

    // States for filter
    const [startDate, setStartDate] = useState(() => getDefaultRange()[0]);
    const [endDate, setEndDate] = useState(() => getDefaultRange()[1]);
    const [isEditingFilter, setIsEditingFilter] = useState(false);
    const [isEditingVendasFilter, setIsEditingVendasFilter] = useState(false);

    const sidebarItems = [
        { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
        { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
        { icon: 'monetization_on', label: 'Financeiro', path: '/admin/financial' },
    ];

    useEffect(() => {
        if (!selectedMatriz?.id) return;
        supabase
            .from('appointments')
            .select('id, scheduled_at, status, client_id, service_id, professional_id, clients(name), professionals(name), services(name, price)')
            .eq('matriz_id', selectedMatriz.id)
            .gte('scheduled_at', startDate + 'T00:00:00')
            .lte('scheduled_at', endDate + 'T23:59:59')
            .order('scheduled_at', { ascending: false })
            .then(({ data }) => { if (data) setRawAppointments(data); });
    }, [selectedMatriz?.id, startDate, endDate]);

    // Real data from appointments
    const doneAppointments = useMemo(() => rawAppointments.filter((a: any) => a.status === 'done'), [rawAppointments]);
    const cancelledAppointments = useMemo(() => rawAppointments.filter((a: any) => a.status === 'cancelled'), [rawAppointments]);
    const noShowAppointments = useMemo(() => rawAppointments.filter((a: any) => a.status === 'no_show'), [rawAppointments]);

    const totalFaturamento = useMemo(() =>
        doneAppointments.reduce((acc: number, a: any) => acc + (a.services?.price || 0), 0),
        [doneAppointments]
    );
    const totalServicos = doneAppointments.length;
    const totalAvulso = totalFaturamento;
    const totalPlano = 0;
    const totalProdutos = 0;
    const qtdAvulsoEstimado = totalServicos;
    const ticketMedio = totalServicos > 0 ? totalFaturamento / totalServicos : 0;

    const chartData = useMemo(() => {
        if (dateRange === 'Diária') {
            const hours: Record<string, number> = {};
            for (let h = 8; h <= 21; h++) hours[`${String(h).padStart(2, '0')}:00`] = 0;
            doneAppointments.forEach((a: any) => {
                const h = new Date(a.scheduled_at).getHours();
                const key = `${String(h).padStart(2, '00')}:00`;
                if (key in hours) hours[key] += (a.services?.price || 0);
            });
            return Object.entries(hours).map(([name, fat]) => ({ name, faturamento: fat, avulso: fat, plano: 0, produtos: 0 }));
        }
        if (dateRange === 'Semanal') {
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const days: Record<string, number> = {};
            dayNames.forEach(d => { days[d] = 0; });
            doneAppointments.forEach((a: any) => {
                const key = dayNames[new Date(a.scheduled_at).getDay()];
                days[key] += (a.services?.price || 0);
            });
            return dayNames.map(name => ({ name, faturamento: days[name], avulso: days[name], plano: 0, produtos: 0 }));
        }
        if (dateRange === 'Anual') {
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const months: Record<string, number> = {};
            monthNames.forEach(m => { months[m] = 0; });
            doneAppointments.forEach((a: any) => {
                const key = monthNames[new Date(a.scheduled_at).getMonth()];
                months[key] += (a.services?.price || 0);
            });
            return monthNames.map(name => ({ name, faturamento: months[name], avulso: months[name], plano: 0, produtos: 0 }));
        }
        // Default: Mensal — group by week within the range
        const weeks: Record<string, number> = { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4': 0 };
        const startMs = new Date(startDate).getTime();
        doneAppointments.forEach((a: any) => {
            const diffDays = Math.floor((new Date(a.scheduled_at).getTime() - startMs) / 86400000);
            const key = `Sem ${Math.min(Math.floor(diffDays / 7) + 1, 4)}`;
            weeks[key] += (a.services?.price || 0);
        });
        return Object.entries(weeks).map(([name, fat]) => ({ name, faturamento: fat, avulso: fat, plano: 0, produtos: 0 }));
    }, [doneAppointments, dateRange, startDate]);

    const pieData = [
        { name: 'Clientes Plano', value: totalPlano, fill: '#f59e0b' },
        { name: 'Clientes Avulsos', value: qtdAvulsoEstimado, fill: '#3b82f6' }
    ];

    const formatDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatYAxis = (v: number) => {
        if (v === 0) return '0';
        if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
        return `R$ ${v}`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-xl shadow-xl">
                    <p className="text-white font-bold mb-3">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-slate-300 text-sm font-medium">{entry.name}</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-bold text-sm">
                                {['Faturamento Total', 'Receita de Serviços (Avulsos)', 'Receita de Produtos'].includes(entry.name) ? formatCurrency(entry.value) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const rankingIndicacao: any[] = []; // No referral system in DB yet

    const rankingServicos = useMemo(() => {
        const map = new Map<string, { name: string; qtd: number; valor: number }>();
        doneAppointments.forEach((a: any) => {
            if (!a.services) return;
            const prev = map.get(a.service_id) || { name: a.services.name, qtd: 0, valor: 0 };
            prev.qtd++;
            prev.valor += (a.services.price || 0);
            map.set(a.service_id, prev);
        });
        return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 5).map((s, i) => ({ id: i + 1, ...s }));
    }, [doneAppointments]);

    const rankingProdutos: any[] = [];

    const rankingClientes = useMemo(() => {
        const map = new Map<string, { name: string; qtd: number; valor: number }>();
        doneAppointments.forEach((a: any) => {
            if (!a.clients) return;
            const prev = map.get(a.client_id) || { name: a.clients.name, qtd: 0, valor: 0 };
            prev.qtd++;
            prev.valor += (a.services?.price || 0);
            map.set(a.client_id, prev);
        });
        return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 5).map((s, i) => ({ id: i + 1, ...s }));
    }, [doneAppointments]);

    const vendasData = useMemo(() =>
        doneAppointments.map((a: any, i: number) => {
            const d = new Date(a.scheduled_at);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            const clientName = a.clients?.name || 'Cliente';
            return {
                id: i + 1,
                data: dateStr,
                descricao: `Atendimento de ${clientName}`,
                tipo: 'Comanda',
                cliente: clientName,
                vendedor: a.professionals?.name || '-',
                valor: a.services?.price || 0,
            };
        }), [doneAppointments]
    );

    const vendasTotal = useMemo(() => vendasData.reduce((acc, v) => acc + v.valor, 0), [vendasData]);

    const renderRankingItem = (item: any, index: number, quantityLabel: string = '') => {
        const medalColors = [
            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bold', // 1st
            'bg-slate-400/20 text-slate-300 border-slate-400/30 font-bold',    // 2nd
            'bg-orange-700/20 text-orange-400 border-orange-700/30 font-bold'  // 3rd
        ];

        const starColors = [
            'text-yellow-400', 'text-slate-300', 'text-orange-400'
        ];

        return (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white-[0.02] transition-colors rounded-lg gap-2">
                <div className="flex items-center gap-4">
                    <div className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border ${medalColors[index] || 'bg-white/5 text-slate-400 border-white/10'}`}>
                        {index + 1}
                        <span className={`absolute -top-1.5 -right-1.5 material-symbols-outlined text-[12px] bg-bg-dark rounded-full ${starColors[index] || 'hidden'}`}>stars</span>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white font-medium text-[13px] truncate max-w-[140px] sm:max-w-[160px]">{item.name}</p>
                        <p className="text-slate-400 text-xs">{item.qtd} {quantityLabel}</p>
                    </div>
                </div>
                {item.valor !== undefined && (
                    <span className="text-white font-medium text-[13px] sm:text-right">{formatCurrency(item.valor)}</span>
                )}
            </div>
        );
    };

    return (
<div className="flex bg-slate-50 dark:bg-background-dark font-sans overflow-hidden min-h-screen relative">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100"></div>
            <Sidebar portalName="KINGK" items={sidebarItems} />

            <main className="flex-1 flex flex-col relative z-10 w-full lg:w-[calc(100%-100px)] lg:ml-[100px] transition-all duration-300">

                <header className="px-8 py-6 flex justify-between items-center shrink-0 relative z-20">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Central de Relatórios</h1>
                        <p className="text-sm text-slate-400 mt-1">Análise completa das métricas da sua unidade</p>
                    </div>
                </header>

                <div className="px-8 pb-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Menu de Tabs e Filtros Inline */}
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-4">

                        {/* Abas de Navegação (Esquerda) */}
                        <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto w-full xl:w-auto custom-scrollbar">
                            <button
                                onClick={() => { setActiveTab('geral'); setIsEditingFilter(false); }}
                                className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl whitespace-nowrap transition-colors ${activeTab === 'geral' ? 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                Geral
                            </button>
                            <button
                                onClick={() => { setActiveTab('vendas'); setIsEditingFilter(false); }}
                                className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl whitespace-nowrap transition-colors ${activeTab === 'vendas' ? 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                Vendas
                            </button>
                            <button
                                onClick={() => { setActiveTab('carteiras'); setIsEditingFilter(false); }}
                                className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl whitespace-nowrap transition-colors ${activeTab === 'carteiras' ? 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                                Carteiras
                            </button>
                        </div>

                        {/* Filtros Inline (Direita) */}
                        <div className="relative z-[60] w-full xl:w-fit ml-auto transform-gpu isolate">
                            {/* Container Visual do Filtro */}
                            <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 rounded-2xl md:h-16 gap-4 w-full h-full transform-gpu isolate">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsEditingFilter(!isEditingFilter)}
                                        className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-red-600/20 glow-red transition-all hover:brightness-110 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                        Período
                                    </button>
                                    <button
                                        onClick={() => setIsEditingFilter(!isEditingFilter)}
                                        className="flex items-center gap-2 text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap"
                                    >
                                        {startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                                Adicionar filtro
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="relative w-full md:w-72">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                                    <input 
                                        className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none placeholder:text-slate-500 shadow-inner" 
                                        placeholder="Buscar relatórios..." 
                                        type="text" 
                                    />
                                </div>
                            </div>
                            
                            {/* Popover flutuante livre da caixa */}
                            {isEditingFilter && (
                                <CustomDatePicker
                                    startDate={startDate}
                                    endDate={endDate}
                                    onApply={(s: string, e: string) => { setStartDate(s); setEndDate(e); setIsEditingFilter(false); }}
                                    onCancel={() => setIsEditingFilter(false)}
                                />
                            )}
                        </div>
                    </div>

                    {/* O conteudo abaixo depende da aba ativa */}
                    {activeTab === 'geral' && (
                        <>
                            {/* Cards de Metricas com dados dinamicos - Atualizado para 5 colunas lg */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex flex-col gap-3 transform-gpu isolate">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm whitespace-nowrap">
                                            Faturamento Total
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer">help</span>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                            14.2%
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalFaturamento)}</div>
                                </div>

                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex flex-col gap-3 transform-gpu isolate">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm">
                                            Receita de Serviços
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer">help</span>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                            5.8%
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalAvulso)}</div>
                                </div>

                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex flex-col gap-3 transform-gpu isolate">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm whitespace-nowrap">
                                            Cliente Plano
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer">help</span>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                            8.2%
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalPlano}</div>
                                </div>

                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex flex-col gap-3 transform-gpu isolate">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm whitespace-nowrap">
                                            Receita de Produtos
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer">help</span>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                            1.2%
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalProdutos)}</div>
                                </div>

                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex flex-col gap-3 transform-gpu isolate">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm">
                                            Ticket Médio
                                            <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer">help</span>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                            8.4%
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(ticketMedio)}</div>
                                </div>
                            </div>

                            {/* Grafico Principal - Otimizado (Usando 100% da largura agora) */}
                            <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col min-h-[450px]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Estatísticas de Faturamento</h3>
                                    <div className="flex gap-4 text-sm font-medium text-slate-400">
                                        {['Diária', 'Semanal', 'Mensal', 'Anual'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => { setDateRange(tab); setIsEditingFilter(false); }}
                                                className={`pb-1 border-b-2 transition-colors ${dateRange === tab ? 'text-red-600 border-red-600 font-bold' : 'border-transparent hover:text-red-500'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full h-[350px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorAvulso" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorProdutos" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
                                            <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                                            {/* Eixo da direita removido */}
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }} />
                                            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px', fontWeight: '500', color: '#64748b' }} />

                                            <Area yAxisId="left" type="monotone" dataKey="faturamento" name="Faturamento Total" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFaturamento)" activeDot={{ r: 5, strokeWidth: 0, fill: '#ef4444' }} />
                                            <Area yAxisId="left" type="monotone" dataKey="avulso" name="Receita de Serviços (Avulsos)" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAvulso)" activeDot={{ r: 5, strokeWidth: 0, fill: '#f59e0b' }} />
                                            <Area yAxisId="left" type="monotone" dataKey="produtos" name="Receita de Produtos" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProdutos)" activeDot={{ r: 5, strokeWidth: 0, fill: '#22c55e' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Graficos Secundarios (Lado a Lado) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full pt-4">

                                {/* Grafico de Rosca e Barras: Avulsos vs Plano */}
                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] h-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-slate-900 dark:text-white font-bold text-lg">Distribuição de Clientes</h3>
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                            <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Comparativo numérico e percentual de atendimentos</p>
                                    
                                    <div className="flex-1 flex flex-col gap-6">
                                        {/* Donut Chart */}
                                        <div className="relative w-full h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                        cornerRadius={4}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                        itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}
                                                        formatter={(value: number) => [`${value} atendimentos`, '']}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalPlano + qtdAvulsoEstimado}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Total</span>
                                            </div>
                                        </div>

                                        {/* Bar Chart (HTML/CSS progress bars) */}
                                        <div className="flex flex-col gap-4 mt-auto">
                                            {pieData.map(item => {
                                                const total = totalPlano + qtdAvulsoEstimado;
                                                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                                return (
                                                    <div key={item.name} className="flex flex-col gap-2">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.fill}}></div>
                                                                <span className="text-slate-300 font-medium">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-baseline gap-1.5">
                                                                <span className="text-slate-900 dark:text-white font-bold">{item.value}</span>
                                                                <span className="text-slate-500 text-[11px] w-8 text-right">({pct}%)</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                                                                style={{width: `${pct}%`, backgroundColor: item.fill}}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Status de Agendamentos Card */}
                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] h-full">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-slate-900 dark:text-white font-bold text-lg">Eficácia da Agenda</h3>
                                        <button className="text-red-500 hover:text-red-400 transition-colors text-sm font-bold hover:underline">Ver histórico</button>
                                    </div>

                                    <div className="flex flex-col gap-6 flex-1 justify-center">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                                    <span className="material-symbols-outlined text-[24px]">task_alt</span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-bold text-sm">Atendimento concluído</p>
                                                    <p className="text-slate-400 text-xs mt-1">{totalServicos}</p>
                                                </div>
                                            </div>
                                            <span className="text-slate-900 dark:text-white font-bold text-base">{formatCurrency(totalFaturamento)}</span>
                                        </div>

                                        <div className="h-px w-full bg-white/5 my-2"></div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                                                    <span className="material-symbols-outlined text-[24px]">person_off</span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-bold text-sm">Não apareceu</p>
                                                    <p className="text-slate-400 text-xs mt-1">{noShowAppointments.length}</p>
                                                </div>
                                            </div>
                                            <span className="text-orange-500 font-bold text-base">- {formatCurrency(noShowAppointments.reduce((acc: number, a: any) => acc + (a.services?.price || 0), 0))}</span>
                                        </div>

                                        <div className="h-px w-full bg-white/5 my-2"></div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                                                    <span className="material-symbols-outlined text-[24px]">event_busy</span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-bold text-sm">Cancelou</p>
                                                    <p className="text-slate-400 text-xs mt-1">{cancelledAppointments.length}</p>
                                                </div>
                                            </div>
                                            <span className="text-slate-400 font-bold text-base">- {formatCurrency(cancelledAppointments.reduce((acc: number, a: any) => acc + (a.services?.price || 0), 0))}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Secoes de Ranking */}
                            <div className="flex flex-col gap-6 w-full pt-4">

                                {/* Ranking de Indicação (1 row container) */}
                                <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[20px]">group_add</span>
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold text-base">Ranking de Indicação</h3>
                                                <button className="text-red-500 hover:text-red-400 transition-colors text-xs font-bold hover:underline mt-0.5 text-left">ver mais</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {rankingIndicacao.map((item, index) => {
                                            const medalColors = [
                                                'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                                                'text-slate-300 bg-slate-400/10 border-slate-400/20',
                                                'text-orange-400 bg-orange-700/10 border-orange-700/20'
                                            ];
                                            return (
                                                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                                    <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border ${medalColors[index] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                                                        {index + 1}
                                                        <span className={`absolute -top-1.5 -right-1.5 material-symbols-outlined text-[14px] bg-bg-dark rounded-full ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : 'text-orange-400'}`}>
                                                            stars
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-slate-900 dark:text-white font-bold text-sm truncate max-w-[200px]">{item.name}</p>
                                                        <p className="text-slate-400 text-xs mt-0.5">{item.qtd}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Grid 3-col para os outros Rankings */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                    {/* Ranking de Procedimentos / Serviços */}
                                    <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[20px]">medical_services</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-slate-900 dark:text-white font-bold text-base">Ranking de Procedimentos</h3>
                                                    <button className="text-red-500 hover:text-red-400 transition-colors text-xs font-bold hover:underline mt-0.5 text-left">ver mais</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col px-1">
                                            {rankingServicos.map((item, index) => renderRankingItem(item, index, ''))}
                                        </div>
                                    </div>

                                    {/* Ranking de Produtos */}
                                    <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-slate-900 dark:text-white font-bold text-base">Ranking de Produtos</h3>
                                                    <button className="text-red-500 hover:text-red-400 transition-colors text-xs font-bold hover:underline mt-0.5 text-left">ver mais</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col h-full">
                                            {rankingProdutos.length > 0 ? (
                                                rankingProdutos.map((item, index) => renderRankingItem(item, index, ''))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-center h-full min-h-[160px]">
                                                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">inventory_2</span>
                                                    <p className="text-slate-900 dark:text-white font-bold text-sm">Não há nada aqui!</p>
                                                    <p className="text-slate-400 text-xs mt-1 w-[80%]">Nenhuma venda de produto encontrada para o período selecionado.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ranking de Pacientes / Clientes */}
                                    <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[20px]">group</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-slate-900 dark:text-white font-bold text-base">Ranking de Pacientes</h3>
                                                    <button className="text-red-500 hover:text-red-400 transition-colors text-xs font-bold hover:underline mt-0.5 text-left">ver mais</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col px-1">
                                            {rankingClientes.map((item, index) => renderRankingItem(item, index, ''))}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </>
                    )}

                    {activeTab === 'vendas' && (() => {
                        return (
                            <div className="flex flex-col w-full bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl flex-1 animate-fadeIn overflow-hidden">
                                {/* Header Top */}
                                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center justify-between lg:justify-start w-full gap-4">
                                        <h2 className="text-slate-900 dark:text-white font-bold text-lg">Relatório de vendas</h2>
                                        <span className="text-slate-500 text-sm font-medium bg-white/5 px-2.5 py-1 rounded-lg">{vendasData.length} registros</span>
                                    </div>
                                    <button className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap border border-slate-200 dark:border-white/10">
                                        Exportar
                                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                                    </button>
                                </div>

                                {/* Header Actions */}
                                <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto relative">
                                        <button 
                                            onClick={() => setIsEditingVendasFilter(!isEditingVendasFilter)}
                                            className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                            Data da venda: <span className="text-slate-900 dark:text-white font-bold">{startDate ? formatDate(startDate) : '16/02/2026'} - {endDate ? formatDate(endDate) : '18/03/2026'}</span>
                                        </button>
                                        
                                        {isEditingVendasFilter && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsEditingVendasFilter(false)}></div>
                                                <div className="absolute top-full left-0 mt-2 z-50">
                                                    <CustomDatePicker
                                                        startDate={startDate}
                                                        endDate={endDate}
                                                        onApply={(s: string, e: string) => { setStartDate(s); setEndDate(e); setIsEditingVendasFilter(false); }}
                                                        onCancel={() => setIsEditingVendasFilter(false)}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <button className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm hover:brightness-110 transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Adicionar filtro
                                        </button>
                                    </div>
                                    <div className="relative w-full lg:w-[300px]">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar" 
                                            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Data <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Descrição <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Tipo <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Cliente <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Vendedor <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center justify-end gap-1.5 w-full text-right">Valor (R$) <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-center">
                                                    <span className="material-symbols-outlined text-[18px]">settings</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vendasData.map((row) => (
                                                <tr key={row.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium">{row.data}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-medium truncate max-w-[250px]">{row.descricao}</td>
                                                    <td className="py-4 px-6">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">{row.tipo}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium truncate max-w-[180px]">{row.cliente}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-400 font-medium">{row.vendedor}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-bold text-right">{row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-4 px-6 text-center text-slate-500">
                                                        <button className="hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center w-full justify-center">
                                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="p-6 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative">
                                            <select className="appearance-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-slate-300 dark:focus:border-white/20 transition-colors cursor-pointer outline-none shadow-sm">
                                                <option className="bg-white dark:bg-bg-dark text-slate-700 dark:text-slate-300">10 por página</option>
                                                <option className="bg-white dark:bg-bg-dark text-slate-700 dark:text-slate-300">20 por página</option>
                                                <option className="bg-white dark:bg-bg-dark text-slate-700 dark:text-slate-300">50 por página</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                            <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_left</span>
                                        </button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                        </button>
                                        
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600 text-white font-bold text-[13px]">1</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors">2</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors">3</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors hidden sm:flex">4</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors hidden sm:flex">5</button>
                                        
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                        </button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Footer Total */}
                                <div className="p-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.03]">
                                    <span className="text-slate-900 dark:text-white font-bold text-lg">Total do período</span>
                                    <span className="text-slate-900 dark:text-white font-bold text-xl tracking-tight">{formatCurrency(vendasTotal)}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'carteiras' && (() => {
                        // Carteiras = saldo de créditos recarregados por cliente.
                        // Tabela client_wallets ainda não implementada — exibe clientes do período com saldo zerado.
                        const avatarColors = [
                            'bg-red-500/10 text-red-500 border border-red-500/20',
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                            'bg-blue-500/10 text-blue-500 border border-blue-500/20',
                            'bg-purple-500/10 text-purple-500 border border-purple-500/20',
                            'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                            'bg-teal-500/10 text-teal-400 border border-teal-500/20',
                            'bg-pink-500/10 text-pink-500 border border-pink-500/20',
                            'bg-orange-500/10 text-orange-400 border border-orange-500/20',
                        ];
                        const clientMap = new Map<string, { name: string; lastDate: Date }>();
                        rawAppointments.forEach((a: any) => {
                            if (!a.clients) return;
                            const d = new Date(a.scheduled_at);
                            const prev = clientMap.get(a.client_id);
                            if (!prev || d > prev.lastDate) clientMap.set(a.client_id, { name: a.clients.name, lastDate: d });
                        });
                        const carteirasMock = Array.from(clientMap.values())
                            .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())
                            .slice(0, 50)
                            .map((data, i) => {
                                const parts = data.name.trim().split(' ');
                                const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
                                const ld = data.lastDate;
                                return {
                                    id: i + 1,
                                    name: data.name,
                                    avatar: initials,
                                    color: avatarColors[i % avatarColors.length],
                                    data: `${String(ld.getDate()).padStart(2,'0')}/${String(ld.getMonth()+1).padStart(2,'0')}/${ld.getFullYear()}`,
                                    saldo: 0.00,
                                    cashback: 0.00,
                                    total: 0.00,
                                };
                            });
                        return (
                            <div className="flex flex-col w-full bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl flex-1 animate-fadeIn overflow-hidden">
                                {/* Header Top */}
                                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center justify-between lg:justify-start w-full gap-4">
                                        <h2 className="text-slate-900 dark:text-white font-bold text-lg">Relatório de carteiras</h2>
                                        <span className="text-slate-500 text-sm font-medium bg-white/5 px-2.5 py-1 rounded-lg">{carteirasMock.length} registros</span>
                                    </div>
                                    <button className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap border border-slate-200 dark:border-white/10">
                                        Exportar
                                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                                    </button>
                                </div>

                                {/* Header Actions */}
                                <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row items-start lg:items-center gap-4">
                                    <button className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm hover:brightness-110 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                        Adicionar filtro
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Cliente <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                    <div className="flex items-center gap-1.5">Última movimentação <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors text-right">
                                                    <div className="flex items-center justify-end gap-1.5 w-full">Saldo atual (R$) <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors text-right">
                                                    <div className="flex items-center justify-end gap-1.5 w-full">Cashback atual (R$) <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors text-right">
                                                    <div className="flex items-center justify-end gap-1.5 w-full">Total (R$) <span className="material-symbols-outlined text-[14px]">unfold_more</span></div>
                                                </th>
                                                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-center">
                                                    <span className="material-symbols-outlined text-[18px]">settings</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carteirasMock.map((row) => (
                                                <tr key={row.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <td className="py-4 px-6 min-w-[250px]">
                                                        <div className="flex items-center gap-3 w-max">
                                                            <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-xs ${row.color}`}>
                                                                {row.avatar}
                                                            </div>
                                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate max-w-[180px]">{row.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-400 font-medium">{row.data}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium text-right">{row.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium text-right">{row.cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium text-right">{row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-4 px-6 text-center text-slate-500">
                                                        <button className="hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center w-full justify-center">
                                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="p-6 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative">
                                            <select className="appearance-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-slate-300 dark:focus:border-white/20 transition-colors cursor-pointer outline-none shadow-sm">
                                                <option className="bg-white dark:bg-[#111111] text-slate-700 dark:text-slate-300">10 por página</option>
                                                <option className="bg-white dark:bg-[#111111] text-slate-700 dark:text-slate-300">20 por página</option>
                                                <option className="bg-white dark:bg-[#111111] text-slate-700 dark:text-slate-300">50 por página</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                            <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_left</span>
                                        </button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                        </button>
                                        
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600 text-white font-bold text-[13px]">1</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors">2</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors">3</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors hidden sm:flex">4</button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-[13px] transition-colors hidden sm:flex">5</button>
                                        
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                        </button>
                                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                </div>
            </main>
        </div>
    );
};

export default AdminAtendimentoReports;
