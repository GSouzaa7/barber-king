import React, { useRef, useState, MouseEvent } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calcula x e y em relação ao centro (de -1 a 1)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Mutliplicador define o ângulo máximo do tilt (ex: 20 graus)
    const multiplier = 15;
    
    setRotation({
      x: -y * multiplier,
      y: x * multiplier
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={`relative perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1})`,
        transition: isHovered ? 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      {/* Glare effect */}
      {isHovered && (
        <div 
          className="absolute inset-0 z-50 pointer-events-none rounded-inherit"
          style={{
            background: `radial-gradient(circle at ${rotation.y * 5 + 50}% ${-rotation.x * 5 + 50}%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)`
          }}
        />
      )}
      {children}
    </div>
  );
};
