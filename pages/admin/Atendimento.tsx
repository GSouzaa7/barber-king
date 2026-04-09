import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

type InventoryItem = { id: string; name: string; price: number; };
type SelectedInsumo = InventoryItem & { quantity: number; };

const AdminAtendimento: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMatriz } = useMatriz();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Outros');
  const [serviceDuration, setServiceDuration] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'dados' | 'calculadora'>('dados');

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isAddingInsumo, setIsAddingInsumo] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | ''>('');
  const [selectedInsumos, setSelectedInsumos] = useState<SelectedInsumo[]>([]);

  const [precoServico, setPrecoServico] = useState('');
  const [calcReceita, setCalcReceita] = useState('');
  const [calcImposto, setCalcImposto] = useState('');
  const [calcComissao, setCalcComissao] = useState('');
  const [calcTaxa, setCalcTaxa] = useState('');
  const [calcMargemDesejada, setCalcMargemDesejada] = useState('60');

  useEffect(() => {
    if (!selectedMatriz) return;
    Promise.all([
      supabase.from('services').select('*').eq('matriz_id', selectedMatriz.id).eq('active', true).order('name'),
      supabase.from('inventory_products').select('id, name, price').eq('matriz_id', selectedMatriz.id).order('name'),
    ]).then(([{ data: svcData }, { data: invData }]) => {
      if (svcData) setServices(svcData);
      if (invData) setInventoryItems(invData);
    });
  }, [selectedMatriz]);

  const currentTotalInsumos = selectedInsumos.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const numImposto = parseFloat(calcImposto) || 0;
  const numComissao = parseFloat(calcComissao) || 0;
  const numTaxa = parseFloat(calcTaxa) || 0;
  const numMargem = parseFloat(calcMargemDesejada) || 0;

  const totalPercTaxes = (numImposto + numComissao + numTaxa + numMargem) / 100;
  const precoIdeal = totalPercTaxes < 1 ? currentTotalInsumos / (1 - totalPercTaxes) : 0;

  // Utilize o preço sugerido (ideal) se nenhuma receita bruta for digitada
  const isAutoCalculating = calcReceita === '' && currentTotalInsumos > 0;
  const numReceita = calcReceita === '' ? precoIdeal : (parseFloat(calcReceita.replace(',', '.')) || 0);

  const valImposto = numReceita * (numImposto / 100);
  const valComissao = numReceita * (numComissao / 100);
  const valTaxa = numReceita * (numTaxa / 100);
  const lucroBruto = numReceita - currentTotalInsumos;
  const lucroLiquido = lucroBruto - valImposto - valComissao - valTaxa;
  const margemAtual = numReceita > 0 ? (lucroLiquido / numReceita) * 100 : 0;

  const gBrl = (val: number) => `R$ ${Math.max(0, val).toFixed(2).replace('.', ',')}`;

  const handleAddInsumo = () => {
      if (selectedItemId === '') return;
      const item = inventoryItems.find(i => i.id === selectedItemId);
      if (!item) return;
      
      const existing = selectedInsumos.find(i => i.id === item.id);
      if (existing) {
          setSelectedInsumos(selectedInsumos.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
          setSelectedInsumos([...selectedInsumos, { ...item, quantity: 1 }]);
      }
      setIsAddingInsumo(false);
      setSelectedItemId('');
  };

  const handleNewService = () => {
      setEditingServiceId(null);
      setServiceName('');
      setServiceCategory('Outros');
      setServiceDuration('');
      setPrecoServico('');
      setCalcReceita('');
      setCalcMargemDesejada('60');
      setSelectedInsumos([]);
      setIsCreateModalOpen(true);
      setActiveModalTab('dados');
  };

  const handleEditService = (service: any) => {
      setEditingServiceId(service.id);
      setServiceName(service.name);
      setServiceDuration(service.duration);
      setPrecoServico(String(service.price));
      setCalcReceita('');
      setSelectedInsumos([]); // Em um sistema real, carregaríamos os insumos salvos deste serviço
      setIsCreateModalOpen(true);
      setActiveModalTab('dados');
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

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen mix-blend-normal opacity-50 dark:opacity-100 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100"></div>
      <Sidebar items={sidebarItems} portalName="BARBER KING" />
      
      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
        <header className="flex justify-between items-start mb-8 border-b border-border-subtle pb-6">
          <div>
            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Atendimento</h2>
            <p className="text-slate-400 text-sm mt-1">Gerencie serviços e abra novas comandas.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={handleNewService}
                className="bg-red-600 hover:bg-red-600/90 text-white px-5 py-2.5 rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
             >
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                Novo Serviço
             </button>

             <ThemeToggle />
                        <div className="relative ml-2">
                <img alt="Admin" className="w-10 h-10 rounded-full border border-border-subtle object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
                <div key={service.id} className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col relative group transition-all hover:border-white/10">
                    
                    {/* Top line: Icon, Duration, Edit Pencil */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <span className="material-symbols-outlined text-xl">content_cut</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                            <span className="text-[10px] font-bold bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-white/5 shadow-inner px-2 py-1 rounded-lg">{service.duration_minutes}min</span>
                            <button onClick={() => handleEditService(service)} className="hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                        </div>
                    </div>

                    {/* Middle: Title and description */}
                    <div className="mb-8 flex-1">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{service.name}</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">&nbsp;</p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 w-full my-4"></div>

                    {/* Bottom: Price */}
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Preço</span>
                        <span className="text-xl font-medium text-slate-900 dark:text-white">R$ {Number(service.price).toFixed(2).replace('.', ',')}</span>
                    </div>

                </div>
            ))}
        </div>

        {isCreateModalOpen && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-border-subtle relative flex-shrink-0">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="material-symbols-outlined text-red-500 text-2xl">{editingServiceId ? 'edit' : 'cases'}</span>
                            <h3 className="font-medium text-slate-900 dark:text-white text-xl">{editingServiceId ? 'Editar Serviço' : 'Cadastrar Serviço'}</h3>
                        </div>
                        <p className="text-slate-400 text-sm">{editingServiceId ? 'Altere as configurações deste serviço' : 'Configure os detalhes e precificação do serviço'}</p>
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 pt-6 flex gap-4 flex-shrink-0">
                        <button 
                            onClick={() => setActiveModalTab('dados')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeModalTab === 'dados' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-white/5 shadow-inner text-slate-500 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-lg">description</span>
                            Dados do Serviço
                        </button>
                        <button 
                            onClick={() => setActiveModalTab('calculadora')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeModalTab === 'calculadora' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-white/5 shadow-inner text-slate-500 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-lg">attach_money</span>
                            Calculadora de Preço
                        </button>
                    </div>

                    {/* Form Area - Dados do Serviço */}
                    {activeModalTab === 'dados' && (
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        
                        <div>
                            <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Nome do Serviço</label>
                            <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="Ex: Corte Degradê" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Categoria</label>
                                <div className="relative">
                                    <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-medium">
                                        <option>Outros</option>
                                        <option>Cabelo</option>
                                        <option>Barba</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Duração (Min)</label>
                                <input value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} type="number" className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="Ex: 60" />
                            </div>
                        </div>

                        {/* Insumos Section */}
                        <div className="bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-white/5 shadow-inner rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white text-sm">
                                    <span className="material-symbols-outlined text-red-500">inventory_2</span>
                                    Insumos do Serviço
                                </div>
                                {!isAddingInsumo && (
                                    <button 
                                        onClick={() => setIsAddingInsumo(true)}
                                        className="text-red-500 text-xs font-bold hover:brightness-110 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Adicionar
                                    </button>
                                )}
                            </div>

                            {isAddingInsumo && (
                                <div className="mb-4 flex gap-2 items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                    <div className="relative flex-1">
                                        <select 
                                            value={selectedItemId}
                                            onChange={(e) => setSelectedItemId(e.target.value)}
                                            className="w-full bg-[#151515] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                                        >
                                            <option value="">Selecione um item do estoque...</option>
                                            {inventoryItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} - R$ {Number(item.price).toFixed(2).replace('.', ',')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleAddInsumo}
                                        disabled={selectedItemId === ''}
                                        className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Inserir
                                    </button>
                                    <button 
                                        onClick={() => { setIsAddingInsumo(false); setSelectedItemId(''); }}
                                        className="text-slate-400 hover:text-white px-2 py-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            )}

                            {selectedInsumos.length === 0 ? (
                                <div className="py-6 flex flex-col items-center justify-center text-slate-500">
                                    <p className="text-sm italic">Nenhum insumo adicionado.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {selectedInsumos.map(insumo => (
                                        <div key={insumo.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-sm">category</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-tight">{insumo.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">R$ {insumo.price.toFixed(2).replace('.', ',')} un.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center bg-[#151515] rounded-lg border border-white/10 overflow-hidden">
                                                    <button 
                                                        onClick={() => {
                                                            if (insumo.quantity > 1) {
                                                                setSelectedInsumos(selectedInsumos.map(i => i.id === insumo.id ? { ...i, quantity: i.quantity - 1 } : i));
                                                            } else {
                                                                setSelectedInsumos(selectedInsumos.filter(i => i.id !== insumo.id));
                                                            }
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                                    >-</button>
                                                    <span className="text-sm font-bold text-white w-6 text-center">{insumo.quantity}</span>
                                                    <button 
                                                        onClick={() => setSelectedInsumos(selectedInsumos.map(i => i.id === insumo.id ? { ...i, quantity: i.quantity + 1 } : i))}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                                    >+</button>
                                                </div>
                                                <span className="text-sm font-bold text-red-500 w-16 text-right">
                                                    R$ {(insumo.price * insumo.quantity).toFixed(2).replace('.', ',')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end pt-4 mt-2 border-t border-white/5">
                                <span className="text-xs text-slate-400 mr-2">Custo Total:</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">R$ {currentTotalInsumos.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Valor de Cobrança (R$)</label>
                                <input value={precoServico} onChange={e => setPrecoServico(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="0,00" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Imposto (%)</label>
                                <input type="number" className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="0" />
                            </div>
                        </div>

                        <div className="pt-2">
                             <div className="flex items-center justify-between cursor-pointer group pb-2">
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 cursor-pointer group-hover:text-slate-400 transition-colors">Descrição</label>
                                <span className="material-symbols-outlined text-slate-600 text-sm group-hover:text-slate-400 transition-colors">expand_more</span>
                             </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-white/5">
                            <button onClick={() => setIsCreateModalOpen(false)} className="w-full py-4 bg-red-500 hover:bg-blue-500 text-white rounded-xl font-extrabold text-base shadow-lg shadow-[#259af4]/20 transition-all">
                                {editingServiceId ? 'Salvar Edição' : 'Salvar Serviço'}
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Form Area - Calculadora de Preço */}
                    {activeModalTab === 'calculadora' && (
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        
                        {/* Title Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                                <span className="text-red-500">*</span>
                                Estratégia de Precificação
                            </div>
                            <button className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[14px]">refresh</span>
                                Resetar
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 font-medium -mt-4">Simule cenários e encontre o preço ideal</p>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Receita Bruta (Preço de Venda)</label>
                                {isAutoCalculating && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">AUTO</span>}
                            </div>
                            <input value={calcReceita} onChange={e => setCalcReceita(e.target.value)} className={`w-full bg-black border ${isAutoCalculating ? 'border-red-500/30' : 'border-white/10'} rounded-xl px-4 py-3 ${isAutoCalculating ? 'text-red-500 font-bold' : 'text-white font-medium'} focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all`} placeholder={isAutoCalculating ? precoIdeal.toFixed(2).replace('.', ',') : "0,00"} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Custo Insumos (Auto)</label>
                                <input className="w-full bg-slate-50 dark:bg-[#101010] border border-slate-200 dark:border-white/5 shadow-inner rounded-xl px-4 py-3 text-red-500 outline-none font-bold cursor-not-allowed" value={`R$ ${currentTotalInsumos.toFixed(2).replace('.', ',')}`} readOnly />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Imposto (%)</label>
                                <input type="number" value={calcImposto} onChange={e => setCalcImposto(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Comissão (%)</label>
                                <input type="number" value={calcComissao} onChange={e => setCalcComissao(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Taxa de Transação (%)</label>
                                <input type="number" value={calcTaxa} onChange={e => setCalcTaxa(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-slate-600 transition-all font-medium" placeholder="0" />
                            </div>
                        </div>

                        {/* Breakdown Section */}
                        <div className={`bg-[#0A0A0A] border ${isAutoCalculating ? 'border-red-500/20' : 'border-white/5'} rounded-xl p-5 relative transition-colors`}>
                            {/* Scrollbar decorator */}
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/5 rounded-r-xl">
                                <div className="w-full h-1/3 bg-white/20 rounded-full mt-2"></div>
                            </div>
                            
                            <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-4">Breakdown do Resultado</h4>
                            
                            <div className="space-y-3 font-medium text-sm">
                                <div className="flex justify-between items-center text-white">
                                    <span>Receita Bruta {isAutoCalculating && <span className="text-[10px] text-red-500 ml-1">(Sugerida)</span>}</span>
                                    <span className="font-bold">{gBrl(numReceita)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500/80">
                                    <span>Custo de Insumos</span>
                                    <span>- {gBrl(currentTotalInsumos)}</span>
                                </div>
                                <div className="flex justify-between items-center font-medium text-slate-900 dark:text-white pt-2 border-t border-white/5">
                                    <span>Lucro Bruto</span>
                                    <span>{gBrl(lucroBruto)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500/80">
                                    <span>Impostos</span>
                                    <span>- {gBrl(valImposto)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500/80">
                                    <span>Comissões</span>
                                    <span>- {gBrl(valComissao)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500/80">
                                    <span>Taxas de Transação</span>
                                    <span>- {gBrl(valTaxa)}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col items-end">
                                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-1 w-full text-left">Lucro Líquido</span>
                                <span className="text-3xl font-extrabold text-[#00d084]">{gBrl(lucroLiquido)}</span>
                                <span className="text-slate-500 text-xs font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span> {margemAtual.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Simulador Inteligente */}
                        <div className="bg-[#1A1A1A] border border-red-500/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 text-red-500 font-bold text-sm mb-4">
                                <span>*</span>
                                Simulador Inteligente
                            </div>
                            <div className="flex items-center justify-start gap-3 mb-4">
                                <span className="text-slate-400 text-sm font-medium">Margem desejada:</span>
                                <div className="relative w-20">
                                    <input type="number" value={calcMargemDesejada} onChange={e => setCalcMargemDesejada(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none font-bold text-center appearance-none" placeholder="60" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <span className="text-[#facc15] text-sm leading-none">💡</span>
                                <span className="text-slate-400">Para atingir <strong className="text-white">{calcMargemDesejada || 0}%</strong> de margem, seu preço ideal seria <strong className="text-red-500">{gBrl(precoIdeal)}</strong></span>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-4 mt-2 flex gap-4">
                            <button 
                                onClick={() => setActiveModalTab('dados')}
                                className="w-1/3 py-4 font-medium text-slate-900 dark:text-white text-base hover:text-slate-300 transition-colors"
                            >
                                Voltar
                            </button>
                            <button 
                                onClick={() => {
                                    setPrecoServico(precoIdeal.toFixed(2).replace('.', ','));
                                    setActiveModalTab('dados');
                                }}
                                className="w-2/3 py-4 bg-red-500 hover:bg-blue-500 text-white rounded-xl font-extrabold text-base shadow-lg shadow-[#259af4]/20 transition-all"
                            >
                                Usar este Valor
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default AdminAtendimento;


