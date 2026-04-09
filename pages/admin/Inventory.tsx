
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';
import { useSearchParams } from 'react-router-dom';

const ptBRMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ptBRDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const getSafeDate = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

interface Product {
  id: string;
  name: string;
  ref: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
  icon?: string;
}

interface InventoryMovement {
  id: string;
  product_id: string;
  matriz_id: string;
  type: 'entrada' | 'saida';
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  movement_date: string;
}

interface ProductGiro {
  productId: string;
  entradas: number;
  saidas: number;
  custoTotal: number; // soma unit_cost * qty das entradas
}

const AdminInventory: React.FC = () => {
  const { selectedMatriz } = useMatriz();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'high'>('all');
  const [activeTab, setActiveTab] = useState<'inventario' | 'giro'>(() => {
    const tab = searchParams.get('tab');
    return (tab === 'giro' ? 'giro' : 'inventario');
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Movements state (Giro de Estoque)
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Date Filter State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>(['2026-03-19', '2026-03-20']);
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<string>('');
  
  // Date Picker Internals
  const initialView = getSafeDate(dateRange[0]) || new Date(2026, 2, 1);
  const [viewDate, setViewDate] = useState(new Date(initialView.getFullYear(), initialView.getMonth(), 1));
  const [tempSelection, setTempSelection] = useState<[string | null, string | null]>(dateRange);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Sincroniza activeTab com o parâmetro ?tab= da URL (mobile bottom nav)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'giro' || tab === 'inventario') {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('inventario');
    }
  }, [searchParams]);

  useEffect(() => {
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
      const today = new Date(2026, 2, 22); // Using fixed current date based on context
      const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
      setIsDatePickerOpen(false); // Auto close or keep open depending on preference
  };

  const handleDayClick = (day: number) => {
      setSelectedPeriodOption(''); // Clear quick option when manually clicking
      const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!tempSelection[0] || (tempSelection[0] && tempSelection[1])) {
          setTempSelection([dStr, null]);
      } else {
          const d1 = getSafeDate(tempSelection[0]);
          const d2 = getSafeDate(dStr);
          if (d1 && d2) {
              if (d2 < d1) setTempSelection([dStr, tempSelection[0]]);
              else setTempSelection([tempSelection[0], dStr]);
              
              // Only auto apply on second click
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

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!selectedMatriz) return;
    supabase
      .from('inventory_products')
      .select('*')
      .eq('matriz_id', selectedMatriz.id)
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data);
      });
  }, [selectedMatriz]);

  // Fetch movements whenever matriz or dateRange changes (only when on giro tab)
  useEffect(() => {
    if (!selectedMatriz || !dateRange[0] || !dateRange[1]) return;
    setLoadingMovements(true);
    supabase
      .from('inventory_movements')
      .select('*')
      .eq('matriz_id', selectedMatriz.id)
      .gte('movement_date', dateRange[0])
      .lte('movement_date', dateRange[1])
      .then(({ data }) => {
        setMovements((data as InventoryMovement[]) || []);
        setLoadingMovements(false);
      });
  }, [selectedMatriz, dateRange]);

  // Compute per-product giro stats from movements
  const giroByProduct: Record<string, ProductGiro> = {};
  for (const m of movements) {
    if (!giroByProduct[m.product_id]) {
      giroByProduct[m.product_id] = { productId: m.product_id, entradas: 0, saidas: 0, custoTotal: 0 };
    }
    if (m.type === 'entrada') {
      giroByProduct[m.product_id].entradas += m.quantity;
      giroByProduct[m.product_id].custoTotal += (m.unit_cost ?? 0) * m.quantity;
    } else {
      giroByProduct[m.product_id].saidas += m.quantity;
    }
  }

  // KPI totals
  const totalEntradasQty  = movements.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0);
  const totalSaidasQty    = movements.filter(m => m.type === 'saida').reduce((s, m) => s + m.quantity, 0);
  const totalEntradasVal  = movements.filter(m => m.type === 'entrada').reduce((s, m) => s + (m.unit_cost ?? 0) * m.quantity, 0);
  const totalSaidasVal    = movements.filter(m => m.type === 'saida').reduce((s, m) => s + (m.unit_cost ?? 0) * m.quantity, 0);

  const itemsPerPage = 4;

    const sidebarItems = [
    { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
    { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
    { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.ref.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = product.quantity < 10;
    if (stockFilter === 'high') matchesStock = product.quantity >= 10;
    return matchesSearch && matchesStock;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatriz) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      matriz_id: selectedMatriz.id,
      name: formData.get('name') as string,
      ref: formData.get('ref') as string,
      category: formData.get('category') as string,
      quantity: parseInt(formData.get('quantity') as string),
      price: parseFloat((formData.get('price') as string).replace(',', '.')),
      low_stock_threshold: parseInt((formData.get('low_stock_threshold') as string) || '10'),
    };

    if (editingProduct) {
      const { data } = await supabase
        .from('inventory_products')
        .update(payload)
        .eq('id', editingProduct.id)
        .select()
        .single();
      if (data) setProducts(products.map(p => p.id === editingProduct.id ? data : p));
    } else {
      const { data } = await supabase
        .from('inventory_products')
        .insert(payload)
        .select()
        .single();
      if (data) setProducts([...products, data]);
    }
    setIsModalOpen(false);
  };

  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case 'Pomada': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Shampoo': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'Óleo': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Acessórios': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen flex bg-background-dark text-slate-100">
      <Sidebar items={sidebarItems} portalName="BARBER KING" />
      
      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
        <button className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        </button>

        <header className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Estoque</h2>
            <p className="text-slate-400 text-sm mt-1">Gerencie seu inventário e giro de produtos.</p>
          </div>
          
          <div className="flex items-center gap-6">
             <button 
                onClick={handleNew}
                className="bg-primary hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-1 transform-gpu transition-all duration-300"
             >
                <span className="material-symbols-outlined text-lg">add</span>
                Novo Produto
             </button>

             <ThemeToggle />
                        <div className="relative">
                <img alt="Admin" className="w-10 h-10 rounded-full border border-border-subtle object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-green border-2 border-background-dark rounded-full"></span>
             </div>
          </div>
        </header>

        <div className="hidden lg:block bg-card-dark border border-border-subtle rounded-2xl p-1.5 mb-8 w-fit shrink-0">
            <div className="flex flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('inventario')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'inventario'
                            ? 'bg-primary text-[#1e293b] dark:text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    INVENTÁRIO
                </button>
                <button
                    onClick={() => setActiveTab('giro')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'giro'
                            ? 'bg-primary text-[#1e293b] dark:text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                    GIRO DE ESTOQUE
                </button>
            </div>
        </div>

        {activeTab === 'inventario' && (
            <div className="flex flex-col flex-1 animate-fadeIn">
                <div className="flex w-full gap-4 mb-6">
                     <button 
                         onClick={() => setStockFilter('low')} 
                         className={`flex-1 py-3 px-5 relative flex flex-col items-start bg-card-dark border ${stockFilter === 'low' ? 'border-danger-red/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-border-subtle hover:border-slate-600'} rounded-2xl transition-all overflow-hidden group`}
                     >
                         <div className={`absolute inset-0 bg-gradient-to-br from-danger-red/10 to-transparent opacity-0 transition-opacity duration-300 ${stockFilter === 'low' ? 'opacity-100' : 'group-hover:opacity-40'}`}></div>
                         <div className="relative flex items-center justify-between w-full mb-1">
                             <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${stockFilter === 'low' ? 'bg-danger-red shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-danger-red/50'}`}></div>
                                 <span className={`text-xs font-bold uppercase tracking-wider ${stockFilter === 'low' ? 'text-white' : 'text-slate-400'}`}>Estoque Baixo</span>
                             </div>
                             <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help hover:text-white transition-colors" title="Produtos com menos de 10 unidades">help</span>
                         </div>
                         <div className={`relative text-2xl font-bold mt-1 ${stockFilter === 'low' ? 'text-danger-red' : 'text-slate-800 dark:text-white'}`}>
                             {products.filter(p => p.quantity < 10).length}
                         </div>
                     </button>

                     <button 
                         onClick={() => setStockFilter('high')} 
                         className={`flex-1 py-3 px-5 relative flex flex-col items-start bg-card-dark border ${stockFilter === 'high' ? 'border-warning-amber/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-border-subtle hover:border-slate-600'} rounded-2xl transition-all overflow-hidden group`}
                     >
                         <div className={`absolute inset-0 bg-gradient-to-br from-warning-amber/10 to-transparent opacity-0 transition-opacity duration-300 ${stockFilter === 'high' ? 'opacity-100' : 'group-hover:opacity-40'}`}></div>
                         <div className="relative flex items-center justify-between w-full mb-1">
                             <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${stockFilter === 'high' ? 'bg-warning-amber shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-warning-amber/50'}`}></div>
                                 <span className={`text-xs font-bold uppercase tracking-wider ${stockFilter === 'high' ? 'text-white' : 'text-slate-400'}`}>Estoque Alto</span>
                             </div>
                             <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help hover:text-white transition-colors" title="Produtos com 10 ou mais unidades">help</span>
                         </div>
                         <div className={`relative text-2xl font-bold mt-1 ${stockFilter === 'high' ? 'text-warning-amber' : 'text-slate-800 dark:text-white'}`}>
                             {products.filter(p => p.quantity >= 10).length}
                         </div>
                     </button>

                     <button 
                         onClick={() => setStockFilter('all')} 
                         className={`flex-1 py-3 px-5 relative flex flex-col items-start bg-card-dark border ${stockFilter === 'all' ? 'border-primary/40 shadow-[0_0_20px_rgba(14,165,233,0.1)]' : 'border-border-subtle hover:border-slate-600'} rounded-2xl transition-all overflow-hidden group`}
                     >
                         <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 ${stockFilter === 'all' ? 'opacity-100' : 'group-hover:opacity-40'}`}></div>
                         <div className="relative flex items-center justify-between w-full mb-1">
                             <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${stockFilter === 'all' ? 'bg-primary shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-primary/50'}`}></div>
                                 <span className={`text-xs font-bold uppercase tracking-wider ${stockFilter === 'all' ? 'text-white' : 'text-slate-400'}`}>Todos</span>
                             </div>
                             <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help hover:text-white transition-colors" title="Todos os produtos">help</span>
                         </div>
                         <div className={`relative text-2xl font-bold mt-1 ${stockFilter === 'all' ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>
                             {products.length}
                         </div>
                     </button>
                </div>

                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="relative flex-1 max-w-lg">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                      <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card-dark border border-border-subtle rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-500 placeholder:text-opacity-60" 
                        placeholder="Buscar produto ou código..." 
                        type="text" 
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 bg-card-dark border border-border-subtle px-4 py-3 rounded-xl text-slate-300 text-sm font-medium hover:text-white hover:border-slate-500 transition-all">
                        <span className="material-symbols-outlined text-lg">category</span>
                        <span>Ordenar por Categoria</span>
                        <span className="material-symbols-outlined text-sm">expand_more</span>
                      </button>
                    </div>
                </div>

                <div className="bg-card-dark border border-border-subtle rounded-2xl overflow-hidden flex flex-col flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-subtle bg-white/[0.02]">
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Produto</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantidade</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço de Venda</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Editar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {currentItems.map((product) => (
                                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#1A1A1A] border border-border-subtle">
                                                    <span className="material-symbols-outlined text-primary text-xl">{product.icon}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{product.name}</p>
                                                    <p className="text-xs text-slate-500">Ref: {product.ref}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyle(product.category)}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 mb-px bg-current`}></span>
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${product.quantity < 10 ? 'bg-danger-red animate-pulse' : 'bg-success-green'}`}></div>
                                                <span className={`text-sm font-bold ${product.quantity < 10 ? 'text-danger-red' : 'text-slate-800 dark:text-white'}`}>
                                                    {product.quantity.toString().padStart(2, '0')} unidades
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end">
                                                <button 
                                                  onClick={() => handleEdit(product)}
                                                  className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="px-6 py-5 bg-white/[0.01] border-t border-border-subtle flex items-center justify-between mt-auto">
                      <p className="text-xs text-slate-500 font-medium">Mostrando <span className="text-slate-800 dark:text-white font-bold">{currentItems.length}</span> de <span className="text-slate-800 dark:text-white font-bold">{filteredProducts.length}</span> produtos</p>
                      <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 bg-card-dark border border-border-subtle rounded-lg text-slate-400 hover:text-white disabled:opacity-30 flex items-center"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                             <button 
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-card-dark border border-border-subtle text-slate-400 hover:text-white'}`}
                            >
                                {page}
                            </button>
                        ))}
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-card-dark border border-border-subtle rounded-lg text-slate-400 hover:text-white disabled:opacity-30 flex items-center"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'giro' && (
            <div className="flex flex-col flex-1 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 font-medium">{movements.length} movimentos no período</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-sm text-slate-500 font-medium">{products.length} produtos</span>
                    </div>
                    <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-bold border border-border-subtle px-4 py-2 rounded-xl bg-card-dark">
                        Exportar
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </button>
                </div>

                <div className="flex items-center justify-between mb-6 bg-card-dark border border-border-subtle p-3 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 relative">
                        {dateRange[0] ? (
                            <button 
                                onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || '2026-03-22')!.getFullYear(), getSafeDate(dateRange[0] || '2026-03-22')!.getMonth(), 1)); }} 
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                            >
                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                Período
                            </button>
                        ) : (
                            <button onClick={() => { setIsDatePickerOpen(true); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || '2026-03-22')!.getFullYear(), getSafeDate(dateRange[0] || '2026-03-22')!.getMonth(), 1)); }} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all border border-border-subtle">
                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                Selecione um Período
                            </button>
                        )}
                        <button onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setTempSelection(dateRange); setViewDate(new Date(getSafeDate(dateRange[0] || '2026-03-22')!.getFullYear(), getSafeDate(dateRange[0] || '2026-03-22')!.getMonth(), 1)); }} className="flex items-center gap-2 text-primary hover:bg-white/5 border border-transparent hover:border-white/10 px-4 py-2.5 rounded-lg text-sm font-bold transition-all">
                            {dateRange[0] && dateRange[1] ? `${formatDisplayDate(dateRange[0])} - ${formatDisplayDate(dateRange[1])}` : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Adicionar filtro
                                </>
                            )}
                        </button>
                        
                        {/* Date Picker Popover */}
                        {isDatePickerOpen && (
                            <div ref={datePickerRef} className="absolute top-12 left-0 mt-2 bg-card-dark text-white rounded-2xl shadow-2xl flex border border-border-subtle overflow-hidden z-[100] animate-fadeIn w-[500px]">
                                {/* Opções Rápidas */}
                                <div className="w-1/3 border-r border-border-subtle bg-background-dark p-3 flex flex-col gap-1">
                                    <div className="text-sm font-bold text-white mb-2 px-3 pt-2">Período</div>
                                    {['Hoje', 'Esta semana', 'Este mês', 'Últimos 7 dias', 'Últimos 30 dias'].map((opt) => (
                                        <button 
                                            key={opt}
                                            onClick={() => handleQuickPeriod(opt)}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedPeriodOption === opt ? 'border-primary' : 'border-slate-600'}`}>
                                                {selectedPeriodOption === opt && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                                            </div>
                                            <span className={selectedPeriodOption === opt ? 'text-white font-bold' : ''}>{opt}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Calendário */}
                                <div className="w-2/3 p-4">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
                                        </button>
                                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                        </button>
                                        <div className="font-bold text-white text-sm">
                                            {ptBRMonths[viewDate.getMonth()]} {viewDate.getFullYear()}
                                        </div>
                                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                        </button>
                                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {ptBRDays.map((d, i) => (
                                            <div key={`${d}-${i}`} className="text-center text-xs font-bold text-slate-400">{d}</div>
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

                                                let bgClass = "text-slate-300 hover:bg-white/10";
                                                if (isSelected) bgClass = "bg-primary text-white font-bold rounded-md shadow-[0_0_10px_rgba(139,92,246,0.5)]";
                                                else if (inRange) bgClass = "bg-primary/20 text-primary font-bold";

                                                const isToday = dStr === '2026-03-22'; // Hardcoded for this context

                                                cells.push(
                                                    <div key={day} className={`relative flex items-center justify-center h-8 ${inRange || isRangeStart || isRangeEnd ? 'before:absolute before:inset-0 before:-z-10' : ''}`}>
                                                        {inRange && <div className="absolute inset-0 bg-primary/10 -z-10"></div>}
                                                        {isRangeStart && <div className="absolute inset-y-0 right-0 w-1/2 bg-primary/10 -z-10"></div>}
                                                        {isRangeEnd && <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/10 -z-10"></div>}
                                                        
                                                        <button
                                                            onClick={() => handleDayClick(day)}
                                                            className={`w-8 h-8 flex items-center justify-center text-xs transition-colors rounded-md ${bgClass} ${isToday && !isSelected && !inRange ? 'text-primary font-bold ring-1 ring-primary/50' : ''}`}
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
                    <div className="relative w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                        <input 
                            className="w-full bg-background-dark border border-border-subtle rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-slate-500" 
                            placeholder="Buscar" 
                            type="text" 
                        />
                    </div>
                </div>

                <div className="flex w-full gap-4 mb-6">
                     <div className="flex-1 py-4 px-6 relative flex flex-col items-center bg-card-dark border border-border-subtle rounded-2xl overflow-hidden group hover:border-success-green/30 transition-colors">
                         <div className="flex items-center gap-2 mb-2 w-full justify-center relative">
                             <div className="w-2 h-2 rounded-full bg-success-green shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                             <span className="text-sm font-bold text-slate-300">Entradas</span>
                             <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help" title="Total de Entradas no período">help</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-2xl font-bold text-white">{totalEntradasQty}</span>
                             <span className="text-slate-400 font-bold">- R$ {totalEntradasVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                     </div>
                     <div className="flex-1 py-4 px-6 relative flex flex-col items-center bg-card-dark border border-border-subtle rounded-2xl overflow-hidden group hover:border-danger-red/30 transition-colors">
                         <div className="flex items-center gap-2 mb-2 w-full justify-center relative">
                             <div className="w-2 h-2 rounded-full bg-danger-red shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                             <span className="text-sm font-bold text-slate-300">Saídas</span>
                             <span className="material-symbols-outlined text-[16px] text-slate-500 cursor-help" title="Total de Saídas no período">help</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-2xl font-bold text-white">{totalSaidasQty}</span>
                             <span className="text-slate-400 font-bold">- R$ {totalSaidasVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                     </div>
                     <div className="flex-1 py-4 px-6 relative flex flex-col items-center bg-primary/10 border border-primary/30 rounded-2xl overflow-hidden group">
                         <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50`}></div>
                         <div className="flex items-center gap-2 mb-2 w-full justify-center relative">
                             <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>
                             <span className="text-sm font-bold text-primary">Total</span>
                             <span className="material-symbols-outlined text-[16px] text-primary/70 cursor-help" title="Todos os registros no período">help</span>
                         </div>
                         <div className="flex items-center gap-2 relative">
                             <span className="text-2xl font-bold text-white">{totalEntradasQty + totalSaidasQty}</span>
                             <span className="text-primary/80 font-bold">- R$ {(totalEntradasVal + totalSaidasVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                     </div>
                </div>

                <div className="bg-card-dark border border-border-subtle rounded-2xl overflow-hidden flex flex-col flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border-subtle bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-300">
                                            Item <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Categoria</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Inicial <span className="material-symbols-outlined text-[14px] cursor-help" title="Estoque inicial">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Entradas <span className="material-symbols-outlined text-[14px] cursor-help" title="Quantidade entrada">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Saídas <span className="material-symbols-outlined text-[14px] cursor-help" title="Quantidade saída">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Final <span className="material-symbols-outlined text-[14px] cursor-help" title="Estoque final calculado">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Custo médio (R$) <span className="material-symbols-outlined text-[14px] cursor-help" title="Custo de aquisição">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <div className="flex items-center gap-1">Preço (R$) <span className="material-symbols-outlined text-[14px] cursor-help" title="Preço de venda atual">help</span></div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">
                                        <span className="material-symbols-outlined text-[18px]">settings</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {loadingMovements ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-slate-500">
                                            <span className="material-symbols-outlined text-4xl animate-spin block mx-auto mb-2">progress_activity</span>
                                            Carregando movimentações...
                                        </td>
                                    </tr>
                                ) : products.map((product) => {
                                    const g = giroByProduct[product.id];
                                    const entradas  = g?.entradas  ?? 0;
                                    const saidas    = g?.saidas    ?? 0;
                                    const custoTotal = g?.custoTotal ?? 0;
                                    // Estoque final = quantidade atual no produto (fonte verdadeira)
                                    const finalQty  = product.quantity;
                                    // Estoque inicial = final - entradas + saídas (lógica retroativa)
                                    const inicial   = Math.max(0, finalQty - entradas + saidas);
                                    // Custo médio das entradas no período
                                    const custoMedio = entradas > 0
                                        ? (custoTotal / entradas).toFixed(2).replace('.', ',')
                                        : '—';

                                    return (
                                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm bg-danger-red/10 text-danger-red border border-danger-red/20 uppercase`}>
                                                    {product.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{product.name}</p>
                                                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">{product.ref}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyle(product.category)} flex items-center gap-1.5 w-max`}>
                                                <span className="w-1.5 h-1.5 rounded-full inline-block bg-current"></span>
                                                {product.category || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">{inicial}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">
                                            <span className={entradas > 0 ? 'text-success-green font-bold' : ''}>{entradas}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">
                                            <span className={saidas > 0 ? 'text-danger-red font-bold' : ''}>{saidas}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">{finalQty}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">
                                            {custoMedio !== '—' ? `R$ ${custoMedio}` : <span className="text-slate-600">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">R$ {Number(product.price).toFixed(2).replace('.', ',')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-slate-500 hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="px-6 py-4 bg-white/[0.01] border-t border-border-subtle flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 bg-background-dark border border-border-subtle rounded-lg px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors">
                          <span className="text-sm text-slate-300 font-medium">10 por página</span>
                          <span className="material-symbols-outlined text-[18px] text-slate-500">expand_more</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="px-3 py-2 bg-background-dark border border-border-subtle rounded-lg text-slate-500 flex items-center disabled:opacity-30 transition-colors" disabled>
                          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
                        </button>
                        <button className="px-3 py-2 bg-background-dark border border-border-subtle rounded-lg text-slate-500 flex items-center disabled:opacity-30 transition-colors" disabled>
                          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-colors bg-primary text-white shadow-lg shadow-primary/20">
                            1
                        </button>
                        <button className="px-3 py-2 bg-background-dark border border-border-subtle rounded-lg text-slate-500 hover:text-white transition-colors flex items-center">
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                        <button className="px-3 py-2 bg-background-dark border border-border-subtle rounded-lg text-slate-500 hover:text-white transition-colors flex items-center">
                          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
                        </button>
                      </div>
                    </div>
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card-dark border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
                    <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                        <h3 className="font-bold text-white text-xl">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Produto</label>
                                <input name="name" required defaultValue={editingProduct?.name} className="w-full bg-slate-100 dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: Pomada" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Referência (Ref)</label>
                                <input name="ref" required defaultValue={editingProduct?.ref} className="w-full bg-slate-100 dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: PM-001" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                                <select name="category" defaultValue={editingProduct?.category} className="w-full bg-slate-100 dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                    <option>Pomada</option>
                                    <option>Shampoo</option>
                                    <option>Óleo</option>
                                    <option>Acessórios</option>
                                    <option>Balm</option>
                                    <option>Gel</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preço (R$)</label>
                                <input name="price" required defaultValue={editingProduct?.price} className="w-full bg-slate-100 dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="00,00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Quantidade</label>
                            <input name="quantity" type="number" required defaultValue={editingProduct?.quantity} className="w-full bg-slate-100 dark:bg-[#151515] border border-border-subtle rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0" />
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm border border-border-subtle rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-1 transform-gpu transition-all duration-300">
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default AdminInventory;



