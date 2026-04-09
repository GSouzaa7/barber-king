import React from 'react';
import { useTheme } from './ThemeContext';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full md:rounded-xl md:w-[42px] md:h-[42px] bg-white border border-slate-200 text-slate-500 hover:text-primary dark:bg-card-dark dark:border-white/5 dark:text-slate-400 dark:hover:text-white transition-all flex items-center justify-center shadow-sm dark:shadow-none"
            title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
            <span className="material-symbols-outlined text-[20px] transition-transform duration-500 hover:rotate-12">
                {isDark ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
};
