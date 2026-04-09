import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { PaymentModal } from '../../components/PaymentModal';
import { ThemeToggle } from '../../components/ThemeToggle';
import { BookingModal } from '../../components/BookingModal';
import { AppointmentDetailsModal } from '../../components/AppointmentDetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState(''); // Preenchido via Supabase, não localStorage

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // State para Preferências (Agora campo único)
  const [generalPreference, setGeneralPreference] = useState('');

  // State para Nova Avaliação
  const [newReview, setNewReview] = useState('');

  // State para Modal de Pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalConfig, setPaymentModalConfig] = useState({
    title: 'Adicionar Créditos',
    subtitle: 'Via Mercado Pago',
    initialAmount: 150,
    isFixedAmount: false
  });
  const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

  const openPaymentModal = (config?: Partial<typeof paymentModalConfig>) => {
    setPaymentModalConfig(prev => ({ ...prev, ...config }));
    setIsPaymentModalOpen(true);
  };

  // Busca nome do cliente autenticado via Supabase (nunca via localStorage — PII)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('clients')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) {
          setUserName(data.name.split(' ')[0]);
        } else {
          // Fallback: usa a parte do e-mail antes do @
          setUserName(user.email?.split('@')[0] ?? 'Cliente');
        }
      });
  }, [user]);

  const handleAddPreference = (value: string) => {
    setGeneralPreference(prev => {
      if (prev.includes(value)) return prev; // Evita duplicatas
      return prev ? `${prev}, ${value}` : value;
    });
  };

  return (
    <div className="bg-background-dark font-display antialiased text-slate-900 dark:text-white selection:bg-red-500/30 min-h-screen relative overflow-hidden transition-colors duration-500">
      
      {/* Cinematic Noise Overlay (Only Dark Mode) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay hidden dark:block" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      
      {/* Ambient Red Glow (Only Dark Mode) */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none hidden dark:block -translate-y-1/2"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-red-900/5 rounded-full blur-[120px] pointer-events-none hidden dark:block translate-y-1/4"></div>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl px-6 md:px-20 py-6 transition-colors">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
              <RazorIcon className="w-10 h-10 text-slate-900 dark:text-white opacity-90" />
              <h2 className="hidden md:block text-2xl font-light tracking-widest text-slate-900 dark:text-white uppercase italic">
                BARBER <span className="font-medium text-red-600">KING</span>
              </h2>
            </div>
            <nav className="hidden lg:flex items-center gap-10">
              <a href="#" className="text-[9px] font-medium text-red-500 uppercase tracking-[0.3em] hover:text-red-400 transition-colors">Agendar</a>
              <a href="#" className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors">Histórico</a>
              <a href="#" className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors">Fidelidade</a>
              <a href="#" className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors">Planos</a>
              <a href="#" className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors">Perfil</a>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-6 py-2 bg-red-600/10 text-red-500 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full border border-red-600/30 hover:bg-red-600/20 hover:text-white glow-red transition-all animate-shine"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              AGENDAR
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium tracking-widest text-slate-800 dark:text-white uppercase"><span className="text-red-500 mr-2">VIP</span> {userName}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em]">Premium Member</p>
            </div>
            
            <ThemeToggle />

            <div className="hidden sm:flex h-10 w-10 rounded-full bg-slate-100 dark:bg-card-dark items-center justify-center overflow-hidden border border-slate-200 dark:border-white/5">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">person</span>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden h-10 w-10 flex items-center justify-center rounded-lg text-slate-800 dark:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-6 md:p-12">
          
          {/* Seção de Agendamento e Saldo */}
          <section className="animate-fade-in-up delay-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">Próximo Agendamento</h3>
              
              <div className="flex items-center bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all py-2 pl-8 pr-2 rounded-2xl">
                <div className="flex flex-col mr-8">
                  <span className="text-[9px] text-slate-500 font-medium uppercase tracking-[0.3em] mb-1">Saldo em Créditos</span>
                  <span className="text-red-500 font-medium text-xl leading-none tracking-wider">R$ 150,00</span>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-white/10 mr-4"></div>
                <button 
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white px-6 py-3 rounded-xl font-medium transition-all animate-shine"
                  onClick={() => openPaymentModal({
                    title: 'Adicionar Créditos',
                    initialAmount: 150,
                    isFixedAmount: false
                  })}
                >
                  <span className="material-symbols-outlined text-sm opacity-50">account_balance_wallet</span>
                  <span className="text-[10px] tracking-[0.2em] uppercase">Recarregar</span>
                </button>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all p-10 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-red-600/10 transition-colors duration-1000"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-8 py-6 text-slate-800 dark:text-white shadow-inner">
                    <span className="text-4xl font-light tracking-tighter">24</span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-red-500 mt-2">Out</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-light tracking-wide text-slate-900 dark:text-white mb-3">Corte de Cabelo + Barba</h4>
                    <div className="flex flex-wrap gap-6 text-slate-500">
                      <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-medium">
                        <span className="material-symbols-outlined text-sm text-red-500/70">schedule</span>
                        14:30
                      </span>
                      <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-medium">
                        <span className="material-symbols-outlined text-sm text-red-500/70">person_pin</span>
                        Ricardo Santos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    className="flex-1 md:flex-none px-8 py-4 text-[10px] font-medium uppercase tracking-[0.2em] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white transition-all"
                  >
                    Remarcar
                  </button>
                  <button 
                    onClick={() => setIsDetailsModalOpen(true)}
                    className="flex-1 md:flex-none px-8 py-4 text-[10px] font-medium uppercase tracking-[0.2em] bg-red-600/10 text-red-500 border border-red-600/30 rounded-xl hover:bg-red-600/20 hover:text-white glow-red transition-all"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Grid Fidelidade e Serviços */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <section className="lg:col-span-1 animate-fade-in-up delay-200">
              <h3 className="mb-8 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">Seu Cartão Fidelidade</h3>
              <div className="relative flex flex-col h-[380px] justify-between overflow-hidden rounded-3xl bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-10 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-colors group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-110">
                  <span className="material-symbols-outlined !text-8xl text-slate-900 dark:text-white">stars</span>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-red-500 font-medium tracking-[0.3em] text-[10px] uppercase flex items-center gap-2">
                       <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                       Acesso Premium
                    </span>
                  </div>
                  <h4 className="text-2xl font-light text-slate-800 dark:text-white leading-relaxed tracking-wide">Faltam 2 interações para o seu <span className="font-medium italic">benefício de assinatura</span>.</h4>
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between text-[9px] font-medium uppercase tracking-[0.3em] text-slate-400">
                    <span>Evolução da Assinatura</span>
                    <span className="text-slate-600 dark:text-white">8/10</span>
                  </div>
                  <div className="h-[2px] w-full bg-slate-100 dark:bg-white/10 overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <button className="w-full mt-8 py-4 bg-transparent text-slate-300 dark:text-slate-600 font-medium tracking-[0.3em] text-[9px] rounded-xl cursor-not-allowed uppercase border border-slate-200 dark:border-white/5 relative z-10 transition-colors" disabled>
                  Benefício Indisponível
                </button>
              </div>
            </section>
            <section className="lg:col-span-2 animate-fade-in-up delay-200">
              <h3 className="mb-8 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">Curadoria de Serviços VIP</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: 'content_cut', name: 'Limpeza de Pele', price: '65,00', desc: 'Recomendado para purificar poros após corte.' },
                  { icon: 'face', name: 'Barboterapia', price: '45,00', desc: 'Ritual com toalha quente e óleos essenciais.' },
                  { icon: 'colors', name: 'Camuflagem de Fios', price: '120,00', desc: 'Recupera o tom natural discretamente.' },
                  { icon: 'spa', name: 'Massagem Capilar', price: '35,00', desc: 'Reduz stress e estimula circulação local.' },
                ].map((service) => (
                  <div key={service.name} className="group p-8 rounded-3xl bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all card-hover cursor-pointer hover:border-red-600/30">
                    <div className="flex justify-between items-start mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-2xl">{service.icon}</span>
                      </div>
                      <span className="text-[11px] font-medium tracking-[0.2em] text-red-500 bg-red-600/10 px-3 py-1.5 rounded-full border border-red-600/20">R$ {service.price}</span>
                    </div>
                    <h5 className="font-light text-xl tracking-wide text-slate-900 dark:text-white mb-2">{service.name}</h5>
                    <p className="text-slate-500 text-xs leading-relaxed">{service.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Produtos */}
          <section className="animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">A Coleção Pessoal</h3>
              <button className="text-[10px] text-red-500 font-medium uppercase tracking-[0.2em] hover:text-red-400 transition-colors hover:underline underline-offset-4 decoration-red-500/30">Visitar Boutique</button>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
              {[
                { icon: 'sanitizer', name: 'Pomada Matte', price: '54,90', desc: 'Fixação forte e efeito seco natural para o dia a dia.' },
                { icon: 'soap', name: 'Shampoo Mentol', price: '42,00', desc: 'Refrescância imediata e limpeza profunda dos fios.' },
                { icon: 'brush', name: 'Óleo para Barba', price: '38,00', desc: 'Hidratação impecável, brilho e perfume amadeirado.' },
                { icon: 'clean_hands', name: 'Balm Alinhador', price: '48,00', desc: 'Controle de volume e maciez instantânea na pele.' },
              ].map((product) => (
                <div key={product.name} className="min-w-[300px] p-8 rounded-3xl bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all card-hover flex flex-col justify-between group">
                  <div className="mb-6 aspect-square rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:border-red-600/20 transition-colors">
                    <span className="material-symbols-outlined !text-6xl text-slate-400 dark:text-gray-600 group-hover:text-red-500/80 transition-colors">{product.icon}</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-light text-xl tracking-wide text-slate-900 dark:text-white">{product.name}</h5>
                      <span className="text-[11px] font-medium text-red-500 tracking-[0.2em]">R$ {product.price}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed mb-6">{product.desc}</p>
                    <button className="w-full py-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-red-600/30 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-[10px] font-medium uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group-hover:hover:bg-red-600/5 group-hover:glow-red">
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seção de Preferências (Simplificada) */}
          <section className="animate-fade-in-up delay-400 bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm dark:shadow-[0_0_40px_rgba(0,0,0,0.4)] relative overflow-hidden transition-colors">
             <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-5 pointer-events-none">
                <span className="material-symbols-outlined !text-[12rem] text-slate-800 dark:text-white">tune</span>
             </div>
             
             <div className="relative z-10">
                <div className="mb-8 max-w-2xl">
                    <h3 className="text-3xl font-light text-slate-900 dark:text-white tracking-wide mb-3">Sua Assinatura Pessoal</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Detalhe como devemos preparar seu ambiente antes da sua chegada. O luxo está na antecipação dos seus desejos.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                        <textarea 
                            value={generalPreference}
                            onChange={(e) => setGeneralPreference(e.target.value)}
                            placeholder="Ex: Gosto da barba bem alinhada navalhada, Whisky on the rocks e música suave no fundo..."
                            className="w-full h-32 bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/5 rounded-2xl px-8 py-6 text-slate-900 dark:text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all resize-none leading-relaxed text-sm"
                        />
                        
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">diamond</span>
                                Sugestões de Lifestyle
                            </p>
                            
                            <div className="flex flex-wrap gap-3">
                                {/* Sugestões de Corte */}
                                {['Degradê Clássico', 'Tesoura Texturizada', 'Social Impecável', 'Mid Fade Clean'].map(sug => (
                                    <button 
                                        key={sug}
                                        onClick={() => handleAddPreference(sug)}
                                        className="px-4 py-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:border-red-600/30 flex items-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-600 group-hover:text-red-500">content_cut</span>
                                        {sug}
                                    </button>
                                ))}
                                {/* Sugestões de Barba */}
                                {['Alinhamento Navalhado', 'Barboterapia Completa', 'Lenhador Tratada', 'Zero Sombras'].map(sug => (
                                    <button 
                                        key={sug}
                                        onClick={() => handleAddPreference(sug)}
                                        className="px-4 py-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:border-red-600/30 flex items-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-600 group-hover:text-red-500">face</span>
                                        {sug}
                                    </button>
                                ))}
                                {/* Sugestões de Bebida */}
                                {['Whisky Puro', 'Água com Gás R.S.', 'Café Expresso Forte', 'Craft IPA'].map(sug => (
                                    <button 
                                        key={sug}
                                        onClick={() => handleAddPreference(sug)}
                                        className="px-4 py-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:border-red-600/30 flex items-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-600 group-hover:text-red-500">liquor</span>
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-10 flex justify-end">
                    <button className="bg-red-600/10 text-red-500 hover:bg-red-600/20 px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.3em] font-medium transition-all flex items-center gap-2 shadow-lg glow-red border border-red-600/30 hover:text-white">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        Gravar Assinatura
                    </button>
                </div>
             </div>
          </section>

          {/* Seção de Feedbacks */}
          <section className="animate-fade-in-up delay-500">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">O Arquivo de Excelência</h3>
                <div className="flex text-amber-500 gap-1 opacity-80">
                    <span className="material-symbols-outlined text-[10px] filled">star</span>
                    <span className="material-symbols-outlined text-[10px] filled">star</span>
                    <span className="material-symbols-outlined text-[10px] filled">star</span>
                    <span className="material-symbols-outlined text-[10px] filled">star</span>
                    <span className="material-symbols-outlined text-[10px] filled">star</span>
                    <span className="ml-2 text-slate-800 dark:text-white font-medium text-[10px] tracking-[0.2em]">4.9/5</span>
                </div>
            </div>

            <div className="relative overflow-hidden flex w-full hover-pause cursor-grab active:cursor-grabbing pb-8 mb-10">
              {/* Fade Gradient masks for the edges */}
              <div className="absolute left-0 top-0 bottom-0 w-8 md:w-24 bg-gradient-to-r from-bg-light dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 md:w-24 bg-gradient-to-l from-bg-light dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none"></div>
              
              {/* Duplicated for absolute seamless infinity loop */}
              {[1, 2].map((marqueeGrp) => (
                <div key={marqueeGrp} className="animate-marquee flex-shrink-0 flex gap-6 px-3" style={{ animationDuration: '45s' }} aria-hidden={marqueeGrp === 2}>
                  {[
                      { name: 'C. Eduardo', role: 'Membro Rei', comment: 'O ritual não tem erro. A precisão superou qualquer capital mundial.', barber: 'Ricardo S.' },
                      { name: 'A. Martins', role: 'Cliente Especial', comment: 'Impecável da recepção ao dry rub final.', barber: 'Marcos L.' },
                      { name: 'F. Costa', role: 'Imperador', comment: 'A barboterapia quente é o melhor refúgio pós-escritório.', barber: 'Lucas N.' },
                      { name: 'Leonardo B.', role: 'Cliente VIP', comment: 'A melhor barbearia que já frequentei, me sinto num clube de alto padrão.', barber: 'Ricardo S.' },
                      { name: 'Roberto A.', role: 'Membro Especial', comment: 'A textura da toalha e a precisão mostram que eles constroem imagem.', barber: 'Lucas N.' }
                  ].map((review, i) => (
                      <div key={i} className="w-[320px] sm:w-[380px] bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all p-8 rounded-3xl relative flex flex-col justify-between group hover:border-slate-300 dark:hover:border-white/20">
                          <span className="material-symbols-outlined absolute top-8 right-8 text-slate-100 dark:text-white/5 text-5xl group-hover:text-amber-500/10 transition-colors">format_quote</span>
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center font-light text-slate-400 dark:text-slate-500 text-xl group-hover:scale-110 transition-transform">
                                  {review.name.charAt(0)}
                              </div>
                              <div>
                                  <h4 className="font-medium text-slate-900 dark:text-white tracking-wider text-sm">{review.name}</h4>
                                  <p className="text-[9px] text-red-500 font-medium uppercase tracking-[0.2em]">{review.role}</p>
                              </div>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-relaxed italic mb-6">"{review.comment}"</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.2em] border-t border-slate-100 dark:border-white/5 pt-4">Curadoria: {review.barber}</p>
                      </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-[#151515]/30 dark:backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start md:items-center transition-colors">
                <div className="flex-1 w-full">
                    <h4 className="font-light text-slate-900 dark:text-white mb-2 text-xl tracking-wide">Avalie sua Experiência</h4>
                    <p className="text-slate-500 text-[11px] mb-4 uppercase tracking-widest">Sua opinião é fundamental para mantermos nosso padrão de excelência.</p>
                    <div className="flex gap-2 relative">
                        <input 
                            type="text" 
                            placeholder="Conte-nos como foi..." 
                            value={newReview}
                            onChange={(e) => setNewReview(e.target.value)}
                            className="w-full bg-white dark:bg-black/60 border border-slate-200 dark:border-white/5 rounded-xl px-6 py-4 text-xs text-slate-800 dark:text-white focus:border-red-600/30 focus:ring-1 focus:ring-red-600/30 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                    <div className="flex text-slate-300 dark:text-slate-700 hover:text-amber-500 cursor-pointer transition-colors gap-1">
                        {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-lg">star</span>)}
                    </div>
                    <button className="bg-red-600/10 text-red-500 border border-red-600/30 px-8 py-4 rounded-xl text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-red-600/20 hover:text-white transition-all w-full md:w-auto glow-red">
                        Enviar Avaliação
                    </button>
                </div>
            </div>
          </section>

          {/* Seção de Planos (Uniformizados) */}
          <section className="py-16 animate-fade-in-up delay-600">
            <div className="text-center mb-16">
                <span className="text-red-500 font-medium tracking-[0.4em] text-[10px] uppercase mb-4 block">Membership</span>
                <h3 className="text-4xl font-light text-slate-900 dark:text-white tracking-widest uppercase mb-4">Planos De Assinatura</h3>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest max-w-lg mx-auto leading-relaxed">A regularidade absoluta para a manutenção da autoimagem de alto nível.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {/* Plano Príncipe */}
                <div className="bg-white dark:bg-[#0a0a0a]/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all rounded-3xl p-10 hover:border-slate-300 dark:hover:border-white/20 flex flex-col group">
                    <h4 className="text-xl font-light text-slate-900 dark:text-white tracking-widest uppercase mb-4">Silver</h4>
                    <div className="flex items-baseline gap-1 mb-10 border-b border-slate-100 dark:border-white/5 pb-8">
                        <span className="text-xs text-slate-400 font-medium tracking-wide">R$</span>
                        <span className="text-5xl font-light text-slate-900 dark:text-white tracking-tighter">89</span>
                        <span className="text-[10px] uppercase text-slate-400 tracking-widest">/mês</span>
                    </div>
                    <ul className="space-y-6 mb-10 flex-1">
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-red-500 opacity-70">check_circle</span>
                            2 Intervenções de Cabelo
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-red-500 opacity-70">check_circle</span>
                            Benefício de 10%
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-red-500 opacity-70">check_circle</span>
                            Bebida Signature
                        </li>
                    </ul>
                    <button 
                        className="w-full py-4 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group-hover:border-slate-300 dark:group-hover:border-white/20"
                        onClick={() => openPaymentModal({
                            title: 'Assinar Plano Silver',
                            initialAmount: 89,
                            isFixedAmount: true
                        })}
                    >
                        Requerer Acesso
                    </button>
                </div>

                {/* Plano Rei (Sem destaque de altura/tamanho) */}
                <div className="bg-slate-50 dark:bg-[#111111]/90 dark:backdrop-blur-2xl border border-red-500/30 rounded-3xl p-10 shadow-xl dark:shadow-[0_0_40px_rgba(220,38,38,0.1)] relative flex flex-col transition-colors group">
                    <div className="absolute top-0 right-8 bg-red-600/10 text-red-500 text-[8px] font-bold px-4 py-2 rounded-b-lg uppercase tracking-[0.2em] border-x border-b border-red-500/20">
                        O Padrão Ouro
                    </div>
                    <h4 className="text-xl font-light text-red-500 tracking-widest uppercase mb-4">Gold</h4>
                    <div className="flex items-baseline gap-1 mb-10 border-b border-red-500/10 pb-8">
                        <span className="text-xs text-slate-400 font-medium tracking-wide">R$</span>
                        <span className="text-6xl font-light text-slate-900 dark:text-white tracking-tighter">149</span>
                        <span className="text-[10px] uppercase text-slate-400 tracking-widest">/mês</span>
                    </div>
                    <ul className="space-y-6 mb-10 flex-1">
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 font-medium">
                            <span className="material-symbols-outlined text-xs text-red-500">check_circle</span>
                            Intervenções Ilimitadas
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 font-medium">
                            <span className="material-symbols-outlined text-xs text-red-500">check_circle</span>
                            2 Barbas Ritualísticas
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 font-medium">
                            <span className="material-symbols-outlined text-xs text-red-500">check_circle</span>
                            Benefício de 20%
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 font-medium">
                            <span className="material-symbols-outlined text-xs text-red-500">check_circle</span>
                            Fila Prioritária Absoluta
                        </li>
                    </ul>
                    <button 
                        className="w-full py-4 bg-red-600/10 text-red-500 rounded-xl text-[10px] uppercase tracking-[0.2em] font-medium border border-red-600/30 hover:bg-red-600/20 hover:text-white glow-red transition-all animate-shine"
                        onClick={() => openPaymentModal({
                            title: 'Assinar Plano Gold',
                            initialAmount: 149,
                            isFixedAmount: true
                        })}
                    >
                        Tornar-se Gold
                    </button>
                </div>

                {/* Plano Imperador */}
                <div className="bg-slate-50 dark:bg-black/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl p-10 relative overflow-hidden group flex flex-col hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                     <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <span className="material-symbols-outlined !text-7xl text-slate-900 dark:text-white">diamond</span>
                     </div>
                    <h4 className="text-xl font-light text-slate-900 dark:text-white tracking-widest uppercase mb-4 relative z-10">Black</h4>
                    <div className="flex items-baseline gap-1 mb-10 border-b border-slate-100 dark:border-white/5 pb-8 relative z-10">
                        <span className="text-xs text-slate-400 font-medium tracking-wide">R$</span>
                        <span className="text-5xl font-light text-slate-900 dark:text-white tracking-tighter">229</span>
                        <span className="text-[10px] uppercase text-slate-400 tracking-widest">/mês</span>
                    </div>
                    <ul className="space-y-6 mb-10 flex-1 relative z-10">
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-slate-400">check_circle</span>
                            Passaporte Ilimitado
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-slate-400">check_circle</span>
                            Sobrancelha Impecável
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-slate-400">check_circle</span>
                            Benefício de 30%
                        </li>
                        <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-slate-400">check_circle</span>
                            Bar Privativo Liberado
                        </li>
                         <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-slate-500">
                            <span className="material-symbols-outlined text-[10px] text-slate-400">check_circle</span>
                            Área Vip Em Massagem
                        </li>
                    </ul>
                    <button 
                        className="w-full py-4 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group-hover:border-slate-300 dark:group-hover:border-white/20 relative z-10"
                        onClick={() => openPaymentModal({
                            title: 'Assinar Plano Black',
                            initialAmount: 229,
                            isFixedAmount: true
                        })}
                    >
                        Aplicar Para Black
                    </button>
                </div>
            </div>
          </section>

        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`fixed top-0 right-0 h-full w-[280px] bg-white dark:bg-[#050505] border-l border-slate-200 dark:border-white/5 shadow-2xl z-[70] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/5">
          <span className="font-medium text-red-500 uppercase tracking-[0.2em] text-[10px]">Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-red-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col p-6 gap-8 flex-1 mt-6">
          <button onClick={() => { setIsBookingModalOpen(true); setIsMobileMenuOpen(false); }} className="text-xs font-medium text-red-500 uppercase tracking-[0.3em] flex items-center gap-4 hover:pl-2 transition-all text-left"><span className="material-symbols-outlined text-xl">calendar_month</span> Agendar</button>
          <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:pl-2"><span className="material-symbols-outlined text-xl">history</span> Histórico</a>
          <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:pl-2"><span className="material-symbols-outlined text-xl">workspace_premium</span> Fidelidade</a>
          <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:pl-2"><span className="material-symbols-outlined text-xl">diamond</span> Planos</a>
          <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:pl-2"><span className="material-symbols-outlined text-xl">person</span> Perfil</a>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 text-[10px] font-medium text-slate-500 hover:text-red-500 transition-colors uppercase tracking-[0.3em] flex items-center gap-3 justify-center"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sair da Conta
          </button>
        </div>
      </div>
      
      {/* Modais */}
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      <AppointmentDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
      
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        publicKey={mpPublicKey}
        {...paymentModalConfig}
      />
    </div>
  );
};

export default ClientDashboard;
