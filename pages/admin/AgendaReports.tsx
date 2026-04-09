import React, { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { ThemeToggle } from "../../components/ThemeToggle";
import { supabase } from "../../lib/supabase";
import { useMatriz } from "../../contexts/MatrizContext";

type AppointmentStatus =
  | "Agendado"
  | "Confirmado"
  | "Não compareceu"
  | "Concluído"
  | "Cancelado";

interface AppointmentRecord {
  id: string;
  services: { name: string; count?: string }[];
  client: { name: string; initials: string; color: string };
  barber: { name: string; image: string };
  duration: string;
  scheduledFor: string;
  status: AppointmentStatus;
}



const CLIENT_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-teal-500/20 text-teal-400',
  'bg-amber-500/20 text-amber-400',
  'bg-purple-500/20 text-purple-400',
  'bg-rose-500/20 text-rose-400',
  'bg-green-500/20 text-green-400',
  'bg-cyan-500/20 text-cyan-400',
];

const DB_STATUS_MAP: Record<string, AppointmentStatus> = {
  pending: 'Agendado',
  confirmed: 'Confirmado',
  in_progress: 'Agendado',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

function toInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return CLIENT_COLORS[h % CLIENT_COLORS.length];
}
function formatScheduledAt(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear() + ' ' + hh + ':' + min;
}
function mapRow(row: any): AppointmentRecord {
  const clientName = (row.clients as any)?.name ?? '—';
  const profName = (row.professionals as any)?.name ?? '—';
  const svcName = (row.services as any)?.name ?? '—';
  const duration = (row.services as any)?.duration_minutes ? (row.services as any).duration_minutes + ' min' : '—';
  return {
    id: row.id,
    services: [{ name: svcName }],
    client: { name: clientName, initials: toInitials(clientName), color: colorFor(clientName) },
    barber: { name: profName, image: 'https://i.pravatar.cc/150?u=' + encodeURIComponent(profName) },
    duration,
    scheduledFor: formatScheduledAt(row.scheduled_at),
    status: (DB_STATUS_MAP[row.status] ?? 'Agendado') as AppointmentStatus,
  };
}

const getStatusStyles = (status: AppointmentStatus) => {
  switch (status) {
    case "Agendado":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "Confirmado":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Não compareceu":
      return "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20";
    case "Concluído":
      return "bg-success-green/10 text-success-green border-success-green/20";
    case "Cancelado":
      return "bg-danger-red/10 text-danger-red border-danger-red/20";
    default:
      return "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20";
  }
};

const getStatusIcon = (status: AppointmentStatus) => {
  switch (status) {
    case "Agendado":
      return "schedule";
    case "Confirmado":
      return "event_available";
    case "Não compareceu":
      return "air";
    case "Concluído":
      return "check_circle";
    case "Cancelado":
      return "cancel";
    default:
      return "help";
  }
};

const getStatusBulletColor = (status: string) => {
  switch (status) {
    case "Agendado":
      return "bg-amber-500";
    case "Confirmado":
      return "bg-blue-500";
    case "Não compareceu":
      return "bg-slate-500";
    case "Concluído":
      return "bg-success-green";
    case "Cancelado":
      return "bg-danger-red";
    case "Todos":
      return "bg-red-600 text-white";
    default:
      return "bg-white";
  }
};

