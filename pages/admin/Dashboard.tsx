import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Label, ComposedChart } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

// Interfaces
interface AppointmentItem {
    id: string;
    name: string;
    service: string;
    time: string;
    barber: string;
    status: 'pending' | 'checked-in';
    phone?: string;
}

interface WaitingItem {
    id: string;
    name: string;
    service: string;
    arrivalTime: string;
}

interface Branch {
    id: string;
    name: string;
    address: string;
}

interface BranchData {
    stats: {
        appointments: number;
        confirmed: number;
        pending: number;
        revenue: string;
    };
    appointments: AppointmentItem[];
    team: {
        name: string;
        status: string;
        color: string;
        img: string;
    }[];
    inventoryAlerts: {
        critical: { item: string; qty: number } | null;
        low: { item: string; qty: number } | null;
    };
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { matrizes, selectedMatriz, setSelectedMatriz, refetch: refetchMatrizes } = useMatriz();

    // --- Estados de Controle de Filial ---
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
    const [showSensitiveData, setShowSensitiveData] = useState(false);

    // --- Estados de Dados Reais ---
    const [todayStats, setTodayStats] = useState({ appointments: 0, confirmed: 0, pending: 0, revenue: 0 });
    const [todayAppointments, setTodayAppointments] = useState<AppointmentItem[]>([]);
    const [team, setTeam] = useState<{ name: string; status: string; color: string; img: string }[]>([]);
    const [inventoryAlerts, setInventoryAlerts] = useState<BranchData['inventoryAlerts']>({ critical: null, low: null });
    const [financialRecords, setFinancialRecords] = useState<{ type: string; amount: number; date: string }[]>([]);
    const [futureAppointments, setFutureAppointments] = useState<{ scheduled_at: string; price: number }[]>([]);
    const [birthdays, setBirthdays] = useState<{ name: string; date: string; phone?: string; daysUntil: number }[]>([]);
    const [professionalStats, setProfessionalStats] = useState<{ name: string; count: number }[]>([]);
    const [dayStats, setDayStats] = useState<{ day: string; val: number }[]>([]);
    const [atRiskClients, setAtRiskClients] = useState<{ id: string; name: string; phone: string; lastVisit: string; daysMissing: number }[]>([]);
    const [heatmapData, setHeatmapData] = useState<number[][]>(
        Array.from({ length: 6 }, () => Array(14).fill(0))
    );

