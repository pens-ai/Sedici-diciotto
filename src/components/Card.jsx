import React from 'react';

export const Card = ({ children, className = '', hover = false, onClick }) => {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6
        ${hover ? 'transition-all duration-200 hover:shadow-xl hover:border-gray-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const StatCard = ({ icon, label, value, color = 'primary', subtitle }) => {
  const colors = {
    primary: 'bg-primary-100 text-primary-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <Card hover>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className={`p-3 sm:p-4 rounded-xl ${colors[color]}`}>
          <div className="w-6 h-6 sm:w-7 sm:h-7 [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>
        <div className="min-w-0 w-full">
          <div className="text-sm sm:text-base font-medium text-gray-600 mb-1">{label}</div>
          <div className="text-xl sm:text-3xl font-bold text-gray-900">{value}</div>
          {subtitle && <div className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</div>}
        </div>
      </div>
    </Card>
  );
};
