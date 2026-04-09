import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

const sidebarItems = [
  { icon: 'grid_view',              label: 'Início',        path: '/admin/dashboard' },
  { icon: 'calendar_today',         label: 'Agenda',        path: '/admin/agenda' },
  { icon: 'group',                  label: 'Contatos',      path: '/admin/clients' },
  { icon: 'receipt_long',           label: 'Atendimento',   path: '/admin/atendimento' },
  { icon: 'content_cut',            label: 'Profissionais', path: '/admin/professionals' },
  { icon: 'inventory_2',            label: 'Estoque',       path: '/admin/inventory' },
  { icon: 'account_balance_wallet', label: 'Financeiro',    path: '/admin/financial' },
  { icon: 'store',                  label: 'Unidades',      path: '/admin/matrizes', desktopOnly: true },
];

const CATEGORIES = ['Cabelo', 'Barba', 'Combo', 'Químicos', 'Acabamentos', 'Infantil', 'Mãos/Pés'];
const DURATIONS  = [15, 30, 45, 60, 90, 120];
const COLORS     = ['blue', 'emerald', 'amber', 'purple', 'red', 'indigo', 'teal', 'pink'];

const COLOR_CLASSES: Record<string, string> = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  purple:  'bg-purple-500',
  red:     'bg-red-500',
  indigo:  'bg-indigo-500',
  teal:    'bg-teal-500',
  pink:    'bg-pink-500',
};

interface Service {
  id: string;
  matriz_id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  color?: string;
}

interface ServiceForm {
  name: string;
  category: string;
  duration_minutes: number;
  price: string;
  color: string;
  active: boolean;
}

const emptyForm: ServiceForm = {
  name: '', category: 'Cabelo', duration_minutes: 30, price: '', color: 'blue', active: true,
};

