import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  // Determinar a "chave" do portal atual baseada na rota
  let portalKey = 'theme-public';
  if (path.startsWith('/admin')) {
    portalKey = 'theme-admin';
  } else if (path.startsWith('/barber') || path.startsWith('/barbeiro')) {
    portalKey = 'theme-barber';
  } else if (path.startsWith('/client')) {
    portalKey = 'theme-client';
  } else if (path.startsWith('/sec')) {
    portalKey = 'theme-sec';
  }

  // Estado para armazenar o tema do contexto atual
  const [theme, setTheme] = useState<Theme>('dark'); // dark é o padrão original

  useEffect(() => {
    // Ao trocar de rota, verificar qual o tema salvo para esse portal
    const savedTheme = localStorage.getItem(portalKey) as Theme | null;
    
    // Telas de login e landing page DEVEM manter a identidade visual original (dark)
    const isPublicOrAuthRoute = [
      '/', '/login', '/register', '/client', 
      '/barbeiro', '/barbeiro/register', '/barber', 
      '/admin', '/sec', '/pending-access'
    ].includes(path);

    if (isPublicOrAuthRoute) {
        setTheme('dark'); 
    } else {
        setTheme(savedTheme || 'dark');
    }
  }, [portalKey, path]);

  useEffect(() => {
    // Aplica a classe ao documento HTML dinamicamente sempre que o estado theme mudar
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light'); // Adicionamos 'light' explicitamente
    }
  }, [theme]);

  const toggleTheme = () => {
    // Bloquear a troca de tema nas telas de login/públicas
    const isPublicOrAuthRoute = [
      '/', '/login', '/register', '/client', 
      '/barbeiro', '/barbeiro/register', '/barber', 
      '/admin', '/sec', '/pending-access'
    ].includes(path);
    
    if (isPublicOrAuthRoute) return; 

    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem(portalKey, newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