    const sidebarItems = [
        { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
        { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
        { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
    ];

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch real data when selected matriz changes
    useEffect(() => {
        if (!selectedMatriz) return;
        const today = new Date().toISOString().split('T')[0];

        // Data de 3 meses à frente para agendamentos futuros (saldo previsto)
        const threeMonthsAhead = new Date();
        threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

        Promise.all([
            // Agendamentos de hoje
            supabase
                .from('appointments')
                .select('id, scheduled_at, status, clients(name, phone), professionals(name), services(name)')
                .eq('matriz_id', selectedMatriz.id)
                .gte('scheduled_at', today + 'T00:00:00')
                .lte('scheduled_at', today + 'T23:59:59'),
            // Profissionais da filial
            supabase
                .from('professional_matrizes')
                .select('professionals(id, name)')
                .eq('matriz_id', selectedMatriz.id)
                .eq('status', 'ativo'),
            // Alertas de estoque baixo
            supabase
                .from('inventory_products')
                .select('name, quantity, low_stock_threshold')
                .eq('matriz_id', selectedMatriz.id)
                .order('quantity'),
            // Registros financeiros (todos da matriz para permitir filtro livre nos meses)
            supabase
                .from('financial_records')
                .select('type, amount, date')
                .eq('matriz_id', selectedMatriz.id),
            // Aniversariantes
            supabase
                .from('client_matrizes')
                .select('clients(name, birth_date, phone)')
                .eq('matriz_id', selectedMatriz.id),
            // Agendamentos do mês por profissional
            supabase
                .from('appointments')
                .select('professional_id, scheduled_at, professionals(name)')
                .eq('matriz_id', selectedMatriz.id)
                .gte('scheduled_at', today.substring(0, 7) + '-01T00:00:00')
                .lte('scheduled_at', today + 'T23:59:59'),
            // Agendamentos futuros pendentes/confirmados (para saldo previsto)
            supabase
                .from('appointments')
                .select('scheduled_at, services(price)')
                .eq('matriz_id', selectedMatriz.id)
                .gt('scheduled_at', new Date().toISOString())
                .lte('scheduled_at', threeMonthsAhead.toISOString()),
            // Agendamentos concluídos para cálculo de retenção (últimos 6 meses)
            supabase
                .from('appointments')
                .select('client_id, scheduled_at, clients(name, phone)')
                .eq('matriz_id', selectedMatriz.id)
                .eq('status', 'done')
                .gt('scheduled_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
                .order('scheduled_at', { ascending: false }),
        ]).then(([apptRes, teamRes, invRes, finRes, clientsRes, monthApptRes, futureApptRes, retentionRes]) => {
            // Stats + agendamentos
            if (apptRes.data) {
                const appts = apptRes.data;
                const confirmed = appts.filter((a: any) => a.status === 'confirmed').length;
                const pending = appts.filter((a: any) => a.status === 'pending').length;
                setTodayStats({ appointments: appts.length, confirmed, pending, revenue: 0 });
                setTodayAppointments(appts.map((a: any) => ({
                    id: a.id,
                    name: (a.clients as any)?.name ?? '—',
                    phone: (a.clients as any)?.phone ?? '',
                    service: (a.services as any)?.name ?? '—',
                    time: new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    barber: (a.professionals as any)?.name ?? '—',
                    status: a.status === 'confirmed' ? 'checked-in' : 'pending',
                })));
            }
            // Team
            if (teamRes.data) {
                const statusOptions = ['Disponível', 'Em Atendimento', 'Em Intervalo'];
                const colorOptions = ['emerald', 'orange', 'red'];
                setTeam(teamRes.data.map((r: any, i: number) => ({
                    name: (r.professionals as any)?.name ?? '—',
                    status: statusOptions[i % statusOptions.length],
                    color: colorOptions[i % colorOptions.length],
                    img: `https://i.pravatar.cc/150?u=${encodeURIComponent((r.professionals as any)?.name ?? i)}`,
                })));
            }
            // Inventory alerts
            if (invRes.data && invRes.data.length > 0) {
                const sorted = invRes.data.filter((p: any) => p.quantity < (p.low_stock_threshold ?? 10));
                setInventoryAlerts({
                    critical: sorted[0] ? { item: sorted[0].name, qty: sorted[0].quantity } : null,
                    low: sorted[1] ? { item: sorted[1].name, qty: sorted[1].quantity } : null,
                });
            } else {
                setInventoryAlerts({ critical: null, low: null });
            }
            // Financial
            if (finRes.data) {
                setFinancialRecords(finRes.data as any);
                const currentMonthPrefix = today.substring(0, 7) + '-';
                const revenue = (finRes.data as any[]).filter(r => r.type === 'income' && r.date?.startsWith(currentMonthPrefix)).reduce((s: number, r: any) => s + Number(r.amount), 0);
                setTodayStats(prev => ({ ...prev, revenue }));
            }
            // Aniversariantes
            if (clientsRes.data) {
                const todayDate = new Date();
                const year = todayDate.getFullYear();
                const upcoming = (clientsRes.data as any[])
                    .map(r => (r.clients as any))
                    .filter(c => c && c.birth_date)
                    .map(c => {
                        const [, bdMonth, bdDay] = c.birth_date.split('-').map(Number);
                        let bdThis = new Date(year, bdMonth - 1, bdDay);
                        if (bdThis < todayDate) bdThis = new Date(year + 1, bdMonth - 1, bdDay);
                        const daysUntil = Math.floor((bdThis.getTime() - todayDate.getTime()) / 86400000);
                        return { 
                            name: c.name as string, 
                            date: `${String(bdDay).padStart(2, '0')}/${String(bdMonth).padStart(2, '0')}`, 
                            phone: c.phone as string,
                            daysUntil 
                        };
                    })
                    .sort((a, b) => a.daysUntil - b.daysUntil)
                    .slice(0, 5);
                setBirthdays(upcoming);
            }
            // Agendamentos futuros: saldo previsto
            if (futureApptRes.data) {
                setFutureAppointments(
                    (futureApptRes.data as any[]).map(a => ({
                        scheduled_at: a.scheduled_at as string,
                        price: Number((a.services as any)?.price ?? 0),
                    }))
                );
            }
            // Agendamentos por profissional + dias mais movimentados
            if (monthApptRes.data) {
                const profMap = new Map<string, { name: string; count: number }>();
                const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                (monthApptRes.data as any[]).forEach(a => {
                    const profId = a.professional_id ?? 'unknown';
                    const profName = (a.professionals as any)?.name ?? '—';
                    if (!profMap.has(profId)) profMap.set(profId, { name: profName, count: 0 });
                    profMap.get(profId)!.count++;
                    const dow = new Date(a.scheduled_at).getDay();
                    dayMap[dow]++;
                });
                setProfessionalStats(Array.from(profMap.values()).sort((a, b) => b.count - a.count).slice(0, 6));
                const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                setDayStats(dayLabels.map((d, i) => ({ day: d, val: dayMap[i] })));
                // Heatmap: 6 rows (Seg–Sáb) × 14 cols (08h–21h)
                const heatMatrix: number[][] = Array.from({ length: 6 }, () => Array(14).fill(0));
                (monthApptRes.data as any[]).forEach(a => {
                    const d = new Date(a.scheduled_at);
                    const dow = d.getDay(); // 0=Dom, 1=Seg … 6=Sáb
                    if (dow === 0) return;
                    const rowIdx = dow - 1;
                    const colIdx = d.getHours() - 8;
                    if (colIdx >= 0 && colIdx < 14) heatMatrix[rowIdx][colIdx]++;
                });
                const maxCell = Math.max(...heatMatrix.flat(), 1);
                setHeatmapData(heatMatrix.map(row => row.map(v => Math.round((v / maxCell) * 100))));
            }

            // Cálculo de Retenção (Clientes sumidos há 45+ dias)
            if (retentionRes.data) {
                const now = new Date();
                const lastVisits = new Map<string, { name: string; phone: string; date: Date }>();
                
                (retentionRes.data as any[]).forEach(a => {
                    const clientId = a.client_id;
                    const clientName = a.clients?.name;
                    const clientPhone = a.clients?.phone;
                    const apptDate = new Date(a.scheduled_at);
                    
                    if (clientId && !lastVisits.has(clientId)) {
                        lastVisits.set(clientId, { name: clientName, phone: clientPhone, date: apptDate });
                    }
                });

                const atRisk = Array.from(lastVisits.entries())
                    .map(([id, data]) => {
                        const diffTime = Math.abs(now.getTime() - data.date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return { id, ...data, daysMissing: diffDays, lastVisit: data.date.toLocaleDateString('pt-BR') };
                    })
                    .filter(c => c.daysMissing >= 45)
                    .sort((a, b) => b.daysMissing - a.daysMissing)
                    .slice(0, 5);
                
                setAtRiskClients(atRisk);
            }
        });
    }, [selectedMatriz]);

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('name') as string;
        const address = formData.get('address') as string;
        const { data } = await supabase.from('matrizes').insert({ name, address }).select().single();
        if (data) {
            await refetchMatrizes();
            setSelectedMatriz(data);
        }
        setIsCreateBranchModalOpen(false);
    };

    const handleCheckIn = (appointmentId: string) => {
        setTodayAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'checked-in' as const } : a));
    };

    const [timeFilter, setTimeFilter] = useState<'diária' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const years = [2024, 2025, 2026, 2027];

    const _currentDateVar = new Date();
    const [selectedMonth, setSelectedMonth] = useState(months[_currentDateVar.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(_currentDateVar.getFullYear());

    const handlePrevPeriod = () => {
        if (timeFilter === 'anual' || timeFilter === 'trimestral' || timeFilter === 'semestral') {
            setSelectedYear(prev => prev - 1);
        } else {
            const currentIdx = months.indexOf(selectedMonth);
            if (currentIdx === 0) {
                setSelectedMonth(months[11]);
                setSelectedYear(prev => prev - 1);
            } else {
                setSelectedMonth(months[currentIdx - 1]);
            }
        }
    };

    const handleNextPeriod = () => {
        if (timeFilter === 'anual' || timeFilter === 'trimestral' || timeFilter === 'semestral') {
            setSelectedYear(prev => prev + 1);
        } else {
            const currentIdx = months.indexOf(selectedMonth);
            if (currentIdx === 11) {
                setSelectedMonth(months[0]);
                setSelectedYear(prev => prev + 1);
            } else {
                setSelectedMonth(months[currentIdx + 1]);
            }
        }
    };

    const getDaysInMonth = (monthIndex: number, year: number) => {
        return new Date(year, monthIndex + 1, 0).getDate();
    };

    const getPeriodLabel = () => {
        const currentIdx = months.indexOf(selectedMonth);
        const monthNum = (currentIdx + 1).toString().padStart(2, '0');

        if (timeFilter === 'anual' || timeFilter === 'trimestral' || timeFilter === 'semestral') {
            return selectedYear.toString();
        } else if (timeFilter === 'mensal') {
            const endIdx = months.indexOf(selectedMonth);
            let startIdx = endIdx - 5;
            let startY = selectedYear;
            if (startIdx < 0) {
                startIdx += 12;
                startY -= 1;
            }
            const startMonthNum = (startIdx + 1).toString().padStart(2, '0');
            return `${startMonthNum}/${startY} - ${monthNum}/${selectedYear}`;
        } else {
            const lastDay = getDaysInMonth(currentIdx, selectedYear);
            return `01/${monthNum}/${selectedYear} - ${lastDay}/${monthNum}/${selectedYear}`;
        }
    };



    const aggregateByDate = (type: string, dateStr: string) =>
        financialRecords.filter((r: any) => r.type === type && r.date === dateStr).reduce((s: number, r: any) => s + Number(r.amount), 0);

    /** Soma receita prevista de agendamentos futuros para um prefixo de data (YYYY-MM-DD ou YYYY-MM-) */
    const aggregateFutureByPrefix = (prefix: string) =>
        futureAppointments
            .filter(a => a.scheduled_at.startsWith(prefix))
            .reduce((s, a) => s + a.price, 0);

    const generateDataForFilter = (filter: string, month: string, year: number) => {
        const monthIndex = months.indexOf(month);
        const pad = (n: number) => String(n).padStart(2, '0');

        if (filter === 'diária') {
            const days = getDaysInMonth(monthIndex, year);
            return Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const dateStr = year + '-' + pad(monthIndex + 1) + '-' + pad(day);
                const entradas = aggregateByDate('income', dateStr);
                const saidas = aggregateByDate('expense', dateStr);
                // Receita prevista: agendamentos futuros pendentes/confirmados neste dia
                const entradasPrev = aggregateFutureByPrefix(dateStr);
                return { name: pad(day), entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev, saidasPrev: 0, saldoPrev: entradasPrev };
            });
        }

        if (filter === 'mensal') {
            return Array.from({ length: 6 }, (_, i) => {
                let targetIdx = monthIndex - (5 - i);
                let targetYear = year;
                if (targetIdx < 0) { targetIdx += 12; targetYear -= 1; }
                const prefix = targetYear + '-' + pad(targetIdx + 1) + '-';
                const entradas = financialRecords.filter((r: any) => r.type === 'income' && r.date?.startsWith(prefix)).reduce((s: number, r: any) => s + Number(r.amount), 0);
                const saidas = financialRecords.filter((r: any) => r.type === 'expense' && r.date?.startsWith(prefix)).reduce((s: number, r: any) => s + Number(r.amount), 0);
                // Receita prevista: agendamentos futuros pendentes/confirmados neste mês
                const entradasPrev = aggregateFutureByPrefix(prefix);
                return { name: months[targetIdx].substring(0, 3) + ' ' + targetYear, entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev, saidasPrev: 0, saldoPrev: entradasPrev };
            });
        }

        if (filter === 'semanal') {
            const days = getDaysInMonth(monthIndex, year);
            const weeksCount = Math.ceil(days / 7);
            return Array.from({ length: weeksCount }, (_, w) => {
                const start = w * 7 + 1;
                const end = Math.min(start + 6, days);
                let entradas = 0;
                let saidas = 0;
                let entradasPrev = 0;
                for (let k = 0; k < end - start + 1; k++) {
                    const dateStr = year + '-' + pad(monthIndex + 1) + '-' + pad(start + k);
                    entradas += aggregateByDate('income', dateStr);
                    saidas += aggregateByDate('expense', dateStr);
                    entradasPrev += aggregateFutureByPrefix(dateStr);
                }
                return { name: 'Semana ' + (w + 1), entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev, saidasPrev: 0, saldoPrev: entradasPrev };
            });
        }

        // trimestral / semestral / anual — agrupar os meses no ano selecionado
        const groupSizes: Record<string, number> = { trimestral: 3, semestral: 6, anual: 12 };
        const groupSize = groupSizes[filter] || 3;
        const groupCount = Math.ceil(12 / groupSize);
        return Array.from({ length: groupCount }, (_, gi) => {
            const startM = gi * groupSize;
            let totalIn = 0, totalOut = 0, totalPrevIn = 0;
            for (let m = startM; m < startM + groupSize; m++) {
                const prefix = year + '-' + pad(m + 1) + '-';
                totalIn += financialRecords.filter((r: any) => r.type === 'income' && r.date?.startsWith(prefix)).reduce((s: number, r: any) => s + Number(r.amount), 0);
                totalOut += financialRecords.filter((r: any) => r.type === 'expense' && r.date?.startsWith(prefix)).reduce((s: number, r: any) => s + Number(r.amount), 0);
                totalPrevIn += aggregateFutureByPrefix(prefix);
            }
            return { 
                name: months[startM]?.substring(0, 3) + '-' + months[Math.min(startM + groupSize - 1, 11)]?.substring(0, 3), 
                entradas: totalIn, 
                saidas: -totalOut, 
                saldo: totalIn - totalOut, 
                entradasPrev: totalPrevIn, 
                saidasPrev: 0, 
                saldoPrev: totalPrevIn 
            };
        });
    };

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#f8fafc] dark:bg-[#1A1A1A] border border-slate-200 dark:border-border-subtle p-3 rounded-xl shadow-xl">
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
                            {entry.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value ?? 0)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const performanceData = useMemo(() => {
        return generateDataForFilter(timeFilter, selectedMonth, selectedYear);
    }, [timeFilter, selectedMonth, selectedYear, financialRecords, futureAppointments]);

    const summaryData = useMemo(() => {
        let entradas = 0;
        let entradasPrev = 0;
        let saidas = 0;
        let saidasPrev = 0;

        performanceData.forEach(d => {
            if (typeof d.entradas === 'number') entradas += d.entradas;
            if (typeof d.entradasPrev === 'number') entradasPrev += d.entradasPrev;
            if (typeof d.saidas === 'number') saidas += d.saidas;
            if (typeof d.saidasPrev === 'number') saidasPrev += d.saidasPrev;
        });

        const saldo = entradas + saidas;
        const saldoPrev = entradasPrev + saidasPrev;

        return {
            entradas,
            entradasPrev,
            saidas,
            saidasPrev,
            saldo,
            saldoPrev
        };
    }, [performanceData]);

    // Formatter function to convert numbers to BRL currency string
    const formatBRL = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const axisDomains = useMemo(() => {
        let lMin = 0; let lMax = 0; let rMin = 0; let rMax = 0;

        performanceData.forEach(d => {
            lMin = Math.min(lMin, d.saidas || 0, d.saidasPrev || 0);
            lMax = Math.max(lMax, d.entradas || 0, d.entradasPrev || 0);
            rMin = Math.min(rMin, d.saldo || 0, d.saldoPrev || 0);
            rMax = Math.max(rMax, d.saldo || 0, d.saldoPrev || 0);
        });

        // Margem de respiro superior e inferior
        lMax = lMax * 1.1;
        rMax = rMax * 1.1;
        lMin = lMin * 1.1;

        // Para manter o "zero" 100% alinhado nos dois eixos e exibir saldos negativos no chart sem cortar,
        // precisamos usar uma ÚNICA proporção baseada nos lMax e lMin.
        const ratioAboveZero = lMax > 0 ? rMax / lMax : 1;
        const ratioBelowZero = lMin < 0 ? rMin / lMin : 1;
        const finalRatio = Math.max(ratioAboveZero, ratioBelowZero, 0.1);

        return {
            leftMin: lMin,
            leftMax: lMax,
            rightMin: lMin * finalRatio,
            rightMax: lMax * finalRatio
        };
    }, [performanceData]);

    const heatmapDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatmapHours = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h'];

    const handleWhatsAppSend = (phone: string, message: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const todayBirthdays = useMemo(() => birthdays.filter(b => b.daysUntil === 0 || b.daysUntil === 365), [birthdays]);
    const pendingReminders = useMemo(() => todayAppointments.filter(a => a.status === 'pending'), [todayAppointments]);

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
            {/* Modern Ambient Glows (Quiet Luxury smooth transition) */}
            <div className="absolute inset-0 pointer-events-none z-[0] overflow-hidden transition-opacity duration-300">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
            </div>
            <Sidebar items={sidebarItems} portalName="BARBER KING" />

            <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative z-10">
                <header className="sticky top-0 z-50 flex justify-between items-center mb-8 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 pb-4 pt-2 -mx-8 px-8">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Painel Admin</h2>
                            <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-medium mt-1">Premium Management</p>
                        </div>

                        {/* Seletor de Filial */}
                        <div className="relative group" ref={dropdownRef}>
                            <button
                                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 border ${isBranchDropdownOpen ? 'border-red-600' : 'border-slate-200 dark:border-border-subtle'} rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-red-600/50 transition-all outline-none`}
                            >
                                <span className="material-symbols-outlined text-red-500 text-lg">location_on</span>
                                <span className="text-xs uppercase font-medium tracking-[0.2em]">{selectedMatriz?.name ?? ''}</span>
                                <span className={`material-symbols-outlined text-slate-500 text-lg transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isBranchDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl shadow-lg dark:shadow-2xl z-50 overflow-hidden animate-fadeIn">
                                    <div className="p-2 space-y-1">
                                        {matrizes.map(branch => (
                                            <button
                                                key={branch.id}
                                                onClick={() => {
                                                    setSelectedMatriz(branch);
                                                    setIsBranchDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-colors ${selectedMatriz?.id === branch.id ? 'bg-red-600/10 glow-red text-red-500' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-medium tracking-wider">{branch.name}</span>
                                                    <span className="text-[9px] font-light uppercase tracking-[0.3em] opacity-60 mt-0.5">{branch.address}</span>
                                                </div>
                                                {selectedMatriz?.id === branch.id && <span className="material-symbols-outlined text-sm">check</span>}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-border-subtle p-2 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5">
                                        <button
                                            onClick={() => {
                                                setIsBranchDropdownOpen(false);
                                                setIsCreateBranchModalOpen(true);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-[10px] uppercase font-bold tracking-[0.2em] text-red-500 hover:bg-red-600/10 glow-red transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">add_business</span>
                                            Nova Filial
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                            <input className="pl-10 pr-4 py-2 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl focus:ring-1 focus:ring-red-600/50 focus:border-red-600 text-slate-900 dark:text-white text-sm outline-none w-64 transition-all" placeholder="Buscar..." type="text" />
                        </div>
                        <ThemeToggle />
                        <button className="p-2.5 rounded-xl bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors relative">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-600 glow-red rounded-full border-2 border-card-dark"></span>
                        </button>
                        <div className="flex items-center gap-3 ml-2">
                            <img alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 dark:border-border-subtle object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
                        </div>
                    </div>
                </header>

                {/* Alertas de Estoque Dinâmicos */}
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                    {inventoryAlerts.critical ? (
                        <div className="flex-1 bg-warning-amber/10 border border-warning-amber/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-warning-amber/20 p-2 rounded-lg text-amber-600 dark:text-warning-amber">
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <div>
                                    <h4 className="text-amber-700 dark:text-amber-200 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">Alerta de Estoque Crítico</h4>
                                    <p className="text-amber-700/80 dark:text-amber-200/60 text-[10px] font-medium tracking-wide uppercase">{inventoryAlerts.critical.item} - <span className="text-amber-600 dark:text-warning-amber font-bold">{inventoryAlerts.critical.qty} unidades restantes</span></p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/admin/inventory')}
                                className="text-[9px] font-bold text-amber-700 dark:text-warning-amber hover:underline uppercase tracking-[0.3em] ml-4 shrink-0"
                            >
                                Repor agora
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 bg-success-green/5 border border-success-green/10 rounded-2xl p-4 flex items-center gap-4">
                            <div className="bg-success-green/10 p-2 rounded-lg text-success-green">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <p className="text-sm font-bold text-success-green">Estoque crítico sob controle.</p>
                        </div>
                    )}

                    {inventoryAlerts.low ? (
                        <div className="flex-1 bg-red-600/10 glow-red border border-red-600/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-600/20 glow-red p-2 rounded-lg text-blue-700 dark:text-red-500">
                                    <span className="material-symbols-outlined">inventory</span>
                                </div>
                                <div>
                                    <h4 className="text-slate-900 dark:text-white text-[11px] font-bold uppercase tracking-[0.2em] mb-1">Alerta de Estoque Baixo</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium tracking-wide uppercase">{inventoryAlerts.low.item} - <span className="text-slate-800 dark:text-slate-300 font-bold">{inventoryAlerts.low.qty} unidades restantes</span></p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/admin/inventory')}
                                className="text-[9px] font-bold text-red-500 hover:underline uppercase tracking-[0.3em] ml-4 shrink-0"
                            >
                                Ver detalhes
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl p-4 flex items-center justify-center text-slate-500 text-sm">
                            Sem alertas de estoque baixo.
                        </div>
                    )}
                </div>

                {/* Ações de CRM Dinâmicas (Notificações) */}
                {(todayBirthdays.length > 0 || pendingReminders.length > 0 || atRiskClients.length > 0) && (
                    <div className="mb-8 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-500">campaign</span>
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-800 dark:text-white">Ações Críticas de CRM</h3>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {todayBirthdays.map((b, idx) => (
                                <div key={`bd-${idx}`} className="flex-1 min-w-[280px] bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between group hover:bg-emerald-500/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <span className="material-symbols-outlined">cake</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">Aniversariante Hoje</h4>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleWhatsAppSend(b.phone || '', `Olá, ${b.name}! A KINGK Barbearia te deseja um feliz aniversário! 🎉 Tem um presente especial pra você, venha nos visitar!`)}
                                        className="bg-[#25D366] hover:brightness-110 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        Parabenizar
                                    </button>
                                </div>
                            ))}
                            {pendingReminders.map((a, idx) => (
                                <div key={`rem-${idx}`} className="flex-1 min-w-[280px] bg-slate-900 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-red-600/50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600 dark:text-red-500">
                                            <span className="material-symbols-outlined">notifications_active</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lembrete de Agendamento</h4>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{a.name} • <span className="font-medium text-red-500">{a.time}</span></p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleWhatsAppSend(a.phone || '', `Olá ${a.name}! Confirmamos seu horário para ${a.service} às ${a.time} hoje na KINGK Barbearia. Podemos confirmar sua presença?`)}
                                        className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-slate-200 dark:border-white/5"
                                    >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        Lembrar
                                    </button>
                                </div>
                            ))}
                            {atRiskClients.map((c, idx) => (
                                <div key={`risk-${idx}`} className="flex-1 min-w-[280px] bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between group hover:bg-amber-500/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                            <span className="material-symbols-outlined">history_toggle_off</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-200">Sumido há {c.daysMissing} dias</h4>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleWhatsAppSend(c.phone || '', `Olá ${c.name}! Sentimos sua falta na KINGK Barbearia. Faz tempo que você não vem nos visitar (última vez em ${c.lastVisit}). Que tal agendar um horário para esta semana?`)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        Recuperar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KPI Cards — Hoje */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Agendamentos Hoje', value: todayStats.appointments, icon: 'calendar_today', color: 'text-red-500' },
                        { label: 'Confirmados', value: todayStats.confirmed, icon: 'check_circle', color: 'text-emerald-500' },
                        { label: 'Pendentes', value: todayStats.pending, icon: 'schedule', color: 'text-amber-500' },
                        { label: 'Receita do Mês', value: formatBRL(todayStats.revenue), icon: 'payments', color: 'text-blue-500' },
                    ].map((card, idx) => (
                        <div key={idx} className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">{card.label}</p>
                                <span className={`material-symbols-outlined text-xl ${card.color}`}>{card.icon}</span>
                            </div>
                            <p className="text-2xl font-light text-slate-900 dark:text-white tracking-wide">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-8 items-stretch flex-1">
                    <div className="flex-1 space-y-8 flex flex-col">

                        {/* Main Content Area */}
                        <section className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl border border-slate-200 dark:border-border-subtle p-6 flex-1 flex flex-col mb-8 shadow-sm">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Line/Bar Chart Left Area */}
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 w-full">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-light tracking-wide text-2xl text-[#1e293b] dark:text-white flex-shrink-0">Fluxo de Caixa</h3>
                                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">help</span>
                                            </div>
                                        </div>

                                        {/* Filter Pill */}
                                        <div className="flex items-center gap-3 bg-[#f8fafc] dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-2xl p-1 relative">

                                            {/* Period Toggle */}
                                            <div className="flex items-center gap-0.5">
                                                {(['diária', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'] as const).map((filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setTimeFilter(filter)}
                                                        className={`px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase rounded-lg transition-all ${timeFilter === filter
                                                            ? 'bg-red-600 glow-red text-white shadow-lg shadow-red-600/20'
                                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Chart Type Toggle */}
                                        <div className="flex items-center gap-1 bg-[#f8fafc] dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-2xl p-1 relative">
                                            <button
                                                onClick={() => setChartType('line')}
                                                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all ${chartType === 'line' ? 'bg-red-600 glow-red text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                            >
                                                <span className="material-symbols-outlined text-xl">show_chart</span>
                                            </button>
                                            <button
                                                onClick={() => setChartType('bar')}
                                                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all ${chartType === 'bar' ? 'bg-red-600 glow-red text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                            >
                                                <span className="material-symbols-outlined text-xl">bar_chart</span>
                                            </button>


                                        </div>
                                    </div>
                                    <div className="h-[400px] w-full mt-6 relative">
                                        <div className={`w-full h-full transition-all duration-300 ${!showSensitiveData ? 'blur-md select-none pointer-events-none' : ''}`}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={performanceData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barGap={0} stackOffset="sign">
                                                    <defs>
                                                        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.3" />
                                                        </filter>
                                                        <linearGradient id="hoverCursor" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                                                            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
                                                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid vertical={false} stroke="#ffffff0a" strokeDasharray="6 6" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                                        dy={15}
                                                        angle={-45}
                                                        textAnchor="end"
                                                        height={70}
                                                        padding={{ left: performanceData.length === 1 ? 150 : 20, right: performanceData.length === 1 ? 150 : 20 }}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        domain={[axisDomains.leftMin, axisDomains.leftMax]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                                        tickFormatter={(val) => `R$ ${val >= 1000 || val <= -1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        domain={[axisDomains.rightMin, axisDomains.rightMax]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={false}
                                                    />
                                                    <RechartsTooltip
                                                        content={renderCustomTooltip}
                                                        cursor={{ fill: 'url(#hoverCursor)' }}
                                                    />

                                                    {chartType === 'bar' ? (
                                                        <>
                                                            {/* Desenhados primeiro: colunas atuais (fundo/mais próximo de zero) */}
                                                            <Bar yAxisId="left" stackId="a" dataKey="entradas" fill="#22c55e" maxBarSize={45} />
                                                            <Bar yAxisId="left" stackId="a" dataKey="saidas" fill="#ef4444" maxBarSize={45} />

                                                            {/* Desenhados depois: colunas previstas (frente/topo da pilha) */}
                                                            <Bar yAxisId="left" stackId="a" dataKey="entradasPrev" fill="#bbf7d0" maxBarSize={45} />
                                                            <Bar yAxisId="left" stackId="a" dataKey="saidasPrev" fill="#fecaca" maxBarSize={45} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Line yAxisId="left" type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                            <Line yAxisId="left" type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                            <Line yAxisId="left" type="monotone" dataKey="entradasPrev" stroke="#bbf7d0" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#1e293b', strokeWidth: 1.5 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                                            <Line yAxisId="left" type="monotone" dataKey="saidasPrev" stroke="#fecaca" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#1e293b', strokeWidth: 1.5 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                                        </>
                                                    )}

                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="saldo"
                                                        stroke="#3b82f6"
                                                        strokeWidth={4}
                                                        filter="url(#shadow)"
                                                        dot={{ r: 5, fill: '#1e293b', strokeWidth: 2, stroke: '#3b82f6' }}
                                                        activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 0, filter: 'url(#shadow)' }}
                                                    />
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="saldoPrev"
                                                        stroke="#93c5fd"
                                                        strokeWidth={3}
                                                        strokeDasharray="6 6"
                                                        dot={{ r: 3, fill: '#1e293b', strokeWidth: 2, stroke: '#93c5fd' }}
                                                        activeDot={{ r: 5, fill: '#93c5fd', strokeWidth: 0 }}
                                                    />

                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Overlay para "Mostrar dados" no gráfico */}
                                        {!showSensitiveData && (
                                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
                                                <button
                                                    onClick={() => setShowSensitiveData(true)}
                                                    className="flex items-center gap-2 px-6 py-3 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-2xl"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                    <span>Mostrar Dados</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center items-center gap-8 mt-6 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-4 bg-[#22c55e] rounded-sm"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em]">Entradas</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-4 bg-[#bbf7d0] rounded-sm"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em]">Entradas Previstas</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-4 bg-[#ef4444] rounded-sm"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em]">Saídas</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-4 bg-[#fecaca] rounded-sm"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em]">Saídas Previstas</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                                            <span className="w-6 h-0.5 bg-[#3b82f6]"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em] ml-1">Saldo</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                                            <span className="w-6 h-0.5 bg-transparent border-t-[2px] border-dashed border-[#93c5fd]"></span>
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em] ml-1">Saldo Previsto</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Area: Filters and Balanço */}
                                <div className="w-full lg:w-80 flex flex-col gap-6">

                                    {/* Filtros de Período */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white flex-shrink-0">Período de Análise</h3>
                                        </div>
                                        <div className="bg-[#f8fafc] dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-2xl p-1 shadow-inner">
                                            <div className="flex justify-between items-center bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-border-subtle/50">
                                                <button
                                                    onClick={handlePrevPeriod}
                                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-[#202020] text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                </button>
                                                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b] dark:text-white px-2">
                                                    {getPeriodLabel()}
                                                </span>
                                                <button
                                                    onClick={handleNextPeriod}
                                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-[#202020] text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balanço */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white flex-shrink-0">Balanço</h3>
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg cursor-help">help_outline</span>
                                        </div>
                                        <div className="bg-[#f8fafc] dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-3xl p-6 shadow-sm flex-1 relative flex flex-col justify-between overflow-hidden">
                                            <button
                                                onClick={() => setShowSensitiveData(!showSensitiveData)}
                                                className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors z-20"
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showSensitiveData ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>

                                            <div className={`transition-all duration-300 ${!showSensitiveData ? 'blur-md select-none pointer-events-none' : ''}`}>
                                                <div className="mb-8 mt-2">
                                                    <p className="text-4xl font-light text-slate-900 dark:text-white tracking-wide">{formatBRL(summaryData.saldo)}</p>
                                                    <p className="text-sm font-medium text-slate-500 mt-2">
                                                        de <span className="text-slate-600 dark:text-slate-300 font-bold">{formatBRL(summaryData.saldoPrev)}</span> previstos
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2">Entradas:</p>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className="text-lg font-medium text-slate-800 dark:text-white whitespace-nowrap">{formatBRL(summaryData.entradas)}</p>
                                                            <button className="text-slate-500 flex flex-shrink-0 items-center justify-center hover:text-slate-900 dark:hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                            </button>
                                                        </div>
                                                        <p className="text-xs font-medium text-slate-500">de {formatBRL(summaryData.entradasPrev)} previsto</p>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2">Saídas:</p>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className="text-lg font-medium text-red-500 whitespace-nowrap">{formatBRL(summaryData.saidas)}</p>
                                                            <button className="text-slate-500 flex flex-shrink-0 items-center justify-center hover:text-slate-900 dark:hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                            </button>
                                                        </div>
                                                        <p className="text-xs font-medium text-slate-500">de {formatBRL(summaryData.saidasPrev)} previsto</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Overlay para "Mostrar dados" no Balanço */}
                                            {!showSensitiveData && (
                                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
                                                    <button
                                                        onClick={() => setShowSensitiveData(true)}
                                                        className="flex items-center gap-2 px-6 py-3 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-2xl"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                        <span>Mostrar Dados</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Left Column: Agendamentos */}
                            <div className="flex flex-col">
                                <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white mb-4">Agendamentos das Próximas 24h</h3>
                                <div className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl border border-slate-200 dark:border-border-subtle p-3 shadow-sm h-[320px] overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                                    <div className="absolute right-1 top-3 bottom-3 w-1.5 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50 z-0 hidden lg:block"></div>
                                    {todayAppointments.length > 0 ? (
                                        todayAppointments.map((item, idx) => (
                                            <div key={idx} className="flex border-l-[4px] border-l-red-600/50 bg-slate-50 dark:bg-white/5 rounded-r-lg p-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors z-10 mr-2 border border-transparent dark:border-white/5 backdrop-blur-sm">
                                                <div className="flex flex-col flex-1 gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${item.status === 'checked-in' ? 'bg-slate-500' : 'bg-red-600 glow-red'}`}></span>
                                                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b] dark:text-white">{item.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-medium tracking-wide text-slate-700 dark:text-slate-300 ml-4">{item.service}</span>
                                                    <span className="text-[9px] font-light tracking-wider text-slate-500 dark:text-slate-500 ml-4">{item.time} {item.time ? '- ' + item.time.replace(':00', ':40').replace(':30', ':10') : ''}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                                            <p className="text-xs font-light tracking-wider">Nenhum agendamento nas próximas 24h.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Aniversariantes */}
                            <div className="flex flex-col">
                                <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white mb-4">Próximos Aniversariantes</h3>
                                <div className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl border border-slate-200 dark:border-border-subtle p-3 shadow-sm h-[320px] overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                                    <div className="absolute right-1 top-3 bottom-3 w-1.5 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50 z-0 hidden lg:block"></div>
                                    {birthdays.length > 0 ? birthdays.map((bd, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-[#1A1A1A] rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors border border-transparent dark:border-[#2A2A2A] z-10 mr-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400">{bd.date}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 glow-red"></span>
                                                <span className="text-xs font-medium tracking-wide text-[#1e293b] dark:text-slate-200 truncate max-w-[160px] sm:max-w-[200px]">{bd.name}</span>
                                            </div>
                                            <button className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" aria-label="Enviar WhatsApp">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                                                </svg>
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">cake</span>
                                            <p className="text-xs font-light tracking-wider">Nenhum aniversariante nos próximos dias.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Relatórios Section */}
                        <div className="flex flex-col mb-8 mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Agendamentos por profissional */}
                                <div className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl border border-slate-200 dark:border-border-subtle p-6 shadow-sm flex flex-col h-[340px] lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-6">
                                        <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b] dark:text-slate-200">Agendamentos por profissional</h4>
                                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm cursor-help">help_outline</span>
                                    </div>
                                    <div className="flex-1 flex items-end justify-center gap-4 pb-2 overflow-x-auto">
                                        {professionalStats.length > 0 ? (() => {
                                            const maxCount = Math.max(...professionalStats.map(p => p.count), 1);
                                            return professionalStats.map((prof, idx) => {
                                                const barH = Math.max(8, Math.round((prof.count / maxCount) * 180));
                                                const isTop = idx === 0;
                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0">
                                                        <div
                                                            className={`w-10 rounded-full border ${isTop ? 'bg-red-600/90 glow-red border-red-500/50' : 'bg-slate-300 dark:bg-slate-700/80 border-slate-200 dark:border-border-subtle'}`}
                                                            style={{ height: `${barH}px` }}
                                                        ></div>
                                                        <div className="w-10 h-10 rounded-full border-[3px] border-white dark:border-[#151515] overflow-hidden -mt-6 z-10 shadow-sm">
                                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(prof.name)}&background=${isTop ? 'ef4444' : '1e293b'}&color=ffffff`} alt={prof.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-700 dark:text-slate-400">{prof.count}</span>
                                                    </div>
                                                );
                                            });
                                        })() : (
                                            <div className="flex flex-col items-center justify-center w-full text-slate-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">content_cut</span>
                                                <p className="text-xs font-light tracking-wider">Nenhum atendimento no mês.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dias mais movimentados */}
                                <div className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl border border-slate-200 dark:border-border-subtle p-6 shadow-sm flex flex-col h-[340px] lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-6">
                                        <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b] dark:text-slate-200">Dias mais movimentados</h4>
                                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm cursor-help">help_outline</span>
                                    </div>
                                    <div className="flex-1 flex items-end justify-between px-2 pb-2">
                                        {(() => {
                                            const data = dayStats.length > 0 ? dayStats : ['D','S','T','Q','Q','S','S'].map(d => ({ day: d, val: 0 }));
                                            const maxVal = Math.max(...data.map(d => d.val), 1);
                                            return data.map((item, idx) => {
                                                const barH = item.val > 0 ? Math.max(6, Math.round((item.val / maxVal) * 200)) : 6;
                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-700 dark:text-slate-300">{item.val > 0 ? item.val : ''}</span>
                                                        <div className="w-7 bg-red-600/80 rounded-t-lg rounded-b-md transition-all border border-red-500/20" style={{ height: `${barH}px` }}></div>
                                                        <span className="text-xs font-bold text-slate-500 mt-1">{item.day}</span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Horários mais movimentados */}
                                <div className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl border border-slate-200 dark:border-border-subtle p-6 shadow-sm flex flex-col h-[340px] relative overflow-hidden lg:col-span-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b] dark:text-slate-200">Horários mais movimentados</h4>
                                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm cursor-help">help_outline</span>
                                    </div>
                                    <div className="w-full overflow-x-auto custom-scrollbar pb-2 flex-1">
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
                                                            if (intensity > 85) { bgClass = 'bg-red-600 glow-red shadow-md shadow-primary/20'; textClass = 'text-white'; }

                                                            return (
                                                                <div
                                                                    key={`${day}-${hIdx}`}
                                                                    className={`flex-1 h-[26px] rounded-md flex items-center justify-center transition-all hover:scale-110 hover:z-10 cursor-pointer ${bgClass}`}
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
                                    <div className="flex items-center justify-end gap-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#f1f5f9] dark:bg-[#151515]"></div> Ocioso</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-600/40 glow-red"></div> Normal</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-600 glow-red"></div> Pico</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de Criação de Filial */}
                {isCreateBranchModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
                            <div className="p-6 border-b border-slate-200 dark:border-border-subtle flex justify-between items-center">
                                <h3 className="font-light tracking-wide uppercase text-lg text-white">Nova Filial</h3>
                                <button onClick={() => setIsCreateBranchModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
                                <div className="p-4 bg-red-600/10 glow-red border border-red-600/20 rounded-xl mb-4">
                                    <p className="text-xs text-red-500 leading-relaxed">
                                        A nova filial será criada com um painel zerado. Você poderá alternar entre as unidades usando o seletor no topo do painel.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nome da Filial</label>
                                    <input name="name" required className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2 text-[#1e293b] dark:text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none" placeholder="Ex: Unidade Centro" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Endereço/Bairro</label>
                                    <input name="address" required className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2 text-[#1e293b] dark:text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none" placeholder="Ex: Zona Sul" />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsCreateBranchModalOpen(false)} className="flex-1 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold text-sm border border-slate-200 dark:border-border-subtle rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-red-600 glow-red text-white rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-primary/20 transition-all">Criar Filial</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminDashboard;


