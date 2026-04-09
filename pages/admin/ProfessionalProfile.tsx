import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const AdminProfessionalProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('geral');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proData, setProData] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    bio: '',
    photo: ''
  });

  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalServices: 0,
    totalCommission: 0
  });

  const [matrices, setMatrices] = useState<any[]>([]);
  const [proMatrizes, setProMatrizes] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // --- Goals State ---
  const [goals, setGoals] = useState({
      newClients: { current: 0, target: 30 },
      faturamento: { current: 0, target: 15000 }
  });

  // --- Month Navigation ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const ptBRMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getMonthLabel = () => {
    return `${ptBRMonths[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`;
  };

  // --- Portfolio State ---
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const fetchPro = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setProData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          specialties: data.specialties || [],
          bio: data.bio || '',
          photo: data.avatar_url || ''
        });
        
        if (data.performance_goals) {
            // Only update targets, preserve current calculated values if they exist
            setGoals(prev => ({
                ...data.performance_goals,
                faturamento: { ...data.performance_goals.faturamento, current: prev.faturamento.current },
                newClients: { ...data.performance_goals.newClients, current: prev.newClients.current }
            }));
        }
        if (data.portfolio_urls) {
            setPortfolioImages(data.portfolio_urls);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar profissional:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExtraData = async () => {
    if (!id) return;
    try {
        // Fetch all matrizes
        const { data: allM } = await supabase.from('matrizes').select('*');
        if (allM) setMatrices(allM);

        // Fetch pro-matriz links
        const { data: links } = await supabase.from('professional_matrizes').select('matriz_id').eq('professional_id', id);
        if (links) setProMatrizes(links.map(l => l.matriz_id));

        // Fetch schedules
        const { data: sch } = await supabase.from('professional_schedules').select('*').eq('professional_id', id);
        if (sch) setSchedules(sch);

        // Fetch history for selected month only and strictly for this professional
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

        console.log(`[Diagnostic] Fetching history for PRO_ID: ${id}, Month: ${selectedDate.getMonth() + 1}, Range: ${startOfMonth} to ${endOfMonth}`);

        const { data: hist, error: histError } = await supabase
            .from('appointments')
            .select(`
                id, 
                scheduled_at, 
                status, 
                clients(name), 
                services(name, price),
                professional_id
            `)
            .eq('professional_id', id)
            .gte('scheduled_at', startOfMonth)
            .lte('scheduled_at', endOfMonth)
            .order('scheduled_at', { ascending: false });

        if (histError) console.error('[Diagnostic] Hist Error:', histError);
        
        if (hist) {
            console.log(`[Diagnostic] Found ${hist.length} records for ${id} in this month.`);
            setHistory(hist);
            // Count total services (done) and total value for commission
            const done = hist.filter(a => {
                const s = a.status?.toLowerCase();
                return s === 'done' || s === 'concluido' || s === 'concluído';
            });
            const totalValue = done.reduce((acc, curr) => acc + (Number((curr.services as any)?.price) || 0), 0);
            
            setStats({
                totalServices: done.length,
                totalCommission: totalValue * 0.4
            });

            // Auto-update current goals from actual filtered data
            setGoals(prev => ({
                ...prev,
                faturamento: { ...prev.faturamento, current: totalValue },
                newClients: { ...prev.newClients, current: done.length }
            }));
        }

        // ONE-TIME DIAGNOSTIC: Check if there are ANY records for this professional OUTSIDE this month
        const { data: allTimeCheck } = await supabase
            .from('appointments')
            .select('id, scheduled_at, status, services(price)')
            .eq('professional_id', id)
            .limit(10);
        
        if (allTimeCheck) {
            console.log('[Diagnostic] Sample of ALL records for this professional:', allTimeCheck);
        }
    } catch (err) {
        console.error('Erro ao carregar dados extras:', err);
    }
  };

  useEffect(() => {
    fetchPro();
  }, [id]);

  useEffect(() => {
    fetchExtraData();
  }, [id, selectedDate]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          name: proData.name,
          email: proData.email,
          phone: proData.phone,
          specialties: proData.specialties,
          bio: proData.bio,
          avatar_url: proData.photo,
          performance_goals: goals,
          portfolio_urls: portfolioImages
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMatrizConnection = async (matrizId: string) => {
    if (!id) return;
    const isLinked = proMatrizes.includes(matrizId);
    try {
        if (isLinked) {
            await supabase.from('professional_matrizes').delete().eq('professional_id', id).eq('matriz_id', matrizId);
            setProMatrizes(prev => prev.filter(mid => mid !== matrizId));
            toast.success('Unidade desvinculada');
        } else {
            await supabase.from('professional_matrizes').insert({ professional_id: id, matriz_id: matrizId, status: 'ativo' });
            setProMatrizes(prev => [...prev, matrizId]);
            toast.success('Unidade vinculada');
        }
    } catch (err) {
        console.error('Erro ao alternar vínculo:', err);
        toast.error('Erro ao atualizar vínculo');
    }
  };

  const updateSchedule = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules(prev => {
        const existing = prev.find(s => s.day_of_week === day);
        if (existing) {
            return prev.map(s => s.day_of_week === day ? { ...s, [field]: value } : s);
        }
        // If not existing, create a default one for that day
        return [...prev, { 
            professional_id: id, 
            matriz_id: proMatrizes[0] || matrices[0]?.id, // Default to first matriz if linked
            day_of_week: day, 
            start_time: field === 'start_time' ? value : '09:00',
            end_time: field === 'end_time' ? value : '19:00'
        }];
    });
  };

  const [editingGoalType, setEditingGoalType] = useState<'newClients' | 'faturamento'>('newClients');
  
  // --- Modals State ---
  const [isPhotoOptionOpen, setIsPhotoOptionOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  // Track whether we are updating 'profile' or 'portfolio'
  const [photoTarget, setPhotoTarget] = useState<'profile' | 'portfolio' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check limit only if target is portfolio
    if (photoTarget === 'portfolio' && portfolioImages.length >= 4) return;

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (photoTarget === 'profile') {
            setProData(prev => ({ ...prev, photo: reader.result as string }));
        } else {
            setPortfolioImages([...portfolioImages, reader.result as string]);
        }
        setIsPhotoOptionOpen(false);
        setPhotoTarget(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    // Check limit only if target is portfolio
    if (photoTarget === 'portfolio' && portfolioImages.length >= 4) return;
    
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
      alert("Erro ao acessar câmera.");
      setIsCameraOpen(false);
    }
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
        
        if (photoTarget === 'profile') {
            setProData(prev => ({ ...prev, photo: imageDataUrl }));
        } else {
            setPortfolioImages([...portfolioImages, imageDataUrl]);
        }

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
        setPhotoTarget(null);
      }
    }
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newTarget = parseInt(formData.get('target') as string) || 0;
    
    setGoals(prev => ({
        ...prev,
        [editingGoalType]: { ...prev[editingGoalType as 'newClients' | 'faturamento'], target: newTarget }
    }));
    setIsGoalModalOpen(false);
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

  const menuItems = [
    { id: 'geral', label: 'Informações Gerais', icon: 'person' },
    { id: 'grade', label: 'Grade de Horários', icon: 'schedule' },
    { id: 'escala', label: 'Escala por Filial', icon: 'domain' },
    { id: 'metas', label: 'Metas e Performance', icon: 'trending_up' },
    { id: 'historico', label: 'Histórico', icon: 'history' },
    { id: 'portfolio', label: 'Portfólio', icon: 'collections' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'geral':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
               <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-500">info</span>
                  <h3 className="font-medium text-xl tracking-tight">Informações Gerais</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Nome Completo</label>
                   <input 
                    value={proData.name} 
                    onChange={e => setProData({...proData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors" 
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">E-mail Profissional</label>
                   <input 
                    value={proData.email} 
                    onChange={e => setProData({...proData, email: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors" 
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Telefone / Whatsapp</label>
                   <input 
                    value={proData.phone} 
                    onChange={e => setProData({...proData, phone: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors" 
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Especialidades (Vírgula)</label>
                   <input 
                    value={proData.specialties.join(', ')} 
                    onChange={e => setProData({...proData, specialties: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="Ex: Corte, Barba, Químicos"
                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors" 
                   />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Bio / Resumo Profissional</label>
                   <textarea 
                    rows={4} 
                    value={proData.bio} 
                    onChange={e => setProData({...proData, bio: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors resize-none" 
                   />
                 </div>
               </div>
            </div>
          </div>
        );
      case 'grade':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-500">schedule</span>
                    <h3 className="font-medium text-xl tracking-tight">Grade de Horários</h3>
                </div>
                <button className="text-red-600 text-[10px] font-bold tracking-[0.2em] flex items-center gap-1 hover:text-red-700 transition-colors uppercase">
                    <span className="material-symbols-outlined text-sm">copy_all</span>
                    REPLICAR HORÁRIOS
                </button>
             </div>
              <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 p-4 border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    <div>Dia da Semana</div>
                    <div>Entrada</div>
                    <div className="text-center">Intervalo</div>
                    <div>Saída</div>
                    <div className="text-center">Status</div>
                </div>
                {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((day, dIdx) => {
                    const daySch = schedules.find(s => s.day_of_week === dIdx);
                    return (
                        <div key={day} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 p-4 border-b border-slate-200 dark:border-white/5 items-center hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                            <span className="text-slate-900 dark:text-white font-medium text-sm">{day}</span>
                            <input 
                                type="time" 
                                value={daySch?.start_time?.slice(0,5) || '09:00'} 
                                onChange={(e) => updateSchedule(dIdx, 'start_time', e.target.value)}
                                className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner" 
                            />
                            <div className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-50">12:00 - 13:00</div>
                            <input 
                                type="time" 
                                value={daySch?.end_time?.slice(0,5) || '19:00'} 
                                onChange={(e) => updateSchedule(dIdx, 'end_time', e.target.value)}
                                className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner" 
                            />
                            <div className="flex justify-center">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] border transition-all ${daySch ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent'}`}>
                                    {daySch ? 'ATIVO' : 'FOLGA'}
                                </span>
                            </div>
                        </div>
                    );
                })}
             </div>
          </div>
        );
      case 'escala':
        return (
          <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-500">domain</span>
                  <h3 className="font-medium text-xl tracking-tight">Escala por Filial</h3>
              </div>
              <p className="text-slate-500 text-sm mb-6">Defina em quais unidades este profissional atua e seus respectivos horários.</p>

              <div className="space-y-6">
                {matrices.map((m) => {
                    const isLinked = proMatrizes.includes(m.id);
                    return (
                        <div key={m.id} className={`bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative group shadow-sm transition-all ${!isLinked ? 'opacity-60 grayscale' : 'ring-1 ring-red-600/20 shadow-red-600/5'}`}>
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isLinked ? 'bg-red-600/10 text-red-600' : 'bg-slate-200 dark:bg-white/5 text-slate-400'}`}>
                                        <span className="material-symbols-outlined">storefront</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">{m.name}</h4>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-widest">{m.address || 'Endereço não cadastrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${isLinked ? 'text-emerald-500' : 'text-slate-400'}`}>
                                        {isLinked ? 'VINCULADO' : 'DESVINCULADO'}
                                    </span>
                                    <button 
                                        onClick={() => toggleMatrizConnection(m.id)}
                                        className={`w-12 h-6 rounded-full p-1 flex items-center transition-all duration-300 shadow-inner ${isLinked ? 'bg-red-600 justify-end' : 'bg-slate-300 dark:bg-slate-800 justify-start'}`}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-white shadow-lg shadow-black/20"></div>
                                    </button>
                                </div>
                             </div>
                             
                             {isLinked && (
                                 <div className="grid grid-cols-7 gap-2 animate-slideDown">
                                     {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day, dIdx) => {
                                         const daySch = schedules.find(s => s.day_of_week === (dIdx + 1) % 7 && s.matriz_id === m.id);
                                         return (
                                            <div key={day} className="bg-white/50 dark:bg-black/20 rounded-xl p-3 border border-slate-200 dark:border-white/5 text-center group/day hover:border-red-600/30 transition-all">
                                                <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-tighter">{day}</p>
                                                <p className={`text-[10px] font-black tracking-tighter ${daySch ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 opacity-40'}`}>
                                                    {daySch ? `${daySch.start_time.slice(0,5)}-${daySch.end_time.slice(0,5)}` : 'FOLGA'}
                                                </p>
                                            </div>
                                         );
                                     })}
                                 </div>
                             )}
                        </div>
                    );
                })}
              </div>
          </div>
        );
      case 'metas':
        return (
            <div className="space-y-8 animate-fadeIn">
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-500">trending_up</span>
                      <h3 className="font-medium text-xl tracking-tight">Metas e Performance</h3>
                   </div>
                   
                   {/* Seletor de Mês */}
                   <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                      <button onClick={handlePrevMonth} className="text-slate-500 hover:text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em] min-w-[150px] text-center">
                        {getMonthLabel()}
                      </span>
                      <button onClick={handleNextMonth} className="text-slate-500 hover:text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                   </div>
                </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Faturamento</p>
                       <button 
                            onClick={() => { setEditingGoalType('faturamento'); setIsGoalModalOpen(true); }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-black/50 p-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm"
                            title="Editar Meta"
                        >
                           <span className="material-symbols-outlined text-sm">edit</span>
                       </button>
                       <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
                                R$ {goals.faturamento.current >= 1000 
                                    ? `${(goals.faturamento.current / 1000).toFixed(1)}k` 
                                    : goals.faturamento.current.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">/ {goals.faturamento.target >= 1000 ? `${(goals.faturamento.target / 1000).toFixed(0)}k` : goals.faturamento.target}</span>
                        </div>
                       <div className="w-full bg-slate-200 dark:bg-white/5 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                           <div className="bg-red-600 dark:bg-red-500 h-full rounded-full transition-all duration-500" style={{width: `${Math.min((goals.faturamento.current / goals.faturamento.target) * 100, 100)}%`}}></div>
                       </div>
                   </div>
                   <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Novos Clientes</p>
                       <div className="flex items-baseline gap-1 relative z-10">
                           <span className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight">{goals.newClients.current}</span>
                           <span className="text-sm text-slate-500 font-medium">/ {goals.newClients.target}</span>
                       </div>
                       <div className="w-full bg-slate-200 dark:bg-white/5 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                           <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{width: `${Math.min((goals.newClients.current / goals.newClients.target) * 100, 100)}%`}}></div>
                       </div>
                       <button 
                            onClick={() => { setEditingGoalType('newClients'); setIsGoalModalOpen(true); }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-black/50 p-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm"
                            title="Editar Meta"
                        >
                           <span className="material-symbols-outlined text-sm">edit</span>
                       </button>
                   </div>
                   <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Avaliação Média</p>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight">5.0</span>
                            <span className="text-sm text-slate-500 font-medium">/ 5.0</span>
                        </div>
                         <div className="flex gap-1 mt-2 text-amber-500 text-sm">
                             <span className="material-symbols-outlined filled">star</span>
                             <span className="material-symbols-outlined filled">star</span>
                             <span className="material-symbols-outlined filled">star</span>
                             <span className="material-symbols-outlined filled">star</span>
                             <span className="material-symbols-outlined filled">star</span>
                         </div>
                    </div>
               </div>
            </div>
        );
      case 'historico':
        return (
             <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-500">history</span>
                        <h3 className="font-medium text-xl tracking-tight">Histórico de Serviços</h3>
                    </div>

                    {/* Seletor de Mês e Ações */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                            <button onClick={handlePrevMonth} className="text-slate-500 hover:text-red-600 transition-colors">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em] min-w-[150px] text-center">
                                {getMonthLabel()}
                            </span>
                            <button onClick={handleNextMonth} className="text-slate-500 hover:text-red-600 transition-colors">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>

                        <div className="flex gap-2">
                             <button 
                                onClick={async () => {
                                    if (window.confirm('Deseja apagar os registros de Rafael, Marcos e outros dados fictícios? Esta ação é irreversível.')) {
                                        const MOCK_NAMES = ['Rafael Souza', 'Marcos Vieira', 'Carlos Andrade', 'Lucas Oliveira'];
                                        
                                        // Limpar agendamentos de Clientes Mock
                                        const { data: clients } = await supabase.from('clients').select('id').in('name', MOCK_NAMES);
                                        if (clients && clients.length > 0) {
                                            await supabase.from('appointments').delete().in('client_id', clients.map(c => c.id));
                                        }

                                        // Limpar agendamentos de Profissionais Mock
                                        const { data: profs } = await supabase.from('professionals').select('id').in('name', MOCK_NAMES);
                                        if (profs && profs.length > 0) {
                                            await supabase.from('appointments').delete().in('professional_id', profs.map(p => p.id));
                                        }

                                        alert('Limpeza concluída! Recarregando dados...');
                                        fetchExtraData();
                                    }
                                }}
                                className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-amber-500/20 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">cleaning_services</span>
                                Limpar Mock
                            </button>

                            <button className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-[10px] font-bold tracking-[0.2em] flex items-center gap-2 transition-all shadow-sm">
                                <span className="material-symbols-outlined text-sm">download</span>
                                EXPORTAR CSV
                            </button>
                        </div>
                    </div>
                </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
                        <div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Total de Serviços (Concluídos)</p>
                             <p className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">{stats.totalServices}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined">content_cut</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
                        <div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Comissão Estimada (40%)</p>
                             <p className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">R$ {stats.totalCommission.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                         <thead className="bg-slate-100/50 dark:bg-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">
                             <tr>
                                 <th className="px-6 py-4">Data</th>
                                 <th className="px-6 py-4">Cliente</th>
                                 <th className="px-6 py-4">Serviço</th>
                                 <th className="px-6 py-4">Valor</th>
                                 <th className="px-6 py-4 text-right">Status</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                             {history.length > 0 ? history.map((row, i) => (
                                 <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                     <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        {new Date(row.scheduled_at).toLocaleDateString('pt-BR')}
                                     </td>
                                     <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">
                                        {(row.clients as any)?.name ?? '—'}
                                     </td>
                                     <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {(row.services as any)?.name ?? '—'}
                                     </td>
                                     <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        R$ {(row.services as any)?.price ?? '0,00'}
                                     </td>
                                     <td className="px-6 py-4 text-sm font-bold text-right">
                                        {(() => {
                                            const s = row.status?.toLowerCase();
                                            if (s === 'done' || s === 'concluido') return <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Concluído</span>;
                                            if (s === 'pending' || s === 'pendente') return <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Pendente</span>;
                                            if (s === 'confirmed' || s === 'confirmado') return <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">Confirmado</span>;
                                            if (s === 'cancelled' || s === 'cancelado') return <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">Cancelado</span>;
                                            return <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">{row.status}</span>;
                                        })()}
                                     </td>
                                 </tr>
                             )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm italic">Nenhum histórico encontrado.</td>
                                </tr>
                             )}
                         </tbody>
                    </table>
                    <button className="w-full py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-slate-900 dark:hover:text-white transition-colors border-t border-slate-200 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-transparent">
                        Ver mais registros
                    </button>
                </div>
             </div>
        );
      case 'portfolio':
        return (
             <div className="space-y-6 animate-fadeIn">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-500">collections</span>
                        <h3 className="font-medium text-xl tracking-tight">Galeria de Trabalhos <span className="text-xs text-slate-500 font-normal ml-2">({portfolioImages.length}/4)</span></h3>
                    </div>
                    {portfolioImages.length >= 4 ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-[0.2em] bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">Máximo atingido</span>
                     ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{portfolioImages.length} FOTOS ENVIADAS</span>
                     )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Add Button */}
                      {portfolioImages.length < 4 && (
                        <div 
                            onClick={() => {
                                setPhotoTarget('portfolio');
                                setIsPhotoOptionOpen(true);
                            }}
                            className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#151515] flex flex-col items-center justify-center cursor-pointer hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-500/20 text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all">
                                    <span className="material-symbols-outlined">add</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-[0.2em] group-hover:text-red-600 dark:group-hover:text-red-400">Adicionar Foto</span>
                        </div>
                      )}

                      {portfolioImages.map((src, i) => (
                          <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-[#151515] overflow-hidden relative group border border-slate-200 dark:border-white/5 shadow-sm">
                               <img src={src} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Portfolio" />
                               <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                   <button className="w-10 h-10 rounded-full bg-white/20 dark:bg-white/10 text-white flex items-center justify-center hover:bg-red-600 hover:text-white transition-all backdrop-blur-md">
                                       <span className="material-symbols-outlined text-sm">visibility</span>
                                   </button>
                                   <button 
                                      onClick={() => setPortfolioImages(portfolioImages.filter((_, idx) => idx !== i))}
                                      className="w-10 h-10 rounded-full bg-white/20 dark:bg-white/10 text-white flex items-center justify-center hover:bg-red-600 hover:text-white transition-all backdrop-blur-md"
                                   >
                                       <span className="material-symbols-outlined text-sm">delete</span>
                                   </button>
                               </div>
                          </div>
                      ))}
                 </div>
             </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background-dark">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase">Carregando Perfil...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
      {/* Modern Ambient Glows (Quiet Luxury smooth transition) */}
      <div className="absolute inset-0 pointer-events-none z-[0] overflow-hidden transition-opacity duration-300">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
      </div>
      <Sidebar items={sidebarItems} portalName="BARBER KING" />
      
      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative z-10">
        <header className="flex justify-between items-start mb-8 pb-4 border-b border-slate-200 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/admin/professionals')}>Equipe</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-slate-900 dark:text-white">Editar Profissional</span>
            </div>
            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight pt-1">{proData.name}</h2>
          </div>
          <button className="px-4 py-2 border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs uppercase font-medium tracking-[0.2em] flex items-center gap-2 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm">
             <span className="material-symbols-outlined text-sm">person_off</span>
             Inativar Profissional
          </button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Navigation Column */}
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col items-center shadow-sm">
                    <div 
                        className="relative mb-4 group cursor-pointer"
                        onClick={() => {
                            setPhotoTarget('profile');
                            setIsPhotoOptionOpen(true);
                        }}
                    >
                        <img src={proData.photo} className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 dark:border-[#151515] shadow-lg" alt="Profile" />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                             <span className="material-symbols-outlined text-white">photo_camera</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status da Conta</p>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[9px] font-medium uppercase tracking-[0.2em]">Ativo no Sistema</span>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all border-l-2 ${
                                activeTab === item.id 
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-lg ${activeTab === item.id ? 'text-red-600 dark:text-red-400' : ''}`}>{item.icon}</span>
                            <span className="tracking-wide">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Column */}
            <div className="xl:col-span-3">
                 <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-8 min-h-[600px] relative shadow-sm">
                      {renderContent()}
                 </div>
                 <div className="flex justify-end gap-4 mt-6">
                     <button onClick={() => navigate('/admin/professionals')} className="px-6 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm">Descartar</button>
                     <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-red-600 hover:bg-red-600/90 disabled:opacity-50 glow-red text-white px-8 py-3 rounded-xl text-[11px] uppercase font-medium tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-red-600/20 transition-all transform hover:-translate-y-[1px]"
                     >
                         <span className="material-symbols-outlined text-lg">{saving ? 'sync' : 'check'}</span>
                         {saving ? 'Salvando...' : 'Salvar Alterações'}
                     </button>
                 </div>
            </div>
        </div>

        {/* Photo Upload Modal */}
        {isPhotoOptionOpen && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm animate-fadeIn shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-medium text-slate-900 dark:text-white text-lg tracking-tight">Adicionar {photoTarget === 'profile' ? 'Foto de Perfil' : 'ao Portfólio'}</h3>
                        <button onClick={() => setIsPhotoOptionOpen(false)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-slate-50 dark:bg-[#151515] hover:bg-red-50 dark:hover:bg-red-500/5 border border-slate-200 dark:border-white/5 hover:border-red-300 dark:hover:border-red-500/30 cursor-pointer transition-all group shadow-sm">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                                ref={fileInputRef}
                            />
                            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform">upload_file</span>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 uppercase tracking-[0.2em] transition-colors mt-2">Galeria</span>
                        </label>
                        <button 
                            onClick={startCamera}
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-slate-50 dark:bg-[#151515] hover:bg-red-50 dark:hover:bg-red-500/5 border border-slate-200 dark:border-white/5 hover:border-red-300 dark:hover:border-red-500/30 cursor-pointer transition-all group shadow-sm"
                        >
                            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform">photo_camera</span>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 uppercase tracking-[0.2em] transition-colors mt-2">Câmera</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Camera Modal */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[70] bg-slate-900/90 dark:bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-fadeIn">
                <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto bg-black"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 items-center">
                        <button 
                            onClick={() => {
                                if (cameraStream) {
                                    cameraStream.getTracks().forEach(track => track.stop());
                                    setCameraStream(null);
                                }
                                setIsCameraOpen(false);
                            }} 
                            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-600 transition-all backdrop-blur-md"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 group hover:border-red-400 transition-colors">
                            <div className="w-full h-full bg-white group-hover:bg-red-500 rounded-full hover:scale-90 transition-all"></div>
                        </button>
                        <div className="w-12 h-12"></div>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Goal Modal */}
        {isGoalModalOpen && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm animate-fadeIn shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-medium text-slate-900 dark:text-white text-lg tracking-tight">Alterar Meta</h3>
                        <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSaveGoal} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
                                {editingGoalType === 'newClients' ? 'Novos Clientes (Meta Mensal)' : 'Faturamento (Meta Mensal em R$)'}
                            </label>
                            <input 
                                type="number" 
                                name="target" 
                                defaultValue={goals[editingGoalType as 'newClients' | 'faturamento'].target} 
                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-red-600 outline-none shadow-inner transition-colors" 
                                min="1"
                            />
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="w-full bg-red-600 hover:bg-red-600/90 glow-red text-white text-[11px] font-medium tracking-[0.2em] uppercase py-3 rounded-xl shadow-xl shadow-red-600/20 transition-all transform hover:-translate-y-[1px]">
                                Salvar Meta
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

export default AdminProfessionalProfile;


