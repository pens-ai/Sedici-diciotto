import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Initial data
const initialProperties = [
  { id: 1, name: 'Sassi Sedicidiciotto 16', beds: 2, bathrooms: 1, description: 'Appartamento moderno nel centro storico', templates: [] },
  { id: 2, name: 'Sassi Sedicidiciotto 18', beds: 4, bathrooms: 2, description: 'Casa spaziosa con vista panoramica', templates: [] },
  { id: 3, name: 'Sasso Bianco', beds: 2, bathrooms: 1, description: 'Accogliente dimora nei sassi', templates: [] },
  { id: 4, name: 'Pozzo Fiorito', beds: 6, bathrooms: 3, description: 'Villa con giardino e piscina', templates: [] },
];

const initialProducts = [
  // Colazione
  { id: 1, name: 'Muffin', price: 1.20, unit: 'pz', category: 'colazione' },
  { id: 2, name: 'Torta fatta in casa', price: 2.50, unit: 'fetta', category: 'colazione' },
  { id: 3, name: 'Succhi di frutta', price: 1.20, unit: 'bottiglia', category: 'colazione' },
  { id: 4, name: 'Cialde caffè', price: 0.25, unit: 'pz', category: 'colazione' },
  { id: 5, name: 'Tè vari gusti', price: 0.15, unit: 'bustina', category: 'colazione' },
  { id: 6, name: 'Biscotti', price: 0.80, unit: 'confezione', category: 'colazione' },
  // Cortesia Bagno
  { id: 7, name: 'Shampoo', price: 0.40, unit: 'pz', category: 'bagno' },
  { id: 8, name: 'Bagnoschiuma', price: 0.40, unit: 'pz', category: 'bagno' },
  { id: 9, name: 'Saponette', price: 0.30, unit: 'pz', category: 'bagno' },
  { id: 10, name: 'Carta igienica', price: 0.50, unit: 'rotolo', category: 'bagno' },
  // Biancheria & Pulizie
  { id: 11, name: 'Lavaggio asciugamani', price: 2.00, unit: 'set', category: 'biancheria' },
  { id: 12, name: 'Set asciugamani', price: 3.00, unit: 'set', category: 'biancheria' },
  { id: 13, name: 'Set lenzuola matrimoniali', price: 4.00, unit: 'set', category: 'biancheria' },
  { id: 14, name: 'Ore pulizia', price: 15.00, unit: 'ora', category: 'biancheria' },
  // Consumabili
  { id: 15, name: 'Sapone piatti', price: 2.50, unit: 'bottiglia', category: 'consumabili' },
  { id: 16, name: 'Tabs lavastoviglie', price: 0.25, unit: 'pz', category: 'consumabili' },
  { id: 17, name: 'Sacchetti spazzatura', price: 0.15, unit: 'pz', category: 'consumabili' },
  { id: 18, name: 'Spugne cucina', price: 0.80, unit: 'pz', category: 'consumabili' },
];

const initialCompanyInfo = {
  name: 'Sassi Sedicidiciotto',
  logo: '',
  vat: '',
  fiscalCode: '',
  address: '',
  phone: '',
  email: ''
};

const initialCustomization = {
  primaryColor: '#6b4ce6',
  secondaryColor: '#5a3ec4',
  logoIcon: '🏠'
};

export const AppProvider = ({ children }) => {
  // State management
  const [properties, setProperties] = useState([]);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(initialCompanyInfo);
  const [customization, setCustomization] = useState(initialCustomization);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedProperties = localStorage.getItem('properties');
    const loadedProducts = localStorage.getItem('products');
    const loadedBookings = localStorage.getItem('bookings');
    const loadedFixedCosts = localStorage.getItem('fixedCosts');
    const loadedCompanyInfo = localStorage.getItem('companyInfo');
    const loadedCustomization = localStorage.getItem('customization');

    setProperties(loadedProperties ? JSON.parse(loadedProperties) : initialProperties);
    setProducts(loadedProducts ? JSON.parse(loadedProducts) : initialProducts);
    setBookings(loadedBookings ? JSON.parse(loadedBookings) : []);
    setFixedCosts(loadedFixedCosts ? JSON.parse(loadedFixedCosts) : []);
    setCompanyInfo(loadedCompanyInfo ? JSON.parse(loadedCompanyInfo) : initialCompanyInfo);
    setCustomization(loadedCustomization ? JSON.parse(loadedCustomization) : initialCustomization);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('fixedCosts', JSON.stringify(fixedCosts));
  }, [fixedCosts]);

  useEffect(() => {
    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
  }, [companyInfo]);

  useEffect(() => {
    localStorage.setItem('customization', JSON.stringify(customization));
  }, [customization]);

  // Properties methods
  const addProperty = (property) => {
    const newProperty = { ...property, id: Date.now(), templates: [] };
    setProperties([...properties, newProperty]);
  };

  const updateProperty = (id, updatedProperty) => {
    setProperties(properties.map(p => p.id === id ? { ...p, ...updatedProperty } : p));
  };

  const deleteProperty = (id) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  // Template methods
  const addTemplate = (propertyId, template) => {
    const newTemplate = { ...template, id: Date.now() };
    setProperties(properties.map(p => 
      p.id === propertyId 
        ? { ...p, templates: [...(p.templates || []), newTemplate] }
        : p
    ));
  };

  const updateTemplate = (propertyId, templateId, updatedTemplate) => {
    setProperties(properties.map(p => 
      p.id === propertyId 
        ? { 
            ...p, 
            templates: p.templates.map(t => 
              t.id === templateId ? { ...t, ...updatedTemplate } : t
            )
          }
        : p
    ));
  };

  const deleteTemplate = (propertyId, templateId) => {
    setProperties(properties.map(p => 
      p.id === propertyId 
        ? { ...p, templates: p.templates.filter(t => t.id !== templateId) }
        : p
    ));
  };

  // Products methods
  const addProduct = (product) => {
    const newProduct = { ...product, id: Date.now() };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id, updatedProduct) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updatedProduct } : p));
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // Bookings methods
  const addBooking = (booking) => {
    const newBooking = { ...booking, id: Date.now(), guestRegistry: [] };
    setBookings([...bookings, newBooking]);
  };

  const updateBooking = (id, updatedBooking) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, ...updatedBooking } : b));
  };

  const deleteBooking = (id) => {
    setBookings(bookings.filter(b => b.id !== id));
  };

  // Fixed Costs methods
  const addFixedCost = (cost) => {
    const newCost = { ...cost, id: Date.now() };
    setFixedCosts([...fixedCosts, newCost]);
  };

  const updateFixedCost = (id, updatedCost) => {
    setFixedCosts(fixedCosts.map(c => c.id === id ? { ...c, ...updatedCost } : c));
  };

  const deleteFixedCost = (id) => {
    setFixedCosts(fixedCosts.filter(c => c.id !== id));
  };

  const value = {
    // State
    properties,
    products,
    bookings,
    fixedCosts,
    companyInfo,
    customization,
    
    // Methods
    addProperty,
    updateProperty,
    deleteProperty,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addProduct,
    updateProduct,
    deleteProduct,
    addBooking,
    updateBooking,
    deleteBooking,
    addFixedCost,
    updateFixedCost,
    deleteFixedCost,
    setCompanyInfo,
    setCustomization,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
