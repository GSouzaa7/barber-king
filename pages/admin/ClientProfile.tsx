import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';

const AdminClientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // --- States for Client Data ---
  const [clientData, setClientData] = useState({
    initials: 'RB',
    name: 'Ricardo Barbosa',
    phone: '(11) 98765-4321',
    email: 'ricardo.b@gmail.com',
    status: 'Cliente Fiel',
    visits: 24,
    totalSpent: 'R$ 1.840',
    styleNotes: '"Prefere degradê médio (mid fade), finalização com pomada efeito seco. Não gosta de usar navalha na sobrancelha."',
    favoriteDrink: 'Cerveja IPA'
  });

  // Busca dados do cliente pelo id da rota (nunca via localStorage — PII)
  // TODO: migrar clientData completo para Supabase quando a integração estiver ativa
  useEffect(() => {
    if (!id) return;
    supabase
      .from('clients')
      .select('name, email, phone')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setClientData(prev => ({
            ...prev,
            name: data.name,
            email: data.email ?? prev.email,
            phone: data.phone ?? prev.phone,
            initials: data.name.substring(0, 2).toUpperCase()
          }));
        }
      });
  }, [id]);

  // --- States for Gallery ---
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&h=500&fit=crop'
  ]);

  // --- States for Modals ---
  const [isPhotoOptionOpen, setIsPhotoOptionOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // --- States for Edit Form (New fields from Image) ---
  const [formData, setFormData] = useState({
      cpf: '',
      rg: '',
      gender: 'Feminino',
      tags: '',
      active: true,
      origin: 'Indicação',
      indicatedBy: '',
      profession: '',
      civilStatus: ''
  });

  // --- States for Accordions & Modals ---
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    whatsapp: true
  });

  const toggleAccordion = (section: string) => {
    setOpenAccordion(prev => prev === section ? null : section);
  };

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // --- Form Handler ---
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Perfil de paciente atualizado com sucesso!");
    // Aqui seria a integração real (Backend)
  };

  // --- Gallery Handlers ---
  const handleAddPhotoClick = () => {
    if (galleryImages.length >= 3) {
      alert("O limite máximo de 3 fotos foi atingido. Exclua uma foto para adicionar outra.");
      return;
    }
    setIsPhotoOptionOpen(true);
  };

  const handleDeletePhoto = (indexToDelete: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta foto?")) {
      setGalleryImages(prev => prev.filter((_, index) => index !== indexToDelete));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (galleryImages.length >= 3) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryImages([reader.result as string, ...galleryImages].slice(0,3));
        setIsPhotoOptionOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Camera Handlers ---
  const startCamera = async () => {
    if (galleryImages.length >= 3) return;

    try {
      setIsPhotoOptionOpen(false);
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        setGalleryImages([imageDataUrl, ...galleryImages].slice(0,3));
        stopCamera();
      }
    }
  };

  // Menu Lateral - conforme tab Clientes
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
        {/* Floating WhatsApp Button */}
        <button className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        </button>

        <header className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                <span className="hover:text-white cursor-pointer" onClick={() => navigate('/admin/clients')}>Clientes</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-slate-900 dark:text-white font-medium">Perfil do Cliente</span>
            </div>
            <h2 className="text-[2rem] font-medium text-slate-900 dark:text-white tracking-tight uppercase pt-1">{clientData.name}</h2>
          </div>
          
          <div className="flex items-center gap-4">
             <button className="bg-red-600 hover:bg-red-600/90 text-white px-5 py-2.5 rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95">
                <span className="material-symbols-outlined text-lg">add</span>
                Novo Agendamento
             </button>
          </div>
        </header>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Column - Form */}
            <div className="xl:col-span-5 flex flex-col gap-6">
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden transition-colors">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full pointer-events-none"></div>

                  <div className="flex items-center gap-4 mb-2 relative z-10">
                    <div className="p-2 bg-gradient-to-b from-slate-100 to-white dark:from-red-600/20 dark:to-red-600/5 rounded-xl border border-slate-200 dark:border-red-500/20 text-slate-600 dark:text-red-500 shadow-sm dark:shadow-inner">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 dark:text-white text-xl tracking-tight">Editar Paciente</h3>
                        <p className="text-[9px] text-slate-500 font-medium uppercase tracking-[0.2em] mt-1">Dados Cadastrais</p>
                    </div>
                  </div>

                  {/* Foto, Nome, Email */}
                  <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                       <label className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-50 dark:bg-[#101010] border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-slate-300 dark:hover:border-red-500/50 hover:text-slate-700 dark:hover:text-red-500 transition-all relative overflow-hidden group shadow-inner">
                           {galleryImages.length > 0 ? (
                               <img src={galleryImages[0]} alt="Avatar" className="w-full h-full object-cover" />
                           ) : (
                               <>
                                <span className="material-symbols-outlined text-3xl mb-1">add_photo_alternate</span>
                               </>
                           )}
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                               <span className="material-symbols-outlined text-white text-lg mb-1">edit</span>
                               <span className="text-[9px] font-medium text-white uppercase tracking-[0.2em] text-center px-1">Alterar Foto</span>
                           </div>
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                               const file = e.target.files?.[0];
                               if(file) {
                                   const reader = new FileReader();
                                   reader.onload = () => {
                                       setGalleryImages([reader.result as string, ...galleryImages].slice(0,3));
                                   };
                                   reader.readAsDataURL(file);
                               }
                           }} />
                       </label>
                       <span className={`text-[9px] font-medium px-3 py-1.5 rounded-full uppercase tracking-[0.2em] border shadow-sm ${
                           clientData.status === 'Cliente Fiel' ? 'bg-[#0F291E] text-emerald-500 border-emerald-500/20' : 
                           clientData.status === 'Recente' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20' : 
                           'bg-slate-500/10 text-slate-400 border-slate-500/20'
                       }`}>
                           {clientData.status}
                       </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                         <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Nome<span className="text-red-500">*</span></label>
                         <input type="text" name="name" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} required className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner" placeholder="Nome completo" />
                      </div>
                      <div>
                         <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">E-mail<span className="text-red-500">*</span></label>
                         <input type="email" name="email" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} required className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner" placeholder="exemplo@email.com" />
                      </div>
                    </div>
                  </div>

                  {/* Telefone, Data Nasc */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                      <div>
                         <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Telefone<span className="text-red-500">*</span></label>
                         <div className="flex bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 overflow-hidden transition-all shadow-inner">
                            <div className="flex items-center gap-2 px-4 py-3 border-r border-border-subtle cursor-pointer hover:bg-white/[0.02] transition-colors shrink-0">
                                <img src="https://flagcdn.com/w20/br.png" alt="BR" className="w-[18px] h-auto rounded-[2px]" />
                                <span className="text-white text-sm font-medium">+55</span>
                            </div>
                            <input type="tel" name="phone" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} required className="w-full bg-transparent border-0 ring-0 focus:ring-0 px-4 py-3 text-slate-900 dark:text-white outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="(99) 99999-9999" />
                         </div>
                      </div>
                      <div>
                         <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Data de nascimento<span className="text-red-500">*</span></label>
                         <div className="relative">
                            <input type="date" required defaultValue="1975-07-26" className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 pr-10 text-white focus:border-red-500 outline-none text-sm [color-scheme:dark] transition-all shadow-inner relative [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">calendar_today</span>
                         </div>
                      </div>
                  </div>

                  {/* CPF, RG */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                      <div>
                         <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">CPF</label>
                         <input type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none text-sm transition-all placeholder:text-slate-600 shadow-inner" />
                      </div>
                      <div>
                         <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">RG</label>
                         <input type="text" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} placeholder="Digite" className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none text-sm transition-all placeholder:text-slate-600 shadow-inner" />
                      </div>
                  </div>

                  {/* Etiquetas */}
                  <div className="relative z-10">
                     <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
                            Etiquetas <span title="Adicione tags para organizar seus clientes" className="material-symbols-outlined text-[14px] text-slate-600 cursor-help hover:text-white transition-colors">help</span>
                        </label>
                        <button type="button" className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 text-[10px] font-medium uppercase tracking-[0.2em] flex items-center gap-0.5 transition-colors">
                            <span className="material-symbols-outlined text-[14px]">add</span> Adicionar
                        </button>
                     </div>
                     <div className="relative">
                         <select className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-slate-600 dark:text-slate-400 text-sm outline-none focus:border-red-500 focus:text-slate-900 dark:focus:text-white transition-all cursor-pointer shadow-inner !bg-none appearance-none">
                            <option>Pesquise/Selecione</option>
                            <option>VIP</option>
                            <option>Atrasado</option>
                         </select>
                         <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-lg">keyboard_arrow_down</span>
                     </div>
                  </div>

                  <div className="border-t border-border-subtle h-px w-full my-4"></div>

                  {/* Informacoes adicionais */}
                  <div className="relative z-10 w-full">
                      <h4 className="font-bold text-white text-sm mb-4">Informações adicionais</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                             <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Origem</label>
                             <div className="relative">
                                 <select value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-white text-sm appearance-none outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner !bg-none">
                                     <option value="Indicação">Indicação</option>
                                     <option value="Instagram">Instagram</option>
                                     <option value="Passou na porta">Passou na porta</option>
                                 </select>
                                 <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">keyboard_arrow_down</span>
                             </div>
                          </div>
                          <div className={`${formData.origin === 'Indicação' ? 'opacity-100' : 'opacity-40 pointer-events-none'} transition-opacity duration-300`}>
                             <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2 invisible sm:visible">Indicado por</label>
                             <div className="relative flex items-center">
                                 <select className="w-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-xl px-4 py-3 text-slate-400 text-sm appearance-none outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner !bg-none">
                                     <option>Selecione o contato que indicou</option>
                                 </select>
                                 <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-lg">keyboard_arrow_down</span>
                             </div>
                          </div>
                      </div>

                      {/* Profissão & Estado Civil */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Profissão</label>
                            <input type="text" name="profession" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} placeholder="Ex: Atendente" className="w-full bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-red-500 outline-none transition-all placeholder:text-slate-600 shadow-inner" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Estado Civil</label>
                            <div className="relative">
                                <select name="civilStatus" value={formData.civilStatus} onChange={e => setFormData({...formData, civilStatus: e.target.value})} className="w-full bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-xl px-4 py-3 text-white text-sm appearance-none outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner pr-8 !bg-none">
                                    <option value="">Selecione</option>
                                    <option value="solteiro">Solteiro(a)</option>
                                    <option value="casado">Casado(a)</option>
                                    <option value="divorciado">Divorciado(a)</option>
                                    <option value="viuvo">Viúvo(a)</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">keyboard_arrow_down</span>
                            </div>
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1">
                               <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Etiquetas</label>
                               <span className="material-symbols-outlined text-[13px] text-slate-500 cursor-help" title="Adicione etiquetas para categorizar este cliente">help</span>
                           </div>
                           <button type="button" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors flex items-center">
                               + Adicionar
                           </button>
                        </div>
                        <div className="relative">
                            <select className="w-full bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-xl px-4 py-3 text-slate-400 text-sm appearance-none outline-none focus:border-red-500 transition-all cursor-pointer shadow-inner pr-8 !bg-none">
                                <option value="">Pesquise/Selecione</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">keyboard_arrow_down</span>
                        </div>
                    </div>

                      {/* Preferencias */}
                      <div className="w-full mt-4">
                          <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 mb-2">Preferências de corte</label>
                          <textarea 
                              value={clientData.styleNotes}
                              onChange={e => setClientData({...clientData, styleNotes: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-red-500 outline-none transition-all placeholder:text-slate-600 shadow-inner resize-none h-24" 
                              placeholder="Digite" 
                          />
                      </div>
                  </div>

                  {/* Accordion Sections */}
                  <div className="relative z-10 w-full mt-6 border-t border-border-subtle divide-y divide-border-subtle">
                      {/* Notificações */}
                      <div className="py-4">
                          <button type="button" onClick={() => toggleAccordion('notificacoes')} className="flex items-center justify-between w-full text-left group">
                              <span className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">Notificações</span>
                              <div className="flex items-center gap-3 text-slate-500">
                                  <span className="text-xs truncate max-w-[150px] sm:max-w-[250px]">
                                      {Object.values(notifications).every(v => v) ? 'Todas ativas' : 
                                       Object.entries(notifications).filter(([_, v]) => v).map(([k]) => k === 'email' ? 'E-mail' : k === 'sms' ? 'SMS' : 'WhatsApp').join(', ') || 'Nenhuma'}
                                  </span>
                                  <span className={`material-symbols-outlined transition-transform duration-300 ${openAccordion === 'notificacoes' ? 'rotate-180' : ''}`}>expand_more</span>
                              </div>
                          </button>
                          
                          {openAccordion === 'notificacoes' && (
                              <div className="mt-6 flex flex-wrap gap-8 animate-fadeIn">
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative inline-flex items-center">
                                          <input type="checkbox" className="sr-only peer" checked={notifications.email} onChange={(e) => setNotifications({...notifications, email: e.target.checked})} />
                                          <div className="w-11 h-6 bg-slate-50 dark:bg-[#101010] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white peer-checked:bg-success-green border border-border-subtle shadow-inner"></div>
                                      </div>
                                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">E-mail</span>
                                  </label>
                                  
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative inline-flex items-center">
                                          <input type="checkbox" className="sr-only peer" checked={notifications.sms} onChange={(e) => setNotifications({...notifications, sms: e.target.checked})} />
                                          <div className="w-11 h-6 bg-slate-50 dark:bg-[#101010] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white peer-checked:bg-success-green border border-border-subtle shadow-inner"></div>
                                      </div>
                                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">SMS</span>
                                  </label>
                                  
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative inline-flex items-center">
                                          <input type="checkbox" className="sr-only peer" checked={notifications.whatsapp} onChange={(e) => setNotifications({...notifications, whatsapp: e.target.checked})} />
                                          <div className="w-11 h-6 bg-slate-50 dark:bg-[#101010] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white peer-checked:bg-success-green border border-border-subtle shadow-inner"></div>
                                      </div>
                                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">WhatsApp</span>
                                  </label>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="pt-8 pb-4 flex justify-center border-t border-border-subtle relative z-10 w-full mt-2">
                      <button type="submit" className="w-[80%] sm:w-[250px] bg-red-600 hover:bg-red-600/90 text-white px-10 py-3.5 rounded-xl font-bold tracking-[0.2em] uppercase text-[10px] shadow-lg shadow-red-600/20 transition-all active:scale-95 text-center">
                          Salvar
                      </button>
                  </div>
                </div>
            </div>

            {/* Right Column - Existing Cards */}
            <div className="xl:col-span-7 flex flex-col gap-6">
                {/* Gallery Section */}
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-red-50 dark:from-red-500/20 to-white dark:to-red-500/5 rounded-xl border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-500">
                                <span className="material-symbols-outlined text-sm">photo_library</span>
                            </div>
                            <h3 className="font-medium text-slate-900 dark:text-white tracking-tight text-lg">Galeria de Cortes <span className="text-xs text-slate-500 font-normal ml-2 bg-white/5 py-1 px-2 rounded-lg">({galleryImages.length}/3)</span></h3>
                        </div>
                        {galleryImages.length < 3 ? (
                            <button 
                                type="button"
                                onClick={handleAddPhotoClick}
                                className="bg-slate-50 dark:bg-[#101010] hover:bg-white/5 border border-border-subtle text-slate-300 px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 transition-all active:scale-95 shadow-inner"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Foto
                            </button>
                        ) : (
                            <span className="text-[10px] text-warning-amber font-bold uppercase tracking-wider bg-warning-amber/10 px-3 py-1.5 rounded-lg border border-warning-amber/20">Máximo</span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryImages.map((src, index) => (
                            <div key={index} className="aspect-square rounded-2xl bg-[#0A0A0A] border border-border-subtle overflow-hidden shadow-md group relative">
                                <img src={src} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={`Corte ${index + 1}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3 backdrop-blur-[1px]">
                                    <button 
                                        type="button"
                                        className="bg-danger-red/90 hover:bg-danger-red text-white w-8 h-8 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all self-end flex items-center justify-center backdrop-blur-sm"
                                        onClick={() => handleDeletePhoto(index)}
                                        title="Excluir foto"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                         {galleryImages.length < 3 && (
                            <div 
                                onClick={handleAddPhotoClick}
                                className="aspect-square rounded-2xl bg-[#0A0A0A] border-2 border-dashed border-border-subtle flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-500 transition-all group shadow-inner"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-red-50 dark:group-hover:bg-red-500/10 transition-all mb-2">
                                    <span className="material-symbols-outlined text-2xl group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">add_photo_alternate</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Nova Foto</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2-Column Grid inside the Right Column for smaller cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Preferências Card */}
                    <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-gradient-to-br from-red-50 dark:from-red-500/20 to-white dark:to-red-500/5 rounded-xl border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-500">
                                <span className="material-symbols-outlined text-sm">psychology</span>
                            </div>
                            <h3 className="font-medium text-slate-900 dark:text-white tracking-tight">Preferências</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-[#101010] p-5 rounded-xl border border-border-subtle relative overflow-hidden shadow-inner">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                <p className="text-[10px] text-red-600 dark:text-red-500 uppercase font-medium tracking-[0.2em] mb-2 ml-1">Notas de Estilo</p>
                                <textarea 
                                    name="styleNotes" 
                                    value={clientData.styleNotes} 
                                    onChange={e => setClientData({...clientData, styleNotes: e.target.value})} 
                                    rows={3} 
                                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-300 text-sm italic leading-relaxed outline-none resize-none placeholder:text-slate-700 ml-1" 
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-[#101010] p-5 rounded-xl border border-border-subtle relative overflow-hidden shadow-inner">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                <p className="text-[10px] text-red-600 dark:text-red-500 uppercase font-medium tracking-[0.2em] mb-2 ml-1">Bebida Favorita</p>
                                <div className="flex items-center gap-2 ml-1">
                                    <span className="material-symbols-outlined text-lg text-amber-400">sports_bar</span>
                                    <input 
                                        type="text" 
                                        name="favoriteDrink" 
                                        value={clientData.favoriteDrink} 
                                        onChange={e => setClientData({...clientData, favoriteDrink: e.target.value})} 
                                        className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-bold text-slate-200 outline-none placeholder:text-slate-700" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Produtos Card */}
                    <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-gradient-to-br from-red-50 dark:from-red-500/20 to-white dark:to-red-500/5 rounded-xl border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-500">
                                <span className="material-symbols-outlined text-sm">shopping_bag</span>
                            </div>
                            <h3 className="font-medium text-slate-900 dark:text-white tracking-tight">Produtos Comprados</h3>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-[#101010] p-4 rounded-xl border border-border-subtle flex flex-col gap-4 flex-1 shadow-inner group cursor-pointer hover:border-red-500/30 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-slate-400 shrink-0 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                                     <span className="material-symbols-outlined text-xl">inventory_2</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">Pomada Matte 120g</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">12 Out 2023</p>
                                </div>
                            </div>
                            <div className="mt-auto border-t border-white/5 pt-3">
                                <span className="text-sm font-bold text-emerald-400 px-3 py-1 bg-emerald-400/10 rounded-lg w-max inline-block">R$ 65,00</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Section Summary */}
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-red-50 dark:from-red-500/20 to-white dark:to-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-500 shrink-0">
                            <span className="material-symbols-outlined text-xl">history_toggle_off</span>
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white tracking-tight text-lg mb-1">Histórico de Serviços</h3>
                            <p className="text-sm text-slate-400">Último serviço: <span className="text-white font-medium">Corte + Barba (16 Out)</span></p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsHistoryDrawerOpen(true)}
                        className="bg-slate-50 dark:bg-[#101010] hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-500 border border-slate-200 dark:border-border-subtle hover:border-red-200 dark:hover:border-red-500/30 px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 shadow-inner"
                    >
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                        Ver Histórico
                    </button>
                </div>

                {/* Removed bottom Gallery Section because it was successfully moved to the top */}
            </div>
        </form>

        {/* --- MODALS E GAVETAS --- */}

        {/* History Drawer */}
        <div className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isHistoryDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsHistoryDrawerOpen(false)}>
            <div 
                className={`absolute top-0 right-0 w-full max-w-md h-full bg-white dark:bg-[#0A0A0A] border-l border-slate-200 dark:border-border-subtle shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isHistoryDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-slate-50 dark:bg-[#0a0a0a] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 dark:text-red-500 border border-red-500/20">
                            <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight">Histórico</h2>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">12 serviços no total</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setIsHistoryDrawerOpen(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#151515] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200 dark:border-border-subtle transition-colors shadow-inner"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                
                {/* Drawer Body - Timeline or List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Item 1 */}
                    <div className="bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-2xl p-5 relative overflow-hidden group hover:border-red-500/30 transition-colors shadow-inner">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50 group-hover:bg-red-600 transition-colors"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white text-lg tracking-tight">Corte + Barba</h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                    16 Out 2023, 14:30
                                </div>
                            </div>
                            <span className="font-extrabold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg text-sm border border-emerald-400/20">R$ 85,00</span>
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[12px] text-slate-300">person</span>
                            </div>
                            <span className="text-xs font-medium text-slate-300">Com <strong className="text-white">Junior</strong></span>
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-slate-50 dark:bg-[#101010] border border-border-subtle rounded-2xl p-5 relative overflow-hidden group hover:border-slate-500/30 transition-colors shadow-inner">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-600/50 group-hover:bg-slate-500 transition-colors"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white text-lg tracking-tight">Corte Social</h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                    02 Out 2023, 10:00
                                </div>
                            </div>
                            <span className="font-extrabold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg text-sm border border-emerald-400/20">R$ 55,00</span>
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[12px] text-slate-300">person</span>
                            </div>
                            <span className="text-xs font-medium text-slate-300">Com <strong className="text-white">Junior</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/* Photo Option Modal */}
        {isPhotoOptionOpen && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white text-lg">Adicionar Foto</h3>
                        <button onClick={() => setIsPhotoOptionOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-[#101010] hover:bg-white/5 border border-border-subtle hover:border-red-500/50 cursor-pointer transition-all group shadow-inner">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                                ref={fileInputRef}
                            />
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">upload_file</span>
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Galeria</span>
                        </label>
                        <button 
                            onClick={startCamera}
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-[#101010] hover:bg-white/5 border border-border-subtle hover:border-red-500/50 cursor-pointer transition-all group shadow-inner"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">photo_camera</span>
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Câmera</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Camera Modal */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto bg-black border border-white/10 rounded-3xl"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-10 items-center">
                        <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all backdrop-blur-md">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                        <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-white rounded-full"></div>
                        </button>
                        <div className="w-12 h-12"></div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default AdminClientProfile;
