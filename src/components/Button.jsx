import React from 'react';

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-md hover:shadow-lg font-semibold',
  secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-semibold border border-gray-300',
  danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold',
  ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-700',
};

const sizes = {
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-5 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };
export default Button;
