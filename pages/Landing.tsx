import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../components/RazorIcon';
import heroVideo from '@/Barber_cutting_beard_202603221207.mp4';
import { Reveal } from '../components/Reveal';
import { TiltCard } from '../components/TiltCard';
import { supabase } from '../lib/supabase';

interface Matriz {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
}

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [matrizes, setMatrizes] = useState<Matriz[]>([]);
  const [loadingMatrizes, setLoadingMatrizes] = useState(true);

  useEffect(() => {
    const fetchMatrizes = async () => {
      const { data } = await supabase
        .from('matrizes')
        .select('id, name, address, phone, maps_url')
        .order('name');
      if (data) setMatrizes(data);
      setLoadingMatrizes(false);
    };
    fetchMatrizes();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="dark">
      <div className="bg-background-dark text-slate-100 transition-colors duration-300 min-h-screen relative">
        {/* Cinematic Noise Overlay */}
        <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-2xl bg-black/40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <RazorIcon className="w-9 h-9 text-slate-200 drop-shadow-lg" />
                <h1 className="text-xl text-white italic uppercase tracking-[0.1em]">
                  BARBER <span className="text-red-500">KING</span>
                </h1>
              </div>
              <nav className="hidden md:flex items-center space-x-8">
                <button onClick={() => scrollToSection('services')} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Tratamentos</button>
                <button onClick={() => scrollToSection('team')} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Profissionais</button>
                <button onClick={() => scrollToSection('locations')} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Localização</button>
                <button onClick={() => scrollToSection('plans')} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Planos</button>
              </nav>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-red-600 hover:bg-red-600/90 text-white px-5 py-2 rounded-lg text-sm transition-all shadow-lg shadow-red-600/20 font-medium"
                >
                  AGENDAR
                </button>
              </div>
            </div>
          </div>
        </header>

        <main>
          {/* Seção Hero - Foto Principal */}
          <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden" id="home">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background-dark z-10"></div>
              <video
                autoPlay
                loop
                muted
                playsInline
                onLoadedData={() => setIsVideoLoaded(true)}
                className={`w-full h-full object-cover object-[55%_25%] md:object-center transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={heroVideo}
              />
            </div>
            <div className="relative z-20 w-full h-full flex flex-col items-start text-left justify-center pb-20 px-6 md:px-12 lg:px-20 xl:px-24">
              <div className="transition-transform duration-100 ease-out will-change-transform w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl" id="hero-content">
                <p className={`text-sm mb-4 text-[#888888] font-medium tracking-[0.2em] uppercase ${isVideoLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
                  Estilo & Tradição
                </p>
                <h1 className={`text-[3.25rem] leading-none sm:text-5xl md:text-6xl lg:text-7xl xl:text-[6.5rem] mb-6 sm:mb-8 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] font-medium tracking-tight uppercase ${isVideoLoaded ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                  A Excelência em <br className="hidden sm:block" />
                  <span className="text-red-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse inline-block mt-2 sm:mt-0">Cada Corte</span>
                </h1>
                <p className={`text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 text-[#cccccc] max-w-3xl ${isVideoLoaded ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                  Redefina seu visual com quem entende do assunto.
                </p>
                <div className={`flex flex-col sm:flex-row items-start gap-4 ${isVideoLoaded ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto px-10 py-5 bg-red-600 text-white text-sm rounded-xl transition-all shadow-2xl shadow-red-600/30 transform hover:-translate-y-1 hover:bg-red-600/90 glow-red font-medium tracking-[0.2em] uppercase"
                  >
                    AGENDAR AGORA
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Cintas Rotativas (Infinite Marquee) - Minimalist Premium */}
          <div className="relative py-4 bg-black overflow-hidden flex border-y border-white/5 z-20 w-full hover-pause">
            <div className="animate-marquee flex-shrink-0 text-slate-400 font-medium tracking-[0.4em] sm:tracking-[0.5em] uppercase text-[10px] sm:text-xs whitespace-nowrap will-change-transform">
              <span className="mx-12 text-red-600/60">✦</span> A EXCELÊNCIA EM CADA CORTE
              <span className="mx-12 text-red-600/60">✦</span> TRADIÇÃO & ESTILO
              <span className="mx-12 text-red-600/60">✦</span> PREMIUM BARBERSHOP
              <span className="mx-12 text-red-600/60">✦</span> NAVALHA AFIADA
              <span className="mx-12 text-red-600/60">✦</span> CUIDADO MASCULINO
              <span className="mx-12 text-red-600/60">✦</span> EST. 2023
              <span className="mx-12 text-red-600/60">✦</span> A EXCELÊNCIA EM CADA CORTE
            </div>
            <div className="animate-marquee flex-shrink-0 text-slate-400 font-medium tracking-[0.4em] sm:tracking-[0.5em] uppercase text-[10px] sm:text-xs whitespace-nowrap will-change-transform" aria-hidden="true">
              <span className="mx-12 text-red-600/60">✦</span> A EXCELÊNCIA EM CADA CORTE
              <span className="mx-12 text-red-600/60">✦</span> TRADIÇÃO & ESTILO
              <span className="mx-12 text-red-600/60">✦</span> PREMIUM BARBERSHOP
              <span className="mx-12 text-red-600/60">✦</span> NAVALHA AFIADA
              <span className="mx-12 text-red-600/60">✦</span> CUIDADO MASCULINO
              <span className="mx-12 text-red-600/60">✦</span> EST. 2023
              <span className="mx-12 text-red-600/60">✦</span> A EXCELÊNCIA EM CADA CORTE
            </div>
          </div>

          {/* 1. Tratamentos (Serviços) com FOTOS */}
          <section className="py-32 bg-background-dark relative overflow-hidden" id="services">
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <span className="text-red-500 text-xs mb-3 block font-medium tracking-[0.2em] uppercase">Menu de Serviços</span>
                <h2 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-4 italic font-medium tracking-tight uppercase">Tratamentos Premium</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Cuidado completo para o homem moderno, do corte clássico aos cuidados com a barba e estética masculina.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Corte de Cabelo',
                    price: 'R$ 55',
                    icon: 'content_cut',
                    desc: 'Tesoura ou máquina, com lavagem e finalização com produtos premium.',
                    img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop'
                  },
                  {
                    title: 'Barba Terapia',
                    price: 'R$ 45',
                    icon: 'face',
                    desc: 'Toalha quente, esfoliação, alinhamento dos fios e hidratação profunda.',
                    img: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000&auto=format&fit=crop'
                  },
                  {
                    title: 'Tingir Cabelo',
                    price: 'R$ 75',
                    icon: 'palette',
                    desc: 'Coloração profissional, platinado ou camuflagem de brancos para renovar o visual.',
                    img: 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=1000&auto=format&fit=crop'
                  },
                ].map((service, idx) => (
                  <Reveal key={idx} delay={idx * 150} direction="up">
                    <TiltCard onClick={() => navigate('/login')} className="group relative rounded-2xl overflow-hidden h-96 border border-white/10 hover:border-red-600/50 transition-all shadow-lg cursor-pointer">
                      {/* Imagem de Fundo */}
                      <div className="absolute inset-0">
                        <img
                          src={service.img}
                          alt={service.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 opacity-90 group-hover:opacity-80 transition-opacity"></div>
                      </div>

                      {/* Conteúdo */}
                      <div className="relative h-full p-8 flex flex-col justify-between z-10">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 group-hover:bg-red-600 group-hover:border-red-600 transition-colors font-medium tracking-[0.2em] uppercase">
                            <span className="material-symbols-outlined text-2xl">{service.icon}</span>
                          </div>
                          <span className="text-base text-white bg-red-600/90 px-4 py-1.5 rounded-full shadow-lg font-medium tracking-[0.2em] uppercase">{service.price}</span>
                        </div>

                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="text-2xl text-white mb-2 font-medium tracking-tight uppercase">{service.title}</h3>
                          <p className="text-slate-300 text-base leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-0 group-hover:h-auto overflow-hidden">
                            {service.desc}
                          </p>
                        </div>
                      </div>
                    </TiltCard>
                  </Reveal>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-sm text-white border-b border-red-600 pb-1 hover:text-red-500 transition-colors font-medium">
                  VER MENU COMPLETO <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. Profissionais (Equipe) */}
          <section className="py-32 bg-card-dark border-y border-white/5 relative overflow-hidden" id="team">
            <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-[150px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-6 text-center md:text-left">
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-red-500 text-xs mb-3 block font-medium tracking-[0.2em] uppercase">Nosso Time</span>
                  <h2 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 italic font-medium tracking-tight uppercase">Mestres da Navalha</h2>
                </div>
                <p className="text-slate-500 max-w-md text-sm md:text-right text-center md:text-left">
                  Nossa equipe é formada por profissionais premiados e constantemente treinados nas últimas tendências internacionais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { name: 'Ricardo Barbosa', role: 'Master Barber', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtndJmu06mt1ColYaOvFbmU3WRsXuk0tZhua9N1c4-TQHxAbOXMPNPXSHVuZ5iAamSNRS6RSF9coXCnX80Pti4r63ml5k7aC9AhI6QYDUmCISTsIB_Le7w6aWcl1p3avhU6DdyXp5BgIFiSmUK1kgGu0kYElGJ86W7WnM8Pto4nC7aR08FxmPWiicvvi6e6MGoGbLwvf0PCcJBPEo_8T3cc6rITOnb5qCy4Sv93yI0Ed7t5gLj66TcJcfGvjzylfU2YByX_ZbPuMeu' },
                  { name: 'Marcos Lima', role: 'Especialista em Cortes', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj8J52JorZbeooq2OelHw8aezRiX1OQefRospfrOy_QkMJaaKNPBd-s6Pu79hCjPHME5sOYlwP19LuNA7NaDYvCQ8g_G5BmQl1l--sd3xOSeok7rxrOXC25zkilCTFyHtFN8gfof0cNjt4EvBPmmLg46SFXYnBGnBaoiTcJEFCYQTHRSpJkBVcuvgsDr6PkiOo0Pi06LLtkdUoe-7V0ymAYfyRC2d4Ow1pMzZWK_ppMs7MKHenlS-uX_HVbDtUlASZMYiuDEnBJO0q' },
                  { name: 'Lucas Neto', role: 'Barba & Visagismo', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO4he2LNQY6MAOfuu-q4jYjsxBzKs4uMS5T2ceI8a-LvfmzoUgd_q-F5-V3e69DJZv45YXbT8Ziea1WKLabUceXsc37atflhi82tWn1NK9sbC403utZMM8QSgjWm1xsG3wDPmemfNi4TcHMP0PYLEdlPhGO0tFx2ruiqRtvq8NA4gfhKp2j5-PUVonNSOXA4aKK4NRVvksB5GttqSdDja1VX85fVQo5qp_MkqyFYJzCcnvWH2_8_zqs7TEQGTqZ91RjP0rq7Ppo4dl' }
                ].map((member, i) => (
                  <Reveal key={i} delay={i * 200} direction="up">
                    <TiltCard className="group relative overflow-hidden rounded-2xl aspect-[3/4]">
                      <img src={member.img} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                        <p className="text-red-500 text-xs mb-1 font-medium tracking-[0.2em] uppercase">{member.role}</p>
                        <h3 className="text-2xl text-white font-medium tracking-tight uppercase">{member.name}</h3>
                        <button onClick={() => navigate('/login')} className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl text-white text-xs transition-all font-medium tracking-[0.2em] uppercase">
                          Agendar Horário
                        </button>
                      </div>
                    </TiltCard>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Localização (Unidades) */}
          <section className="py-32 bg-background-dark relative overflow-hidden" id="locations">
            <div className="absolute top-1/2 right-0 w-[500px] h-[500px] -translate-y-1/2 translate-x-1/4 bg-red-600/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <span className="text-red-500 text-xs mb-3 block font-medium tracking-[0.2em] uppercase">Onde Estamos</span>
                  <h2 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-6 italic font-medium tracking-tight uppercase">Nossas Unidades</h2>
                  <p className="text-slate-500 mb-10 leading-relaxed max-w-xl">
                    Ambientes climatizados, estacionamento próprio e o chopp sempre gelado esperando por você. Escolha a unidade mais próxima.
                  </p>

                  <div className="space-y-4 w-full max-w-md lg:max-w-none">
                    {loadingMatrizes ? (
                      /* Skeleton de carregamento */
                      [0, 1].map((i) => (
                        <div key={i} className="flex gap-4 sm:gap-6 p-6 rounded-2xl bg-card-dark border border-white/5 animate-pulse">
                          <div className="shrink-0 w-12 h-12 rounded-full bg-white/5" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-4 bg-white/5 rounded w-2/3" />
                            <div className="h-3 bg-white/5 rounded w-full" />
                            <div className="h-3 bg-white/5 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : matrizes.length === 0 ? (
                      <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-card-dark border border-white/5 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-3 opacity-30">store_mall_directory</span>
                        <p className="text-sm">Nossas unidades em breve.</p>
                      </div>
                    ) : (
                      matrizes.map((m, idx) => (
                        <div
                          key={m.id}
                          className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-2xl bg-card-dark border border-white/5 hover:border-red-600/30 transition-all text-left"
                        >
                          <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center mx-auto sm:mx-0 ${idx === 0 ? 'bg-red-600/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>
                            <span className="material-symbols-outlined">storefront</span>
                          </div>
                          <div className="flex flex-col items-center sm:items-start">
                            <h3 className="text-lg text-white mb-1 font-medium">{m.name}</h3>
                            {m.address && (
                              <p className="text-slate-400 text-sm mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-slate-500">location_on</span>
                                {m.address}
                              </p>
                            )}
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-1">
                              {m.phone && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <span className="material-symbols-outlined text-sm">call</span>
                                  {m.phone}
                                </span>
                              )}
                              {m.maps_url && (
                                <a
                                  href={m.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-sm">map</span>
                                  Ver no Google Maps
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button onClick={() => navigate('/login')} className="mt-8 mx-auto lg:mx-0 px-8 py-4 bg-white text-black rounded-xl hover:bg-slate-200 transition-all shadow-lg flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined">calendar_month</span>
                    AGENDAR VISITA
                  </button>
                </div>

                <div className="relative h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  {/* Placeholder para Mapa */}
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
                    alt="Mapa da Localização"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
                  <div className="absolute bottom-8 left-8 right-8 bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 text-white mb-2">
                      <span className="material-symbols-outlined text-red-500">pin_drop</span>
                      <span className="font-display font-medium">Fácil Acesso</span>
                    </div>
                    <p className="text-xs text-slate-400">Estamos localizados próximos às principais estações de metrô e contamos com convênio em estacionamentos parceiros.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Diferenciais (Reduzido para não poluir) */}
          <section className="py-32 bg-card-dark border-t border-white/5 relative overflow-hidden" id="differentials">
            <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] -translate-y-1/2 -translate-x-1/2 bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Reveal delay={0} direction="up">
                  <TiltCard className="group p-8 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-red-600/30 transition-all hover:bg-white/[0.04]">
                    <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-slate-200 mb-6 group-hover:scale-110 transition-transform p-3 shadow-lg">
                      <RazorIcon className="w-full h-full" />
                    </div>
                    <h3 className="text-xl text-white mb-3 font-medium">Clube de Fidelidade</h3>
                    <p className="text-slate-400 leading-relaxed">Acumule pontos a cada visita e troque por serviços exclusivos e produtos da nossa loja.</p>
                  </TiltCard>
                </Reveal>
                <Reveal delay={150} direction="up">
                  <TiltCard className="group p-8 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-red-600/30 transition-all hover:bg-white/[0.04]">
                    <div className="w-14 h-14 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">sports_bar</span>
                    </div>
                    <h3 className="text-xl text-white mb-3 font-medium">Bar & Lazer</h3>
                    <p className="text-slate-400 leading-relaxed">Aguarde seu horário jogando sinuca ou desfrutando de uma cerveja artesanal gelada por nossa conta.</p>
                  </TiltCard>
                </Reveal>
                <Reveal delay={300} direction="up">
                  <TiltCard className="group p-8 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-red-600/30 transition-all hover:bg-white/[0.04]">
                    <div className="w-14 h-14 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">chair</span>
                    </div>
                    <h3 className="text-xl text-white mb-3 font-medium">Ambiente Premium</h3>
                    <p className="text-slate-400 leading-relaxed">Espaço moderno, confortável e climatizado. Criado para ser o seu momento de relaxamento.</p>
                  </TiltCard>
                </Reveal>
              </div>
            </div>
          </section>

          {/* Feedbacks (Social Proof) - Horizontal Marquee */}
          <section className="py-24 bg-background-dark border-t border-white/5 relative overflow-hidden" id="testimonials">
            <div className="absolute top-1/2 left-0 w-[500px] h-[500px] -translate-y-1/2 -translate-x-1/4 bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto mb-16 px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <Reveal delay={0} direction="up">
                <span className="text-red-500 text-xs mb-3 block font-medium tracking-[0.2em] uppercase">A Palavra de Quem Exige o Melhor</span>
                <h2 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 italic font-medium tracking-tight uppercase">Relatos VIP</h2>
              </Reveal>
            </div>

            <div className="relative overflow-hidden flex w-full hover-pause cursor-grab active:cursor-grabbing pb-8">
              {/* Fade Gradient masks for the edges */}
              <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-48 bg-gradient-to-r from-background-dark to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-48 bg-gradient-to-l from-background-dark to-transparent z-10 pointer-events-none"></div>

              {/* Duplicated for absolute seamless infinity loop */}
              {[1, 2].map((marqueeGrp) => (
                <div key={marqueeGrp} className="animate-marquee flex-shrink-0 flex gap-6 px-3" style={{ animationDuration: '45s' }} aria-hidden={marqueeGrp === 2}>
                  {[
                    { name: 'Dr. Leonardo B.', role: 'Cliente VIP', text: 'O nível de atenção aos detalhes é surreal. A melhor barbearia que já frequentei, me sinto num clube exclusivo de alto padrão.' },
                    { name: 'Fernando S.', role: 'Empreendedor', text: 'Ambiente impecável e profissionais que realmente entendem de imagem. O chopp gelado e a pontualidade fazem toda a diferença na minha rotina.' },
                    { name: 'Dr. André Martins', role: 'Plano Imperador', text: 'Serviço de altíssimo padrão. É o meu momento de descompressão na semana. Agendamento rápido e resultado premium absoluto.' },
                    { name: 'Roberto A.', role: 'Plano Rei', text: 'A textura da toalha quente, o atendimento minucioso e as linhas perfeitas mostram que eles não cortam cabelo, constroem imagem.' },
                    { name: 'Marcos V.', role: 'Advogado Sócio', text: 'Precisão absoluta na navalha. Tradição mesclada com as melhores técnicas modernas. O plano vale cada centavo investido.' }
                  ].map((testimonial, i) => (
                    <TiltCard key={i} className="w-[320px] sm:w-[400px] p-8 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-red-600/30 transition-all flex flex-col justify-between">
                      <p className="text-slate-400 italic text-sm leading-relaxed mb-8">"{testimonial.text}"</p>
                      <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                        <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 font-medium tracking-widest">
                          {testimonial.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-white text-sm font-medium tracking-tight uppercase">{testimonial.name}</h4>
                          <span className="text-red-500 text-[10px] tracking-[0.2em] uppercase">{testimonial.role}</span>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* 5. Planos Mensais */}
          <section className="py-32 bg-card-dark border-t border-white/5 relative overflow-hidden" id="plans">
            <div className="absolute top-0 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/4 bg-red-600/5 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <span className="text-red-500 text-xs mb-3 block font-medium tracking-[0.2em] uppercase">Seja um Membro</span>
                <h3 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 italic mb-6 font-medium tracking-tight uppercase">Assinaturas Barber King</h3>
                <p className="text-slate-500 max-w-lg mx-auto">Economize e mantenha o estilo sempre em dia com acesso exclusivo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {/* Plano Príncipe */}
                <Reveal delay={0} direction="up">
                  <TiltCard className="h-full bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all flex flex-col group">
                    <h4 className="text-xl text-white italic mb-2 uppercase tracking-[0.1em]">Príncipe</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-sm text-slate-400">R$</span>
                      <span className="text-4xl text-white font-medium tracking-tight uppercase">89</span>
                      <span className="text-sm text-slate-400">/mês</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-red-500 text-lg">check</span>
                        2 Cortes de Cabelo
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-red-500 text-lg">check</span>
                        10% OFF em produtos
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-red-500 text-lg">check</span>
                        Bebida de cortesia
                      </li>
                    </ul>
                    <button onClick={() => navigate('/login')} className="w-full py-4 border border-white/10 rounded-xl text-white hover:bg-white/5 transition-all font-medium tracking-[0.2em] uppercase">
                      ASSINAR AGORA
                    </button>
                  </TiltCard>
                </Reveal>

                {/* Plano Rei (Destaque) */}
                <Reveal delay={200} direction="up">
                  <TiltCard className="h-full bg-[#151515]/80 backdrop-blur-xl border-2 border-red-600 rounded-3xl p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] relative flex flex-col transform md:-translate-y-4">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-3 py-1 rounded-full shadow-lg font-medium tracking-[0.2em] uppercase">
                      Mais Popular
                    </div>
                    <h4 className="text-2xl text-red-500 italic mb-2 font-medium tracking-tight uppercase">Rei</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-sm text-slate-400">R$</span>
                      <span className="text-5xl text-white font-medium tracking-tight uppercase">149</span>
                      <span className="text-sm text-slate-400">/mês</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-white">
                        <span className="material-symbols-outlined text-red-500 text-lg">check_circle</span>
                        Cortes Ilimitados
                      </li>
                      <li className="flex items-center gap-3 text-sm text-white">
                        <span className="material-symbols-outlined text-red-500 text-lg">check_circle</span>
                        2 Barbas Completas
                      </li>
                      <li className="flex items-center gap-3 text-sm text-white">
                        <span className="material-symbols-outlined text-red-500 text-lg">check_circle</span>
                        20% OFF em produtos
                      </li>
                      <li className="flex items-center gap-3 text-sm text-white">
                        <span className="material-symbols-outlined text-red-500 text-lg">check_circle</span>
                        Agendamento Prioritário
                      </li>
                    </ul>
                    <button onClick={() => navigate('/login')} className="w-full py-4 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20 hover:brightness-110 transition-all font-medium tracking-[0.2em] uppercase">
                      QUERO SER REI
                    </button>
                  </TiltCard>
                </Reveal>

                {/* Plano Imperador */}
                <Reveal delay={400} direction="up">
                  <TiltCard className="h-full bg-gradient-to-b from-[#1A1A1A]/80 to-black/80 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden group flex flex-col">
                    <div className="absolute top-0 right-0 p-6 opacity-20">
                      <span className="material-symbols-outlined !text-6xl text-amber-500">crown</span>
                    </div>
                    <h4 className="text-xl text-amber-500 italic mb-2 uppercase tracking-[0.1em]">Imperador</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-sm text-slate-400">R$</span>
                      <span className="text-4xl text-white font-medium tracking-tight uppercase">229</span>
                      <span className="text-sm text-slate-400">/mês</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-amber-500 text-lg">check</span>
                        Cabelo e Barba Ilimitados
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-amber-500 text-lg">check</span>
                        Sobrancelha Inclusa
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-amber-500 text-lg">check</span>
                        30% OFF em produtos
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-amber-500 text-lg">check</span>
                        Bebidas Premium Liberadas
                      </li>
                    </ul>
                    <button onClick={() => navigate('/login')} className="w-full py-4 border border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black rounded-xl transition-all font-medium tracking-[0.2em] uppercase">
                      ASSINAR IMPERADOR
                    </button>
                  </TiltCard>
                </Reveal>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-black border-t border-white/5 py-12" id="footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex items-center gap-2">
                  <RazorIcon className="w-7 h-7 text-slate-200 drop-shadow-md" />
                  <span className="text-xl text-white font-medium">BARBER <span className="text-red-500">KING</span></span>
                </div>
                <p className="text-slate-500 text-sm max-w-xs text-center md:text-left">
                  A experiência definitiva em barbearia premium. Tradição e modernidade em cada detalhe.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-8">
                <button className="text-slate-400 hover:text-white transition-colors text-sm">Privacidade</button>
                <button className="text-slate-400 hover:text-white transition-colors text-sm">Termos de Uso</button>
                <button onClick={() => scrollToSection('footer')} className="text-slate-400 hover:text-white transition-colors text-sm">Contato</button>
                <button onClick={() => scrollToSection('differentials')} className="text-slate-400 hover:text-white transition-colors text-sm">Sobre Nós</button>
              </div>
              <div className="flex items-center gap-5">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-xl">camera_alt</span>
                </a>
                <a
                  href="https://whatsapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-xl">chat</span>
                </a>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <p>© 2023 BARBER KING. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div >
  );
};

export default Landing;
