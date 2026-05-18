import React, { useEffect } from 'react';

const ResetPasswordRedirect: React.FC = () => {
  useEffect(() => {
    // Redireciona para a rota com hash mantendo os parâmetros de recuperação
    const params = new URLSearchParams(window.location.search);
    window.location.hash = `/admin/reset-password?${params.toString()}`;
  }, []);

  return <div className="bg-background-dark min-h-screen" />;
};

export default ResetPasswordRedirect;
