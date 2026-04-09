import React, { useState, useEffect } from 'react';

// Define the interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Escuta do evento no Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detecção de iOS e Standalone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    // Mostra o prompt do iOS se for iOS, não estiver em standalone, e não foi dispensado
    if (isIos && !isStandalone) {
      const hasDismissed = localStorage.getItem('pwa_ios_prompt_dismissed');
      if (!hasDismissed) {
        setShowIosPrompt(true);
      }
    }

    // Detecção se o app foi instalado com sucesso
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Dispara o prompt nativo
    await installPrompt.prompt();
    
    // Aguarda a escolha do usuário
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleDismissIos = () => {
    setShowIosPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa_ios_prompt_dismissed', 'true');
  };

  const handleDismissAndroid = () => {
    setInstallPrompt(null);
    setIsDismissed(true);
  };

  // Se já foi dispensado nesta sessão/estado, não renderiza nada
  if (isDismissed) return null;

  // Prompt Android/Desktop
  if (installPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] bg-card-dark border border-border-subtle rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-fade-in-up">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center overflow-hidden shrink-0 border border-border-subtle">
              <img src="/pwa-192x192.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-semibold text-text-base">Barber King</h3>
              <p className="text-sm text-text-muted">Instale o app para acesso rápido e offline</p>
            </div>
          </div>
          <button 
            onClick={handleDismissAndroid}
            className="text-text-muted hover:text-text-base"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <button
          onClick={handleInstallClick}
          className="w-full py-2 bg-primary hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Instalar Aplicativo
        </button>
      </div>
    );
  }

  // Prompt iOS
  if (showIosPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-card-dark border border-border-subtle rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-fade-in-up md:hidden">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center overflow-hidden shrink-0 border border-border-subtle">
              <img src="/apple-touch-icon.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-semibold text-text-base">Instalar Barber King</h3>
              <p className="text-sm text-text-muted leading-tight mt-1">
                Toque em <span className="inline-block mx-1 font-bold">Compartilhar</span> 
                e depois em <span className="font-bold">Adicionar à Tela de Início</span>
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismissIos}
          className="w-full py-2 bg-border-subtle hover:bg-zinc-800 text-text-base font-medium rounded-lg transition-colors mt-2"
        >
          Agora Não
        </button>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;
