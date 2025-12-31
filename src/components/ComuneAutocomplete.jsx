import { useState, useEffect, useRef } from 'react';
import { searchComuni } from '../api/checkin.api';

/**
 * Autocomplete component for Italian comuni
 * Stores ISTAT code in value but displays comune name
 */
const ComuneAutocomplete = ({
  value, // ISTAT code
  onChange, // callback with (code, nome, provincia)
  onProvinceChange, // optional: callback to also set provincia
  placeholder = 'Cerca comune...',
  required = false,
  className = '',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComune, setSelectedComune] = useState(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Load comune name when value (code) changes
  useEffect(() => {
    if (value && !selectedComune) {
      // Try to find the comune in suggestions or search for it
      const loadComune = async () => {
        try {
          const results = await searchComuni(value);
          const found = results.find(c => c.codice === value);
          if (found) {
            setSelectedComune(found);
            setInputValue(found.nome);
          }
        } catch (err) {
          // If code doesn't match, might be a name (old data)
          setInputValue(value);
        }
      };
      loadComune();
    }
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedComune(null);

    // Clear the stored value when typing
    if (onChange) {
      onChange('', '', '');
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 2) {
      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchComuni(newValue);
          setSuggestions(results);
          setIsOpen(true);
        } catch (err) {
          console.error('Error searching comuni:', err);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (comune) => {
    setSelectedComune(comune);
    setInputValue(comune.nome);
    setIsOpen(false);
    setSuggestions([]);

    if (onChange) {
      onChange(comune.codice, comune.nome, comune.provincia);
    }
    if (onProvinceChange) {
      onProvinceChange(comune.provincia);
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${className}`}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((comune) => (
            <button
              key={comune.codice}
              type="button"
              onClick={() => handleSelect(comune)}
              className="w-full px-4 py-3 text-left hover:bg-primary-50 focus:bg-primary-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{comune.nome}</div>
              <div className="text-sm text-gray-500">({comune.provincia})</div>
            </button>
          ))}
        </div>
      )}

      {isOpen && suggestions.length === 0 && inputValue.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500">
          Nessun comune trovato
        </div>
      )}
    </div>
  );
};

export default ComuneAutocomplete;
