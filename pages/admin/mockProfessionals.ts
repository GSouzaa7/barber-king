export interface Professional {
  id: number | string;
  name: string;
  role: string;
  email: string;
  tags: { label: string; color: string }[];
  status: string;
  statusColor: string;
  commission: string;
  photo: string;
  color?: string; // added for agenda
}

export const defaultProfessionals: Professional[] = [
  { id: 1, name: 'Marcos Lima', role: 'Master Barber', email: 'marcos@barberking.com', tags: [{label: 'Corte', color: 'blue'}, {label: 'Barba', color: 'teal'}], status: 'Ativo', statusColor: 'success-green', commission: '50%', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtndJmu06mt1ColYaOvFbmU3WRsXuk0tZhua9N1c4-TQHxAbOXMPNPXSHVuZ5iAamSNRS6RSF9coXCnX80Pti4r63ml5k7aC9AhI6QYDUmCISTsIB_Le7w6aWcl1p3avhU6DdyXp5BgIFiSmUK1kgGu0kYElGJ86W7WnM8Pto4nC7aR08FxmPWiicvvi6e6MGoGbLwvf0PCcJBPEo_8T3cc6rITOnb5qCy4Sv93yI0Ed7t5gLj66TcJcfGvjzylfU2YByX_ZbPuMeu', color: '#10b981' },
  { id: 2, name: 'Mateus Oliveira', role: 'Hair Stylist', email: 'mateus.o@barberking.com', tags: [{label: 'Químicos', color: 'purple'}, {label: 'Corte', color: 'blue'}], status: 'Em Pausa', statusColor: 'warning-amber', commission: '45%', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATGTYjU80Nfzy5JqqLvmVKnqcRWIFHyRGAi9Hc6v5fvQctQXQGmMmgpoOdIMD_HOtGmSlA-P-OBVQc--uTU4MkMkpWH3SGAvJc-cIinn4fKiP5ZyFeqRI6gnqQi-91IrduBPCyW7gwdOcUIW20FiAvUITGeEuYyhlk7GIWjIYlAgI1aErj6KWxlAIad-qpBok5LMbUGhBLp-hVFpsoN6u1TJ31nI-SR3BdFdr9pUO9zDEjsCZyqt-d8OUeB9BVhgnEjK3LtTodHDIo', color: '#8b5cf6' },
  { id: 3, name: 'André Santos', role: 'Barber', email: 'andre.s@barberking.com', tags: [{label: 'Corte', color: 'blue'}], status: 'Ativo', statusColor: 'success-green', commission: '40%', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSECfJQW12EYA9fGzvGlpTCfeAIMb2RnHNtQ8svaCDoIfFl7mvAP6xgtbRve3H_MYWoOqoQihqB40TEEIo5mdJhZZaK67TVQzSE-Ogzq5sejTcur0JzM-pQzktlJEMaLL_fqCAWJquXb1R6svl46pFnFtmgybNqMSKo4kpXjEYO8huRwdpDwO8Q2Uef464vIAKjj94MJcOsal2ng53-sJUgooeK-NOAa6R9rbESQCN5IlJr-egglbK3gjDaBNw86Rg8nwt8Uw_FszS', color: '#f59e0b' },
  { id: 4, name: 'Lucas Neto', role: 'Barber', email: 'lucas.n@barberking.com', tags: [{label: 'Barba', color: 'teal'}], status: 'Ativo', statusColor: 'success-green', commission: '40%', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO4he2LNQY6MAOfuu-q4jYjsxBzKs4uMS5T2ceI8a-LvfmzoUgd_q-F5-V3e69DJZv45YXbT8Ziea1WKLabUceXsc37atflhi82tWn1NK9sbC403utZMM8QSgjWm1xsG3wDPmemfNi4TcHMP0PYLEdlPhGO0tFx2ruiqRtvq8NA4gfhKp2j5-PUVonNSOXA4aKK4NRVvksB5GttqSdDja1VX85fVQo5qp_MkqyFYJzCcnvWH2_8_zqs7TEQGTqZ91RjP0rq7Ppo4dl', color: '#3b82f6' },
  { id: 5, name: 'Carlos Junior', role: 'Junior Barber', email: 'carlos.j@barberking.com', tags: [{label: 'Corte', color: 'blue'}], status: 'Férias', statusColor: 'slate-500', commission: '30%', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1OLrQdX5hEzAk31dFzrKnjPIsy25WOIIV9wle6C56KC7VlI7Aww9lIkZakW2oBb4LMUznkQbYuBsXwlpY1QqMpbhq8vZypVG72xlgn_eekwrXBCM167rqHIKE77mElwb9mxt1bgfUMENxwIxB8wiQVFvN_f_p_2_daQJqnnkfpTudZaTFy2EaeNmHNTAztaGZiZYMSe9mrts3tPI1uFCcx2hOGN0kdsqbtgTSoDHDsNDL4mIahSvmD6bahtP6x62uMSvBunvBGM5m', color: '#64748b' },
];

export const getProfessionals = (): Professional[] => {
   const stored = localStorage.getItem('bk_professionals_v2');
   if (stored) return JSON.parse(stored);
   
   localStorage.setItem('bk_professionals_v2', JSON.stringify(defaultProfessionals));
   return defaultProfessionals;
};

export const saveProfessionals = (pros: Professional[]) => {
    localStorage.setItem('bk_professionals_v2', JSON.stringify(pros));
};

export const updateProfessionalColor = (name: string, newColor: string) => {
    const pros = getProfessionals();
    const updated = pros.map(p => p.name === name || p.id === name || p.name === 'João Silva' ? { ...p, color: newColor } : p);
    saveProfessionals(updated);
};
