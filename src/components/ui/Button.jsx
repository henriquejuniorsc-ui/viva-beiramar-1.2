import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  const base = "inline-flex items-center justify-center transition-all duration-200 ease-in-out font-medium rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#C4A265] hover:bg-[#D4B87A] text-white shadow-sm",
    secondary: "bg-[#1B2B3A] hover:bg-[#2A4054] text-white shadow-sm",
    outline: "border border-[#C4A265] text-[#C4A265] hover:bg-[#C4A265] hover:text-white",
    outlineGray: "border border-[#E8E2D8] text-[#1B2B3A] hover:bg-[#F5F0E8]",
    danger: "bg-red-50 hover:bg-red-100 text-red-600",
    ghost: "hover:bg-[#F5F0E8] text-[#5A5A5A] hover:text-[#1B2B3A]"
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

export default Button;
