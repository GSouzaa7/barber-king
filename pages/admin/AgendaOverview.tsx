import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

const ptBRMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ptBRDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const getSafeDate = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const ptBRMonthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getInitialWeekRange = (): [string, string] => {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - today.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [fmtDate(start), fmtDate(end)];
};

const AdminAgendaOverview: React.FC = () => {
    const { selectedMatriz } = useMatriz();
    const heatmapDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatmapHours = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h'];

    const [overviewFilter, setOverviewFilter] = useState<'diária' | 'semanal' | 'mensal' | 'anual'>('diária');

    // --- Supabase data ---
    const [rawAppointments, setRawAppointments] = useState<any[]>([]);
    const [professionalCount, setProfessionalCount] = useState(1);
    const [waitingListCount, setWaitingListCount] = useState(0);

    // Date Filter State
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const [dateRange, setDateRange] = React.useState<[string | null, string | null]>(getInitialWeekRange());
    const [selectedPeriodOption, setSelectedPeriodOption] = React.useState<string>('');

    // Date Picker Internals
    const initialView = getSafeDate(dateRange[0] ?? '') || new Date();
    const [viewDate, setViewDate] = React.useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));
    const [tempSelection, setTempSelection] = React.useState<[string | null, string | null]>(dateRange);
    const datePickerRef = React.useRef<HTMLDivElement>(null);

    // Fetch appointments from Supabase when selectedMatriz or dateRange changes
    useEffect(() => {
        if (!selectedMatriz || !dateRange[0] || !dateRange[1]) return;
        const [from, to] = dateRange as [string, string];
        Promise.all([
            supabase
                .from('appointments')
                .select('id, scheduled_at, status, client_id, professional_id, clients(name), professionals(name), services(name, duration_minutes)')
                .eq('matriz_id', selectedMatriz.id)
                .gte('scheduled_at', from + 'T00:00:00')
                .lte('scheduled_at', to + 'T23:59:59'),
            supabase
                .from('professional_matrizes')
                .select('id')
                .eq('matriz_id', selectedMatriz.id)
                .eq('status', 'ativo'),
        ]).then(([apptRes, profRes]) => {
            if (apptRes.data) setRawAppointments(apptRes.data);
            if (profRes.data) setProfessionalCount(Math.max(profRes.data.length, 1));
        });
        const stored = JSON.parse(localStorage.getItem('bk_waiting_list') || '[]');
        setWaitingListCount(stored.length);
    }, [selectedMatriz, dateRange]);

    // --- Derived metrics ---
    const statusCounts = useMemo(() => {
        const c = { pending: 0, confirmed: 0, done: 0, cancelled: 0, total: rawAppointments.length };
        rawAppointments.forEach(a => {
            if (a.status === 'pending' || a.status === 'in_progress') c.pending++;
            else if (a.status === 'confirmed') c.confirmed++;
            else if (a.status === 'done') c.done++;
            else if (a.status === 'cancelled') c.cancelled++;
        });
        return c;
    }, [rawAppointments]);

    const overviewChartData = useMemo(() => {
        if (!dateRange[0] || !dateRange[1]) return [];
        const from = new Date(dateRange[0] + 'T00:00:00');
        const to = new Date(dateRange[1] + 'T23:59:59');
        const dayCount = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

        if (overviewFilter === 'diária' || dayCount <= 14) {
            return Array.from({ length: dayCount }, (_, i) => {
                const d = new Date(from); d.setDate(d.getDate() + i);
                const dateStr = fmtDate(d);
                const count = rawAppointments.filter(a => (a.scheduled_at as string).startsWith(dateStr)).length;
                return { name: `${String(d.getDate()).padStart(2, '0')} ${ptBRMonthsShort[d.getMonth()]}`, agendamentos: count, media: 0 };
            });
        }
        // Semanal: group by week
        if (overviewFilter === 'semanal') {
            const weeks: Record<string, number> = {};
            rawAppointments.forEach(a => {
                const d = new Date(a.scheduled_at);
                const startOfWeek = new Date(d); startOfWeek.setDate(d.getDate() - d.getDay());
                const key = fmtDate(startOfWeek);
                weeks[key] = (weeks[key] ?? 0) + 1;
            });
            return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
                const d = new Date(k + 'T00:00:00');
                return { name: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, agendamentos: v, media: 0 };
            });
        }
        // Mensal/anual: group by month
        const months: Record<string, number> = {};
        rawAppointments.forEach(a => {
            const key = (a.scheduled_at as string).substring(0, 7);
            months[key] = (months[key] ?? 0) + 1;
        });
        return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
            const [y, m] = k.split('-');
            return { name: `${ptBRMonthsShort[parseInt(m) - 1]} ${y}`, agendamentos: v, media: 0 };
        });
    }, [rawAppointments, overviewFilter, dateRange]);

    const chartDataWithMedia = useMemo(() => {
        if (overviewChartData.length === 0) return [];
        const avg = +(overviewChartData.reduce((s, d) => s + d.agendamentos, 0) / overviewChartData.length).toFixed(1);
        return overviewChartData.map(d => ({ ...d, media: avg }));
    }, [overviewChartData]);

    const topClients = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        rawAppointments.forEach(a => {
            const id = a.client_id ?? 'unknown';
            const name = (a.clients as any)?.name ?? '—';
            if (!map.has(id)) map.set(id, { name, count: 0 });
            map.get(id)!.count++;
        });
        const total = rawAppointments.length;
        return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 3)
            .map(c => ({ ...c, pct: total > 0 ? Math.round((c.count / total) * 100) : 0 }));
    }, [rawAppointments]);

    const topServices = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        rawAppointments.forEach(a => {
            const name = (a.services as any)?.name ?? '—';
            if (!map.has(name)) map.set(name, { name, count: 0 });
            map.get(name)!.count++;
        });
        const total = rawAppointments.length;
        return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 3)
            .map(s => ({ ...s, pct: total > 0 ? Math.round((s.count / total) * 100) : 0 }));
    }, [rawAppointments]);

    const topProfessionals = useMemo(() => {
        const map = new Map<string, { name: string; minutes: number; count: number }>();
        rawAppointments.forEach(a => {
            const id = a.professional_id ?? 'unknown';
            const name = (a.professionals as any)?.name ?? '—';
            const dur = (a.services as any)?.duration_minutes ?? 30;
            if (!map.has(id)) map.set(id, { name, minutes: 0, count: 0 });
            const p = map.get(id)!; p.minutes += dur; p.count++;
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 3);
    }, [rawAppointments]);

    const dayStats = useMemo(() => {
        const m: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        rawAppointments.forEach(a => { m[new Date(a.scheduled_at).getDay()]++; });
        return ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((name, i) => ({ name, val: m[i] }));
    }, [rawAppointments]);

    const heatmapData = useMemo(() => {
        const matrix: number[][] = Array.from({ length: 6 }, () => Array(14).fill(0));
        rawAppointments.forEach(a => {
            const d = new Date(a.scheduled_at);
            const dow = d.getDay();
            if (dow === 0) return;
            const col = d.getHours() - 8;
            if (col >= 0 && col < 14) matrix[dow - 1][col]++;
        });
        const maxCell = Math.max(...matrix.flat(), 1);
        return matrix.map(row => row.map(v => Math.round((v / maxCell) * 100)));
    }, [rawAppointments]);

    const ociosidadePct = useMemo(() => {
        if (!dateRange[0] || !dateRange[1]) return 0;
        const from = new Date(dateRange[0] + 'T00:00:00');
        const to = new Date(dateRange[1] + 'T23:59:59');
        const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
        const bookedMin = rawAppointments.reduce((s, a) => s + ((a.services as any)?.duration_minutes ?? 30), 0);
        const availMin = days * professionalCount * 10 * 60;
        return +Math.min(100, Math.max(0, 100 - (bookedMin / availMin) * 100)).toFixed(1);
    }, [rawAppointments, dateRange, professionalCount]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        if (isDatePickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDatePickerOpen]);

    // Handle Quick Periods
    const handleQuickPeriod = (option: string) => {
        setSelectedPeriodOption(option);
        const today = new Date();
        const formatDate = (date: Date) => fmtDate(date);
        let start, end;
        
        switch (option) {
            case 'Hoje':
                start = formatDate(today);
                end = start;
                break;
            case 'Esta semana':
                const first = today.getDate() - today.getDay(); // Sunday
                const last = first + 6; // Saturday
                start = formatDate(new Date(today.getFullYear(), today.getMonth(), first));
                end = formatDate(new Date(today.getFullYear(), today.getMonth(), last));
                break;
            case 'Este mês':
                start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
                end = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                break;
            case 'Últimos 7 dias':
                start = formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
                end = formatDate(today);
                break;
            case 'Últimos 30 dias':
                start = formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
                end = formatDate(today);
                break;
            default:
                return;
        }
        
        setTempSelection([start, end]);
        setDateRange([start, end]);
        setIsDatePickerOpen(false);
    };

    const handleDayClick = (day: number) => {
        setSelectedPeriodOption('');
        const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!tempSelection[0] || (tempSelection[0] && tempSelection[1])) {
            setTempSelection([dStr, null]);
        } else {
            const d1 = getSafeDate(tempSelection[0]);
            const d2 = getSafeDate(dStr);
            if (d1 && d2) {
                if (d2 < d1) setTempSelection([dStr, tempSelection[0]]);
                else setTempSelection([tempSelection[0], dStr]);
                
                setDateRange([tempSelection[0] < dStr ? tempSelection[0] : dStr, tempSelection[0] > dStr ? tempSelection[0] : dStr]);
                setTimeout(() => setIsDatePickerOpen(false), 200);
            }
        }
    };

    const formatDisplayDate = (dStr: string | null) => {
        if (!dStr) return '';
        const parts = dStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const sidebarItems = [
        { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
        { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
        { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
    ];

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
            {/* Modern Ambient Glows */}
            <div className="absolute inset-0 pointer-events-none z-[0] overflow-hidden transition-opacity duration-300">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
            </div>
            <Sidebar items={sidebarItems} portalName="BARBER KING" />

            <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative z-10">
                <header className="sticky top-0 z-50 flex justify-between items-center mb-8 bg-white/80 dark:bg-[#050505]/80 border-b border-slate-200 dark:border-white/5 pb-4 pt-2 -mx-8 px-8">
                    <div>
                        <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Visão Geral</h2>
                        <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-medium mt-1">Agendamentos da Equipe</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <ThemeToggle />
                        <div className="relative">
                            <img alt="Admin" className="w-10 h-10 rounded-full border border-slate-200 dark:border-border-subtle object-cover shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-green border-2 border-white dark:border-background-dark rounded-full"></span>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-6 animate-fadeIn pb-8">
                    {/* Filtros */}
                    <div className="relative z-[60]">
                        <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 rounded-2xl md:h-16 gap-4 transform-gpu isolate">
                            <div className="flex items-center gap-3">
                            {dateRange[0] ? (
                                <button 
                                    onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || fmtDate(new Date()))!.getFullYear(), getSafeDate(dateRange[0] || fmtDate(new Date()))!.getMonth(), 1)); }} 
                                    className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-red-600/20 glow-red transition-all hover:brightness-110"
                                >
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    Período
                                </button>
                            ) : (
                                <button onClick={() => { setIsDatePickerOpen(true); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || fmtDate(new Date()))!.getFullYear(), getSafeDate(dateRange[0] || fmtDate(new Date()))!.getMonth(), 1)); }} className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all border border-border-subtle">
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    Selecione um Período
                                </button>
                            )}
                            <button onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || fmtDate(new Date()))!.getFullYear(), getSafeDate(dateRange[0] || fmtDate(new Date()))!.getMonth(), 1)); }} className="flex items-center gap-2 text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all">
                                {dateRange[0] && dateRange[1] ? `${formatDisplayDate(dateRange[0])} - ${formatDisplayDate(dateRange[1])}` : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                        Adicionar filtro
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="relative w-72">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                            <input 
                                className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none placeholder:text-slate-500 shadow-inner" 
                                placeholder="Buscar" 
                                type="text" 
                            />
                        </div>
                    </div>
                            
                    {/* Date Picker Popover */}
                    {isDatePickerOpen && (
                        <div ref={datePickerRef} className="absolute top-[120%] left-0 mt-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl text-slate-900 dark:text-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,1)] lg:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex border border-slate-200 dark:border-white/10 overflow-hidden z-[100] animate-fadeIn w-[500px] transform-gpu will-change-transform isolate">
                                    {/* Opções Rápidas */}
                                    <div className="w-1/3 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#111] p-3 flex flex-col gap-1">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white mb-2 px-3 pt-2">Período</div>
                                        {['Hoje', 'Esta semana', 'Este mês', 'Últimos 7 dias', 'Últimos 30 dias'].map((opt) => (
                                            <button 
                                                key={opt}
                                                onClick={() => handleQuickPeriod(opt)}
                                                className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors group"
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedPeriodOption === opt ? 'border-red-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {selectedPeriodOption === opt && <div className="w-2 h-2 rounded-full bg-red-600"></div>}
                                                </div>
                                                <span className={selectedPeriodOption === opt ? 'text-slate-900 dark:text-white font-bold' : ''}>{opt}</span>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Calendário */}
                                    <div className="w-2/3 p-4">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
                                            </button>
                                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                            </button>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                {ptBRMonths[viewDate.getMonth()]} {viewDate.getFullYear()}
                                            </div>
                                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                            </button>
                                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {ptBRDays.map((d, i) => (
                                                <div key={`${d}-${i}`} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">{d}</div>
                                            ))}
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1">
                                            {(() => {
                                                const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                                                const firstDayIndex = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
                                                let cells = [];
                                                
                                                for (let i = 0; i < firstDayIndex; i++) {
                                                    cells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
                                                }
                                                
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    
                                                    let isSelected = dStr === tempSelection[0] || dStr === tempSelection[1];
                                                    let inRange = false;
                                                    let isRangeStart = dStr === tempSelection[0] && tempSelection[1] !== null && dStr < tempSelection[1];
                                                    let isRangeEnd = dStr === tempSelection[1] && tempSelection[0] !== null && dStr > tempSelection[0]!;

                                                    if (tempSelection[0] && tempSelection[1]) {
                                                        const cur = getSafeDate(dStr);
                                                        const d1 = getSafeDate(tempSelection[0]);
                                                        const d2 = getSafeDate(tempSelection[1]);
                                                        if (cur && d1 && d2 && cur > d1 && cur < d2) {
                                                            inRange = true;
                                                        }
                                                    }

                                                    let bgClass = "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10";
                                                    if (isSelected) bgClass = "bg-red-600 text-white font-bold rounded-md shadow-[0_0_10px_rgba(220,38,38,0.5)] glow-red";
                                                    else if (inRange) bgClass = "bg-red-600/20 text-red-600 dark:text-red-500 font-bold";

                                                    const isToday = dStr === fmtDate(new Date());

                                                    cells.push(
                                                        <div key={day} className={`relative flex items-center justify-center h-8 ${inRange || isRangeStart || isRangeEnd ? 'before:absolute before:inset-0 before:-z-10' : ''}`}>
                                                            {inRange && <div className="absolute inset-0 bg-red-600/10 -z-10"></div>}
                                                            {isRangeStart && <div className="absolute inset-y-0 right-0 w-1/2 bg-red-600/10 -z-10"></div>}
                                                            {isRangeEnd && <div className="absolute inset-y-0 left-0 w-1/2 bg-red-600/10 -z-10"></div>}
                                                            
                                                            <button
                                                                onClick={() => handleDayClick(day)}
                                                                className={`w-8 h-8 flex items-center justify-center text-xs transition-colors rounded-md ${bgClass} ${isToday && !isSelected && !inRange ? 'text-red-600 font-bold ring-1 ring-red-600/50' : ''}`}
                                                            >
                                                                {day}
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                                return cells;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* 3 Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between transform-gpu isolate">
                            <div className="flex items-start justify-between">
                                <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight">Total de agendamentos</h4>
                            </div>
                            <p className="text-4xl font-light text-slate-900 dark:text-white tracking-wide mt-4">{statusCounts.total}</p>
                        </div>

                        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between transform-gpu isolate">
                            <div className="flex items-start justify-between">
                                <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight">Ociosidade estimada</h4>
                            </div>
                            <p className="text-4xl font-light text-slate-900 dark:text-white tracking-wide mt-4">{ociosidadePct} %</p>
                        </div>

                        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between transform-gpu isolate">
                            <div className="flex items-start justify-between">
                                <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight">Na lista de espera</h4>
                            </div>
                            <p className="text-4xl font-light text-slate-900 dark:text-white tracking-wide mt-4">{waitingListCount}</p>
                        </div>
                    </div>

                        {/* Chart and Status List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm col-span-2 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-base">Agendamentos por período</h4>
                                    <div className="flex gap-2">
                                        {['diária', 'semanal', 'mensal', 'anual'].map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => { setOverviewFilter(filter as any); setIsDatePickerOpen(false); }}
                                                className={`px-3 py-1.5 text-[11px] sm:text-xs font-bold capitalize rounded-md transition-all ${overviewFilter === filter ? 'text-red-600' : 'text-slate-500 hover:text-slate-900 dark:text-white'}`}
                                            >
                                                {filter}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-[250px] w-full mt-2 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartDataWithMedia} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                            <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} domain={[0, 8]} tickCount={5} />
                                            <RechartsTooltip cursor={{ fill: 'var(--border-subtle)' }} contentStyle={{ backgroundColor: 'var(--card-dark)', borderColor: 'var(--border-subtle)', borderRadius: '12px', color: 'var(--text-base)' }} itemStyle={{ color: 'var(--text-base)' }} />
                                            <Bar dataKey="agendamentos" fill="#86efac" maxBarSize={40} radius={[4, 4, 0, 0]} />
                                            <Line type="monotone" dataKey="media" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-6 mt-4 ml-8">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-[#86efac] rounded-sm"></span>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">Agendamentos</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-[2px] bg-[#dc2626]"></span>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">Média</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm col-span-1">
                                <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight mb-6">Agendamentos por status</h4>
                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: 'Agendado', count: statusCounts.pending, icon: 'event', color: 'bg-red-600/10 text-red-600' },
                                        { label: 'Confirmado', count: statusCounts.confirmed, icon: 'event_available', color: 'bg-blue-500/10 text-blue-500' },
                                        { label: 'Concluído', count: statusCounts.done, icon: 'check_circle', color: 'bg-success-green/10 text-success-green' },
                                        { label: 'Cancelado', count: statusCounts.cancelled, icon: 'cancel', color: 'bg-danger-red/10 text-danger-red' },
                                    ].map(({ label, count, icon, color }) => {
                                        const pct = statusCounts.total > 0 ? (count / statusCounts.total * 100).toFixed(1) : '0';
                                        return (
                                            <div key={label} className="flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                                                        <span className="material-symbols-outlined">{icon}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white font-bold text-sm">{label}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{count}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold text-sm ${count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 4 Cards Secundários */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Clientes mais frequentes */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col">
                                <div className="flex items-start gap-4 mb-6 border-b border-white/5 pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 text-red-500 hover:text-red-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">group</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-sm leading-tight">Clientes mais frequentes</h4>
                                        <button className="text-red-500 hover:text-red-600 text-xs font-bold mt-1 hover:underline">ver mais</button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-5">
                                    {topClients.length > 0 ? topClients.map((c, idx) => {
                                        const rankColors = ['bg-amber-500/10 text-amber-500', 'bg-slate-400/10 text-slate-500 dark:text-slate-400', 'bg-orange-500/10 text-orange-500'];
                                        return (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${rankColors[idx]} flex items-center justify-center font-bold text-sm`}>{idx + 1}</div>
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white font-bold text-sm">{c.name}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{c.count} agendamentos</p>
                                                    </div>
                                                </div>
                                                <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">{c.pct}%</span>
                                            </div>
                                        );
                                    }) : <p className="text-slate-500 text-xs text-center mt-4">Nenhum dado no período.</p>}
                                </div>
                            </div>

                            {/* Ociosidade por cadeira */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col">
                                <div className="flex items-start gap-4 mb-6 border-b border-white/5 pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-danger-red/10 text-danger-red flex items-center justify-center">
                                        <span className="material-symbols-outlined">chair</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-sm leading-tight">Ociosidade por cadeira</h4>
                                        <button className="text-red-500 hover:text-red-600 text-xs font-bold mt-1 hover:underline">ver mais</button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                    <span className="material-symbols-outlined text-3xl text-red-500 hover:text-red-600 mb-3">warning</span>
                                    <h5 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-sm">Não há nada aqui!</h5>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Nenhum dado encontrado<br/>para os filtros selecionados</p>
                                </div>
                            </div>

                            {/* Ociosidade por barbeiro */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col">
                                <div className="flex items-start gap-4 mb-6 border-b border-white/5 pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined">content_cut</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-sm leading-tight">Ociosidade por barbeiro</h4>
                                        <button className="text-red-500 hover:text-red-600 text-xs font-bold mt-1 hover:underline">ver mais</button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-5">
                                    {topProfessionals.length > 0 ? topProfessionals.map((p, idx) => {
                                        const rankColors = ['bg-amber-500/10 text-amber-500', 'bg-slate-400/10 text-slate-500 dark:text-slate-400', 'bg-orange-500/10 text-orange-500'];
                                        const h = Math.floor(p.minutes / 60).toString().padStart(2, '0');
                                        const m = (p.minutes % 60).toString().padStart(2, '0');
                                        return (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${rankColors[idx]} flex items-center justify-center font-bold text-sm`}>{idx + 1}</div>
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white font-bold text-sm">{p.name}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{h}:{m} atendidos</p>
                                                    </div>
                                                </div>
                                                <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">{p.count} aptos</span>
                                            </div>
                                        );
                                    }) : <p className="text-slate-500 text-xs text-center mt-4">Nenhum dado no período.</p>}
                                </div>
                            </div>

                            {/* Serviços mais frequentes */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
                                <div className="flex items-start gap-4 mb-6 border-b border-white/5 pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 text-red-500 hover:text-red-600 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">storefront</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-sm leading-tight">Serviços mais frequentes</h4>
                                        <button className="text-red-500 hover:text-red-600 text-xs font-bold mt-1 hover:underline">ver mais</button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-5 overflow-hidden">
                                    {topServices.length > 0 ? topServices.map((s, idx) => {
                                        const rankColors = ['bg-amber-500/10 text-amber-500', 'bg-slate-400/10 text-slate-500 dark:text-slate-400', 'bg-orange-500/10 text-orange-500'];
                                        return (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className={`w-8 h-8 rounded-full ${rankColors[idx]} flex items-center justify-center font-bold text-sm shrink-0`}>{idx + 1}</div>
                                                    <div className="truncate">
                                                        <p className="text-slate-900 dark:text-white font-bold text-sm truncate">{s.name}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{s.count}</p>
                                                    </div>
                                                </div>
                                                <span className="text-slate-500 dark:text-slate-400 font-bold text-sm pl-2">{s.pct}%</span>
                                            </div>
                                        );
                                    }) : <p className="text-slate-500 text-xs text-center mt-4">Nenhum dado no período.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Secondary Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Dias mais movimentados */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col h-[320px] relative">
                                <div className="flex items-start gap-2 mb-6">
                                    <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-base">Dias mais movimentados</h4>
                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm mt-0.5 cursor-help">help</span>
                                </div>
                                <div className="flex-1 w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={dayStats}
                                            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                                        >
                                            <XAxis dataKey="name" axisLine={{ stroke: '#dc2626', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                                            <Bar dataKey="val" fill="#dc2626" maxBarSize={30} radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 600, dy: -5 }} />
                                            <RechartsTooltip cursor={{ fill: 'var(--border-subtle)' }} contentStyle={{ backgroundColor: 'var(--card-dark)', borderColor: 'var(--border-subtle)', borderRadius: '12px', color: 'var(--text-base)' }} itemStyle={{ color: 'var(--text-base)' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Horários mais movimentados */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col h-[320px] relative overflow-hidden">
                                <div className="flex items-start gap-2 mb-4">
                                    <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight text-base">Horários mais movimentados</h4>
                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm mt-0.5 cursor-help">help</span>
                                </div>
                                <div className="w-full overflow-x-auto custom-scrollbar pb-2 flex-1 relative z-10">
                                    <div className="min-w-[400px]">
                                        {/* Headers das horas */}
                                        <div className="flex mb-2 ml-[40px]">
                                            {heatmapHours.map(hour => (
                                                <div key={hour} className="flex-1 text-center text-[10px] font-bold text-slate-500">{hour}</div>
                                            ))}
                                        </div>

                                        {/* Linhas dos dias */}
                                        {heatmapDays.map((day, dIdx) => (
                                            <div key={day} className="flex items-center mb-1">
                                                <div className="w-[40px] text-xs font-bold text-slate-500 dark:text-slate-400">{day}</div>
                                                <div className="flex-1 flex gap-1">
                                                    {heatmapData[dIdx].map((intensity, hIdx) => {
                                                        let bgClass = 'bg-[#f1f5f9] dark:bg-[#151515]';
                                                        let textClass = 'text-transparent';
                                                        if (intensity > 15) bgClass = 'bg-red-600/20 glow-red';
                                                        if (intensity > 35) bgClass = 'bg-red-600/40 glow-red';
                                                        if (intensity > 60) { bgClass = 'bg-red-600/70 glow-red'; textClass = 'text-white'; }
                                                        if (intensity > 85) { bgClass = 'bg-red-600 glow-red shadow-md shadow-red-600/20'; textClass = 'text-white'; }

                                                        return (
                                                            <div
                                                                key={`${day}-${hIdx}`}
                                                                className={`flex-1 h-[26px] rounded-md flex items-center justify-center transition-all hover:scale-110 hover:z-[60] cursor-pointer ${bgClass} relative`}
                                                                title={`${day} ${heatmapHours[hIdx]} - Movimento: ${intensity}%`}
                                                            >
                                                                <span className={`text-[8px] uppercase font-bold tracking-[0.2em] opacity-90 ${textClass}`}>{intensity}%</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 relative z-10">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-background-dark"></div> Ocioso</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-600/40 shadow-[0_0_10px_rgba(220,38,38,0.4)]"></div> Normal</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div> Pico</span>
                                </div>
                            </div>
                        </div>
                </div>
            </main>
        </div>
    );
};

export default AdminAgendaOverview;
