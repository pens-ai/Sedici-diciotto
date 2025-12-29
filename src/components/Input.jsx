import React, { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-4 py-3 text-base rounded-xl border-2 transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          placeholder:text-gray-400
          ${error ? 'border-red-500' : 'border-gray-200'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = forwardRef(({ label, error, children, className = '', ...props }, ref) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-4 py-3 text-base rounded-xl border-2 transition-colors appearance-none
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          bg-white cursor-pointer
          ${error ? 'border-red-500' : 'border-gray-200'}
        `}
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export const Textarea = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full px-4 py-3 text-base rounded-xl border-2 transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          placeholder:text-gray-400
          ${error ? 'border-red-500' : 'border-gray-200'}
        `}
        rows={4}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
