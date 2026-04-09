import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';

const BarberDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Estados para gerenciamento do portfólio e modais
  const [portfolioImages, setPortfolioImages] = useState<string[]>([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuATKQRjDIpf-pqwGAgQK7Ky6QMsw00MtNlf9zTnZx0J2vVPiih7l6eUN4LISfVwM8vb2bVryLFzyHlKz-RMGVvH83PpwQNCZd6ddM34PNmSP-ancTkXa30kUMdFbfhTS0vg2NpRe3Co7pROB7Aeob2tJYCv-6eX5JBYoizAfkieXO8UmhGe9DdQWADwcwvwZtUCN34Ew8MuN3zpCmDcrofDlGqFhmgIfaDwdSNfPF0HWg8DgIhH0gA7pc7GyQ3BPZjYnYIz1RrYmEyP',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAB0ImOdnrJqB-VsqR0XgSmBPFewZe0ikbkOH_LFWXzd48V9SVpiOLkq4SJH7pIgrmg3HIysZ4UUFRNpykJh_naDHbwkjhGoIIlYKNzdd76TgrzXMCsuujvVns7Hl5kOaGLumQVqFTtoqSo1Ti0S-qOwfBgNoJWAL4TY5oYPWYl76PQSlgNIy_Ef9L0UHh8ewpn5ujqtgyZ2ukBT31KaENYPTHqDmvNSBVUGDajWYE5bctBi48HUcYb56kCDS9kg8QhlWYcqQ4WgvST',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD57Ve4As7oByFHpble6BcHauLSAIwvW6QOtiamt4JgsYJ2v9droy-UjCjUM1F16jDWyQX7nFcD_7uJUdTM_qjZkMKfypvUmwX5etuUxUJc5RHL86I4HvUGb-JH7OhOvYnnUYmcG7IScTMadgcL1D5BsTmLUSVpuUJUtKrYsxutIczk4s7xGXxTLdUGF4vJK26zjbYnpni92w1JmE9ueaXv8VANEUGnLFTk2-s-snos0TD5lshI4pwHBYNmcyc6lYsti-1ecwVbdMhR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdBsYYaNF5YLSbg4rn02INQP5HZd0hg5Vqpx0oxshsoMDmYgGwVbSwEr_X9md69TR4tQjEOqtC71UsLHs67-TOm844gJxqLdTr7D7OPxeCRpLMu3Ohn2_90yFAtjku_YxCPW9tcFd3z0EoljCF7DUS0elqbiqbQS7NaJqsT21J7_iYkzcvy-vmD-SHbuVOTGVzrcehHn3xbMA-km2NMrCOkVS8b_T5XMogTJ3rqA_julJyzUEvqlVdWjz6Cge1YKZQ-kRCEdWNp6IZ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAxKi2gOr-wDovbLGaj4b6zRkEub-igEorLYpqU8UO5xtZ6JU_Z7ClcNe_q8cQU09bEzPRjCiurIqXFJRNsaIkFbCG5zVlFRXjOMDZPIEWXkllC7sQnbJpLIZ0eCqHMqB84wRT1s4tlr_440dZvmIOK1ev_a0e-ZGQTqxXpmxJls2RUzqwi5Sfoa3xR1faXUl9In8l011j6kNT6kzc7z6bVPlynVgEPehpPE-YcrA-P6Fgqa_ntrJRV_-fd-6GpaAgneoMAwIGLmUD9'
  ]);

  const [isPhotoOptionOpen, setIsPhotoOptionOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<{
    customer: string;
    service: string;
    time: string;
    preferences: string;
    photos: string[];
  } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Estado para o seletor de mês do faturamento
  const [selectedMonth, setSelectedMonth] = useState('2023-10');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(2023);

  // Estados para bloquear agenda
  const [isBlockAgendaOpen, setIsBlockAgendaOpen] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Estados dos seletores customizados
  const [isBlockDatePickerOpen, setIsBlockDatePickerOpen] = useState(false);
  const [isBlockEndDatePickerOpen, setIsBlockEndDatePickerOpen] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Helper para os horários (das 08:00 às 22:30)
  const timeSlots = [];
  for (let h = 8; h <= 22; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa a câmera diretamente no evento de clique para garantir permissão do navegador
  const startCamera = async () => {
    // Não fechamos o modal de opções imediatamente para manter o contexto do evento de clique
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setIsPhotoOptionOpen(false); // Fecha opções apenas após sucesso
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setIsPhotoOptionOpen(false);
      alert("Não foi possível acessar a câmera. Verifique se você permitiu o acesso no navegador.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Conecta o stream ao elemento de vídeo quando disponível
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => console.error("Erro ao reproduzir vídeo:", err));
    }
  }, [isCameraOpen, cameraStream]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Manipuladores de upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPortfolioImages([...portfolioImages, reader.result as string]);
        setIsPhotoOptionOpen(false);
      };
      reader.readAsDataURL(file);
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
        // Desenha a imagem
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/png');
        setPortfolioImages([...portfolioImages, imageDataUrl]);
        stopCamera();
      }
    }
  };

  const deletePhoto = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreview = (e: React.MouseEvent, src: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewImage(src);
  };

  // Lógica mock para retornar valores de faturamento baseados no mês/ano
  const getMonthlyData = (monthStr: string) => {
    if (!monthStr) return { value: 'R$ 12.450,00', growth: '+8%' };

    const [year, month] = monthStr.split('-').map(Number);
    
    // Algoritmo determinístico para gerar valores baseados no ano e mês
    // Garante que mudar o ano altere os valores
    const baseValue = 12000 + ((year - 2023) * 1500);
    const seasonalVariation = Math.sin(month) * 800;
    const finalValue = Math.max(0, baseValue + seasonalVariation);
    
    const value = finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Crescimento simulado
    const isPositive = (year + month) % 2 !== 0;
    const percent = ((year + month) % 15) + 2;
    const growth = `${isPositive ? '+' : '-'}${percent}%`;

    return { value, growth };
  };

  // Controle do Picker Customizado
  const toggleDatePicker = () => {
    if (!isDatePickerOpen) {
       // Sincroniza o ano do picker com o ano selecionado ao abrir
       const [y] = selectedMonth.split('-');
       setPickerYear(parseInt(y));
    }
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  const monthlyData = getMonthlyData(selectedMonth);

  const months = [
    { name: 'jan', val: '01' }, { name: 'fev', val: '02' }, { name: 'mar', val: '03' },
    { name: 'abr', val: '04' }, { name: 'mai', val: '05' }, { name: 'jun', val: '06' },
    { name: 'jul', val: '07' }, { name: 'ago', val: '08' }, { name: 'set', val: '09' },
    { name: 'out', val: '10' }, { name: 'nov', val: '11' }, { name: 'dez', val: '12' },
  ];

  return (
    <div className="bg-background-dark font-sans antialiased text-white selection:bg-primary/30 min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md bg-black/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <RazorIcon className="w-9 h-9 text-slate-200 drop-shadow-lg" />
                <h1 className="text-xl font-medium tracking-tight uppercase text-white uppercase italic hidden sm:block">
                  BARBER <span className="text-primary">KING</span>
                </h1>
              </div>
              <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm leading-none">Ricardo Silva</span>
                <span className="text-slate-400 text-[10px] font-medium tracking-[0.2em] uppercase">Unidade Jardins • Professional Barber</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background-dark"></span>
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-medium">
                RS
              </div>
              <button 
                onClick={() => navigate('/')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium text-white tracking-tight uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_today</span>
                  Sua Agenda de Hoje
                </h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsBlockAgendaOpen(true)} className="px-4 py-2 bg-danger-red/10 text-danger-red text-sm font-medium rounded-lg hover:bg-danger-red hover:text-white transition-all flex items-center gap-2 border border-danger-red/20 group">
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        <span className="hidden sm:inline">Bloquear Horário</span>
                    </button>
                    <span className="hidden md:inline text-xs font-medium text-slate-500 uppercase tracking-widest">3 Pendentes</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-card-dark border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl px-4 py-3 min-w-[80px]">
                      <span className="text-primary font-medium text-xl">09:00</span>
                      <span className="text-slate-500 text-[10px] font-medium tracking-[0.2em] uppercase">Hoje</span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white font-medium text-lg">Marcos Oliveira</h3>
                      <p className="text-slate-400 text-sm">Corte Degradê + Barba Terapia</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setSelectedAppointment({
                            customer: 'Marcos Oliveira',
                            service: 'Corte Degradê + Barba Terapia',
                            time: '09:00',
                            preferences: 'Cliente prefere corte na tesoura nas laterais, sem máquina. Gosta da barba bem desenhada e alinhada com toalha quente.',
                            photos: [
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuATKQRjDIpf-pqwGAgQK7Ky6QMsw00MtNlf9zTnZx0J2vVPiih7l6eUN4LISfVwM8vb2bVryLFzyHlKz-RMGVvH83PpwQNCZd6ddM34PNmSP-ancTkXa30kUMdFbfhTS0vg2NpRe3Co7pROB7Aeob2tJYCv-6eX5JBYoizAfkieXO8UmhGe9DdQWADwcwvwZtUCN34Ew8MuN3zpCmDcrofDlGqFhmgIfaDwdSNfPF0HWg8DgIhH0gA7pc7GyQ3BPZjYnYIz1RrYmEyP'
                            ]
                          });
                          setIsDetailsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        DETALHES
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-card-dark border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl px-4 py-3 min-w-[80px]">
                      <span className="text-primary font-medium text-xl">10:30</span>
                      <span className="text-slate-500 text-[10px] font-medium tracking-[0.2em] uppercase">Hoje</span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white font-medium text-lg">Felipe Santos</h3>
                      <p className="text-slate-400 text-sm">Corte Clássico Tesoura</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setSelectedAppointment({
                            customer: 'Felipe Santos',
                            service: 'Corte Clássico Tesoura',
                            time: '10:30',
                            preferences: 'Gosta de conversar sobre futebol. Corte tradicional, apenas tesoura, franja levemente caída para a direita.',
                            photos: []
                          });
                          setIsDetailsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        DETALHES
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-card-dark border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl px-4 py-3 min-w-[80px]">
                      <span className="text-primary font-medium text-xl">14:00</span>
                      <span className="text-slate-500 text-[10px] font-medium tracking-[0.2em] uppercase">Hoje</span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white font-medium text-lg">André Luiz</h3>
                      <p className="text-slate-400 text-sm">Sobrancelha + Corte</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setSelectedAppointment({
                            customer: 'André Luiz',
                            service: 'Sobrancelha + Corte',
                            time: '14:00',
                            preferences: 'Sobrancelha apenas limpa, sem afinar muito. Corte disfarçado navalhado.',
                            photos: [
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuAB0ImOdnrJqB-VsqR0XgSmBPFewZe0ikbkOH_LFWXzd48V9SVpiOLkq4SJH7pIgrmg3HIysZ4UUFRNpykJh_naDHbwkjhGoIIlYKNzdd76TgrzXMCsuujvVns7Hl5kOaGLumQVqFTtoqSo1Ti0S-qOwfBgNoJWAL4TY5oYPWYl76PQSlgNIy_Ef9L0UHh8ewpn5ujqtgyZ2ukBT31KaENYPTHqDmvNSBVUGDajWYE5bctBi48HUcYb56kCDS9kg8QhlWYcqQ4WgvST',
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuD57Ve4As7oByFHpble6BcHauLSAIwvW6QOtiamt4JgsYJ2v9droy-UjCjUM1F16jDWyQX7nFcD_7uJUdTM_qjZkMKfypvUmwX5etuUxUJc5RHL86I4HvUGb-JH7OhOvYnnUYmcG7IScTMadgcL1D5BsTmLUSVpuUJUtKrYsxutIczk4s7xGXxTLdUGF4vJK26zjbYnpni92w1JmE9ueaXv8VANEUGnLFTk2-s-snos0TD5lshI4pwHBYNmcyc6lYsti-1ecwVbdMhR'
                            ]
                          });
                          setIsDetailsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        DETALHES
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium text-white tracking-tight uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">photo_library</span>
                  Seu Portfólio
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portfolioImages.map((src, i) => (
                  <div key={i} className="portfolio-item relative aspect-square rounded-2xl overflow-hidden bg-card-dark border border-white/5 group">
                    <img alt={`Portfolio work ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={src} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        type="button"
                        onClick={(e) => handlePreview(e, src)}
                        className="w-10 h-10 rounded-full bg-primary/80 text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => deletePhoto(e, i)}
                        className="w-10 h-10 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer z-10"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setIsPhotoOptionOpen(true)}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-card-dark/30 group"
                >
                  <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-3xl">add_a_photo</span>
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-primary uppercase tracking-widest">Novo</span>
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">monitoring</span>
                Métricas de Performance
              </h2>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Faturamento Diário */}
                <div className="bg-card-dark border border-white/5 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase">Faturamento Hoje</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-medium text-white">R$ 485,00</span>
                    <span className="text-emerald-500 text-xs font-medium">+12%</span>
                  </div>
                </div>

                {/* Faturamento Mensal (Com Seletor Customizado) */}
                <div className="bg-card-dark border border-white/5 p-5 rounded-2xl relative z-20 overflow-visible">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase">Faturamento Mensal</span>
                        <div className="relative">
                            <button 
                                onClick={toggleDatePicker}
                                className="flex items-center gap-2 bg-[#151515] hover:bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 transition-all group"
                            >
                                <span className="text-xs font-medium text-white uppercase tracking-wide">
                                    {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                </span>
                                <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-white">calendar_month</span>
                            </button>

                            {isDatePickerOpen && (
                                <div className="absolute top-full right-0 mt-2 w-72 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-fadeIn">
                                    {/* Year Selector */}
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                                        <button 
                                            onClick={() => setPickerYear(prev => prev - 1)}
                                            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                                        </button>
                                        <span className="font-medium text-white text-lg">{pickerYear}</span>
                                        <button 
                                            onClick={() => setPickerYear(prev => prev + 1)}
                                            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                                        </button>
                                    </div>
                                    
                                    {/* Month Grid */}
                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        {months.map((m) => {
                                            const isSelected = parseInt(selectedMonth.split('-')[1]) === parseInt(m.val) && parseInt(selectedMonth.split('-')[0]) === pickerYear;
                                            return (
                                                <button
                                                    key={m.val}
                                                    onClick={() => {
                                                        setSelectedMonth(`${pickerYear}-${m.val}`);
                                                        setIsDatePickerOpen(false);
                                                    }}
                                                    className={`py-2 rounded-lg text-xs font-medium uppercase transition-colors ${
                                                        isSelected 
                                                        ? 'bg-primary text-white' 
                                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {m.name}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex justify-between items-center border-t border-white/10 pt-3">
                                        <button 
                                            onClick={() => setIsDatePickerOpen(false)}
                                            className="text-xs font-medium text-slate-500 hover:text-white transition-colors"
                                        >
                                            Limpar
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const now = new Date();
                                                const currentYear = now.getFullYear();
                                                const currentMonth = now.getMonth() + 1;
                                                setPickerYear(currentYear);
                                                setSelectedMonth(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
                                                setIsDatePickerOpen(false);
                                            }}
                                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                        >
                                            Este mês
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1 relative z-10">
                        <span className="text-2xl font-medium text-white">{monthlyData.value}</span>
                        <span className={`text-xs font-medium ${monthlyData.growth.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                            {monthlyData.growth}
                        </span>
                    </div>
                </div>

                {/* Avaliação Média */}
                <div className="bg-card-dark border border-white/5 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase">Avaliação Média</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-medium text-white">4.9</span>
                    <div className="flex text-yellow-500">
                      {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-sm filled">star</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">notifications_active</span>
                Alertas Rápidos
              </h2>
              <div className="space-y-3">
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">add_task</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Novo agendamento</p>
                    <p className="text-xs text-slate-400 mt-0.5">Roberto via App às 16:30 hoje.</p>
                  </div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                    <span className="material-symbols-outlined text-lg">cancel</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Cancelamento</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tiago Souza cancelou o horário das 11:30.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Modal de Opções de Foto */}
        {isPhotoOptionOpen && (
            <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card-dark border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-fadeIn shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-medium text-white text-lg">Adicionar ao Portfólio</h3>
                        <button onClick={() => setIsPhotoOptionOpen(false)} className="text-slate-500 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-[#151515] hover:bg-white/5 border border-white/10 hover:border-primary/50 cursor-pointer transition-all group">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                                ref={fileInputRef}
                            />
                            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">upload_file</span>
                            <span className="text-xs font-medium text-white">Galeria</span>
                        </label>
                        <button 
                            onClick={startCamera}
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-[#151515] hover:bg-white/5 border border-white/10 hover:border-primary/50 cursor-pointer transition-all group"
                        >
                            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">photo_camera</span>
                            <span className="text-xs font-medium text-white">Câmera</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal da Câmera */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn">
                <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#1A1A1A]">
                    {/* Placeholder para carregamento */}
                    {!cameraStream && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#1A1A1A]">
                            <span className="material-symbols-outlined text-4xl text-slate-500 animate-spin">progress_activity</span>
                        </div>
                    )}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-auto bg-black min-h-[300px]"
                        onLoadedMetadata={(e) => e.currentTarget.play()}
                    ></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 items-center z-20">
                        <button 
                            onClick={stopCamera}
                            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all backdrop-blur-md"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-white rounded-full"></div>
                        </button>
                        <div className="w-12 h-12"></div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Preview de Imagem */}
        {previewImage && (
            <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setPreviewImage(null)}>
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-6 right-6 text-white hover:text-slate-300 transition-colors"
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
                <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                    onClick={(e) => e.stopPropagation()} 
                />
            </div>
        )}

        {/* Modal Bloquear Agenda */}
        {isBlockAgendaOpen && (
            <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-card-dark border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                    <button 
                        onClick={() => setIsBlockAgendaOpen(false)}
                        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                    
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-danger-red/10 flex items-center justify-center mb-6 text-danger-red border border-danger-red/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                            <span className="material-symbols-outlined text-3xl">event_busy</span>
                        </div>
                        <h3 className="text-2xl font-medium text-white tracking-tight uppercase mb-2">Bloquear Agenda</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">Selecione o período que deseja indisponibilizar para novos agendamentos.</p>
                    </div>

                    <div className="space-y-6">
                        {/* Start Data Selector */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-medium tracking-[0.2em] uppercase text-slate-400 pl-1">Data Início</label>
                                <div 
                                    onClick={() => {
                                        setIsBlockDatePickerOpen(!isBlockDatePickerOpen);
                                        setIsBlockEndDatePickerOpen(false);
                                        setIsStartTimePickerOpen(false);
                                        setIsEndTimePickerOpen(false);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-white/20 transition-colors group"
                                >
                                    <span className={blockDate ? 'text-white font-medium' : 'text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis'}>
                                        {blockDate ? new Date(blockDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Data de início'}
                                    </span>
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-xl">calendar_today</span>
                                </div>

                                {isBlockDatePickerOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-5 z-50 animate-fadeIn">
                                        <div className="flex items-center justify-between mb-4">
                                            <button 
                                                onClick={() => {
                                                    if (calendarMonth === 0) {
                                                        setCalendarMonth(11);
                                                        setCalendarYear(y => y - 1);
                                                    } else {
                                                        setCalendarMonth(m => m - 1);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <h4 className="text-sm font-medium text-white uppercase tracking-wider">
                                                {new Date(calendarYear, calendarMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </h4>
                                            <button 
                                                onClick={() => {
                                                    if (calendarMonth === 11) {
                                                        setCalendarMonth(0);
                                                        setCalendarYear(y => y + 1);
                                                    } else {
                                                        setCalendarMonth(m => m + 1);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                                <div key={i} className="text-center text-[10px] font-medium text-slate-500 py-1">{d}</div>
                                            ))}
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1">
                                            {/* Blanks */}
                                            {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, i) => (
                                                <div key={`blank-${i}`} className="h-8"></div>
                                            ))}
                                            
                                            {/* Days */}
                                            {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, i) => {
                                                const day = i + 1;
                                                const currentStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isSelected = blockDate === currentStr;
                                                const isToday = currentStr === new Date().toISOString().split('T')[0];
                                                
                                                return (
                                                    <button
                                                        key={`day-${day}`}
                                                        onClick={() => {
                                                            setBlockDate(currentStr);
                                                            setIsBlockDatePickerOpen(false);
                                                        }}
                                                        className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                                                            isSelected 
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                                            : isToday
                                                            ? 'bg-white/10 text-primary border border-primary/30 hover:bg-white/20'
                                                            : 'text-slate-300 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* End Data Selector */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-medium tracking-[0.2em] uppercase text-slate-400 pl-1">Data de Volta (Opcional)</label>
                                <div 
                                    onClick={() => {
                                        setIsBlockEndDatePickerOpen(!isBlockEndDatePickerOpen);
                                        setIsBlockDatePickerOpen(false);
                                        setIsStartTimePickerOpen(false);
                                        setIsEndTimePickerOpen(false);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-white/20 transition-colors group"
                                >
                                    <span className={blockEndDate ? 'text-white font-medium' : 'text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis'}>
                                        {blockEndDate ? new Date(blockEndDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Data de volta'}
                                    </span>
                                    {blockEndDate ? (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBlockEndDate('');
                                            }}
                                            className="material-symbols-outlined text-slate-500 hover:text-danger-red transition-colors text-xl"
                                        >
                                            close
                                        </button>
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-xl">calendar_today</span>
                                    )}
                                </div>

                                {isBlockEndDatePickerOpen && (
                                    <div className="absolute top-full right-0 w-[280px] mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-5 z-50 animate-fadeIn">
                                        <div className="flex items-center justify-between mb-4">
                                            <button 
                                                onClick={() => {
                                                    if (calendarMonth === 0) {
                                                        setCalendarMonth(11);
                                                        setCalendarYear(y => y - 1);
                                                    } else {
                                                        setCalendarMonth(m => m - 1);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <h4 className="text-sm font-medium text-white uppercase tracking-wider">
                                                {new Date(calendarYear, calendarMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </h4>
                                            <button 
                                                onClick={() => {
                                                    if (calendarMonth === 11) {
                                                        setCalendarMonth(0);
                                                        setCalendarYear(y => y + 1);
                                                    } else {
                                                        setCalendarMonth(m => m + 1);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                                <div key={i} className="text-center text-[10px] font-medium text-slate-500 py-1">{d}</div>
                                            ))}
                                        </div>
                                        
                                        <div className="grid grid-cols-7 gap-1">
                                            {/* Blanks */}
                                            {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, i) => (
                                                <div key={`blank-end-${i}`} className="h-8"></div>
                                            ))}
                                            
                                            {/* Days */}
                                            {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, i) => {
                                                const day = i + 1;
                                                const currentStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isSelected = blockEndDate === currentStr;
                                                const isToday = currentStr === new Date().toISOString().split('T')[0];
                                                const isDisabled = blockDate ? currentStr < blockDate : false;
                                                
                                                return (
                                                    <button
                                                        key={`day-end-${day}`}
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            setBlockEndDate(currentStr);
                                                            setIsBlockEndDatePickerOpen(false);
                                                        }}
                                                        className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                                                            isDisabled
                                                            ? 'text-slate-600 opacity-50 cursor-not-allowed'
                                                            : isSelected 
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                                            : isToday
                                                            ? 'bg-white/10 text-primary border border-primary/30 hover:bg-white/20'
                                                            : 'text-slate-300 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                {/* Start Time */}
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-medium tracking-[0.2em] uppercase text-slate-400 pl-1">Início</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xl">schedule</span>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={5}
                                            placeholder="--:--"
                                            value={blockStartTime}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^\d]/g, '');
                                                if (val.length > 2) val = val.substring(0, 2) + ':' + val.substring(2, 4);
                                                setBlockStartTime(val);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setIsStartTimePickerOpen(false);
                                                    if (blockStartTime) {
                                                        let val = blockStartTime.replace(/[^\d]/g, '');
                                                        if (val.length === 1) val = `0${val}00`;
                                                        else if (val.length === 2) val = `${val}00`;
                                                        else if (val.length === 3) val = `${val.substring(0, 2)}0${val.substring(2, 3)}`;
                                                        let hh = parseInt(val.substring(0, 2) || '0', 10);
                                                        let mm = parseInt(val.substring(2, 4) || '0', 10);
                                                        if (hh > 23) hh = 23;
                                                        if (mm > 59) mm = 59;
                                                        setBlockStartTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
                                                    }
                                                }
                                            }}
                                            onClick={() => {
                                                setIsStartTimePickerOpen(true);
                                                setIsEndTimePickerOpen(false);
                                                setIsBlockDatePickerOpen(false);
                                                setIsBlockEndDatePickerOpen(false);
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setIsStartTimePickerOpen(false), 200);
                                                if (blockStartTime) {
                                                    let val = blockStartTime.replace(/[^\d]/g, '');
                                                    if (val.length === 1) val = `0${val}00`;
                                                    else if (val.length === 2) val = `${val}00`;
                                                    else if (val.length === 3) val = `${val.substring(0, 2)}0${val.substring(2, 3)}`;
                                                    let hh = parseInt(val.substring(0, 2) || '0', 10);
                                                    let mm = parseInt(val.substring(2, 4) || '0', 10);
                                                    if (hh > 23) hh = 23;
                                                    if (mm > 59) mm = 59;
                                                    setBlockStartTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-danger-red focus:ring-0 transition-colors outline-none placeholder:text-slate-500"
                                        />
                                    </div>

                                    {isStartTimePickerOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 animate-fadeIn max-h-60 overflow-y-auto custom-scrollbar">
                                            {timeSlots.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setBlockStartTime(time);
                                                        setIsStartTimePickerOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors border-b border-white/5 last:border-0 ${
                                                        blockStartTime === time ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* End Time */}
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-medium tracking-[0.2em] uppercase text-slate-400 pl-1">Término</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xl">schedule</span>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={5}
                                            placeholder="--:--"
                                            value={blockEndTime}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^\d]/g, '');
                                                if (val.length > 2) val = val.substring(0, 2) + ':' + val.substring(2, 4);
                                                setBlockEndTime(val);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setIsEndTimePickerOpen(false);
                                                    if (blockEndTime) {
                                                        let val = blockEndTime.replace(/[^\d]/g, '');
                                                        if (val.length === 1) val = `0${val}00`;
                                                        else if (val.length === 2) val = `${val}00`;
                                                        else if (val.length === 3) val = `${val.substring(0, 2)}0${val.substring(2, 3)}`;
                                                        let hh = parseInt(val.substring(0, 2) || '0', 10);
                                                        let mm = parseInt(val.substring(2, 4) || '0', 10);
                                                        if (hh > 23) hh = 23;
                                                        if (mm > 59) mm = 59;
                                                        setBlockEndTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
                                                    }
                                                }
                                            }}
                                            onClick={() => {
                                                setIsEndTimePickerOpen(true);
                                                setIsStartTimePickerOpen(false);
                                                setIsBlockDatePickerOpen(false);
                                                setIsBlockEndDatePickerOpen(false);
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setIsEndTimePickerOpen(false), 200);
                                                if (blockEndTime) {
                                                    let val = blockEndTime.replace(/[^\d]/g, '');
                                                    if (val.length === 1) val = `0${val}00`;
                                                    else if (val.length === 2) val = `${val}00`;
                                                    else if (val.length === 3) val = `${val.substring(0, 2)}0${val.substring(2, 3)}`;
                                                    let hh = parseInt(val.substring(0, 2) || '0', 10);
                                                    let mm = parseInt(val.substring(2, 4) || '0', 10);
                                                    if (hh > 23) hh = 23;
                                                    if (mm > 59) mm = 59;
                                                    setBlockEndTime(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-danger-red focus:ring-0 transition-colors outline-none placeholder:text-slate-500"
                                        />
                                    </div>

                                    {isEndTimePickerOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 animate-fadeIn max-h-60 overflow-y-auto custom-scrollbar">
                                            {timeSlots.filter(t => !blockStartTime || t > blockStartTime).map(time => (
                                                <button
                                                    key={time}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setBlockEndTime(time);
                                                        setIsEndTimePickerOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors border-b border-white/5 last:border-0 ${
                                                        blockEndTime === time ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium tracking-[0.2em] uppercase text-slate-400 pl-1">Motivo <span className="text-slate-600 opacity-60 lowercase font-normal">(opcional)</span></label>
                            <textarea 
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="Ex: Almoço, consulta médica, licença..."
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-danger-red focus:ring-0 transition-colors outline-none resize-none overflow-hidden"
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button 
                                onClick={() => {
                                    setIsBlockAgendaOpen(false);
                                    // mock reset
                                    setBlockDate('');
                                    setBlockStartTime('');
                                    setBlockEndTime('');
                                    setBlockReason('');
                                }}
                                className="w-full py-4 bg-danger-red hover:bg-[#ff3333] text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">block</span>
                                CONFIRMAR BLOQUEIO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {/* Modal Detalhes do Atendimento */}
        {isDetailsModalOpen && selectedAppointment && (
            <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-card-dark border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
                    <button 
                        onClick={() => setIsDetailsModalOpen(false)}
                        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                    
                    <div className="mb-6 pr-12 shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium tracking-[0.2em] uppercase">
                                {selectedAppointment.time}
                            </span>
                            <span className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase">Detalhes do Agendamento</span>
                        </div>
                        <h2 className="text-2xl font-medium text-white">{selectedAppointment.customer}</h2>
                        <p className="text-primary font-medium mt-1">{selectedAppointment.service}</p>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6 flex-grow">
                        <div className="bg-[#151515] p-5 rounded-2xl border border-white/5">
                            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">speaker_notes</span>
                                Preferências do Cliente
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {selectedAppointment.preferences}
                            </p>
                        </div>

                        {selectedAppointment.photos && selectedAppointment.photos.length > 0 && (
                            <div>
                                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">photo_library</span>
                                    Fotos de Referência
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedAppointment.photos.map((photo, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={photo} alt={`Foto referência ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={(e) => handlePreview(e, photo)}>
                                                <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default BarberDashboard;
