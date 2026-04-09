import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

const ptBRMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ptBRDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// --- Interfaces ---
interface Supplier {
  id: string;
  matriz_id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  person_type: string;
  document: string | null;
  country: string;
  state: string | null;
  city: string | null;
  opening_date: string | null;
  notes: string | null;
  created_at: string;
}

interface SupplierOrder {
  id: string;
  supplier_id: string;
  matriz_id: string;
  amount: number | null;
  status: string;
  order_date: string;
  expected_delivery: string | null;
  delivered_at: string | null;
  notes: string | null;
}

interface SupplierRow extends Supplier {
  lastOrder: string;
  nextDelivery: string;
  status: string;
  amount: string;
}

// --- Date helpers ---
const formatISODate = (iso: string): string => {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return '—';
  const [y, m, d] = parts;
  return `${d} ${ptBRMonths[parseInt(m) - 1]} ${y}`;
};

const isoToDisplay = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const displayToISO = (display: string): string => {
  const parts = display.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

// --- CustomSelect ---
const CustomSelect: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = 'Selecione' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isClickInsideSelect = selectRef.current?.contains(event.target as Node);
      const isClickInsideDropdown = dropdownRef.current?.contains(event.target as Node);
      if (!isClickInsideSelect && !isClickInsideDropdown) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      const isScrollingDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!isScrollingDropdown) setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[42px] bg-slate-100 dark:bg-[#111] border rounded-xl pl-4 pr-3 flex items-center justify-between text-sm shadow-inner transition-colors ${isOpen ? 'border-primary' : 'border-transparent dark:border-white/10'}`}
      >
        <span className={selectedOption ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] w-6 h-6 flex items-center justify-center rounded-md transition-all duration-300 ${isOpen ? 'rotate-180 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white' : 'text-slate-400 bg-transparent'}`}
        >
          expand_more
        </span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white dark:bg-[#1a1a1a] border border-border-subtle dark:border-white/10 rounded-xl shadow-xl overflow-hidden animate-fadeIn"
            style={dropdownStyle}
          >
            <ul className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  >
                    {opt.label}
                    {value === opt.value && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

// --- AdminSuppliers ---
const AdminSuppliers: React.FC = () => {
  const { selectedMatriz } = useMatriz();

  // === UI state ===
  const [searchTerm, setSearchTerm] = useState('');
  const [modalData, setModalData] = useState<SupplierRow | { isNew: true } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [personType, setPersonType] = useState('Jurídica');
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewDate, setViewDate] = useState(new Date(2026, 2, 1));
  const [contactType, setContactType] = useState('');
  const [docType, setDocType] = useState('');
  const [countryType, setCountryType] = useState('brasil');
  const [stateType, setStateType] = useState('');
  const [cityType, setCityType] = useState('');
  const datePickerRef = React.useRef<HTMLDivElement>(null);

  // === data state ===
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [allOrders, setAllOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // === form state for modal ===
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDocument, setFormDocument] = useState('');
  const [formCategory, setFormCategory] = useState('');

  // === outside click for date picker ===
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isDatePickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  // === fetch suppliers when matriz changes ===
  useEffect(() => {
    if (!selectedMatriz) return;
    fetchSuppliers();
  }, [selectedMatriz]);

  // === populate form when modal opens ===
  useEffect(() => {
    if (!modalData) return;
    if ('isNew' in modalData) {
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormDocument('');
      setFormCategory('');
      setPersonType('Jurídica');
      setSelectedDate('');
      setStateType('');
      setCityType('');
      setCountryType('brasil');
    } else {
      const s = modalData as SupplierRow;
      setFormName(s.name || '');
      setFormEmail(s.email || '');
      setFormPhone(s.phone || '');
      setFormDocument(s.document || '');
      setFormCategory(s.category || '');
      setPersonType(s.person_type || 'Jurídica');
      setSelectedDate(s.opening_date ? isoToDisplay(s.opening_date) : '');
      setStateType(s.state || '');
      setCityType(s.city || '');
      setCountryType(s.country || 'brasil');
    }
  }, [modalData]);

  // === fetch logic ===
  const fetchSuppliers = async () => {
    if (!selectedMatriz) return;
    setLoading(true);
    const [{ data: suppliersRaw }, { data: ordersRaw }] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('matriz_id', selectedMatriz.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('supplier_orders')
        .select('*')
        .eq('matriz_id', selectedMatriz.id)
        .order('order_date', { ascending: false }),
    ]);

    const orders = (ordersRaw as SupplierOrder[]) || [];
    setAllOrders(orders);

    if (suppliersRaw) {
      const enriched: SupplierRow[] = (suppliersRaw as Supplier[]).map((supplier) => {
        const latestOrder = orders.find((o) => o.supplier_id === supplier.id);
        return {
          ...supplier,
          lastOrder: latestOrder?.order_date ? formatISODate(latestOrder.order_date) : '—',
          nextDelivery: latestOrder?.expected_delivery
            ? formatISODate(latestOrder.expected_delivery)
            : '—',
          status: latestOrder?.status || '—',
          amount:
            latestOrder?.amount != null
              ? `R$ ${Number(latestOrder.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'R$ 0,00',
        };
      });
      setSuppliers(enriched);
    }
    setLoading(false);
  };

  // === save (insert / update) ===
  const handleSave = async () => {
    if (!selectedMatriz || !formName.trim()) return;
    setSaving(true);

    const payload = {
      matriz_id: selectedMatriz.id,
      name: formName.trim(),
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      document: formDocument.trim() || null,
      category: formCategory || null,
      person_type: personType,
      opening_date: selectedDate ? displayToISO(selectedDate) : null,
      country: countryType,
      state: stateType || null,
      city: cityType || null,
    };

    if (modalData && !('isNew' in modalData)) {
      const { data } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', (modalData as SupplierRow).id)
        .select()
        .single();
      if (data) {
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === data.id
              ? { ...s, ...data }
              : s
          )
        );
      }
    } else {
      const { data } = await supabase
        .from('suppliers')
        .insert(payload)
        .select()
        .single();
      if (data) {
        setSuppliers((prev) => [
          {
            ...(data as Supplier),
            lastOrder: '—',
            nextDelivery: '—',
            status: '—',
            amount: 'R$ 0,00',
          },
          ...prev,
        ]);
      }
    }

    setSaving(false);
    setModalData(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const sidebarItems = [
    { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
    { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
    { icon: 'group', label: 'Contatos', path: '/admin/clients' },
    { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
    { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
    { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
  ];

  const filteredSuppliers = suppliers.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs using real order data
  const now = new Date();
  const activeOrders = allOrders.filter((o) => o.status !== 'Concluído').length;
  const totalSpent = allOrders
    .filter((o) => {
      if (!o.order_date) return false;
      const [y, m] = o.order_date.split('-');
      return parseInt(m) === now.getMonth() + 1 && parseInt(y) === now.getFullYear();
    })
    .reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

  const handleWhatsApp = (phone: string, name: string) => {
    const msg = `Olá, falo da barbearia. Gostaria de ver o status do meu pedido com a ${name}, por favor.`;
    const formattedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex bg-background-dark min-h-screen">
      <Sidebar items={sidebarItems} portalName="KINGK" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">local_shipping</span>
              Fornecedores
            </h2>
            <p className="text-slate-400 mt-1 max-w-2xl">
              Gerencie as compras do seu estoque, acompanhe entregas e contate fornecedores.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex bg-white dark:bg-[#111111] border border-border-subtle dark:border-white/10 rounded-xl overflow-hidden w-full md:w-auto">
              <span className="material-symbols-outlined text-slate-500 p-3 bg-transparent flex items-center justify-center">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nome ou categoria..."
                className="bg-transparent border-none outline-none text-white px-2 py-3 w-full md:w-64 placeholder:text-slate-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Dashboard Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fadeIn">
          <div className="bg-card-dark border border-border-subtle rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total de Fornecedores
            </h3>
            <span className="text-3xl font-extrabold text-white">{suppliers.length}</span>
          </div>
          <div className="bg-card-dark border border-border-subtle rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#259af4]/5 rounded-full blur-2xl"></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Pedidos em Andamento
            </h3>
            <span className="text-3xl font-extrabold text-white">{activeOrders}</span>
          </div>
          <div className="bg-card-dark border border-border-subtle rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-danger-red/5 rounded-full blur-2xl"></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Gasto no Mês (Estoque)
            </h3>
            <span className="text-3xl font-extrabold text-white">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Tabela de Fornecedores */}
        <div
          className="bg-card-dark border border-border-subtle rounded-3xl overflow-hidden animate-fadeIn"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="p-6 border-b border-border-subtle flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Diretório de Parceiros</h3>
            <button
              onClick={() => setModalData({ isNew: true })}
              className="bg-primary hover:bg-primary-hover text-bg-dark px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Novo Fornecedor
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-border-subtle">
                  <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Fornecedor
                  </th>
                  <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Categoria
                  </th>
                  <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Último Pedido
                  </th>
                  <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Status Entrega
                  </th>
                  <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-right">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl animate-spin block mx-auto mb-2">
                        progress_activity
                      </span>
                      Carregando fornecedores...
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-border-subtle dark:border-white/10 text-white font-bold">
                            {row.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-bold text-sm block">{row.name}</span>
                            <span className="text-slate-500 text-xs">{row.phone || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-border-subtle dark:border-white/10">
                          {row.category || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-300 font-medium text-sm block">{row.lastOrder}</span>
                        <span className="text-slate-500 text-xs block">Valor: {row.amount}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.status === 'Em Rota'
                                ? 'bg-[#259af4] animate-pulse'
                                : row.status === 'Aguardando'
                                ? 'bg-amber-500'
                                : row.status === 'Separando'
                                ? 'bg-purple-500'
                                : row.status === 'Concluído'
                                ? 'bg-[#25D366]'
                                : 'bg-slate-500'
                            }`}
                          ></span>
                          <div>
                            <span className="text-white text-sm font-bold block">{row.status}</span>
                            {row.nextDelivery !== '—' && row.status !== 'Concluído' && (
                              <span className="text-slate-500 text-xs">Prev: {row.nextDelivery}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 outline-none">
                          {row.phone && (
                            <button
                              onClick={() => handleWhatsApp(row.phone!, row.name)}
                              className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                              title="Cobrar pelo WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                            </button>
                          )}
                          <button
                            onClick={() => setModalData(row)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 hover:text-white transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredSuppliers.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">
                {searchTerm ? 'search_off' : 'local_shipping'}
              </span>
              <h3 className="text-lg font-bold text-white mb-2">
                {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              </h3>
              <p className="text-slate-500">
                {searchTerm
                  ? `Sua busca por "${searchTerm}" não retornou resultados.`
                  : 'Clique em "Novo Fornecedor" para adicionar o primeiro.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Novo/Editar Fornecedor */}
      {modalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-card-dark border border-border-subtle rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8 animate-slideUp shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] shrink-0">
              <h3 className="text-xl font-bold text-white">
                {'isNew' in modalData ? 'Novo Fornecedor' : 'Editar Fornecedor'}
              </h3>
              <button
                onClick={() => setModalData(null)}
                className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Top section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Foto Upload */}
                <div className="col-span-1 flex flex-col items-center justify-center p-5 border border-dashed border-white/20 rounded-2xl bg-white dark:bg-[#111] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer group h-full">
                  <div className="w-16 h-16 bg-card-dark rounded-full flex items-center justify-center mb-3 overflow-hidden border border-white/10 group-hover:border-primary transition-colors shadow-inner">
                    <span className="material-symbols-outlined text-3xl text-slate-600 group-hover:text-primary transition-colors">
                      person
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mb-3 leading-relaxed px-2">
                    Selecione um arquivo JPG ou PNG do seu dispositivo
                  </p>
                  <button className="px-4 py-1.5 bg-primary/10 text-primary rounded-xl font-bold text-[10px] hover:bg-primary hover:text-white transition-colors">
                    Escolher foto
                  </button>
                </div>

                {/* Fields */}
                <div className="col-span-2 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Nome<span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Nome do parceiro/empresa"
                        className="w-full h-[48px] bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl px-4 text-white outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/30 shadow-inner placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="contato@empresa.com"
                        className="w-full h-[48px] bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl px-4 text-white outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/30 shadow-inner placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Telefone
                      </label>
                      <div className="flex bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-all focus-within:ring-1 focus-within:ring-primary/30 h-[48px] shadow-inner">
                        <div className="px-3 border-r border-white/10 flex items-center justify-center bg-slate-50 dark:bg-white/[0.02] text-sm text-slate-600 dark:text-slate-300 gap-2 font-bold shrink-0 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer transition-colors">
                          <img
                            src="https://flagcdn.com/w20/br.png"
                            alt="BR"
                            className="w-[18px] h-auto rounded-[2px]"
                          />
                          +55{' '}
                          <span className="material-symbols-outlined text-[14px] text-slate-500">
                            expand_more
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full h-full bg-transparent px-4 text-white outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Data de Abertura / Nasc.
                      </label>
                      <div
                        className="flex bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-all focus-within:ring-1 focus-within:ring-primary/30 h-[48px] shadow-inner cursor-pointer"
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                      >
                        <input
                          readOnly
                          value={selectedDate}
                          type="text"
                          placeholder="DD/MM/AAAA"
                          className="w-full h-full bg-transparent px-4 text-white outline-none placeholder:text-slate-600 cursor-pointer"
                        />
                        <button
                          type="button"
                          className="material-symbols-outlined text-slate-500 px-4 hover:text-white transition-colors bg-slate-50 dark:bg-white/[0.02] border-l border-border-subtle dark:border-white/10 h-full flex items-center justify-center pointer-events-none"
                        >
                          calendar_today
                        </button>
                      </div>
                      {isDatePickerOpen && (
                        <div
                          ref={datePickerRef}
                          className="absolute top-[calc(100%+8px)] right-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl text-white rounded-2xl shadow-xl flex flex-col border border-border-subtle dark:border-white/10 overflow-hidden z-[100] animate-fadeIn w-[280px]"
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-4 px-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewDate(
                                    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                  );
                                }}
                                className="text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  chevron_left
                                </span>
                              </button>
                              <div className="font-bold text-white text-sm">
                                {ptBRMonths[viewDate.getMonth()]} {viewDate.getFullYear()}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewDate(
                                    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                  );
                                }}
                                className="text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  chevron_right
                                </span>
                              </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {ptBRDays.map((d, i) => (
                                <div
                                  key={'hdr' + i}
                                  className="text-center text-xs font-bold text-slate-500 dark:text-slate-400"
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
                                  0
                                ).getDate();
                                const firstDayIndex = new Date(
                                  viewDate.getFullYear(),
                                  viewDate.getMonth(),
                                  1
                                ).getDay();
                                const cells = [];
                                for (let i = 0; i < firstDayIndex; i++)
                                  cells.push(
                                    <div key={`empty-${i}`} className="w-8 h-8"></div>
                                  );
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const dStr = `${String(day).padStart(2, '0')}/${String(
                                    viewDate.getMonth() + 1
                                  ).padStart(2, '0')}/${viewDate.getFullYear()}`;
                                  const isSelected = selectedDate === dStr;
                                  cells.push(
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate(dStr);
                                        setIsDatePickerOpen(false);
                                      }}
                                      className={`w-8 h-8 flex items-center justify-center text-xs rounded-md font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-primary text-white font-bold shadow-md shadow-primary/30'
                                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Tipo de Pessoa<span className="text-primary">*</span>
                      </label>
                      <div className="flex bg-slate-50 dark:bg-[#0A0A0A] border border-border-subtle dark:border-white/10 rounded-xl p-1 relative h-[48px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setPersonType('Física');
                          }}
                          className={`flex-1 h-full text-sm font-bold rounded-lg transition-all duration-300 ${personType === 'Física' ? 'bg-primary text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          Física
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setPersonType('Jurídica');
                          }}
                          className={`flex-1 h-full text-sm font-bold rounded-lg transition-all duration-300 ${personType === 'Jurídica' ? 'bg-primary text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          Jurídica
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Categoria
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full h-[48px] bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl px-4 text-white outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/30 shadow-inner"
                      >
                        <option value="">Selecione</option>
                        <option>Produtos de Cabelo</option>
                        <option>Materiais Descartáveis</option>
                        <option>Óleos e Balms</option>
                        <option>Equipamentos</option>
                        <option>Insumos</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {personType === 'Física' ? 'CPF' : 'CNPJ'}
                      </label>
                      <input
                        type="text"
                        value={formDocument}
                        onChange={(e) => setFormDocument(e.target.value)}
                        placeholder={
                          personType === 'Física' ? '000.000.000-00' : '00.000.000/0000-00'
                        }
                        className="w-full h-[48px] bg-white dark:bg-[#111] border border-border-subtle dark:border-white/10 rounded-xl px-4 text-white outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/30 shadow-inner placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accordions */}
              <div className="space-y-2 pt-4 border-t border-border-subtle dark:border-white/5">
                <div className="border border-border-subtle bg-white dark:bg-[#111] rounded-2xl overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === 'contatos' ? null : 'contatos'
                      )
                    }
                    className="w-full p-5 flex justify-between items-center text-left outline-none relative z-10 bg-inherit group"
                  >
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      Contatos adicionais
                    </span>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                      Sem contatos adicionais{' '}
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${expandedAccordion === 'contatos' ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-background-dark/30 ${expandedAccordion === 'contatos' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-5 border-t border-border-subtle dark:border-white/5 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1/3">
                          <label className="block text-[10px] font-bold text-slate-400 capitalize mb-1 ml-1">
                            Tipo
                          </label>
                          <div className="relative">
                            <CustomSelect
                              value={contactType}
                              onChange={setContactType}
                              options={[
                                { value: 'movel', label: 'Telefone móvel' },
                                { value: 'fixo', label: 'Telefone fixo' },
                                { value: 'facebook', label: 'Facebook' },
                                { value: 'instagram', label: 'Instagram' },
                                { value: 'email2', label: 'E-mail secundário' },
                              ]}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 capitalize mb-1 ml-1">
                            Número
                          </label>
                          <input
                            type="text"
                            placeholder="Selecione o tipo"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          className="mt-5 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-danger-red hover:bg-danger-red/10 rounded-xl transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete_outline
                          </span>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="w-max px-4 h-10 text-primary dark:text-primary transition-colors rounded-xl flex items-center gap-2 text-sm font-bold bg-transparent hover:bg-primary/5"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>{' '}
                        Adicionar contato
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-border-subtle bg-white dark:bg-[#111] rounded-2xl overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === 'documentos' ? null : 'documentos'
                      )
                    }
                    className="w-full p-5 flex justify-between items-center text-left outline-none relative z-10 bg-inherit group"
                  >
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      Documentos
                    </span>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                      Nenhum documento cadastrado{' '}
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${expandedAccordion === 'documentos' ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-background-dark/30 ${expandedAccordion === 'documentos' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-5 border-t border-border-subtle dark:border-white/5 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1/3">
                          <label className="block text-[10px] font-bold text-slate-400 capitalize mb-1 ml-1">
                            Tipo
                          </label>
                          <div className="relative">
                            <CustomSelect
                              value={docType}
                              onChange={setDocType}
                              options={[
                                { value: 'rg', label: 'RG' },
                                { value: 'cpf', label: 'CPF' },
                                { value: 'cnh', label: 'CNH' },
                                { value: 'outro', label: 'Outro' },
                              ]}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 capitalize mb-1 ml-1">
                            Número
                          </label>
                          <input
                            type="text"
                            placeholder="Selecione o tipo"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          className="mt-5 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-danger-red hover:bg-danger-red/10 rounded-xl transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete_outline
                          </span>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="w-max px-4 h-10 text-primary dark:text-primary transition-colors rounded-xl flex items-center gap-2 text-sm font-bold bg-transparent hover:bg-primary/5"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>{' '}
                        Adicionar documento
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-border-subtle bg-white dark:bg-[#111] rounded-2xl overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === 'endereco' ? null : 'endereco'
                      )
                    }
                    className="w-full p-5 flex justify-between items-center text-left outline-none relative z-10 bg-inherit group"
                  >
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      Endereço
                    </span>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${expandedAccordion === 'endereco' ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-background-dark/30 ${expandedAccordion === 'endereco' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-5 border-t border-border-subtle dark:border-white/5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            País
                          </label>
                          <input
                            type="text"
                            placeholder="Brasil"
                            value={countryType}
                            onChange={(e) => setCountryType(e.target.value)}
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Código postal*
                          </label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Estado*
                          </label>
                          <input
                            type="text"
                            placeholder="Digite o estado"
                            value={stateType}
                            onChange={(e) => setStateType(e.target.value)}
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Cidade*
                          </label>
                          <input
                            type="text"
                            placeholder="Digite a cidade"
                            value={cityType}
                            onChange={(e) => setCityType(e.target.value)}
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Bairro*
                          </label>
                          <input
                            type="text"
                            placeholder="Digite"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Rua*
                          </label>
                          <input
                            type="text"
                            placeholder="Digite"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Número*
                          </label>
                          <input
                            type="text"
                            placeholder="Digite"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2">
                            Complemento
                          </label>
                          <input
                            type="text"
                            placeholder="Digite"
                            className="w-full h-[42px] bg-slate-100 dark:bg-[#111] border border-transparent dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-primary text-sm shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-border-subtle bg-white dark:bg-[#111] rounded-2xl overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAccordion(expandedAccordion === 'anexos' ? null : 'anexos')
                    }
                    className="w-full p-5 flex justify-between items-center text-left outline-none relative z-10 bg-inherit group"
                  >
                    <span className="font-bold text-slate-800 dark:text-white text-sm">Anexos</span>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${expandedAccordion === 'anexos' ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-background-dark/30 ${expandedAccordion === 'anexos' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-5 border-t border-border-subtle dark:border-white/5">
                      <label className="block text-[11px] font-bold text-slate-400 capitalize mb-2 ml-1">
                        Anexos
                      </label>
                      <div className="relative border border-dashed border-border-subtle dark:border-white/20 hover:border-primary/50 transition-colors rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-transparent group cursor-pointer overflow-hidden">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                          multiple
                          title=" "
                        />
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <span className="material-symbols-outlined text-4xl text-primary mb-3">
                            cloud_upload
                          </span>
                          <p className="text-[10px] text-slate-400 mb-4 max-w-[90%] leading-relaxed font-medium">
                            JPG, JPEG, PNG, WEBP, HEIC, HEIF, JFIF, PDF, TXT, DOC, DOCX, XLS,
                            XLSX, OGG, MP4 ou MOV, menores de 20.97 MB
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-bold mb-4">
                            Arraste e solte seus arquivos aqui
                          </p>
                          <button
                            type="button"
                            className="px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-sm transition-colors pointer-events-none"
                          >
                            Escolher arquivos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-subtle bg-slate-50 dark:bg-white/[0.02] flex justify-end gap-5 shrink-0 px-8">
              <button
                onClick={() => setModalData(null)}
                className="px-8 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 uppercase tracking-wider text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-10 py-3 rounded-xl font-bold text-white uppercase tracking-widest text-sm bg-primary hover:bg-red-500 transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-1 transform-gpu disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
              >
                {saving && (
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[100] animate-slideUp">
          <div className="bg-card-dark border border-[#25D366]/30 shadow-[0_10px_40px_rgba(37,211,102,0.1)] rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#25D366] text-xl">check_circle</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Sucesso!</h4>
              <p className="text-slate-400 text-xs mt-0.5">
                Parceiro salvo com sucesso no diretório.
              </p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="ml-4 text-slate-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;
