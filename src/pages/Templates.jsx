import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Users, Package, Search, X, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';
import * as templatesApi from '../api/templates.api';
import * as productsApi from '../api/products.api';

// Emoji per categorie prodotti
const getCategoryEmoji = (categoryName) => {
  const lower = categoryName?.toLowerCase() || '';
  if (lower.includes('colazione') || lower.includes('breakfast')) return '☕';
  if (lower.includes('bagno') || lower.includes('igiene') || lower.includes('toilette')) return '🛁';
  if (lower.includes('pulizia') || lower.includes('detersiv')) return '🧹';
  if (lower.includes('camera') || lower.includes('letto') || lower.includes('biancheria')) return '🛏️';
  if (lower.includes('cucina') || lower.includes('kitchen')) return '🍳';
  if (lower.includes('bevand') || lower.includes('drink')) return '🥤';
  if (lower.includes('snack') || lower.includes('dolci')) return '🍪';
  if (lower.includes('extra') || lower.includes('servizi')) return '⭐';
  if (lower.includes('benvenuto') || lower.includes('welcome')) return '🎁';
  return '📦';
};

export const Templates = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Queries
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getTemplates,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getProducts(),
  });

  const templates = templatesData || [];
  const products = productsData?.data || productsData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template creato con successo');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => templatesApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template aggiornato');
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template eliminato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'eliminazione');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: templatesApi.duplicateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template duplicato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la duplicazione');
    },
  });

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDeleteTemplate = (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicateTemplate = (id) => {
    duplicateMutation.mutate(id);
  };

  const handleSaveTemplate = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Calculate template total cost
  const calculateTemplateCost = (template) => {
    if (!template.products) return 0;
    return template.products.reduce((sum, tp) => {
      return sum + (tp.product?.price || 0) * tp.quantity;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            📋 Template di Costi
          </h1>
          <p className="text-base text-gray-600 mt-1">
            Crea template riutilizzabili per le tue prenotazioni
          </p>
        </div>
        <Button onClick={handleAddTemplate} className="text-base py-3 px-6 w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          Nuovo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun template creato</h3>
            <p className="text-base text-gray-600 mb-6">
              I template ti aiutano a calcolare automaticamente i costi delle prenotazioni
            </p>
            <Button onClick={handleAddTemplate} className="text-base py-3 px-6">
              <Plus className="w-5 h-5 mr-2" />
              Crea il Primo Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      <Users className="w-4 h-4" />
                      {template.minGuests}-{template.maxGuests} ospiti
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      <Package className="w-4 h-4" />
                      {template.products?.length || 0} prodotti
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    €{calculateTemplateCost(template).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">costo totale</div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
              )}

              {/* Product list preview */}
              {template.products?.length > 0 && (
                <div className="mb-4 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {template.products.slice(0, 4).map(tp => (
                      <span
                        key={tp.id}
                        className="px-2 py-1 bg-gray-50 text-xs text-gray-600 rounded-lg border"
                      >
                        {getCategoryEmoji(tp.product?.category?.name)} {tp.product?.name} x{tp.quantity}
                      </span>
                    ))}
                    {template.products.length > 4 && (
                      <span className="px-2 py-1 text-xs text-gray-400">
                        +{template.products.length - 4} altri
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(template.id)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors text-sm font-medium"
                  title="Duplica template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
                  title="Elimina template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Template Modal */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        products={products}
        onSave={handleSaveTemplate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};

// Template Modal Component with Category-based product selection
function TemplateModal({ isOpen, onClose, template, products, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    minGuests: '1',
    maxGuests: '2',
    description: '',
    products: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Query per categorie prodotti
  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productsApi.getCategories,
  });

  const categories = categoriesData || [];

  // Raggruppa prodotti per categoria
  const productsByCategory = useMemo(() => {
    const grouped = {};
    products.forEach(product => {
      const categoryId = product.categoryId || 'uncategorized';
      const categoryName = product.category?.name || 'Senza Categoria';
      if (!grouped[categoryId]) {
        grouped[categoryId] = {
          id: categoryId,
          name: categoryName,
          products: [],
        };
      }
      grouped[categoryId].products.push(product);
    });
    return Object.values(grouped);
  }, [products]);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        minGuests: template.minGuests.toString(),
        maxGuests: template.maxGuests.toString(),
        description: template.description || '',
        products: template.products?.map(tp => ({
          productId: tp.productId,
          quantity: tp.quantity,
          product: tp.product,
        })) || [],
      });
    } else {
      setFormData({
        name: '',
        minGuests: '1',
        maxGuests: '2',
        description: '',
        products: [],
      });
    }
    setSearchTerm('');
    setSelectedCategory(null);
    setShowSearch(false);
  }, [template, isOpen]);

  const handleAddProduct = (product) => {
    if (formData.products.some(p => p.productId === product.id)) {
      // Se già presente, incrementa la quantità
      setFormData(prev => ({
        ...prev,
        products: prev.products.map(p =>
          p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p
        ),
      }));
      toast.success(`Quantità aumentata per ${product.name}`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        productId: product.id,
        quantity: 1,
        product,
      }],
    }));
    toast.success(`${product.name} aggiunto`);
  };

  const handleRemoveProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.productId !== productId),
    }));
  };

  const handleQuantityChange = (productId, quantity) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.productId === productId ? { ...p, quantity: parseFloat(quantity) || 0 } : p
      ),
    }));
  };

  const totalCost = formData.products.reduce((sum, p) => {
    return sum + (p.product?.price || 0) * p.quantity;
  }, 0);

  // Prodotti filtrati per ricerca
  const filteredProducts = searchTerm
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Prodotti della categoria selezionata
  const categoryProducts = selectedCategory
    ? products.filter(p => (p.categoryId || 'uncategorized') === selectedCategory)
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      minGuests: parseInt(formData.minGuests),
      maxGuests: parseInt(formData.maxGuests),
      description: formData.description,
      products: formData.products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
    });
  };

  // Check if product is already in template
  const isProductInTemplate = (productId) => {
    return formData.products.some(p => p.productId === productId);
  };

  const getProductQuantity = (productId) => {
    const product = formData.products.find(p => p.productId === productId);
    return product ? product.quantity : 0;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Modifica Template' : 'Nuovo Template'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nome del template"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="es. Standard 2 persone, Premium, Famiglia..."
          required
          className="text-base"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Minimo ospiti
            </label>
            <input
              type="number"
              min="1"
              value={formData.minGuests}
              onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
              className="w-full h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Massimo ospiti
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxGuests}
              onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
              className="w-full h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>

        <Textarea
          label="Descrizione (opzionale)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrizione del template..."
          className="text-base"
        />

        {/* Products section con selezione per categoria */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-base font-semibold text-gray-700">
              Prodotti e costi inclusi
            </label>
            <button
              type="button"
              onClick={() => {
                setShowSearch(!showSearch);
                setSelectedCategory(null);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showSearch
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4 inline-block mr-1" />
              Cerca
            </button>
          </div>

          {/* Ricerca prodotti */}
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Scrivi il nome del prodotto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 text-base border-2 border-primary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-primary-50"
                autoFocus
              />
              {filteredProducts.length > 0 && searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredProducts.slice(0, 10).map(product => {
                    const inTemplate = isProductInTemplate(product.id);
                    const qty = getProductQuantity(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between text-base ${
                          inTemplate ? 'bg-green-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryEmoji(product.category?.name)}</span>
                          <span>{product.name}</span>
                          {inTemplate && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              x{qty}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 font-medium">
                          €{parseFloat(product.price).toFixed(2)}/{product.unit}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Categorie prodotti - sempre visibili */}
          {!showSearch && (
            <>
              <p className="text-sm text-gray-500">Seleziona una categoria per vedere i prodotti:</p>
              <div className="flex flex-wrap gap-2">
                {productsByCategory.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  const productsInTemplate = cat.products.filter(p => isProductInTemplate(p.id)).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                      className={`px-4 py-2.5 rounded-xl text-base font-medium transition-all border-2 ${
                        isSelected
                          ? 'bg-primary-100 text-primary-800 border-primary-300 shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-2">{getCategoryEmoji(cat.name)}</span>
                      {cat.name}
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                        {cat.products.length}
                      </span>
                      {productsInTemplate > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {productsInTemplate}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Prodotti della categoria selezionata */}
              {selectedCategory && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">
                      {getCategoryEmoji(productsByCategory.find(c => c.id === selectedCategory)?.name)}
                      {' '}
                      {productsByCategory.find(c => c.id === selectedCategory)?.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {categoryProducts.map(product => {
                      const inTemplate = isProductInTemplate(product.id);
                      const qty = getProductQuantity(product.id);

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className={`p-3 rounded-xl text-left transition-all border-2 ${
                            inTemplate
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                            {inTemplate ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                                <Check className="w-4 h-4" />
                                x{qty}
                              </span>
                            ) : (
                              <Plus className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            €{parseFloat(product.price).toFixed(2)}/{product.unit}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Prodotti selezionati */}
          {formData.products.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700">
                  Prodotti nel template ({formData.products.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {formData.products.map(p => (
                  <div
                    key={p.productId}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-gray-200"
                  >
                    <span className="text-xl">{getCategoryEmoji(p.product?.category?.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{p.product?.name}</p>
                      <p className="text-xs text-gray-500">
                        €{parseFloat(p.product?.price || 0).toFixed(2)}/{p.product?.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(p.productId, Math.max(0.1, p.quantity - 1))}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg text-lg font-bold text-gray-600"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={p.quantity}
                        onChange={(e) => handleQuantityChange(p.productId, e.target.value)}
                        className="w-16 px-2 py-1.5 text-center text-base font-semibold border-2 border-gray-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(p.productId, p.quantity + 1)}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg text-lg font-bold text-gray-600"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-600 w-16 text-right font-medium">
                        €{(p.quantity * (p.product?.price || 0)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(p.productId)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {formData.products.length === 0 && !selectedCategory && !showSearch && (
            <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-2">👆</div>
              <p className="text-base text-gray-600">Seleziona una categoria sopra</p>
              <p className="text-sm text-gray-400">per aggiungere prodotti al template</p>
            </div>
          )}

          {/* Total */}
          {formData.products.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border-2 border-primary-200">
              <span className="text-lg font-semibold text-gray-700">Costo Totale:</span>
              <span className="text-2xl font-bold text-primary-600">€{totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-3 text-base">
            Annulla
          </Button>
          <Button type="submit" className="flex-1 py-3 text-base" disabled={isLoading || !formData.name}>
            {isLoading ? 'Salvataggio...' : template ? 'Salva Modifiche' : 'Crea Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Templates;