const ptBRMonths = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const ptBRDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const AdminAgendaReports: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMatriz } = useMatriz();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);


  const getInitialRange = (): [string, string] => {
    const t = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const start = new Date(t); start.setDate(t.getDate() - t.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [fmt(start), fmt(end)];
  };
  const [dateRange, setDateRange] = useState<[string | null, string | null]>(getInitialRange());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<
    [string | null, string | null]
  >([null, null]);
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<
    string | null
  >(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedMatriz) return;
    const [from, to] = dateRange;
    let q = supabase
      .from('appointments')
      .select('id, scheduled_at, status, clients(name), professionals(name), services(name, duration_minutes)')
      .eq('matriz_id', selectedMatriz.id)
      .order('scheduled_at', { ascending: false });
    if (from) q = q.gte('scheduled_at', from + 'T00:00:00');
    if (to) q = q.lte('scheduled_at', to + 'T23:59:59');
    q.then(({ data }) => { if (data) setAppointments(data.map(mapRow)); });
  }, [selectedMatriz, dateRange]);


  const getSafeDate = (dStr: string) => {
    if (!dStr) return null;
    const [y, m, d] = dStr.split("-");
    if (!y || !m || !d) return null;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 0, 0, 0);
  };

  const handleDayClick = (day: number) => {
    const clickedDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!tempSelection[0] || (tempSelection[0] && tempSelection[1])) {
      setTempSelection([clickedDate, null]);
    } else {
      const cur = getSafeDate(clickedDate)!;
      const d1 = getSafeDate(tempSelection[0])!;
      if (cur < d1) {
        setTempSelection([clickedDate, tempSelection[0]]);
      } else {
        setTempSelection([tempSelection[0], clickedDate]);
        setDateRange([tempSelection[0], clickedDate]);
        setTimeout(() => setIsDatePickerOpen(false), 300);
      }
    }
  };

  const handleQuickPeriod = (opt: string) => {
    setSelectedPeriodOption(opt);
    const today = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let start: string, end: string;
    switch (opt) {
      case 'Hoje': start = end = fmt(today); break;
      case 'Esta semana': {
        const s = new Date(today); s.setDate(today.getDate() - today.getDay());
        const e = new Date(s); e.setDate(s.getDate() + 6);
        start = fmt(s); end = fmt(e); break;
      }
      case 'Este mês': {
        start = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
        end = fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)); break;
      }
      case 'Últimos 7 dias': {
        const s = new Date(today); s.setDate(today.getDate() - 7);
        start = fmt(s); end = fmt(today); break;
      }
      case 'Últimos 30 dias': {
        const s = new Date(today); s.setDate(today.getDate() - 30);
        start = fmt(s); end = fmt(today); break;
      }
      default: setIsDatePickerOpen(false); return;
    }
    setDateRange([start, end]);
    setTempSelection([start, end]);
    setIsDatePickerOpen(false);
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y}`;
  };
  const [selectedTab, setSelectedTab] = useState<string>("Todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchActionsOpen, setIsBatchActionsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const defaultColumns = {
    servicos: true,
    cliente: true,
    barbeiro: true,
    duracao: true,
    agendadoPara: true,
    status: true,
    plano: false,
    cadeira: false,
    comanda: false,
  };

  const columnsInfo = {
    servicos: "Serviços",
    cliente: "Cliente",
    barbeiro: "Barbeiro",
    duracao: "Duração",
    agendadoPara: "Agendado para",
    status: "Status",
    plano: "Plano de Assinatura",
    cadeira: "Cadeira",
    comanda: "Comanda",
  };

  const [columns, setColumns] = useState(defaultColumns);

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === appointments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(appointments.map((a) => a.id));
    }
  };

  const sidebarItems = [
    { icon: "grid_view", label: "Início", path: "/admin/dashboard" },
    { icon: "calendar_today", label: "Agenda", path: "/admin/agenda" },
    { icon: "receipt_long", label: "Atendimento", path: "/admin/atendimento" },
    { icon: "group", label: "Contatos", path: "/admin/clients" },
    {
      icon: "content_cut",
      label: "Profissionais",
      path: "/admin/professionals",
    },
    { icon: "inventory_2", label: "Estoque", path: "/admin/inventory" },
    {
      icon: "account_balance_wallet",
      label: "Financeiro",
      path: "/admin/financial",
    },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const isFilterActive = dateRange[0] !== null && dateRange[1] !== null;

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      Agendado: 0, Confirmado: 0, "Não compareceu": 0, "Conclu\u00eddo": 0, Cancelado: 0,
    };
    appointments.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status]++;
    });
    return [
      { label: "Agendado", count: counts["Agendado"] },
      { label: "Confirmado", count: counts["Confirmado"] },
      { label: "Não compareceu", count: counts["Não compareceu"] },
      { label: "Concluído", count: counts["Conclu\u00eddo"] },
      { label: "Cancelado", count: counts["Cancelado"] },
      { label: "Todos", count: appointments.length },
    ];
  }, [appointments]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#050505] font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
      {/* Modern Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none z-[0] overflow-hidden transition-opacity duration-300">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
      </div>
      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative overflow-y-auto">
        <div className="max-w-[1400px] mx-auto w-full space-y-8 pb-12">
          {/* Header + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-[70]">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-600 to-slate-400 dark:from-white dark:via-slate-200 dark:to-slate-500 italic font-extrabold tracking-tight uppercase">
                Relatório de agendamentos
              </h2>
              <div className="flex items-center gap-2 pt-1 font-medium">
                {selectedIds.length > 0 ? (
                  <span className="text-amber-500 text-sm">
                    {selectedIds.length} selecionados de{" "}
                    {appointments.length} registros
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    {appointments.length} registros
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => setIsBatchActionsOpen(!isBatchActionsOpen)}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-widest font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:bg-card-dark"
                >
                  Ações em lote
                  <span className="material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </button>

                {isBatchActionsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsBatchActionsOpen(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        Alterar status
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        Alterar barbeiro
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        Alterar cadeira
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        Alterar data
                      </button>
                      <div className="h-px bg-white/5 my-1"></div>
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-danger-red hover:bg-danger-red/10 transition-colors">
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-widest font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shadow-sm"
                >
                  Exportar
                  <span className="material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </button>

                {isExportOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsExportOpen(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        CSV
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        Excel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 animate-fadeIn pb-8">
            {/* Filtros */}
            <div className="relative z-[60]">
              <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/[0.02] shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 rounded-2xl md:h-16 gap-4 transform-gpu isolate">
                <div className="flex items-center gap-3">
                {dateRange[0] ? (
                  <button
                    onClick={() => {
                      setIsDatePickerOpen(!isDatePickerOpen);
                      setTempSelection(dateRange);
                      setViewDate(
                        new Date(
                          getSafeDate(
                            dateRange[0] || "2026-03-22",
                          )!.getFullYear(),
                          getSafeDate(dateRange[0] || "2026-03-22")!.getMonth(),
                          1,
                        ),
                      );
                    }}
                    className="flex items-center gap-2 bg-red-600 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-red-600/20 glow-red transition-all hover:brightness-110"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      calendar_today
                    </span>
                    Período
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDatePickerOpen(true);
                      setTempSelection(dateRange);
                      setViewDate(
                        new Date(
                          getSafeDate(
                            dateRange[0] || "2026-03-22",
                          )!.getFullYear(),
                          getSafeDate(dateRange[0] || "2026-03-22")!.getMonth(),
                          1,
                        ),
                      );
                    }}
                    className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all border border-border-subtle"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      calendar_today
                    </span>
                    Selecione um Período
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDatePickerOpen(!isDatePickerOpen);
                    setTempSelection(dateRange);
                    setViewDate(
                      new Date(
                        getSafeDate(
                          dateRange[0] || "2026-03-22",
                        )!.getFullYear(),
                        getSafeDate(dateRange[0] || "2026-03-22")!.getMonth(),
                        1,
                      ),
                    );
                  }}
                  className="flex items-center gap-2 text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all"
                >
                  {dateRange[0] && dateRange[1] ? (
                    `${formatDisplayDate(dateRange[0])} - ${formatDisplayDate(dateRange[1])}`
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        add
                      </span>
                      Adicionar filtro
                    </>
                  )}
                </button>
              </div>
              <div className="relative w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                  search
                </span>
                <input
                  className="w-full bg-slate-50 dark:bg-[#151515] border border-transparent dark:border-white/[0.02] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 dark:text-white focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-600/10 dark:focus:ring-red-600/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner"
                  placeholder="Buscar"
                  type="text"
                />
              </div>
            </div>

            {/* Date Picker Popover */}
            {isDatePickerOpen && (
              <div
                ref={datePickerRef}
                className="absolute top-[120%] left-0 mt-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl text-slate-900 dark:text-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,1)] lg:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex border border-slate-200 dark:border-white/5 overflow-hidden z-[100] animate-fadeIn w-[500px] transform-gpu will-change-transform isolate"
              >
                    {/* Opções Rápidas */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3 flex flex-col gap-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white mb-2 px-3 pt-2">
                        Período
                      </div>
                      {[
                        "Hoje",
                        "Esta semana",
                        "Este mês",
                        "Últimos 7 dias",
                        "Últimos 30 dias",
                      ].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleQuickPeriod(opt)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors group"
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedPeriodOption === opt ? "border-red-600" : "border-slate-300 dark:border-white/20"}`}
                          >
                            {selectedPeriodOption === opt && (
                              <div className="w-2 h-2 rounded-full bg-red-600"></div>
                            )}
                          </div>
                          <span
                            className={
                              selectedPeriodOption === opt
                                ? "text-slate-900 dark:text-white font-bold"
                                : ""
                            }
                          >
                            {opt}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Calendário */}
                    <div className="w-2/3 p-4">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <button
                          onClick={() =>
                            setViewDate(
                              new Date(
                                viewDate.getFullYear(),
                                viewDate.getMonth() - 1,
                                1,
                              ),
                            )
                          }
                          className="text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            keyboard_double_arrow_left
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setViewDate(
                              new Date(
                                viewDate.getFullYear(),
                                viewDate.getMonth() - 1,
                                1,
                              ),
                            )
                          }
                          className="text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            chevron_left
                          </span>
                        </button>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {ptBRMonths[viewDate.getMonth()]}{" "}
                          {viewDate.getFullYear()}
                        </div>
                        <button
                          onClick={() =>
                            setViewDate(
                              new Date(
                                viewDate.getFullYear(),
                                viewDate.getMonth() + 1,
                                1,
                              ),
                            )
                          }
                          className="text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            chevron_right
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setViewDate(
                              new Date(
                                viewDate.getFullYear(),
                                viewDate.getMonth() + 1,
                                1,
                              ),
                            )
                          }
                          className="text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            keyboard_double_arrow_right
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {ptBRDays.map((d, i) => (
                          <div
                            key={`${d}-${i}`}
                            className="text-center text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400"
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const daysInMonth = new Date(
                            viewDate.getFullYear(),
                            viewDate.getMonth() + 1,
                            0,
                          ).getDate();
                          const firstDayIndex = new Date(
                            viewDate.getFullYear(),
                            viewDate.getMonth(),
                            1,
                          ).getDay();
                          let cells = [];

                          for (let i = 0; i < firstDayIndex; i++) {
                            cells.push(
                              <div
                                key={`empty-${i}`}
                                className="w-8 h-8"
                              ></div>,
                            );
                          }

                          for (let day = 1; day <= daysInMonth; day++) {
                            const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                            let isSelected =
                              dStr === tempSelection[0] ||
                              dStr === tempSelection[1];
                            let inRange = false;
                            let isRangeStart =
                              dStr === tempSelection[0] &&
                              tempSelection[1] !== null &&
                              dStr < tempSelection[1];
                            let isRangeEnd =
                              dStr === tempSelection[1] &&
                              tempSelection[0] !== null &&
                              dStr > tempSelection[0]!;

                            if (tempSelection[0] && tempSelection[1]) {
                              const cur = getSafeDate(dStr);
                              const d1 = getSafeDate(tempSelection[0]);
                              const d2 = getSafeDate(tempSelection[1]);
                              if (cur && d1 && d2 && cur > d1 && cur < d2) {
                                inRange = true;
                              }
                            }

                            let bgClass = "text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10";
                            if (isSelected)
                              bgClass =
                                "bg-red-600 text-slate-900 dark:text-white font-bold rounded-md shadow-[0_0_10px_rgba(220,38,38,0.5)] glow-red";
                            else if (inRange)
                              bgClass =
                                "bg-red-600/20 text-red-600 dark:text-red-500 font-bold";

                            const isToday = dStr === "2026-03-22";

                            cells.push(
                              <div
                                key={day}
                                className={`relative flex items-center justify-center h-8 ${inRange || isRangeStart || isRangeEnd ? "before:absolute before:inset-0 before:-z-10" : ""}`}
                              >
                                {inRange && (
                                  <div className="absolute inset-0 bg-red-600/10 -z-10"></div>
                                )}
                                {isRangeStart && (
                                  <div className="absolute inset-y-0 right-0 w-1/2 bg-red-600/10 -z-10"></div>
                                )}
                                {isRangeEnd && (
                                  <div className="absolute inset-y-0 left-0 w-1/2 bg-red-600/10 -z-10"></div>
                                )}

                                <button
                                  onClick={() => handleDayClick(day)}
                                  className={`w-8 h-8 flex items-center justify-center text-xs transition-colors rounded-md ${bgClass} ${isToday && !isSelected && !inRange ? "text-red-500 font-bold ring-1 ring-red-500/30" : ""}`}
                                >
                                  {day}
                                </button>
                              </div>,
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 border border-slate-200 dark:border-white/[0.02] rounded-2xl shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col transform-gpu isolate">
              {/* Status Tabs */}
              <div className="flex flex-wrap border-b border-slate-200 dark:border-white/5 overflow-x-auto hide-scrollbar">
                {stats.map((stat, idx) => (
                  <button
                    key={stat.label}
                    onClick={() => { setSelectedTab(stat.label); setIsDatePickerOpen(false); }}
                    className={`flex-1 min-w-[140px] px-6 py-5 flex flex-col gap-1.5 border-b-[3px] transition-colors relative
                                        ${selectedTab === stat.label ? "border-red-600 bg-red-600/5" : "border-transparent hover:bg-red-50 dark:hover:bg-red-600/10"}
                                        ${idx < stats.length - 1 ? "border-r border-slate-200 dark:border-white/5" : ""}
                                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${getStatusBulletColor(stat.label)}`}
                      ></span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold ${selectedTab === stat.label ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white ml-4">
                      {stat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                      <th className="py-4 px-6 w-12 text-slate-500 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.length === appointments.length &&
                            appointments.length > 0
                          }
                          onChange={toggleAll}
                          className="w-4 h-4 rounded border-slate-600 bg-transparent text-red-600 focus:ring-red-600 focus:ring-offset-background-dark cursor-pointer checked:bg-red-600"
                        />
                      </th>
                      {columns.servicos && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          Serviços
                        </th>
                      )}
                      {columns.cliente && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:text-white">
                            Cliente
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_drop_down
                            </span>
                          </div>
                        </th>
                      )}
                      {columns.barbeiro && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:text-white">
                            Barbeiro
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_drop_down
                            </span>
                          </div>
                        </th>
                      )}
                      {columns.duracao && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:text-white">
                            Duração
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_drop_down
                            </span>
                          </div>
                        </th>
                      )}
                      {columns.agendadoPara && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:text-white">
                            Agendado para
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_drop_down
                            </span>
                          </div>
                        </th>
                      )}
                      {columns.status && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:text-white">
                            Status
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_drop_down
                            </span>
                          </div>
                        </th>
                      )}
                      {columns.plano && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          Plano
                        </th>
                      )}
                      {columns.cadeira && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          Cadeira
                        </th>
                      )}
                      {columns.comanda && (
                        <th className="py-4 px-4 text-[10px] uppercase tracking-widest font-bold text-slate-900/90 dark:text-white/90">
                          Comanda
                        </th>
                      )}

                      <th className="py-4 px-6 text-center text-slate-500 dark:text-slate-400 w-16 relative">
                        <button
                          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                          className={`p-1.5 rounded-lg transition-colors ${isSettingsOpen ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 hover:text-slate-900 dark:text-white"}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            settings
                          </span>
                        </button>

                        {isSettingsOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsSettingsOpen(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-xl shadow-xl z-20 py-2 text-left">
                              <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
                                {Object.entries(columnsInfo).map(
                                  ([key, label]) => (
                                    <label
                                      key={key}
                                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={
                                          columns[key as keyof typeof columns]
                                        }
                                        onChange={() =>
                                          toggleColumn(
                                            key as keyof typeof columns,
                                          )
                                        }
                                      />
                                      <div
                                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${columns[key as keyof typeof columns] ? "bg-red-600 text-white border-red-600" : "border-slate-500 bg-transparent"}`}
                                      >
                                        {columns[
                                          key as keyof typeof columns
                                        ] && (
                                          <span className="material-symbols-outlined text-slate-900 dark:text-white text-[14px] font-bold">
                                            check
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                                        {label}
                                      </span>
                                    </label>
                                  ),
                                )}
                              </div>
                              <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 mt-1 bg-slate-100 dark:bg-white/[0.02]">
                                <button
                                  onClick={() => setColumns(defaultColumns)}
                                  className="text-red-600 text-sm font-bold hover:text-slate-900 dark:text-white transition-colors"
                                >
                                  Restaurar Padrão
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt, i) => (
                      <tr
                        key={appt.id}
                        className="border-b border-slate-200 dark:border-white/5 hover:bg-red-50 dark:hover:bg-red-600/10 transition-colors group"
                      >
                        <td className="py-3 px-6 w-12">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(appt.id)}
                            onChange={() => toggleSelection(appt.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-transparent text-red-600 focus:ring-red-600 focus:ring-offset-background-dark cursor-pointer checked:bg-red-600"
                          />
                        </td>
                        {columns.servicos && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                {appt.services[0].name}
                              </span>
                            </div>
                          </td>
                        )}
                        {columns.cliente && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${appt.client.color}`}
                              >
                                {appt.client.initials}
                              </div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                {appt.client.name}
                              </span>
                            </div>
                          </td>
                        )}
                        {columns.barbeiro && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={appt.barber.image}
                                alt={appt.barber.name}
                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/5"
                              />
                              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                {appt.barber.name}
                              </span>
                            </div>
                          </td>
                        )}
                        {columns.duracao && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {appt.duration}
                            </span>
                          </td>
                        )}
                        {columns.agendadoPara && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                              {appt.scheduledFor}
                            </span>
                          </td>
                        )}
                        {columns.status && (
                          <td className="py-3 px-4">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold leading-none ${getStatusStyles(appt.status)}`}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {getStatusIcon(appt.status)}
                              </span>
                              {appt.status}
                            </div>
                          </td>
                        )}
                        {columns.plano && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-500">-</span>
                          </td>
                        )}
                        {columns.cadeira && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-500">-</span>
                          </td>
                        )}
                        {columns.comanda && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-500">-</span>
                          </td>
                        )}
                        <td className="py-3 px-6 text-center text-slate-500 dark:text-slate-400 relative">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionId(
                                  openActionId === appt.id ? null : appt.id,
                                );
                              }}
                              className={`p-1 rounded-lg transition-colors ${openActionId === appt.id ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-red-600/10 hover:text-slate-900 dark:hover:text-red-500"}`}
                              title="Ações"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                more_vert
                              </span>
                            </button>
                            {openActionId === appt.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[90]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionId(null);
                                  }}
                                ></div>
                                <div
                                  className="absolute right-0 top-[80%] mt-1 w-28 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-[100] py-1 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <div className="h-px bg-slate-200 dark:bg-white/5 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-danger-red hover:bg-danger-red/10 transition-colors"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="p-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-slate-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                  <div className="relative">
                    <select className="appearance-none bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-lg px-4 py-2 pr-10 outline-none focus:border-red-600 cursor-pointer hover:border-slate-600 transition-colors">
                      <option value="25">25 por página</option>
                      <option value="50">50 por página</option>
                      <option value="100">100 por página</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none text-slate-500 dark:text-slate-400">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      keyboard_double_arrow_left
                    </span>
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>

                  <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600 text-white text-slate-900 dark:text-white font-bold border border-red-600 shadow-sm hover:brightness-110 transition-colors">
                    1
                  </button>

                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      keyboard_double_arrow_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAgendaReports;
