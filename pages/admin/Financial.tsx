import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Label, Legend } from 'recharts';
import Sidebar from '../../components/Sidebar';
import { toast } from 'sonner';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';
import { useSearchParams } from 'react-router-dom';

const ptBRMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ptBRDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const _today = new Date();
const _pad = (n: number) => String(n).padStart(2, '0');
const _fmt = (d: Date) => `${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
const _monthStart = new Date(_today.getFullYear(), _today.getMonth(), 1);

const CustomDatePicker = ({ startDate, endDate, onApply, onCancel, selectedPeriodOption, setSelectedPeriodOption }: any) => {

    const getSafeDate = (dStr: string) => {
        if (!dStr) return null;
        const parts = dStr.split('-');
        if (parts.length !== 3) return null;
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const initialView = getSafeDate(startDate) || new Date();
    const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));

    const [tempStart, setTempStart] = useState<Date | null>(getSafeDate(startDate));
    const [tempEnd, setTempEnd] = useState<Date | null>(getSafeDate(endDate));

    const pad = (n: number) => n.toString().padStart(2, '0');
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleQuickPeriod = (option: string) => {
        if (setSelectedPeriodOption) setSelectedPeriodOption(option);
        const today = new Date(); // Or hardcode if using a fixed date context like 2026-03-22
        const formatDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
        
        onApply(start, end);
    };

    const handleDateClick = (day: number) => {
        if (setSelectedPeriodOption) setSelectedPeriodOption('');
        const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(clickedDate);
            setTempEnd(null);
        } else {
            if (clickedDate < tempStart) {
                setTempEnd(tempStart);
                setTempStart(clickedDate);
            } else {
                setTempEnd(clickedDate);
                setTimeout(() => {
                    // Automatically apply when the second date is selected, to behave smoothly like Agenda
                    const startStr = `${tempStart.getFullYear()}-${pad(tempStart.getMonth() + 1)}-${pad(tempStart.getDate())}`;
                    const endStr = `${clickedDate.getFullYear()}-${pad(clickedDate.getMonth() + 1)}-${pad(clickedDate.getDate())}`;
                    onApply(startStr, endStr);
                }, 200);
            }
        }
    };

    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDayIndex = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    
    let cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
        cells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}-${pad(day)}`;
        const curDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        
        let isSelected = false;
        let inRange = false;
        let isRangeStart = false;
        let isRangeEnd = false;

        const startStr = tempStart ? `${tempStart.getFullYear()}-${pad(tempStart.getMonth() + 1)}-${pad(tempStart.getDate())}` : null;
        const endStr = tempEnd ? `${tempEnd.getFullYear()}-${pad(tempEnd.getMonth() + 1)}-${pad(tempEnd.getDate())}` : null;

        if (dStr === startStr || dStr === endStr) {
            isSelected = true;
        }
        
        if (tempStart && tempEnd) {
            isRangeStart = dStr === startStr && dStr < endStr!;
            isRangeEnd = dStr === endStr && dStr > startStr!;
            if (curDate > tempStart && curDate < tempEnd) {
                inRange = true;
            }
        }

        let bgClass = "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10";
        if (isSelected) bgClass = "bg-red-600 text-white font-light tracking-wide rounded-md shadow-[0_0_10px_rgba(220,38,38,0.5)] glow-red";
        else if (inRange) bgClass = "bg-red-600/20 text-red-600 dark:text-red-500 font-light tracking-wide";

        const isToday = dStr === `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

        cells.push(
            <div key={day} className={`relative flex items-center justify-center h-8 ${inRange || isRangeStart || isRangeEnd ? 'before:absolute before:inset-0 before:-z-10' : ''}`}>
                {inRange && <div className="absolute inset-0 bg-red-600/10 -z-10"></div>}
                {isRangeStart && <div className="absolute inset-y-0 right-0 w-1/2 bg-red-600/10 -z-10"></div>}
                {isRangeEnd && <div className="absolute inset-y-0 left-0 w-1/2 bg-red-600/10 -z-10"></div>}
                
                <button
                    onClick={() => handleDateClick(day)}
                    className={`w-8 h-8 flex items-center justify-center text-xs transition-colors rounded-md ${bgClass} ${isToday && !isSelected && !inRange ? 'text-red-600 font-light tracking-wide ring-1 ring-red-600/50' : ''}`}
                >
                    {day}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl text-slate-900 dark:text-white flex border-none w-[500px] isolate" onClick={(e) => e.stopPropagation()}>
            {/* Opções Rápidas */}
            <div className="w-1/3 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#111] p-3 flex flex-col gap-1">
                <div className="text-sm font-light tracking-wide text-slate-900 dark:text-white mb-2 px-3 pt-2">Período</div>
                {['Hoje', 'Esta semana', 'Este mês', 'Últimos 7 dias', 'Últimos 30 dias'].map((opt) => (
                    <button 
                        key={opt}
                        onClick={() => handleQuickPeriod(opt)}
                        className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-light text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors group"
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedPeriodOption === opt ? 'border-red-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {selectedPeriodOption === opt && <div className="w-2 h-2 rounded-full bg-red-600"></div>}
                        </div>
                        <span className={selectedPeriodOption === opt ? 'text-slate-900 dark:text-white font-light tracking-wide' : ''}>{opt}</span>
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
                    <div className="font-light tracking-wide text-slate-900 dark:text-white text-sm">
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
                        <div key={`${d}-${i}`} className="text-center text-xs font-light tracking-wide text-slate-500 dark:text-slate-400">{d}</div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {cells}
                </div>
            </div>
        </div>
    );
};

const VALID_FINANCIAL_TABS = ['visao-geral', 'fluxo-caixa', 'gestao-despesas', 'relatorios', 'comissoes', 'categorias-contas'];

const AdminFinancial: React.FC = () => {
    const { selectedMatriz } = useMatriz();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        return tab && VALID_FINANCIAL_TABS.includes(tab) ? tab : 'visao-geral';
    });

    // Sincroniza activeTab com o parâmetro ?tab= da URL (mobile bottom nav)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && VALID_FINANCIAL_TABS.includes(tab)) {
            setActiveTab(tab);
        } else if (!tab) {
            setActiveTab('visao-geral');
        }
    }, [searchParams]);

    // --- Comissões State ---
    const [comissoesBarbers, setComissoesBarbers] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedMatriz) return;
        supabase
            .from('professional_matrizes')
            .select('professionals(id, name)')
            .eq('matriz_id', selectedMatriz.id)
            .eq('status', 'ativo')
            .then(({ data }) => {
                if (data) {
                    setComissoesBarbers(data.map((row: any, idx: number) => ({
                        id: row.professionals.id,
                        name: row.professionals.name,
                        img: String(10 + idx),
                        role: 'Profissional',
                        services: 0,
                        revenue: 0,
                        comission: 0,
                        status: 'Pendente',
                    })));
                }
            });
    }, [selectedMatriz]);
    const [comissoesCurrentMonth, setComissoesCurrentMonth] = useState(() => new Date(_today.getFullYear(), _today.getMonth(), 1));
    const [comissoesProfFilter, setComissoesProfFilter] = useState('Todos os profissionais');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [isLancarPagamentosModalOpen, setIsLancarPagamentosModalOpen] = useState(false);
    const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
    const [selectedBarberForFechamento, setSelectedBarberForFechamento] = useState<any>(null);

    const formatComissoesMonth = (date: Date) => {
        const monthsStr = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${monthsStr[date.getMonth()]} de ${date.getFullYear()}`;
    };

    const handlePrevMonthComissoes = () => setComissoesCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonthComissoes = () => setComissoesCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryType, setNewCategoryType] = useState<'Categoria' | 'Subcategoria'>('Subcategoria');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');
    const [timeFilter, setTimeFilter] = useState<'diária' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');

    // States for custom filter
    const [startDate, setStartDate] = useState(() => _fmt(_monthStart));
    const [endDate, setEndDate] = useState(() => _fmt(_today));
    const [selectedPeriodOption, setSelectedPeriodOption] = useState<string>('');
    const [isEditingFilter, setIsEditingFilter] = useState(false);
    const [categoryType, setCategoryType] = useState<'Receita' | 'Despesa'>('Despesa');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    // Selectors State
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => ptBRMonths[_today.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(() => _today.getFullYear());

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const years = [2024, 2025, 2026, 2027, 2028, 2029];

    const [relatoriosMonth, setRelatoriosMonth] = useState(() => ptBRMonths[_today.getMonth()]);
    const [relatoriosYear, setRelatoriosYear] = useState(() => _today.getFullYear());

    // --- Supabase: Transações e Despesas ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedMatriz) return;
        const fetchRecords = async () => {
            const { data, error } = await supabase
                .from('financial_records')
                .select('*')
                .eq('matriz_id', selectedMatriz.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((r: any) => ({
                    id: r.id,
                    time: r.created_at ? new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
                    desc: r.description || '',
                    client: r.client_name || r.entity || '',
                    entity: r.entity || '',
                    category: r.category || '',
                    type: r.type,
                    method: r.payment_method || 'PIX',
                    value: Number(r.amount),
                    dueDate: r.due_date ? r.due_date.split('-').reverse().join('/') : '',
                    status: r.payment_status === 'pending' ? 'Pendente' : 'Pago',
                    date: r.date
                }));
                setTransactions(mapped);
                setExpenses(mapped.filter((r: any) => r.type === 'expense'));
            }
        };
        fetchRecords();
    }, [selectedMatriz]);

    // --- Appointments para gráficos de Visão Geral ---
    const [rawAppts, setRawAppts] = useState<any[]>([]);
    useEffect(() => {
        if (!selectedMatriz) return;
        supabase
            .from('appointments')
            .select('id, scheduled_at, status, service_id, professional_id, services(name, price), professionals(name)')
            .eq('matriz_id', selectedMatriz.id)
            .eq('status', 'done')
            .order('scheduled_at', { ascending: false })
            .then(({ data }) => { if (data) setRawAppts(data); });
    }, [selectedMatriz]);

    // Comissões enriched with real revenue/services/commission from appointments
    const comissoesData = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const monthIdx = comissoesCurrentMonth.getMonth();
        const year = comissoesCurrentMonth.getFullYear();
        const prefix = `${year}-${pad(monthIdx + 1)}-`;
        const monthAppts = rawAppts.filter((a: any) => {
            const dateStr = a.scheduled_at?.split('T')[0] || '';
            return dateStr.startsWith(prefix);
        });
        return comissoesBarbers.map(barber => {
            const barberAppts = monthAppts.filter((a: any) => a.professional_id === barber.id);
            const revenue = barberAppts.reduce((s: number, a: any) => s + Number(a.services?.price || 0), 0);
            const services = barberAppts.length;
            const comission = Math.round(revenue * 0.5 * 100) / 100;
            return { ...barber, services, revenue, comission };
        });
    }, [comissoesBarbers, rawAppts, comissoesCurrentMonth]);

    // --- Integração de Comissões com Despesas ---
    const createComissaoDespesa = async (barberName: string, amount: number) => {
        if (!selectedMatriz) return;
        const today = new Date().toISOString().split('T')[0];
        const { data: newRec } = await supabase
            .from('financial_records')
            .insert({
                matriz_id: selectedMatriz.id,
                type: 'expense',
                amount,
                description: `Comissão: ${barberName}`,
                entity: barberName,
                category: 'Despesas com colaboradores',
                payment_method: 'PIX',
                payment_status: 'paid',
                date: today
            })
            .select()
            .single();

        if (newRec) {
            const mapped = {
                id: newRec.id,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                desc: `Comissão: ${barberName}`,
                client: barberName,
                entity: barberName,
                category: 'Despesas com colaboradores',
                type: 'expense',
                method: 'PIX',
                value: amount,
                dueDate: today.split('-').reverse().join('/'),
                status: 'Pago',
                date: today
            };
            setTransactions(prev => [mapped, ...prev]);
            setExpenses(prev => [mapped, ...prev]);
        }
    };


    const getDaysInMonth = (monthIndex: number, year: number) => {
        return new Date(year, monthIndex + 1, 0).getDate();
    };

    const aggregateByDate = (type: string, dateStr: string) =>
        transactions.filter(t => t.type === type && t.date === dateStr).reduce((s: number, t: any) => s + t.value, 0);

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
                return { name: pad(day), entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev: 0, saidasPrev: 0, saldoPrev: 0 };
            });
        }

        if (filter === 'mensal') {
            return Array.from({ length: 6 }, (_, i) => {
                let targetIdx = monthIndex - (5 - i);
                let targetYear = year;
                if (targetIdx < 0) { targetIdx += 12; targetYear -= 1; }
                const prefix = targetYear + '-' + pad(targetIdx + 1) + '-';
                const entradas = transactions.filter((t: any) => t.type === 'income' && t.date?.startsWith(prefix)).reduce((s: number, t: any) => s + t.value, 0);
                const saidas = transactions.filter((t: any) => t.type === 'expense' && t.date?.startsWith(prefix)).reduce((s: number, t: any) => s + t.value, 0);
                return { name: months[targetIdx].substring(0, 3) + ' ' + targetYear, entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev: 0, saidasPrev: 0, saldoPrev: 0 };
            });
        }

        // semanal, trimestral, semestral, anual: aggregate months within range
        const getPrefixesForFilter = () => {
            const prefixes: string[] = [];
            if (filter === 'semanal') {
                const days = getDaysInMonth(monthIndex, year);
                const weeksCount = Math.ceil(days / 7);
                for (let w = 0; w < weeksCount; w++) {
                    const start = w * 7 + 1;
                    const end = Math.min(start + 6, days);
                    const entradas = Array.from({ length: end - start + 1 }, (_, k) => aggregateByDate('income', year + '-' + pad(monthIndex + 1) + '-' + pad(start + k))).reduce((a, b) => a + b, 0);
                    const saidas = Array.from({ length: end - start + 1 }, (_, k) => aggregateByDate('expense', year + '-' + pad(monthIndex + 1) + '-' + pad(start + k))).reduce((a, b) => a + b, 0);
                    prefixes.push(JSON.stringify({ name: 'Semana ' + (w + 1), entradas, saidas: -saidas, saldo: entradas - saidas, entradasPrev: 0, saidasPrev: 0, saldoPrev: 0 }));
                }
                return prefixes.map(p => JSON.parse(p));
            }
            return [];
        };

        if (filter === 'semanal') return getPrefixesForFilter();

        // trimestral / semestral / anual — group months
        const groupSizes: Record<string, number> = { trimestral: 3, semestral: 6, anual: 12 };
        const groupSize = groupSizes[filter] || 3;
        const groupCount = Math.ceil(12 / groupSize);
        return Array.from({ length: groupCount }, (_, gi) => {
            const startM = gi * groupSize;
            let totalIn = 0, totalOut = 0;
            for (let m = startM; m < startM + groupSize; m++) {
                const prefix = year + '-' + pad(m + 1) + '-';
                totalIn += transactions.filter((t: any) => t.type === 'income' && t.date?.startsWith(prefix)).reduce((s: number, t: any) => s + t.value, 0);
                totalOut += transactions.filter((t: any) => t.type === 'expense' && t.date?.startsWith(prefix)).reduce((s: number, t: any) => s + t.value, 0);
            }
            return { name: months[startM]?.substring(0, 3) + '-' + months[Math.min(startM + groupSize - 1, 11)]?.substring(0, 3), entradas: totalIn, saidas: -totalOut, saldo: totalIn - totalOut, entradasPrev: 0, saidasPrev: 0, saldoPrev: 0 };
        });
    };
    const performanceData = useMemo(() => {
        return generateDataForFilter(timeFilter, selectedMonth, selectedYear);
    }, [timeFilter, selectedMonth, selectedYear, transactions]);

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

    const formatBRL = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

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

    const axisDomains = useMemo(() => {
        let lMin = 0; let lMax = 0; let rMin = 0; let rMax = 0;

        performanceData.forEach(d => {
            lMin = Math.min(lMin, d.saidas || 0, d.saidasPrev || 0);
            lMax = Math.max(lMax, d.entradas || 0, d.entradasPrev || 0);
            rMin = Math.min(rMin, d.saldo || 0, d.saldoPrev || 0);
            rMax = Math.max(rMax, d.saldo || 0, d.saldoPrev || 0);
        });

        lMax = lMax * 1.1;
        rMax = rMax * 1.1;
        lMin = lMin * 1.1;

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

    const _svcColors = ['#259af4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
    const servicesData = useMemo(() => {
        const map = new Map<string, number>();
        rawAppts.forEach((a: any) => {
            if (!a.services?.name) return;
            map.set(a.services.name, (map.get(a.services.name) || 0) + 1);
        });
        const total = rawAppts.length || 1;
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count], i) => ({ name, value: Math.round((count / total) * 100), color: _svcColors[i % _svcColors.length] }));
    }, [rawAppts]);

    const barberPerformanceData = useMemo(() => {
        const map = new Map<string, { name: string; servicos: number; produtos: number }>();
        rawAppts.forEach((a: any) => {
            if (!a.professionals?.name) return;
            const prev = map.get(a.professional_id) || { name: a.professionals.name, servicos: 0, produtos: 0 };
            prev.servicos += (a.services?.price || 0);
            map.set(a.professional_id, prev);
        });
        return Array.from(map.values()).sort((a, b) => b.servicos - a.servicos).slice(0, 6);
    }, [rawAppts]);

    const heatmapDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatmapHours = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h'];
    const heatmapIntensities = useMemo(() => {
        const matrix: number[][] = Array.from({ length: 6 }, () => Array(14).fill(0));
        rawAppts.forEach((a: any) => {
            const d = new Date(a.scheduled_at);
            const dow = d.getDay(); // 0=Dom
            if (dow === 0) return;
            const dIdx = dow - 1; // 0=Seg..5=Sáb
            const hIdx = d.getHours() - 8; // 0=08h..13=21h
            if (dIdx >= 0 && dIdx < 6 && hIdx >= 0 && hIdx < 14) matrix[dIdx][hIdx]++;
        });
        const maxVal = Math.max(...matrix.flat(), 1);
        return matrix.map(row => row.map(v => Math.round((v / maxVal) * 100)));
    }, [rawAppts]);

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#f8fafc] dark:bg-[#1A1A1A] border border-border-subtle p-3 rounded-xl shadow-xl">
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Período: {label}</p>
                    {payload.map((entry: any, index: number) => {
                        let labelText = '';
                        if (entry.name === 'entradas') labelText = 'Entradas: ';
                        if (entry.name === 'entradasPrev') labelText = 'Entradas Prev: ';
                        if (entry.name === 'saidas') labelText = 'Saídas: ';
                        if (entry.name === 'saidasPrev') labelText = 'Saídas Prev: ';
                        if (entry.name === 'saldo') labelText = 'Saldo: ';
                        if (entry.name === 'saldoPrev') labelText = 'Saldo Prev: ';

                        const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value);
                        return (
                            <p key={`item-${index}`} className="text-sm font-light tracking-wide" style={{ color: entry.color }}>
                                {labelText}{formattedValue}
                            </p>
                        )
                    })}
                </div>
            );
        }
        return null;
    };

    const renderCustomLegend = (props: any) => {
        const { payload } = props;
        const customLabels: Record<string, { label: string, icon: React.ReactNode }> = {
            entradas: { label: 'ENTRADAS', icon: <div className="w-2 h-4 bg-[#22c55e] rounded-sm mr-2" /> },
            entradasPrev: { label: 'ENTRADAS PREVISTAS', icon: <div className="w-2 h-4 bg-[#bbf7d0] rounded-sm mr-2" /> },
            saidas: { label: 'SAÍDAS', icon: <div className="w-2 h-4 bg-[#ef4444] rounded-sm mr-2" /> },
            saidasPrev: { label: 'SAÍDAS PREVISTAS', icon: <div className="w-2 h-4 bg-[#fecaca] rounded-sm mr-2" /> },
            saldo: { label: 'SALDO', icon: <div className="w-6 h-0.5 bg-[#3b82f6] mr-2" /> },
            saldoPrev: { label: 'SALDO PREVISTO', icon: <div className="w-6 h-0.5 border-t-2 border-dashed border-[#60a5fa] mr-2" /> },
        };

        return (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border-subtle">
                {payload.map((entry: any, index: number) => {
                    // Extract dataKey safely. Sometimes entry.value is used, but payload for Legend gives dataKey in entry.dataKey or entry.value depending on setup.
                    const dataKey = entry.dataKey || (entry.payload && entry.payload.dataKey);
                    const item = customLabels[dataKey];
                    if (!item) return null;
                    return (
                        <div key={`item-${index}`} className="flex items-center">
                            {item.icon}
                            <span className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-300 uppercase tracking-widest">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const cardMetrics = useMemo(() => {
        const inRange = (t: any) => {
            if (!startDate || !endDate) return true;
            return t.date >= startDate && t.date <= endDate;
        };

        const faturamento = transactions.filter(t => t.type === 'income' && inRange(t)).reduce((s, t) => s + t.value, 0);
        const despesas = transactions.filter(t => t.type === 'expense' && inRange(t)).reduce((s, t) => s + t.value, 0);
        const lucro = faturamento - despesas;
        const incomeCount = transactions.filter(t => t.type === 'income' && inRange(t)).length;
        const ticketMedio = incomeCount > 0 ? faturamento / incomeCount : 0;

        return {
            faturamento,
            pFaturamento: 0,
            despesas,
            lucro,
            ticketMedio,
            changeFaturamento: '',
            changeDespesas: '',
            changeLucro: '',
        };
    }, [startDate, endDate, transactions]);

    const _todayStr = _fmt(_today);
    const aPagar = useMemo(() =>
        transactions.filter(t => t.type === 'expense' && t.status === 'Pendente').reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );
    const aPagarEmAtraso = useMemo(() =>
        transactions.filter(t => t.type === 'expense' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('/').reverse().join('-') < _todayStr).reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );
    const aPagarHoje = useMemo(() =>
        transactions.filter(t => t.type === 'expense' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('/').reverse().join('-') === _todayStr).reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );
    const pagosMes = useMemo(() => {
        const prefix = `${_today.getFullYear()}-${_pad(_today.getMonth()+1)}`;
        return transactions.filter(t => t.type === 'expense' && t.status === 'Pago' && t.date?.startsWith(prefix)).reduce((s: number, t: any) => s + t.value, 0);
    }, [transactions]);
    const entradasHoje = useMemo(() =>
        transactions.filter(t => t.type === 'income' && t.date === _todayStr).reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );
    const saidasHoje = useMemo(() =>
        transactions.filter(t => t.type === 'expense' && t.date === _todayStr).reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );
    const saldoTotal = useMemo(() =>
        transactions.filter(t => t.type === 'income').reduce((s: number, t: any) => s + t.value, 0) -
        transactions.filter(t => t.type === 'expense' && t.status === 'Pago').reduce((s: number, t: any) => s + t.value, 0),
        [transactions]
    );

    const categoryPieData = useMemo(() => {
        const colors = ['#f43f5e', '#fb7185', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];
        const map = new Map<string, number>();
        transactions.filter(t => categoryType === 'Despesa' ? t.type === 'expense' : t.type === 'income')
            .forEach((t: any) => { const cat = t.category || 'Sem categoria'; map.set(cat, (map.get(cat) || 0) + t.value); });
        return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
    }, [transactions, categoryType]);

    // A Receber — computed from income records
    const aReceberMetrics = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const todayStr = _fmt(_today);
        const monthPrefix = `${_today.getFullYear()}-${pad(_today.getMonth() + 1)}-`;
        const yearPrefix = `${_today.getFullYear()}-`;
        const incomes = transactions.filter(t => t.type === 'income');
        const dueDateStr = (t: any) => t.dueDate ? t.dueDate.split('/').reverse().join('-') : '';
        const inadimplencia = incomes.filter(t => t.status === 'Pendente' && dueDateStr(t) && dueDateStr(t) < todayStr).reduce((s, t) => s + t.value, 0);
        const paraHoje = incomes.filter(t => t.status === 'Pendente' && dueDateStr(t) === todayStr).reduce((s, t) => s + t.value, 0);
        const paraEsteMes = incomes.filter(t => t.status === 'Pendente' && dueDateStr(t).startsWith(monthPrefix)).reduce((s, t) => s + t.value, 0);
        const paraEsteAno = incomes.filter(t => t.status === 'Pendente' && dueDateStr(t).startsWith(yearPrefix)).reduce((s, t) => s + t.value, 0);
        const recebidosNoMes = incomes.filter(t => t.status === 'Pago' && t.date?.startsWith(monthPrefix)).reduce((s, t) => s + t.value, 0);
        const recebidosNoAno = incomes.filter(t => t.status === 'Pago' && t.date?.startsWith(yearPrefix)).reduce((s, t) => s + t.value, 0);
        return { inadimplencia, paraHoje, paraEsteMes, paraEsteAno, recebidosNoMes, recebidosNoAno };
    }, [transactions]);

    // Contas a Pagar extras — A vencer futuro, próximos 5 dias, total do período
    const contasAPagarExtras = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const todayStr = _fmt(_today);
        const in5Days = _fmt(new Date(_today.getFullYear(), _today.getMonth(), _today.getDate() + 5));
        const monthPrefix = `${_today.getFullYear()}-${pad(_today.getMonth() + 1)}-`;
        const expenses = transactions.filter(t => t.type === 'expense');
        const dueDateStr = (t: any) => t.dueDate ? t.dueDate.split('/').reverse().join('-') : '';
        const aVencer = expenses.filter(t => t.status === 'Pendente' && dueDateStr(t) > todayStr).reduce((s, t) => s + t.value, 0);
        const proximos5Dias = expenses.filter(t => t.status === 'Pendente' && dueDateStr(t) >= todayStr && dueDateStr(t) <= in5Days).length;
        const totalPeriodo = expenses.filter(t => t.date?.startsWith(monthPrefix)).reduce((s, t) => s + t.value, 0);
        return { aVencer, proximos5Dias, totalPeriodo };
    }, [transactions]);

    // Resumo de Crescimento — variação vs trimestre anterior + top serviço
    const crescimentoInsights = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const monthPrefix = `${_today.getFullYear()}-${pad(_today.getMonth() + 1)}-`;
        const currentMonthIncome = transactions.filter(t => t.type === 'income' && t.date?.startsWith(monthPrefix)).reduce((s, t) => s + t.value, 0);
        let totalLast3 = 0;
        for (let i = 1; i <= 3; i++) {
            let m = _today.getMonth() - i; let y = _today.getFullYear();
            if (m < 0) { m += 12; y -= 1; }
            const prefix = `${y}-${pad(m + 1)}-`;
            totalLast3 += transactions.filter(t => t.type === 'income' && t.date?.startsWith(prefix)).reduce((s, t) => s + t.value, 0);
        }
        const avgLast3 = totalLast3 / 3;
        const crescimentoPct = avgLast3 > 0 ? Math.round(((currentMonthIncome - avgLast3) / avgLast3) * 100) : null;
        const svcMap = new Map<string, number>();
        rawAppts.filter((a: any) => { const d = a.scheduled_at?.split('T')[0] || ''; return d.startsWith(monthPrefix); })
            .forEach((a: any) => { if (!a.services?.name) return; svcMap.set(a.services.name, (svcMap.get(a.services.name) || 0) + Number(a.services?.price || 0)); });
        const svcTotal = Array.from(svcMap.values()).reduce((s, v) => s + v, 0);
        const topSvc = Array.from(svcMap.entries()).sort((a, b) => b[1] - a[1])[0];
        const topSvcPct = topSvc && svcTotal > 0 ? Math.round((topSvc[1] / svcTotal) * 100) : null;
        return { crescimentoPct, topSvcName: topSvc?.[0] ?? null, topSvcPct };
    }, [transactions, rawAppts]);

    // Relatórios por Categoria — computed from real transactions
    const relatoriosData = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const monthIdx = ptBRMonths.indexOf(relatoriosMonth);
        const prefix = `${relatoriosYear}-${pad(monthIdx + 1)}-`;
        const rColors = ['#a3e635', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#fca5a5', '#fdba74', '#fef08a'];
        const periodTx = transactions.filter(t => t.date?.startsWith(prefix));

        const incomeMap = new Map<string, number>();
        periodTx.filter(t => t.type === 'income').forEach(t => {
            const cat = t.category || 'Receitas de serviços';
            incomeMap.set(cat, (incomeMap.get(cat) || 0) + t.value);
        });
        const receitasChart = Array.from(incomeMap.entries()).map(([name, value], i) => ({ name, value, color: rColors[i % rColors.length] }));
        const totalReceitas = receitasChart.reduce((s, d) => s + d.value, 0);
        const receitasTable = receitasChart.map((item, i) => ({
            id: `rec_${i}`,
            category: item.name,
            percent: totalReceitas > 0 ? `${((item.value / totalReceitas) * 100).toFixed(0)}%` : '0%',
            value: item.value,
            subItems: [{ category: item.name, percent: totalReceitas > 0 ? `${((item.value / totalReceitas) * 100).toFixed(0)}%` : '0%', value: item.value }]
        }));

        const expenseMap = new Map<string, number>();
        periodTx.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Despesas diversas';
            expenseMap.set(cat, (expenseMap.get(cat) || 0) + t.value);
        });
        const despesasChart = Array.from(expenseMap.entries()).map(([name, value], i) => ({ name, value, color: rColors[(i + 4) % rColors.length] }));
        const totalDespesas = despesasChart.reduce((s, d) => s + d.value, 0);
        const despesasTable = despesasChart.map((item, i) => ({
            id: `des_${i}`,
            category: item.name,
            percent: totalDespesas > 0 ? `${((item.value / totalDespesas) * 100).toFixed(0)}%` : '0%',
            value: -item.value,
            subItems: [{ category: item.name, percent: totalDespesas > 0 ? `${((item.value / totalDespesas) * 100).toFixed(0)}%` : '0%', value: -item.value }]
        }));

        return { receitasChart, despesasChart, receitasTable, despesasTable, totalReceitas, totalDespesas };
    }, [transactions, relatoriosMonth, relatoriosYear]);

    const sidebarItems = [
        { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
        { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
        { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
    ];

    const menuItems = [
        { id: 'visao-geral', label: 'Visão Geral', icon: 'dashboard' },
        { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: 'payments' },
        { id: 'gestao-despesas', label: 'Gestão de Despesas', icon: 'receipt_long' },
        { id: 'relatorios', label: 'Relatórios por Categoria', icon: 'bar_chart' },
        { id: 'comissoes', label: 'Comissões', icon: 'payments' },
        { id: 'categorias-contas', label: 'Categorias de Contas', icon: 'category' },
    ];

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatriz) return;
        const fd = new FormData(e.target as HTMLFormElement);
        const type = fd.get('type') as string || 'income';
        const description = fd.get('description') as string;
        const amount = parseFloat((fd.get('amount') as string || '0').replace(',', '.'));
        const category = fd.get('category') as string;
        const today = new Date().toISOString().split('T')[0];

        const { data: newRec } = await supabase
            .from('financial_records')
            .insert({
                matriz_id: selectedMatriz.id,
                type: type === 'Receita' ? 'income' : 'expense',
                amount,
                description,
                category,
                payment_method: 'PIX',
                payment_status: 'paid',
                date: today
            })
            .select()
            .single();

        if (newRec) {
            const mapped = {
                id: newRec.id,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                desc: description,
                client: '',
                entity: '',
                category,
                type: newRec.type,
                method: 'PIX',
                value: amount,
                dueDate: '',
                status: 'Pago',
                date: today
            };
            setTransactions(prev => [mapped, ...prev]);
            if (newRec.type === 'expense') setExpenses(prev => [mapped, ...prev]);
            toast.success('Transação registrada!');
        }
        setIsTransactionModalOpen(false);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatriz) return;
        const fd = new FormData(e.target as HTMLFormElement);
        const description = fd.get('description') as string;
        const amount = parseFloat((fd.get('amount') as string || '0').replace(',', '.'));
        const category = fd.get('category') as string;
        const due_date = fd.get('due_date') as string;

        const { data: newRec } = await supabase
            .from('financial_records')
            .insert({
                matriz_id: selectedMatriz.id,
                type: 'expense',
                amount,
                description,
                category,
                due_date: due_date || null,
                payment_status: 'pending',
                date: due_date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (newRec) {
            const mapped = {
                id: newRec.id,
                time: '--:--',
                desc: description,
                client: '',
                entity: '',
                category,
                type: 'expense',
                method: '',
                value: amount,
                dueDate: due_date ? due_date.split('-').reverse().join('/') : '',
                status: 'Pendente',
                date: due_date || new Date().toISOString().split('T')[0]
            };
            setExpenses(prev => [mapped, ...prev]);
            setTransactions(prev => [mapped, ...prev]);
            toast.success('Despesa agendada!');
        }
        setIsExpenseModalOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'visao-geral':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-2">
                            <div>
                                <h2 className="text-2xl font-light tracking-wide text-[#1e293b] dark:text-white">Visão Geral Financeira</h2>
                                <p className="text-slate-400 text-sm">Acompanhe a saúde financeira da sua barbearia em tempo real.</p>
                            </div>

                            {/* Filtros Copiados Exatamente da Agenda (Visão Geral) */}
                            <div className="relative z-[60] w-full">
                                <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 rounded-2xl md:h-16 gap-4 transform-gpu isolate">
                                    <div className="flex items-center gap-3">
                                        {startDate ? (
                                            <button 
                                                onClick={() => setIsEditingFilter(!isEditingFilter)} 
                                                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-light tracking-wide shadow-lg shadow-red-600/20 glow-red transition-all hover:brightness-110"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                                Período
                                            </button>
                                        ) : (
                                            <button onClick={() => setIsEditingFilter(true)} className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-light tracking-wide transition-all border border-border-subtle">
                                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                                Selecione um Período
                                            </button>
                                        )}
                                        <button onClick={() => setIsEditingFilter(!isEditingFilter)} className="flex items-center gap-2 text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-light tracking-wide transition-all">
                                            {startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                    Adicionar filtro
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="relative w-72">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-[18px]">search</span>
                                        <input 
                                            className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none placeholder:text-slate-500 shadow-inner" 
                                            placeholder="Buscar" 
                                            type="text" 
                                        />
                                    </div>
                                </div>
                                
                                {isEditingFilter && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsEditingFilter(false)}></div>
                                        <div className="absolute top-[120%] left-0 mt-2 z-[100] animate-fadeIn shadow-[0_8px_30px_rgba(0,0,0,1)] lg:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                                            <CustomDatePicker
                                                startDate={startDate}
                                                endDate={endDate}
                                                selectedPeriodOption={selectedPeriodOption}
                                                setSelectedPeriodOption={setSelectedPeriodOption}
                                                onApply={(s: string, e: string) => { setStartDate(s); setEndDate(e); setIsEditingFilter(false); }}
                                                onCancel={() => setIsEditingFilter(false)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            {[
                                { label: 'Faturamento Total', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardMetrics.faturamento), change: cardMetrics.changeFaturamento, color: 'success-green', icon: 'trending_up', highlight: true },
                                { label: 'A Pagar', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-aPagar), change: 'Em atraso', color: 'danger-red', icon: 'money_off', highlight: true },
                                { label: 'Faturamento Previsto', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardMetrics.pFaturamento), change: 'Meta do período', color: 'teal-cyan', icon: 'add_chart' },
                                { label: 'Despesas', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-cardMetrics.despesas), change: cardMetrics.changeDespesas, color: 'danger-red', icon: 'trending_down', highlight: true },
                                { label: 'Lucro Líquido', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardMetrics.lucro), change: cardMetrics.changeLucro, color: 'success-green', icon: 'account_balance_wallet' },
                                { label: 'Ticket Médio', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardMetrics.ticketMedio), change: 'Estável', color: 'warning-amber', icon: 'confirmation_number' },
                            ].map((card, i) => (
                                <div key={i} className="bg-card-dark border border-border-subtle p-5 rounded-2xl relative overflow-hidden group hover:border-border-subtle/80 transition-all">
                                    <div className={`p-2 rounded-lg bg-${card.color}/10 w-fit mb-4 text-${card.color}`}>
                                        <span className="material-symbols-outlined">{card.icon}</span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-300 uppercase tracking-widest leading-tight h-6 flex items-center">{card.label}</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className={`text-lg xl:text-xl font-bold whitespace-nowrap ${card.highlight ? `text-${card.color}` : 'text-[#1e293b] dark:text-white'}`}>
                                                {card.highlight && !card.value.startsWith('-') ? '+ ' : ''}{card.value}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {card.highlight && <span className={`w-1.5 h-1.5 rounded-full bg-${card.color} animate-pulse`}></span>}
                                            <span className={`text-xs font-medium tracking-wide ${card.highlight ? 'text-slate-500 dark:text-slate-400' : `text-${card.color}`}`}>{card.change}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Gráficos Redesenhados */}
                        <div className="flex flex-col gap-6">
                            {/* Gráfico 1: Desempenho Financeiro (Layout Fluxo de Caixa) */}
                            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col lg:flex-row gap-8 shadow-sm">
                                {/* Left Area: Line/Bar Chart */}
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 w-full">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-light tracking-wide text-2xl text-[#1e293b] dark:text-white flex-shrink-0">Desempenho Financeiro</h3>
                                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">help_outline</span>
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
                                                        className={`px-4 py-2 text-[10px] font-light tracking-wide tracking-[0.2em] uppercase rounded-lg transition-all ${timeFilter === filter
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
                                        <ResponsiveContainer width="100%" height="100%" style={{ fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}>
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
                                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500, fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}
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
                                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500, fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}
                                                    tickFormatter={(val) => `R$ ${val >= 1000 || val <= -1000 ? (val / 1000).toFixed(1) + 'k' : Number(val).toFixed(0)}`}
                                                    width={60}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    domain={[axisDomains.rightMin, axisDomains.rightMax]}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={false}
                                                    width={10}
                                                />
                                                <RechartsTooltip
                                                    content={renderCustomTooltip}
                                                    cursor={{ fill: 'url(#hoverCursor)' }}
                                                />
                                                <Legend content={renderCustomLegend} verticalAlign="bottom" height={60} />

                                                {chartType === 'bar' ? (
                                                    <>
                                                        <Bar yAxisId="left" stackId="a" dataKey="entradas" name="Entradas" fill="#22c55e" maxBarSize={45} />
                                                        <Bar yAxisId="left" stackId="a" dataKey="saidas" name="Saídas" fill="#ef4444" maxBarSize={45} />

                                                        <Bar yAxisId="left" stackId="a" dataKey="entradasPrev" name="Entradas Prev" fill="#bbf7d0" maxBarSize={45} />
                                                        <Bar yAxisId="left" stackId="a" dataKey="saidasPrev" name="Saídas Prev" fill="#fecaca" maxBarSize={45} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <Line yAxisId="left" type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                        <Line yAxisId="left" type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                        <Line yAxisId="left" type="monotone" dataKey="entradasPrev" name="Entradas Prev" stroke="#bbf7d0" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#1e293b', strokeWidth: 1.5 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                                        <Line yAxisId="left" type="monotone" dataKey="saidasPrev" name="Saídas Prev" stroke="#fecaca" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#1e293b', strokeWidth: 1.5 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                                    </>
                                                )}

                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="saldo"
                                                    name="Saldo Líquido"
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
                                                    name="Saldo Previsão"
                                                    stroke="#94a3b8"
                                                    strokeWidth={2}
                                                    strokeDasharray="4 4"
                                                    dot={{ r: 3, fill: '#1e293b', strokeWidth: 1.5, stroke: '#94a3b8' }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
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
                                                <span className="text-[10px] uppercase font-light tracking-wide tracking-[0.2em] text-[#1e293b] dark:text-white px-2">
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

                                    {/* Balanço sem o botão de esconder */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white flex-shrink-0">Balanço</h3>
                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg cursor-help">help_outline</span>
                                        </div>
                                        <div className="bg-[#f8fafc] dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-3xl p-6 shadow-sm flex-1 relative flex flex-col justify-between overflow-hidden">
                                            
                                            <div>
                                                <div className="mb-8 mt-2">
                                                    <p className="text-4xl font-light text-slate-900 dark:text-white tracking-wide">{formatBRL(summaryData.saldo)}</p>
                                                    <p className="text-sm font-light text-slate-500 dark:text-slate-400 mt-2">
                                                        de <span className="text-slate-600 dark:text-slate-300 font-light tracking-wide">{formatBRL(summaryData.saldoPrev)}</span> previstos
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] uppercase font-medium tracking-wide tracking-[0.2em] text-slate-500 dark:text-slate-300 mb-2">Entradas:</p>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className="text-lg font-light text-slate-800 dark:text-white whitespace-nowrap">{formatBRL(summaryData.entradas)}</p>
                                                            <button className="text-slate-500 flex flex-shrink-0 items-center justify-center hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                            </button>
                                                        </div>
                                                        <p className="text-xs font-light text-slate-500 dark:text-slate-400">de {formatBRL(summaryData.entradasPrev)} previsto</p>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] uppercase font-medium tracking-wide tracking-[0.2em] text-slate-500 dark:text-slate-300 mb-2">Saídas:</p>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className="text-lg font-light text-red-500 whitespace-nowrap">{formatBRL(summaryData.saidas)}</p>
                                                            <button className="text-slate-500 flex flex-shrink-0 items-center justify-center hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                            </button>
                                                        </div>
                                                        <p className="text-xs font-light text-slate-500 dark:text-slate-400">de {formatBRL(summaryData.saidasPrev)} previsto</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Novos Painéis Financeiros (Receber, Pagar, Categorias) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                                {/* Panel 1: A receber */}
                                <div className="bg-card-dark border border-border-subtle rounded-2xl p-6 flex flex-col h-full shadow-sm hover:border-border-subtle/80 transition-colors">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white">A receber</h3>
                                        <a href="#" className="text-primary text-sm font-light tracking-wide hover:underline">Ver todas</a>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {[
                                            { label: 'Inadimplência', value: formatBRL(aReceberMetrics.inadimplencia) },
                                            { label: 'Para hoje', value: formatBRL(aReceberMetrics.paraHoje) },
                                            { label: 'Para este mês', value: formatBRL(aReceberMetrics.paraEsteMes) },
                                            { label: 'Para este ano', value: formatBRL(aReceberMetrics.paraEsteAno) },
                                            { label: 'Recebidos no mês', value: formatBRL(aReceberMetrics.recebidosNoMes) },
                                            { label: 'Recebidos no ano', value: formatBRL(aReceberMetrics.recebidosNoAno) },
                                        ].map(item => (
                                            <div key={item.label} className="flex justify-between items-center">
                                                <span className="text-sm font-light text-[#1e293b] dark:text-slate-300">{item.label}</span>
                                                <span className="text-sm font-light tracking-wide text-success-green">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Panel 2: A pagar */}
                                <div className="bg-card-dark border border-border-subtle rounded-2xl p-6 flex flex-col h-full shadow-sm hover:border-border-subtle/80 transition-colors">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white">A pagar</h3>
                                        <a href="#" className="text-primary text-sm font-light tracking-wide hover:underline">Ver todas</a>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {[
                                            { label: 'Em atraso', value: formatBRL(aPagarEmAtraso) },
                                            { label: 'Para hoje', value: formatBRL(aPagarHoje) },
                                            { label: 'Todos pendentes', value: formatBRL(aPagar) },
                                            { label: 'Pagos no mês', value: formatBRL(pagosMes) },
                                        ].map(item => (
                                            <div key={item.label} className="flex justify-between items-center">
                                                <span className="text-sm font-light text-[#1e293b] dark:text-slate-300">{item.label}</span>
                                                <span className="text-sm font-light tracking-wide text-danger-red">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Panel 3: Categorias */}
                                <div className="bg-card-dark border border-border-subtle rounded-2xl p-6 flex flex-col h-full shadow-sm hover:border-border-subtle/80 transition-colors">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-1">
                                            <h3 className="font-light tracking-wide uppercase text-lg text-[#1e293b] dark:text-white">Categorias</h3>
                                            <span className="material-symbols-outlined text-slate-400 text-[16px] cursor-help" title="Distribuição do saldo por categoria">help</span>
                                        </div>
                                        <div className="flex items-center bg-[#f1f5f9] dark:bg-white/5 border border-border-subtle rounded-lg p-0.5">
                                            <button 
                                                onClick={() => setCategoryType('Receita')}
                                                className={`px-3 py-1 text-xs font-light tracking-wide rounded-md transition-colors ${categoryType === 'Receita' ? 'bg-[#22c55e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                            >
                                                Receita
                                            </button>
                                            <button 
                                                onClick={() => setCategoryType('Despesa')}
                                                className={`px-3 py-1 text-xs font-light tracking-wide rounded-md transition-colors ${categoryType === 'Despesa' ? 'bg-[#f43f5e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                            >
                                                Despesa
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col xl:flex-row items-center justify-between gap-6 flex-1 mt-2">
                                        <div className="w-36 h-36 shrink-0">
                                            <ResponsiveContainer width="100%" height="100%" style={{ fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}>
                                                <PieChart>
                                                    <Pie 
                                                        data={categoryPieData.length > 0 ? categoryPieData : [{ name: 'Sem dados', value: 1, color: '#334155' }]}
                                                        innerRadius={0}
                                                        outerRadius={65}
                                                        dataKey="value"
                                                        stroke="var(--bg-card-dark, #fff)"
                                                        strokeWidth={2}
                                                    >
                                                        {(categoryPieData.length > 0 ? categoryPieData : [{ name: 'Sem dados', value: 1, color: '#334155' }]).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-3 w-full">
                                            {categoryPieData.map((cat, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }}></span>
                                                    <span className="text-xs font-light text-slate-500 dark:text-slate-400 leading-tight">{cat.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gráfico 2: Serviços Realizados (Progresso & Donut) */}
                            <div className="bg-card-dark border border-border-subtle rounded-2xl p-8">
                                <div className="flex flex-col md:flex-row gap-10 items-center">
                                    {/* Lado Esquerdo: Barras de Progresso */}
                                    <div className="flex-1 w-full flex flex-col justify-center">
                                        <h3 className="font-light tracking-wide uppercase text-xl text-[#1e293b] dark:text-white mb-2">Serviços Realizados (%)</h3>
                                        <p className="text-sm font-light text-slate-400 mb-8">Distribuição volumétrica por categoria de atendimento.</p>
                                        <div className="space-y-6">
                                            {servicesData.map((s, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                                                            <span className="text-slate-400 font-light tracking-wide text-sm">{s.name}</span>
                                                        </div>
                                                        <span className="text-[#1e293b] dark:text-white font-light tracking-wide">{s.value}%</span>
                                                    </div>
                                                    <div className="w-full bg-card-dark dark:bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lado Direito: Donut Chart */}
                                    <div className="w-64 h-64 relative flex-shrink-0 flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%" style={{ fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}>
                                            <PieChart>
                                                <Pie
                                                    data={servicesData}
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                    stroke="none"
                                                    cornerRadius={5}
                                                >
                                                    {servicesData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-light tracking-wide text-[#1e293b] dark:text-white">100%</span>
                                            <span className="text-[10px] font-light text-slate-500 uppercase tracking-widest mt-1">Total</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-start gap-4">
                                <div className="bg-primary rounded-xl p-3 text-white shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined">auto_graph</span>
                                </div>
                                <div>
                                    <h4 className="font-light tracking-wide uppercase text-[#1e293b] dark:text-white text-lg mb-1">Resumo de Crescimento</h4>
                                    <p className="text-slate-500 dark:text-slate-300 text-sm leading-relaxed">
                                        {crescimentoInsights.crescimentoPct !== null ? (
                                            <>Seu faturamento está{' '}
                                                <span className={`font-light tracking-wide ${crescimentoInsights.crescimentoPct >= 0 ? 'text-success-green' : 'text-danger-red'}`}>
                                                    {crescimentoInsights.crescimentoPct >= 0 ? '+' : ''}{crescimentoInsights.crescimentoPct}%
                                                    {crescimentoInsights.crescimentoPct >= 0 ? ' acima' : ' abaixo'}
                                                </span>{' '}da média do último trimestre.{' '}
                                            </>
                                        ) : <span>Sem dados suficientes para comparar trimestre anterior. </span>}
                                        {crescimentoInsights.topSvcName && crescimentoInsights.topSvcPct !== null ? (
                                            <>O serviço de "{crescimentoInsights.topSvcName}" representa{' '}
                                                <span className="text-primary font-light tracking-wide">{crescimentoInsights.topSvcPct}% da sua receita</span> este mês.
                                            </>
                                        ) : <span>Sem agendamentos concluídos este mês.</span>}
                                    </p>
                                </div>
                                <button className="ml-auto text-primary text-sm font-light tracking-wide hover:underline whitespace-nowrap">Ver Detalhes</button>
                            </div>

                            {/* INDICADORES ESTRATÉGICOS (NOVOS) */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">

                                {/* Receita por Profissional (Cross-sell) */}
                                <div className="bg-card-dark border border-border-subtle rounded-2xl p-6">
                                    <h3 className="font-light tracking-wide uppercase text-xl text-[#1e293b] dark:text-white mb-2">Desempenho da Equipe</h3>
                                    <p className="text-sm font-light tracking-wide text-slate-400 mb-6">Compare receita de serviços vs. venda de produtos.</p>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%" style={{ fontFamily: '\"Plus Jakarta Sans\", sans-serif' }}>
                                            <BarChart data={barberPerformanceData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#ffffff0a" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500, fontFamily: '\"Plus Jakarta Sans\", sans-serif' }} tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`} />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500, fontFamily: '\"Plus Jakarta Sans\", sans-serif' }} width={90} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: '#ffffff05' }} 
                                                    content={({ active, payload, label }: any) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-xl">
                                                                    <p className="font-light tracking-wide text-slate-900 dark:text-white mb-2">{label}</p>
                                                                    {payload.map((entry: any, index: number) => (
                                                                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                                                <span className="text-sm font-light text-slate-500 dark:text-slate-400">{entry.name}</span>
                                                                            </div>
                                                                            <span className="text-sm font-light tracking-wide text-slate-900 dark:text-white">R$ {entry.value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }} 
                                                />
                                                <Bar dataKey="servicos" name="Serviços" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} barSize={24} />
                                                <Bar dataKey="produtos" name="Produtos" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Heatmap de Horários de Pico */}
                                <div className="bg-card-dark border border-border-subtle rounded-2xl p-6">
                                    <h3 className="font-light tracking-wide uppercase text-xl text-[#1e293b] dark:text-white mb-2">Mapa de Calor: Ocupação</h3>
                                    <p className="text-sm font-light tracking-wide text-slate-400 mb-6">Identifique horários de pico para otimizar escalas.</p>

                                    <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                                        <div className="min-w-[720px]">
                                            {/* Headers das horas */}
                                            <div className="flex mb-2 ml-[40px]">
                                                {heatmapHours.map(hour => (
                                                    <div key={hour} className="flex-1 text-center text-[10px] font-light tracking-wide text-slate-500">{hour}</div>
                                                ))}
                                            </div>

                                            {/* Linhas dos dias */}
                                            {heatmapDays.map((day, dIdx) => (
                                                <div key={day} className="flex items-center mb-1">
                                                    <div className="w-[40px] text-xs font-light tracking-wide text-slate-400">{day}</div>
                                                    <div className="flex-1 flex gap-1">
                                                        {heatmapIntensities[dIdx].map((intensity, hIdx) => {
                                                            let bgClass = 'bg-[#f1f5f9] dark:bg-[#151515]';
                                                            let textClass = 'text-transparent';
                                                            if (intensity > 15) bgClass = 'bg-primary/20';
                                                            if (intensity > 35) bgClass = 'bg-primary/40';
                                                            if (intensity > 60) { bgClass = 'bg-primary/70'; textClass = 'text-white'; }
                                                            if (intensity > 85) { bgClass = 'bg-primary shadow-md shadow-primary/20'; textClass = 'text-white'; }

                                                            return (
                                                                <div
                                                                    key={`${day}-${hIdx}`}
                                                                    className={`flex-1 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 hover:z-10 cursor-pointer ${bgClass}`}
                                                                    title={`${day} ${heatmapHours[hIdx]} - Movimento: ${intensity}%`}
                                                                >
                                                                    <span className={`text-[9px] font-light tracking-wide opacity-90 ${textClass}`}>{intensity}%</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 mt-4 text-[10px] font-light text-slate-500 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#f1f5f9] dark:bg-[#151515]"></div> Ocioso</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-primary/40"></div> Normal</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-primary"></div> Pico</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                );

            case 'fluxo-caixa':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-card-dark border border-border-subtle p-4 rounded-xl">
                                <p className="text-[10px] font-light text-slate-500 uppercase tracking-widest mb-1">Entradas Hoje</p>
                                <p className="text-xl font-light tracking-wide text-success-green">{formatBRL(entradasHoje)}</p>
                            </div>
                            <div className="bg-card-dark border border-border-subtle p-4 rounded-xl">
                                <p className="text-[10px] font-light text-slate-500 uppercase tracking-widest mb-1">Saídas Hoje</p>
                                <p className="text-xl font-light tracking-wide text-danger-red">{formatBRL(saidasHoje)}</p>
                            </div>
                            <div className="bg-card-dark border border-border-subtle p-4 rounded-xl">
                                <p className="text-[10px] font-light text-slate-500 uppercase tracking-widest mb-1">Saldo do Dia</p>
                                <p className={`text-xl font-light tracking-wide ${entradasHoje - saidasHoje >= 0 ? 'text-success-green' : 'text-danger-red'}`}>{formatBRL(entradasHoje - saidasHoje)}</p>
                            </div>
                            <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl">
                                <p className="text-[10px] font-light text-blue-300 uppercase tracking-widest mb-1">Saldo Total</p>
                                <p className="text-xl font-light tracking-wide text-[#1e293b] dark:text-white">{formatBRL(saldoTotal)}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h2 className="font-light tracking-wide uppercase text-2xl text-[#1e293b] dark:text-white">Monitor de Fluxo de Caixa</h2>
                                <p className="text-slate-400 text-sm">Monitoramento em tempo real das movimentações diárias.</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 border border-border-subtle rounded-xl text-slate-300 hover:text-[#1e293b] dark:text-white flex items-center gap-2 text-sm font-light tracking-wide transition-all">
                                    <span className="material-symbols-outlined text-lg">print</span>
                                    Imprimir
                                </button>
                                <button
                                    onClick={() => setIsTransactionModalOpen(true)}
                                    className="bg-primary hover:brightness-110 active:scale-95 text-[#1e293b] dark:text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/20 transition-all duration-300"
                                >
                                    <span className="material-symbols-outlined text-lg">add_circle</span>
                                    Nova Transação
                                </button>
                            </div>
                        </div>

                        <div className="bg-card-dark border border-border-subtle rounded-2xl p-4 flex gap-4 items-center">
                            <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle px-3 py-2 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-slate-500">
                                <span className="material-symbols-outlined text-lg">calendar_month</span>
                                <span>Hoje, {_today.getDate()} de {ptBRMonths[_today.getMonth()]}</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle px-3 py-2 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-slate-500">
                                <span className="material-symbols-outlined text-lg">filter_list</span>
                                <span>Todos os Tipos</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                            </div>
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                                <input type="text" placeholder="Pesquisar por descrição..." className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-[#1e293b] dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                        </div>

                        <div className="bg-card-dark border border-border-subtle rounded-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Hora</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4">Pagamento</th>
                                        <th className="px-6 py-4">Valor</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-400 font-light">{t.time}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-light tracking-wide text-[#1e293b] dark:text-white">{t.desc}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.client}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-light tracking-wide uppercase tracking-wider bg-${t.type === 'income' ? 'blue' : 'purple'}-500/10 text-${t.type === 'income' ? 'primary' : 'purple-400'}`}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{t.method}</td>
                                            <td className={`px-6 py-4 text-sm font-light tracking-wide ${t.type === 'income' ? 'text-success-green' : 'text-danger-red'}`}>
                                                {t.type === 'income' ? '+' : '-'} R$ {t.value.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-500 hover:text-[#1e293b] dark:text-slate-400 dark:hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-lg">receipt</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 border-t border-border-subtle flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-light">Mostrando 5 de 24 movimentações registradas hoje.</span>
                                <div className="flex gap-2">
                                    <button className="w-8 h-8 flex items-center justify-center bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg text-slate-400 hover:text-[#1e293b] dark:text-white"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                    <button className="w-8 h-8 flex items-center justify-center bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg text-slate-400 hover:text-[#1e293b] dark:text-white"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'gestao-despesas':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <h2 className="text-2xl font-light tracking-wide text-[#1e293b] dark:text-white">Contas a Pagar</h2>
                                <p className="text-slate-400 text-sm">Gerencie suas obrigações financeiras e evite juros por atraso.</p>
                            </div>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="bg-primary hover:brightness-110 active:scale-95 text-[#1e293b] dark:text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/20 transition-all duration-300"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Nova Despesa
                            </button>
                        </div>

                        <div className="bg-warning-amber/5 border border-warning-amber/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-warning-amber/10 flex items-center justify-center text-warning-amber shrink-0">
                                    <span className="material-symbols-outlined filled">notifications_active</span>
                                </div>
                                <div>
                                    <h4 className="text-warning-amber font-medium tracking-wide text-sm">Alerta de Vencimento</h4>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs">Atenção: <span className="text-[#1e293b] dark:text-white font-medium tracking-wide">{contasAPagarExtras.proximos5Dias} {contasAPagarExtras.proximos5Dias === 1 ? 'conta vence' : 'contas vencem'} nos próximos 5 dias</span>. Revise agora para evitar multas.</p>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-warning-amber text-black font-light tracking-wide text-xs rounded-lg hover:brightness-110 uppercase tracking-widest shrink-0">
                                Ver Pendentes
                            </button>
                        </div>

                        {/* Barra de Resumo (Despesas) */}
                        <div className="bg-white dark:bg-card-dark border border-border-subtle rounded-2xl flex overflow-x-auto custom-scrollbar shadow-sm">
                            <div className="min-w-[170px] flex-1 p-5 relative border-r border-border-subtle bg-danger-red/5">
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-danger-red"></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-danger-red shrink-0"></span>
                                    <span className="text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">Vencidos</span>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help" title="Contas atrasadas">help</span>
                                </div>
                                <p className="text-xl font-bold text-[#1e293b] dark:text-white">{formatBRL(aPagarEmAtraso)}</p>
                            </div>

                            <div className="min-w-[170px] flex-1 p-5 relative border-r border-border-subtle">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-warning-amber shrink-0"></span>
                                    <span className="text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">Vencem hoje</span>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help" title="Vencimento na data atual">help</span>
                                </div>
                                <p className="text-xl font-bold text-[#1e293b] dark:text-white">{formatBRL(aPagarHoje)}</p>
                            </div>

                            <div className="min-w-[170px] flex-1 p-5 relative border-r border-border-subtle">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shrink-0"></span>
                                    <span className="text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">A vencer</span>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help" title="Contas com vencimento futuro no período">help</span>
                                </div>
                                <p className="text-xl font-bold text-[#1e293b] dark:text-white">{formatBRL(contasAPagarExtras.aVencer)}</p>
                            </div>

                            <div className="min-w-[170px] flex-1 p-5 relative border-r border-border-subtle">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-success-green shrink-0"></span>
                                    <span className="text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">Pagos</span>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help" title="Contas já pagas no período">help</span>
                                </div>
                                <p className="text-xl font-bold text-[#1e293b] dark:text-white">{formatBRL(pagosMes)}</p>
                            </div>

                            <div className="min-w-[170px] flex-1 p-5 relative bg-[#3b82f6]/5">
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3b82f6]"></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shrink-0"></span>
                                    <span className="text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">Total do período</span>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help" title="Soma total de todas as contas no período">help</span>
                                </div>
                                <p className="text-xl font-bold text-[#1e293b] dark:text-white">{formatBRL(contasAPagarExtras.totalPeriodo)}</p>
                            </div>
                        </div>

                        <div className="bg-card-dark border border-border-subtle rounded-2xl p-4 flex gap-4 items-center">
                            <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle px-3 py-2 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-slate-500">
                                <span className="material-symbols-outlined text-lg">calendar_month</span>
                                <span>{ptBRMonths[_today.getMonth()]}, {_today.getFullYear()}</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle px-3 py-2 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-slate-500">
                                <span className="material-symbols-outlined text-lg">filter_list</span>
                                <span>Todas Categorias</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                            </div>
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">search</span>
                                <input type="text" placeholder="Filtrar por nome..." className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-[#1e293b] dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                        </div>

                        <div className="bg-card-dark border border-border-subtle rounded-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4">Vencimento</th>
                                        <th className="px-6 py-4">Valor</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {expenses.map((e) => (
                                        <tr key={e.id} className="hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-light tracking-wide text-[#1e293b] dark:text-white">{e.desc}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{e.entity}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                                    {e.category}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-medium tracking-wide ${e.status === 'Pendente' ? 'text-warning-amber' : 'text-slate-500 dark:text-slate-400'}`}>{e.dueDate}</td>
                                            <td className="px-6 py-4 text-sm font-light tracking-wide text-[#1e293b] dark:text-white">R$ {e.value.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-light tracking-wide uppercase tracking-wider border ${e.status === 'Pago' ? 'bg-success-green/10 text-success-green border-success-green/20' : 'bg-warning-amber/10 text-warning-amber border-warning-amber/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 mb-px bg-current`}></span>
                                                    {e.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {e.status !== 'Pago' && (
                                                        <button
                                                            onClick={() => {
                                                                toast.success(`${e.desc} marcado como pago!`);
                                                            }}
                                                            className="text-slate-500 hover:text-success-green transition-all active:scale-95"
                                                            title="Marcar como Pago"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                                        </button>
                                                    )}
                                                    <button className="text-slate-500 hover:text-[#1e293b] dark:text-white"><span className="material-symbols-outlined text-lg">edit</span></button>
                                                    <button className="text-slate-500 hover:text-danger-red"><span className="material-symbols-outlined text-lg">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-6 mt-6">
                            <div className="flex-1">
                                <p className="text-[10px] font-light tracking-wide text-slate-500 uppercase tracking-widest mb-1">Total Pago</p>
                                <p className="text-2xl font-light tracking-wide text-success-green">{formatBRL(pagosMes)}</p>
                            </div>
                            <div className="flex-1 border-l border-border-subtle pl-6">
                                <p className="text-[10px] font-light tracking-wide text-slate-500 uppercase tracking-widest mb-1">Total Pendente</p>
                                <p className="text-2xl font-light tracking-wide text-warning-amber">{formatBRL(aPagar)}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'relatorios': {
                const { receitasChart: receitasChartData, despesasChart: despesasChartData, receitasTable: receitasTableData, despesasTable: despesasTableData, totalReceitas, totalDespesas } = relatoriosData;

                const formatVal = (val: number) => {
                    const abs = Math.abs(val);
                    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
                    return val < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
                };

                return (
                    <div className="space-y-6 animate-fadeIn bg-white dark:bg-card-dark rounded-2xl p-6 md:p-8 shadow-sm">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-light tracking-wide text-[#1e293b] dark:text-white">Relatório de categorias</h2>
                            <button className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-light transition-colors">
                                Exportar
                                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </button>
                        </div>

                        <div className="h-px bg-border-subtle w-full mb-6"></div>

                        {/* Filter Bar */}
                        <div className="flex mb-8">
                            <div className="flex items-center bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-2 py-1.5">
                                <button
                                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-[#1e293b] dark:text-white transition-colors"
                                    onClick={() => {
                                        const idx = ptBRMonths.indexOf(relatoriosMonth);
                                        if (idx === 0) { setRelatoriosMonth(ptBRMonths[11]); setRelatoriosYear(y => y - 1); }
                                        else setRelatoriosMonth(ptBRMonths[idx - 1]);
                                    }}
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <span className="px-3 text-sm font-light tracking-wide text-[#1e293b] dark:text-white">{relatoriosMonth} de {relatoriosYear}</span>
                                <button
                                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-[#1e293b] dark:text-white transition-colors"
                                    onClick={() => {
                                        const idx = ptBRMonths.indexOf(relatoriosMonth);
                                        if (idx === 11) { setRelatoriosMonth(ptBRMonths[0]); setRelatoriosYear(y => y + 1); }
                                        else setRelatoriosMonth(ptBRMonths[idx + 1]);
                                    }}
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-border-subtle w-full mb-10"></div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            {/* Receitas Chart */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                <div className="flex flex-col gap-3 min-w-[150px]">
                                    <h4 className="font-light tracking-wide text-[#1e293b] dark:text-white mb-2">Receitas</h4>
                                    {receitasChartData.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                                            <span className="text-xs font-light text-slate-500">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-48 h-48 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={receitasChartData}
                                                innerRadius={45}
                                                outerRadius={90}
                                                dataKey="value"
                                                stroke="var(--bg-card-dark, #fff)"
                                                strokeWidth={2}
                                            >
                                                {receitasChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Despesas Chart */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                <div className="w-48 h-48 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={despesasChartData}
                                                innerRadius={45}
                                                outerRadius={90}
                                                dataKey="value"
                                                stroke="var(--bg-card-dark, #fff)"
                                                strokeWidth={2}
                                            >
                                                {despesasChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-3 min-w-[150px]">
                                    <h4 className="font-light tracking-wide text-[#1e293b] dark:text-white mb-2">Despesas</h4>
                                    {despesasChartData.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                                            <span className="text-xs font-light text-slate-500 leading-tight">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Hierarchical Tables */}
                        <div className="space-y-10">
                            {/* Receitas Table */}
                            <div>
                                <h3 className="font-light tracking-wide text-[#1e293b] dark:text-white mb-4">Receitas</h3>
                                <div className="w-full">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 pb-3 border-b border-slate-200 dark:border-white/5 text-xs font-light tracking-wide text-[#1e293b] dark:text-slate-300">
                                        <div className="col-span-8">Categorias</div>
                                        <div className="col-span-2 text-center md:text-left">Percentual</div>
                                        <div className="col-span-2 text-right">Valor</div>
                                    </div>

                                    {/* Body */}
                                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                                        {receitasTableData.map((row) => (
                                            <React.Fragment key={row.id}>
                                                <div 
                                                    className="grid grid-cols-12 py-4 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                                    onClick={() => toggleRow(row.id)}
                                                >
                                                    <div className="col-span-8 flex items-center gap-2 text-sm text-slate-500">
                                                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${expandedRows[row.id] ? 'rotate-180' : ''}`}>expand_more</span>
                                                        {row.category}
                                                    </div>
                                                    <div className="col-span-2 text-sm text-slate-500 text-center md:text-left">{row.percent}</div>
                                                    <div className="col-span-2 text-sm text-slate-500 text-right">{formatVal(row.value)}</div>
                                                </div>
                                                {/* Expanded Content */}
                                                {expandedRows[row.id] && row.subItems.map((sub, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 py-3 items-center bg-slate-50/50 dark:bg-black/10">
                                                        <div className="col-span-8 pl-8 text-sm text-slate-500">{sub.category}</div>
                                                        <div className="col-span-2 text-sm text-slate-500 text-center md:text-left">{sub.percent}</div>
                                                        <div className="col-span-2 text-sm text-slate-500 text-right">{formatVal(sub.value)}</div>
                                                    </div>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Total Footer */}
                                    <div className="grid grid-cols-12 py-4 border-t border-slate-200 dark:border-white/5 mt-2 font-light tracking-wide text-[#1e293b] dark:text-white">
                                        <div className="col-span-8 pl-2">Total</div>
                                        <div className="col-span-2 text-center md:text-left">100%</div>
                                        <div className="col-span-2 text-right text-success-green">{formatVal(totalReceitas)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Despesas Table */}
                            <div>
                                <h3 className="font-light tracking-wide text-[#1e293b] dark:text-white mb-4">Despesas</h3>
                                <div className="w-full">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 pb-3 border-b border-slate-200 dark:border-white/5 text-xs font-light tracking-wide text-[#1e293b] dark:text-slate-300">
                                        <div className="col-span-8">Categorias</div>
                                        <div className="col-span-2 text-center md:text-left">Percentual</div>
                                        <div className="col-span-2 text-right">Valor</div>
                                    </div>

                                    {/* Body */}
                                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                                        {despesasTableData.map((row) => (
                                            <React.Fragment key={row.id}>
                                                <div 
                                                    className="grid grid-cols-12 py-4 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                                    onClick={() => toggleRow(row.id)}
                                                >
                                                    <div className="col-span-8 flex items-center gap-2 text-sm text-slate-500">
                                                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${expandedRows[row.id] ? 'rotate-180' : ''}`}>expand_more</span>
                                                        {row.category}
                                                    </div>
                                                    <div className="col-span-2 text-sm text-slate-500 text-center md:text-left">{row.percent}</div>
                                                    <div className="col-span-2 text-sm text-slate-500 text-right">{formatVal(row.value)}</div>
                                                </div>
                                                {/* Expanded Content */}
                                                {expandedRows[row.id] && row.subItems.map((sub, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 py-3 items-center bg-slate-50/50 dark:bg-black/10">
                                                        <div className="col-span-8 pl-8 text-sm text-slate-500">{sub.category}</div>
                                                        <div className="col-span-2 text-sm text-slate-500 text-center md:text-left">{sub.percent}</div>
                                                        <div className="col-span-2 text-sm text-slate-500 text-right">{formatVal(sub.value)}</div>
                                                    </div>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Total Footer */}
                                    <div className="grid grid-cols-12 py-4 border-t border-slate-200 dark:border-white/5 mt-2 font-light tracking-wide text-[#1e293b] dark:text-white">
                                        <div className="col-span-8 pl-2">Total</div>
                                        <div className="col-span-2 text-center md:text-left">100%</div>
                                        <div className="col-span-2 text-right text-danger-red">{formatVal(-totalDespesas)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            case 'categorias-contas':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white dark:bg-card-dark border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-border-subtle">
                                <h2 className="text-xl font-light tracking-wide text-[#1e293b] dark:text-white">Categorias</h2>
                            </div>

                            {/* Toolbar */}
                            <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border-subtle">
                                <button 
                                    onClick={() => { setNewCategoryType('Categoria'); setIsCategoryModalOpen(true); }}
                                    className="flex items-center gap-2 text-primary hover:brightness-110 font-light tracking-wide text-sm transition-colors self-start md:self-auto"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                    Adicionar categoria
                                </button>
                                <div className="relative w-full md:w-64 shrink-0">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar" 
                                        className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg py-2 pl-9 pr-3 text-sm text-[#1e293b] dark:text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="w-full">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-light tracking-wide text-[#1e293b] dark:text-slate-300">
                                    <div className="col-span-8 pl-2">Descrição</div>
                                    <div className="col-span-2 text-center">Status</div>
                                    <div className="col-span-2 text-center md:text-right">Ações</div>
                                </div>

                                <div className="divide-y divide-slate-200 dark:divide-white/5">
                                    {[
                                        {
                                            id: 'g0',
                                            name: 'Aquisições de imobilizados',
                                            status: true,
                                            subs: [
                                                { id: 'g0-1', name: 'Computadores e Periféricos', status: true },
                                                { id: 'g0-2', name: 'Edifícios e Construções', status: true },
                                                { id: 'g0-3', name: 'Máquinas e Equipamentos', status: true },
                                                { id: 'g0-4', name: 'Móveis, Utensílios e Instalações', status: true },
                                                { id: 'g0-5', name: 'Terrenos', status: true },
                                                { id: 'g0-6', name: 'Veículos', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g1',
                                            name: 'Aquisições de mercadorias',
                                            status: true,
                                            subs: [
                                                { id: 'g1-1', name: 'Compras de materiais de atendimento', status: true },
                                                { id: 'g1-2', name: 'Compras de produtos para revenda', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g2',
                                            name: 'Comissões',
                                            status: true,
                                            subs: [
                                                { id: 'g2-1', name: 'Comissões de profissionais', status: true },
                                                { id: 'g2-2', name: 'Comissões de vendedores', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g3',
                                            name: 'Custos',
                                            status: true,
                                            subs: [
                                                { id: 'g3-1', name: 'Custo das mercadorias vendidas', status: true },
                                                { id: 'g3-2', name: 'Custo dos serviços prestados', status: true },
                                                { id: 'g3-3', name: 'Serviços de Terceiros', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g4',
                                            name: 'Descontos incondicionais',
                                            status: true,
                                            subs: [
                                                { id: 'g4-1', name: 'Descontos concedidos', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g5',
                                            name: 'Despesas administrativas',
                                            status: true,
                                            subs: [
                                                { id: 'g5-1', name: 'Frete/Transporte', status: true },
                                                { id: 'g5-2', name: 'Honorários advocatícios', status: true },
                                                { id: 'g5-3', name: 'Honorários consultoria', status: true },
                                                { id: 'g5-4', name: 'Honorários contábeis', status: true },
                                                { id: 'g5-5', name: 'Internet', status: true },
                                                { id: 'g5-6', name: 'Limpeza', status: true },
                                                { id: 'g5-7', name: 'Materiais de escritório', status: true },
                                                { id: 'g5-8', name: 'Materiais de limpeza e de higiene', status: true },
                                                { id: 'g5-9', name: 'Sistemas e ferramentas', status: true },
                                                { id: 'g5-10', name: 'Telefone', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g6',
                                            name: 'Despesas com colaboradores',
                                            status: true,
                                            subs: [
                                                { id: 'g6-1', name: 'Benefícios', status: true },
                                                { id: 'g6-2', name: 'Confraternizações', status: true },
                                                { id: 'g6-3', name: 'Contribuição sindical', status: true },
                                                { id: 'g6-4', name: 'Cursos e treinamentos', status: true },
                                                { id: 'g6-5', name: 'Gratificações', status: true },
                                                { id: 'g6-6', name: 'Uniformes', status: true },
                                                { id: 'g6-7', name: 'Vale-Alimentação', status: true },
                                                { id: 'g6-8', name: 'Vale-Transporte', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g7',
                                            name: 'Despesas com imóveis',
                                            status: true,
                                            subs: [
                                                { id: 'g7-1', name: 'Água e saneamento', status: true },
                                                { id: 'g7-2', name: 'Aluguel', status: true },
                                                { id: 'g7-3', name: 'Alvará de funcionamento', status: true },
                                                { id: 'g7-4', name: 'Condomínio', status: true },
                                                { id: 'g7-5', name: 'Energia elétrica', status: true },
                                                { id: 'g7-6', name: 'IPTU', status: true },
                                                { id: 'g7-7', name: 'Seguro de imóveis', status: true },
                                                { id: 'g7-8', name: 'Vigilância e segurança patrimonial', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g8',
                                            name: 'Despesas com salários e encargos',
                                            status: true,
                                            subs: [
                                                { id: 'g8-1', name: '13º salário', status: true },
                                                { id: 'g8-2', name: 'Adiantamentos salariais', status: true },
                                                { id: 'g8-3', name: 'Férias', status: true },
                                                { id: 'g8-4', name: 'FGTS e multa de FGTS', status: true },
                                                { id: 'g8-5', name: 'INSS sobre salários - GPS', status: true },
                                                { id: 'g8-6', name: 'IRRF s/ salários - DARF 0561', status: true },
                                                { id: 'g8-7', name: 'PLR - Participação nos lucros e resultados', status: true },
                                                { id: 'g8-8', name: 'Rescisões', status: true },
                                                { id: 'g8-9', name: 'Salários', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g9',
                                            name: 'Despesas com sócios',
                                            status: true,
                                            subs: [
                                                { id: 'g9-1', name: 'Convênios', status: true },
                                                { id: 'g9-2', name: 'Pró-labore', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g10',
                                            name: 'Despesas com veículos',
                                            status: true,
                                            subs: [
                                                { id: 'g10-1', name: 'Combustíveis', status: true },
                                                { id: 'g10-2', name: 'Estacionamento', status: true },
                                                { id: 'g10-3', name: 'IPVA / DPVAT / Licenciamento', status: true },
                                                { id: 'g10-4', name: 'Outras despesas com veículos', status: true },
                                                { id: 'g10-5', name: 'Seguros de veículos', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g11',
                                            name: 'Despesas financeiras',
                                            status: true,
                                            subs: [
                                                { id: 'g11-1', name: 'Impostos sobre aplicações', status: true },
                                                { id: 'g11-2', name: 'Juros pagos', status: true },
                                                { id: 'g11-3', name: 'Tarifas', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g12',
                                            name: 'Despesas comerciais',
                                            status: true,
                                            subs: [
                                                { id: 'g12-1', name: 'Brindes para clientes', status: true },
                                                { id: 'g12-2', name: 'Publicidade/Marketing', status: true },
                                                { id: 'g12-3', name: 'Viagens e representações da empresa', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g13',
                                            name: 'Devolução de vendas',
                                            status: true,
                                            subs: [
                                                { id: 'g13-1', name: 'Cancelamentos', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g14',
                                            name: 'Empréstimos e dívidas',
                                            status: true,
                                            subs: [
                                                { id: 'g14-1', name: 'Adiantamentos de terceiros', status: true },
                                                { id: 'g14-2', name: 'Empréstimos e Financiamentos', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g15',
                                            name: 'Impostos',
                                            status: true,
                                            subs: [
                                                { id: 'g15-1', name: 'COFINS sobre vendas', status: true },
                                                { id: 'g15-2', name: 'CSLL', status: true },
                                                { id: 'g15-3', name: 'ICMS sobre vendas', status: true },
                                                { id: 'g15-4', name: 'IRPJ', status: true },
                                                { id: 'g15-5', name: 'ISS sobre faturamento', status: true },
                                                { id: 'g15-6', name: 'Outros impostos sobre vendas', status: true },
                                                { id: 'g15-7', name: 'PIS sobre venda', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g16',
                                            name: 'Receitas',
                                            status: true,
                                            subs: [
                                                { id: 'g16-1', name: 'Receitas de serviços', status: true },
                                                { id: 'g16-2', name: 'Receitas de vendas', status: true }
                                            ]
                                        },
                                        {
                                            id: 'g17',
                                            name: 'Receitas financeiras',
                                            status: true,
                                            subs: [
                                                { id: 'g17-1', name: 'Juros e multas recebidos', status: true },
                                                { id: 'g17-2', name: 'Rendimentos de aplicações', status: true }
                                            ]
                                        }
                                    ].map((group) => (
                                        <React.Fragment key={group.id}>
                                            {/* Parent Row */}
                                            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                <div className="col-span-8 flex items-center">
                                                    <div className="pl-2 text-sm font-light tracking-wide text-[#1e293b] dark:text-white">
                                                        {group.name}
                                                    </div>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    {/* Toggle Switch */}
                                                    <div className={`w-11 h-6 rounded-full relative cursor-pointer border ${group.status ? 'bg-success-green border-success-green' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'} transition-colors duration-300 ease-in-out`}>
                                                        <div className={`absolute top-[1px] w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out ${group.status ? 'left-[22px]' : 'left-[1px]'}`}></div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 flex justify-center md:justify-end">
                                                    <button className="w-8 h-8 rounded text-slate-400 group-hover:text-primary transition-colors hover:bg-slate-200/50 dark:hover:bg-white/5 flex flex-col gap-[3px] items-center justify-center">
                                                        <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                        <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                        <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Subcategories */}
                                            {group.subs.map((sub) => (
                                                <div key={sub.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <div className="col-span-8 flex items-center">
                                                        <div className="pl-8 text-sm font-light tracking-wide text-slate-500 dark:text-slate-400">
                                                            {sub.name}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex justify-center">
                                                        {/* Toggle Switch */}
                                                        <div className={`w-11 h-6 rounded-full relative cursor-pointer border ${sub.status ? 'bg-success-green border-success-green' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'} transition-colors duration-300 ease-in-out`}>
                                                            <div className={`absolute top-[1px] w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out ${sub.status ? 'left-[22px]' : 'left-[1px]'}`}></div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex justify-center md:justify-end">
                                                        <button className="w-8 h-8 rounded text-slate-400 group-hover:text-primary transition-colors hover:bg-slate-200/50 dark:hover:bg-white/5 flex flex-col gap-[3px] items-center justify-center">
                                                            <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                            <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                            <div className="w-[3px] h-[3px] rounded-full bg-current"></div>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Footer / Add Subcategory Row for this group */}
                                            <div className="px-6 py-4">
                                                <button 
                                                    onClick={() => { setNewCategoryType('Subcategoria'); setIsCategoryModalOpen(true); }}
                                                    className="flex items-center gap-2 pl-8 text-primary hover:brightness-110 font-light tracking-wide text-sm transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                                    Adicionar subcategoria
                                                </button>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );


            case 'comissoes':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Control Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center w-full md:w-auto">
                                <div className="bg-card-dark border border-border-subtle rounded-xl flex items-center shadow-lg shadow-black/5">
                                    <button onClick={handlePrevMonthComissoes} className="p-2.5 text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                                    </button>
                                    <div className="px-4 py-2 flex items-center gap-2 text-[#1e293b] dark:text-white font-light tracking-wide text-sm cursor-pointer hover:text-primary transition-colors min-w-[140px] justify-center">
                                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                        {formatComissoesMonth(comissoesCurrentMonth)}
                                    </div>
                                    <button onClick={handleNextMonthComissoes} className="p-2.5 text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <select 
                                        value={comissoesProfFilter}
                                        onChange={(e) => setComissoesProfFilter(e.target.value)}
                                        className="appearance-none bg-none bg-card-dark border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-sm font-light tracking-wide text-[#1e293b] dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer shadow-lg shadow-black/5 h-full">
                                        <option value="Todos os profissionais">Todos os profissionais</option>
                                        {Array.from(new Set(comissoesBarbers.map(b => b.name))).map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 w-full md:w-auto relative">
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-card-dark border border-border-subtle hover:bg-white/5 text-[#1e293b] dark:text-white px-5 py-2.5 rounded-xl font-light tracking-wide text-sm transition-all shadow-lg shadow-black/5 w-full md:w-auto">
                                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                        Exportar Fechamento
                                        <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: isExportDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                                    </button>
                                    {isExportDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-card-dark border border-border-subtle rounded-xl shadow-2xl py-2 z-20 animate-slideUp">
                                            <button 
                                                onClick={() => {
                                                    toast.success('Documento PDF gerado com sucesso!');
                                                    setIsExportDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 hover:text-white font-light tracking-wide text-sm transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-danger-red">picture_as_pdf</span>
                                                Em PDF
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    toast.success('Documento Word gerado com sucesso!');
                                                    setIsExportDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 hover:text-white font-light tracking-wide text-sm transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                                                Em Word
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsLancarPagamentosModalOpen(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:brightness-110 text-[#1e293b] dark:text-white px-5 py-2.5 rounded-xl font-light tracking-wide text-sm transition-all shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-[20px]">payments</span>
                                    Lançar Pagamentos
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-card-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-[64px] text-white">store</span>
                                </div>
                                <p className="text-slate-400 text-sm font-light tracking-wide mb-2 uppercase tracking-wider">Total Gerado (Serviços)</p>
                                <h3 className="text-3xl font-light tracking-wide text-[#1e293b] dark:text-white ">
                                    R$ {comissoesData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <div className="mt-4 flex items-center gap-2 text-xs font-light tracking-wide text-success-green bg-success-green/10 w-max px-2 py-1 rounded-md">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                    +12% vs mês ant.
                                </div>
                            </div>

                            <div className="bg-card-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-[64px] text-danger-red">account_balance_wallet</span>
                                </div>
                                <p className="text-slate-400 text-sm font-light tracking-wide mb-2 uppercase tracking-wider">Total a Pagar (Pendente)</p>
                                <h3 className="text-3xl font-light tracking-wide text-danger-red ">
                                    R$ {comissoesData.filter(b => b.status === 'Pendente').reduce((acc, curr) => acc + curr.comission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <div className="mt-4 flex items-center gap-2 text-xs font-light tracking-wide text-slate-500">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    {comissoesData.filter(b => b.status === 'Pendente').length} profissionais aguardando repasse
                                </div>
                            </div>

                            <div className="bg-card-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-[64px] text-success-green">done_all</span>
                                </div>
                                <p className="text-slate-400 text-sm font-light tracking-wide mb-2 uppercase tracking-wider">Total Pago (Mês)</p>
                                <h3 className="text-3xl font-light tracking-wide text-success-green ">
                                    R$ {comissoesData.filter(b => b.status === 'Pago').reduce((acc, curr) => acc + curr.comission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <div className="mt-4 flex items-center gap-2 text-xs font-light tracking-wide text-slate-500">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    Repasses já liquidados
                                </div>
                            </div>

                            <div className="bg-card-dark p-6 rounded-2xl border border-primary/30 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                <p className="text-primary text-sm font-light tracking-wide uppercase tracking-wider z-10">Destaque do Mês</p>
                                <div className="flex items-center gap-4 mt-2 z-10">
                                    {(() => {
                                        const top = [...comissoesData].sort((a, b) => b.revenue - a.revenue)[0];
                                        if (!top) return <p className="text-slate-500 text-sm font-light">Sem dados no mês</p>;
                                        return (
                                            <>
                                                <img src={`https://i.pravatar.cc/150?img=${top.img}`} alt={top.name} className="w-14 h-14 rounded-xl object-cover border-2 border-primary" />
                                                <div>
                                                    <h4 className="text-[#1e293b] dark:text-white font-light tracking-wide text-lg leading-tight">{top.name}</h4>
                                                    <p className="text-slate-500 text-sm font-light">R$ {top.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerados</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Profissionais */}
                        <div className="bg-card-dark border border-border-subtle rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                                <h3 className="text-lg font-light tracking-wide text-[#1e293b] dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">groups</span>
                                    Comissões Analíticas
                                </h3>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <div className="min-w-[1000px]">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 px-6 py-4 bg-[#f8fafc] dark:bg-black/20 border-b border-border-subtle text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-3">Profissional</div>
                                        <div className="col-span-2 text-center">Faturamento Total</div>
                                        <div className="col-span-1 text-center">Serviços</div>
                                        <div className="col-span-2 text-center">Comissão Líquida</div>
                                        <div className="col-span-2 text-center">Status</div>
                                        <div className="col-span-2 text-right">Ações</div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-border-subtle">
                                        {comissoesData
                                            .filter(barber => comissoesProfFilter === 'Todos os profissionais' || barber.name === comissoesProfFilter)
                                            .map((barber) => (
                                                <div key={barber.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                <div className="col-span-3 flex items-center gap-4">
                                                    <img src={`https://i.pravatar.cc/150?img=${barber.img}`} alt={barber.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                                    <div>
                                                        <div className="font-light tracking-wide text-[#1e293b] dark:text-white text-sm">{barber.name}</div>
                                                        <div className="text-xs text-slate-500 font-light">{barber.role}</div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-center text-sm font-light tracking-wide text-slate-400">
                                                    R$ {barber.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="col-span-1 text-center text-sm font-light tracking-wide text-slate-500 bg-white/5 mx-auto rounded-lg px-2 py-1">
                                                    {barber.services}
                                                </div>
                                                <div className="col-span-2 text-center text-sm font-light tracking-wide text-[#1e293b] dark:text-white bg-primary/10 text-primary mx-8 rounded-lg py-1">
                                                    R$ {barber.comission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-light tracking-wide leading-none flex items-center gap-1.5 ${barber.status === 'Pago' ? 'bg-success-green/20 text-success-green' : 'bg-danger-red/20 text-danger-red'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${barber.status === 'Pago' ? 'bg-success-green' : 'bg-danger-red'}`}></div>
                                                        {barber.status}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 flex justify-end gap-2">
                                                    {barber.status === 'Pendente' && (
                                                        <button 
                                                            onClick={() => {
                                                                setComissoesBarbers(prev => prev.map(b => b.id === barber.id ? { ...b, status: 'Pago' } : b));
                                                                createComissaoDespesa(barber.name, barber.comission);
                                                                toast.success(`Pagamento de R$ ${barber.comission.toLocaleString('pt-BR')} para ${barber.name} registrado!`);
                                                            }}
                                                            className="px-3 py-1.5 bg-success-green text-white hover:brightness-110 shrink-0 text-xs font-light tracking-wide rounded-lg transition-all"
                                                        >
                                                            Pagar
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedBarberForFechamento(barber);
                                                            setIsFechamentoModalOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-[#f8fafc] dark:bg-card-dark border border-border-subtle hover:bg-white/5 text-[#1e293b] dark:text-white shrink-0 text-xs font-light tracking-wide rounded-lg transition-all">
                                                        Ver Fechamento
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex bg-background-dark font-sans text-[#1e293b] dark:text-slate-100">
            <Sidebar items={sidebarItems} portalName="BARBER KING" />

            <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
                <header className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-light mb-1">
                            <span className="text-[#1e293b] dark:text-white">Financeiro</span>
                        </div>
                        <h2 className="text-3xl font-light tracking-wide text-[#1e293b] dark:text-white tracking-tight">Barbearia BARBER KING</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="bg-primary hover:brightness-110 text-[#1e293b] dark:text-white px-5 py-2.5 rounded-xl font-light tracking-wide text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
                            Meu Perfil
                        </button>
                        <ThemeToggle />
                        <div className="relative">
                            <img alt="Admin" className="w-10 h-10 rounded-full border border-border-subtle object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-green border-2 border-background-dark rounded-full"></span>
                        </div>
                    </div>
                </header>


                <div className="flex flex-col">

                    <div className="hidden lg:block bg-card-dark border border-border-subtle rounded-2xl p-1.5 mb-8">
                        <div className="flex flex-wrap gap-1">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-light tracking-wide transition-all ${activeTab === item.id
                                        ? 'bg-primary text-[#1e293b] dark:text-white shadow-lg shadow-primary/20'
                                        : 'text-slate-400 hover:text-[#1e293b] dark:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full">
                        {renderContent()}
                    </div>
                </div>

                {isTransactionModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-card-dark border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                                <h3 className="font-light tracking-wide text-[#1e293b] dark:text-white text-xl">Nova Transação</h3>
                                <button onClick={() => setIsTransactionModalOpen(false)} className="text-slate-500 hover:text-[#1e293b] dark:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
                                <div className="flex gap-4">
                                    <label className="flex-1 cursor-pointer">
                                        <input type="radio" name="type" value="Receita" className="peer sr-only" defaultChecked />
                                        <div className="text-center py-2 border border-border-subtle rounded-lg peer-checked:bg-success-green/20 peer-checked:text-success-green peer-checked:border-success-green text-slate-500 font-light tracking-wide transition-all">Receita</div>
                                    </label>
                                    <label className="flex-1 cursor-pointer">
                                        <input type="radio" name="type" value="Despesa" className="peer sr-only" />
                                        <div className="text-center py-2 border border-border-subtle rounded-lg peer-checked:bg-danger-red/20 peer-checked:text-danger-red peer-checked:border-danger-red text-slate-500 font-light tracking-wide transition-all">Despesa</div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                                    <input name="description" required className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: Venda de Produto" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Valor</label>
                                        <input name="amount" required className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="R$ 0,00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                                        <div className="relative">
                                            <select name="category" className="w-full appearance-none bg-none bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none pr-10 cursor-pointer">
                                                <option>Serviços</option>
                                                <option>Vendas</option>
                                                <option>Outros</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-[#1e293b] dark:text-white font-light tracking-wide text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-primary text-[#1e293b] dark:text-white rounded-xl font-light tracking-wide text-sm hover:brightness-110 shadow-lg shadow-primary/20 transition-all">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isExpenseModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-card-dark border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                                <h3 className="font-light tracking-wide text-[#1e293b] dark:text-white text-xl">Nova Despesa</h3>
                                <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-500 hover:text-[#1e293b] dark:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Descrição / Fornecedor</label>
                                    <input name="description" required className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Valor</label>
                                        <input name="amount" required className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="R$ 0,00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Vencimento</label>
                                        <input name="due_date" type="date" className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-700 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                                    <div className="relative">
                                        <select name="category" className="w-full appearance-none bg-none bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-[#1e293b] dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none pr-10 cursor-pointer">
                                            <option>Fixa</option>
                                            <option>Variável</option>
                                            <option>Investimento</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-[#1e293b] dark:text-white font-light tracking-wide text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-primary text-[#1e293b] dark:text-white rounded-xl font-light tracking-wide text-sm hover:brightness-110 shadow-lg shadow-primary/20 transition-all">Agendar Pagamento</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-card-dark border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                                <h3 className="font-light tracking-wide text-[#1e293b] dark:text-white text-xl">Nova categoria</h3>
                                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-500 hover:text-[#1e293b] dark:text-white transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); setIsCategoryModalOpen(false); toast.success('Categoria adicionada com sucesso!'); }} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-2">Nível*</label>
                                        <div className="flex bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg p-1">
                                            <button 
                                                type="button"
                                                onClick={() => setNewCategoryType('Categoria')}
                                                className={`flex-1 py-1.5 text-sm font-light tracking-wide rounded-md transition-all ${newCategoryType === 'Categoria' ? 'bg-primary text-[#1e293b] dark:text-white shadow-sm' : 'text-slate-500 hover:text-[#1e293b] dark:hover:text-white'}`}
                                            >
                                                Categoria
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setNewCategoryType('Subcategoria')}
                                                className={`flex-1 py-1.5 text-sm font-light tracking-wide rounded-md transition-all ${newCategoryType === 'Subcategoria' ? 'bg-primary text-[#1e293b] dark:text-white shadow-sm' : 'text-slate-500 hover:text-[#1e293b] dark:hover:text-white'}`}
                                            >
                                                Subcategoria
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-2">Descrição*</label>
                                        <input 
                                            required
                                            className="w-full bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                                            placeholder="Digite" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className={newCategoryType === 'Categoria' ? 'opacity-50 pointer-events-none' : ''}>
                                        <label className="block text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-2">Associar a categoria raiz*</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full appearance-none bg-none bg-[#f8fafc] dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-sm text-[#1e293b] dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer pr-10"
                                                required={newCategoryType === 'Subcategoria'}
                                            >
                                                <option>Aquisições de imobilizados</option>
                                                <option>Aquisições de mercadorias</option>
                                                <option>Comissões</option>
                                                <option>Custos</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-xs font-light tracking-wide text-slate-500 uppercase tracking-wider mb-2">
                                            Ativo
                                            <span className="material-symbols-outlined text-[14px] cursor-help" title="Define se a categoria está visível nos lançamentos">help</span>
                                        </label>
                                        <div className="w-11 h-6 rounded-full relative cursor-pointer border bg-success-green border-success-green transition-colors duration-300 ease-in-out">
                                            <div className="absolute top-[1px] w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out left-[22px]"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 flex justify-center">
                                    <button type="submit" className="w-full max-w-[200px] py-3 bg-primary text-[#1e293b] dark:text-white rounded-xl font-light tracking-wide text-sm hover:brightness-110 shadow-lg shadow-primary/20 transition-all">
                                        Salvar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isFechamentoModalOpen && selectedBarberForFechamento && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFechamentoModalOpen(false)}></div>
                        <div className="relative bg-card-dark border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-slideUp z-10">
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <img src={`https://i.pravatar.cc/150?img=${selectedBarberForFechamento.img}`} alt={selectedBarberForFechamento.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                    <div>
                                        <h3 className="text-xl font-light tracking-wide text-white">Extrato de Comissões</h3>
                                        <p className="text-slate-400 text-sm mt-1">{selectedBarberForFechamento.name} • {formatComissoesMonth(comissoesCurrentMonth)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsFechamentoModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4 rounded-xl border border-white/5 bg-black/20 p-4">
                                    <div className="flex justify-between items-center py-2 border-b border-border-subtle text-slate-300">
                                        <div className="font-light text-sm">Total Arrecadado</div>
                                        <div className="font-light tracking-wide">R$ {selectedBarberForFechamento.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-subtle text-slate-300">
                                        <div className="font-light text-sm">Serviços Executados</div>
                                        <div className="font-light tracking-wide bg-white/5 px-3 py-1 rounded-lg">{selectedBarberForFechamento.services}</div>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-subtle text-slate-300">
                                        <div className="font-light text-sm text-primary">Comissão Líquida</div>
                                        <div className="text-primary font-light tracking-wide text-lg">R$ {selectedBarberForFechamento.comission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-slate-300">
                                        <div className="font-light text-sm">Status do Repasse</div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-light tracking-wide leading-none flex items-center gap-1.5 ${selectedBarberForFechamento.status === 'Pago' ? 'bg-success-green/20 text-success-green' : 'bg-danger-red/20 text-danger-red'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${selectedBarberForFechamento.status === 'Pago' ? 'bg-success-green' : 'bg-danger-red'}`}></div>
                                            {selectedBarberForFechamento.status}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setIsFechamentoModalOpen(false)} className="w-full mt-6 bg-card-dark border border-border-subtle hover:bg-white/5 text-slate-300 font-light tracking-wide py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center">
                                    Fechar Extrato
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isLancarPagamentosModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLancarPagamentosModalOpen(false)}></div>
                        <div className="relative bg-card-dark border border-border-subtle rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-slideUp z-10">
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h3 className="text-xl font-light tracking-wide text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">payments</span>
                                    Confirmar Repasses
                                </h3>
                                <button onClick={() => setIsLancarPagamentosModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Deseja liquidar os repasses de todos os <strong className="text-white">{comissoesBarbers.filter(b => b.status === "Pendente").length} profissionais pendentes</strong> deste mês? 
                                    <br/><br/>
                                    O valor total de <strong className="text-danger-red">R$ {comissoesBarbers.filter(b => b.status === 'Pendente').reduce((acc, curr) => acc + curr.comission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> será lançado como despesa no sistema.
                                </p>
                                <div className="mt-8 flex justify-end gap-3 w-full">
                                    <button onClick={() => setIsLancarPagamentosModalOpen(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-light tracking-wide text-sm hover:bg-white/10 transition-colors">
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const pendingBarbers = comissoesBarbers.filter(b => b.status === "Pendente");
                                            pendingBarbers.forEach(b => createComissaoDespesa(b.name, b.comission));
                                            setComissoesBarbers(prev => prev.map(b => ({ ...b, status: 'Pago' })));
                                            setIsLancarPagamentosModalOpen(false);
                                            toast.success('Todos os repasses pendentes foram marcados como pagos e lançados como despesa!');
                                        }} 
                                        className="flex-1 bg-primary hover:brightness-110 text-[#1e293b] px-5 py-3 rounded-xl font-light tracking-wide text-sm transition-all shadow-lg shadow-primary/20"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminFinancial;




