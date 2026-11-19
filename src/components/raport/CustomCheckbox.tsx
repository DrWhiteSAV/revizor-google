import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  isLightTheme?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  isLightTheme = false,
  className = '',
  size = 'md'
}) => {
  const boxSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;

  return (
    <label
      id={id}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
      } ${className}`}
    >
      <div
        className={`${boxSize} rounded-md border flex items-center justify-center transition-all shrink-0 ${
          checked
            ? isLightTheme
              ? 'bg-gradient-to-br from-[#D99E41] to-[#B87D1E] border-amber-600 text-amber-950 shadow-[0_0_8px_rgba(217,158,65,0.4)]'
              : 'bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] border-[#F4EE8E] text-amber-950 shadow-[0_0_12px_rgba(244,238,142,0.4)]'
            : isLightTheme
              ? 'bg-white/80 border-amber-400/80 hover:border-amber-600 text-transparent'
              : 'bg-[#140A01]/80 border-amber-400/50 hover:border-[#E7C768] text-transparent'
        }`}
      >
        <Check size={iconSize} className={`stroke-[3.5] transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
      </div>
      {label && <div className="text-sm font-medium leading-tight">{label}</div>}
    </label>
  );
};
