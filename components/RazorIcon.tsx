
import React from 'react';

export const RazorIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 640 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      {/* Cabo */}
      <path d="M420 110c-20-8-42 4-52 22l-48 86c-6 10-3 22 6 30l28 26c10 10 26 10 36 0l118-118c14-14 6-38-12-46z" />

      {/* Lâmina */}
      <path d="M60 320c0-14 12-26 26-26h254c10 0 20 6 24 16l12 28c4 10-4 22-16 22H86c-14 0-26-12-26-26z" />

      {/* Detalhe do encaixe */}
      <circle cx="388" cy="132" r="10" />
    </svg>
  );
};
