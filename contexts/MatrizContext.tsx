import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Matriz {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  created_at: string;
}

interface MatrizContextType {
  matrizes: Matriz[];
  selectedMatriz: Matriz | null;
  setSelectedMatriz: (matriz: Matriz) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const MatrizContext = createContext<MatrizContextType>({
  matrizes: [],
  selectedMatriz: null,
  setSelectedMatriz: () => {},
  loading: true,
  refetch: async () => {},
});

const STORAGE_KEY = 'bk_selected_matriz_id';

export const MatrizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [matrizes, setMatrizes] = useState<Matriz[]>([]);
  const [selectedMatriz, setSelectedMatrizState] = useState<Matriz | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMatrizes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matrizes')
      .select('*')
      .order('name');

    if (!error && data) {
      setMatrizes(data);

      // Restaura a última selecionada ou usa a primeira
      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = data.find((m) => m.id === savedId);
      setSelectedMatrizState(saved ?? data[0] ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchMatrizes();
    } else {
      setMatrizes([]);
      setSelectedMatrizState(null);
      setLoading(false);
    }
  }, [user]);

  const setSelectedMatriz = (matriz: Matriz) => {
    setSelectedMatrizState(matriz);
    localStorage.setItem(STORAGE_KEY, matriz.id);
  };

  return (
    <MatrizContext.Provider value={{ matrizes, selectedMatriz, setSelectedMatriz, loading, refetch: fetchMatrizes }}>
      {children}
    </MatrizContext.Provider>
  );
};

export const useMatriz = () => useContext(MatrizContext);