const AdminServices: React.FC = () => {
  const { selectedMatriz } = useMatriz();

  const [services, setServices]       = useState<Service[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');

  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isDeleteOpen, setIsDeleteOpen]     = useState(false);
  const [editing, setEditing]               = useState<Service | null>(null);
  const [toDelete, setToDelete]             = useState<Service | null>(null);
  const [form, setForm]                     = useState<ServiceForm>(emptyForm);
  const [saving, setSaving]                 = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [error, setError]                   = useState('');

  const fetchServices = async () => {
    if (!selectedMatriz) { setServices([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('services')
      .select('*')
      .eq('matriz_id', selectedMatriz.id)
      .order('name');
    if (!err && data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [selectedMatriz]);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount   = services.filter(s => s.active).length;
  const avgPrice      = services.length ? (services.reduce((acc, s) => acc + Number(s.price), 0) / services.length) : 0;
  const topCategory   = services.length
    ? Object.entries(services.reduce((acc: Record<string, number>, s) => { acc[s.category] = (acc[s.category] ?? 0) + 1; return acc; }, {}))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? '—'
    : '—';

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setIsModalOpen(true); };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, duration_minutes: s.duration_minutes, price: String(s.price), color: s.color ?? 'blue', active: s.active });
    setError(''); setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatriz) return;
    setError('');
    if (!form.name.trim())  { setError('Nome é obrigatório.'); return; }
    if (!form.price.trim()) { setError('Preço é obrigatório.'); return; }
    const priceNum = parseFloat(form.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) { setError('Preço inválido.'); return; }

    setSaving(true);
    const payload = {
      name: form.name.trim(), category: form.category,
      duration_minutes: form.duration_minutes, price: priceNum,
      color: form.color, active: form.active, matriz_id: selectedMatriz.id,
    };

    if (editing) {
      const { error: err } = await supabase.from('services').update(payload).eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('services').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    await fetchServices();
    setSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    await supabase.from('services').delete().eq('id', toDelete.id);
    await fetchServices();
    setDeleting(false);
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  const toggleActive = async (s: Service) => {
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none opacity-50 dark:opacity-100 animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />

      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
        {/* Header */}
        <header className="flex justify-between items-start mb-8 border-b border-border-subtle pb-6">
          <div>
            <h2 className="text-[2rem] font-medium text-slate-900 dark:text-white uppercase tracking-tight pt-1">Serviços</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {selectedMatriz ? `Catálogo de ${selectedMatriz.name}` : 'Selecione uma unidade'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={openCreate}
              disabled={!selectedMatriz}
              className="bg-red-600 hover:bg-red-600/90 text-white px-5 py-2.5 rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Novo Serviço
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Serviços Ativos</p>
              <p className="text-2xl font-medium text-slate-900 dark:text-white">{activeCount} <span className="text-sm text-slate-500">/ {services.length}</span></p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined">attach_money</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Ticket Médio</p>
              <p className="text-2xl font-medium text-slate-900 dark:text-white">R$ {formatPrice(avgPrice)}</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <span className="material-symbols-outlined">category</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Categoria Principal</p>
              <p className="text-2xl font-medium text-slate-900 dark:text-white">{topCategory}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none transition-all placeholder:text-slate-500"
              placeholder="Buscar serviço ou categoria..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1">
          {loading ? (
            <div className="flex items-center justify-center flex-1 py-20 text-slate-500">
              <span className="material-symbols-outlined animate-spin text-3xl mr-3">progress_activity</span>
              Carregando...
            </div>
          ) : !selectedMatriz ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-30">store</span>
              <p className="text-sm font-medium">Selecione uma unidade no menu lateral.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-30">content_cut</span>
              <p className="text-sm font-medium">Nenhum serviço encontrado.</p>
              <button onClick={openCreate} className="mt-4 text-red-500 text-xs font-medium hover:underline">
                Criar primeiro serviço →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-white/[0.02]">
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Serviço</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Categoria</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Duração</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Preço</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((service) => (
                    <tr key={service.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${COLOR_CLASSES[service.color ?? 'blue'] ?? 'bg-blue-500'} shadow-[0_0_10px_rgba(0,0,0,0.3)]`} />
                          <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">{service.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
                          {service.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                          <span className="text-sm font-medium">{service.duration_minutes} min</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">R$ {formatPrice(service.price)}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => toggleActive(service)}
                          className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.2em] uppercase border transition-all ${service.active ? 'bg-success-green/10 text-success-green border-success-green/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}
                        >
                          {service.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(service)}
                            className="p-2 border border-border-subtle rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => { setToDelete(service); setIsDeleteOpen(true); }}
                            className="p-2 border border-border-subtle rounded-lg text-slate-400 hover:text-danger-red hover:border-danger-red transition-all"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-medium text-slate-900 dark:text-white text-xl">
                {editing ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Serviço *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="Ex: Corte Degradê" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 outline-none text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duração</label>
                  <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 outline-none text-sm">
                    {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preço (R$) *</label>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="00,00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select value={form.active ? 'ativo' : 'inativo'} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'ativo' }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 outline-none text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor na Agenda</label>
                  <div className="flex gap-3 flex-wrap">
                    {COLORS.map(color => (
                      <label key={color} className="cursor-pointer">
                        <input type="radio" name="color" value={color} checked={form.color === color} onChange={() => setForm(f => ({ ...f, color }))} className="sr-only peer" />
                        <div className={`w-8 h-8 rounded-full ${COLOR_CLASSES[color]} border-2 border-transparent peer-checked:border-white peer-checked:scale-110 transition-all shadow-lg`} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>{error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] hover:bg-red-600/90 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {isDeleteOpen && toDelete && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-danger-red/10 flex items-center justify-center text-danger-red mb-4">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white text-lg mb-2">Excluir Serviço?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Tem certeza que deseja excluir <strong className="text-slate-900 dark:text-white">{toDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-danger-red text-white font-medium text-sm rounded-xl hover:bg-red-600 shadow-lg transition-all disabled:opacity-50">
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServices;
