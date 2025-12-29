import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Package,
  Upload,
  Download,
  FolderPlus,
  ShoppingBag,
  Coffee,
  Sparkles,
  Bath,
  Utensils,
  Bed,
  Lightbulb,
  Heart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as productsApi from '../api/products.api';
import Button from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';

// Category emojis based on common names
const CATEGORY_EMOJIS = {
  'colazione': '☕',
  'bagno': '🛁',
  'pulizia': '🧹',
  'cucina': '🍳',
  'camera': '🛏️',
  'benvenuto': '🎁',
  'default': '📦',
};

const getCategoryEmoji = (categoryName) => {
  const lowerName = categoryName.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }
  return CATEGORY_EMOJIS.default;
};

export const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getProducts(),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Prodotto creato');
      setShowProductModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Prodotto aggiornato');
      setShowProductModal(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Prodotto eliminato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'eliminazione');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: productsApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria creata');
      setShowCategoryModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  const products = productsData?.data || [];

  // Group products by category
  const productsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = products.filter(p => p.categoryId === category.id);
    return acc;
  }, {});

  // Filter products
  const filteredCategories = categories.filter(category => {
    const categoryProducts = productsByCategory[category.id] || [];
    if (!searchTerm) return true;
    return categoryProducts.some(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleExport = async () => {
    try {
      const blob = await productsApi.exportProducts();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Prodotti esportati');
    } catch (error) {
      toast.error('Errore durante l\'esportazione');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await productsApi.importProducts(file);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(result.message);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore durante l\'importazione');
    }

    e.target.value = '';
  };

  if (loadingProducts || loadingCategories) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl">
              🛒
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prodotti e Forniture</h1>
              <p className="text-base text-gray-600">Gestisci i prodotti per le tue case vacanza</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowCategoryModal(true)}
              className="text-base py-3 px-4"
            >
              <FolderPlus className="w-5 h-5 mr-2" />
              Nuova Categoria
            </Button>
            <Button
              onClick={() => setShowProductModal(true)}
              className="text-base py-3 px-4"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Prodotto
            </Button>
          </div>
        </div>
      </div>

      {/* Search and actions */}
      <Card className="p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca prodotti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer text-base font-medium">
              <Upload className="w-5 h-5 mr-2" />
              Importa
            </span>
          </label>
          <Button variant="secondary" onClick={handleExport} className="py-3 px-4 text-base">
            <Download className="w-5 h-5 mr-2" />
            Esporta
          </Button>
        </div>
      </Card>

      {/* Categories and Products */}
      <div className="space-y-4">
        {filteredCategories.length === 0 && categories.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
                📦
              </div>
              <p className="text-lg text-gray-600 mb-6">Nessuna categoria creata</p>
              <Button onClick={() => setShowCategoryModal(true)} className="text-base py-3 px-6">
                <FolderPlus className="w-5 h-5 mr-2" />
                Crea la prima categoria
              </Button>
            </div>
          </Card>
        ) : (
          filteredCategories.map(category => {
            const categoryProducts = productsByCategory[category.id] || [];
            const isExpanded = expandedCategories[category.id] !== false;
            const filteredProducts = searchTerm
              ? categoryProducts.filter(p =>
                  p.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : categoryProducts;

            if (searchTerm && filteredProducts.length === 0) return null;

            const emoji = getCategoryEmoji(category.name);

            return (
              <Card key={category.id} className="overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                      {emoji}
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-semibold text-gray-900">{category.name}</span>
                      <span className="ml-3 text-base text-gray-500">
                        {categoryProducts.length} {categoryProducts.length === 1 ? 'prodotto' : 'prodotti'}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t-2">
                    {filteredProducts.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 text-base">
                        Nessun prodotto in questa categoria
                      </p>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.map(product => (
                          <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-medium text-gray-900">{product.name}</span>
                                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                                    €{parseFloat(product.price).toFixed(2)}/{product.unit}
                                  </span>
                                </div>
                                {product.description && (
                                  <p className="text-base text-gray-500 mt-1">{product.description}</p>
                                )}
                                {product.packageCost > 0 && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    Confezione: €{parseFloat(product.packageCost).toFixed(2)} ({product.packageQuantity} {product.unit})
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowProductModal(true);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors text-sm font-medium"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Modifica
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Eliminare questo prodotto?')) {
                                      deleteProductMutation.mutate(product.id);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors text-sm font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        onSave={(data) => {
          if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, data });
          } else {
            createProductMutation.mutate(data);
          }
        }}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={(data) => createCategoryMutation.mutate(data)}
        isLoading={createCategoryMutation.isPending}
      />
    </div>
  );
};

function ProductModal({ isOpen, onClose, product, categories, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceType: 'direct',
    price: '',
    packageCost: '',
    packageQuantity: '1',
    unit: 'pz',
    categoryId: '',
  });

  const unitPrice = formData.priceType === 'package' && formData.packageCost && formData.packageQuantity
    ? (parseFloat(formData.packageCost) / parseFloat(formData.packageQuantity)).toFixed(4)
    : '0';

  useEffect(() => {
    if (product) {
      const isPackage = product.packageQuantity > 1 || product.packageCost > 0;
      setFormData({
        name: product.name,
        description: product.description || '',
        priceType: isPackage ? 'package' : 'direct',
        price: product.price?.toString() || '',
        packageCost: product.packageCost?.toString() || '',
        packageQuantity: product.packageQuantity?.toString() || '1',
        unit: product.unit,
        categoryId: product.categoryId,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        priceType: 'direct',
        price: '',
        packageCost: '',
        packageQuantity: '1',
        unit: 'pz',
        categoryId: categories[0]?.id || '',
      });
    }
  }, [product, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalPrice, packageCost, packageQuantity;

    if (formData.priceType === 'package') {
      packageCost = parseFloat(formData.packageCost) || 0;
      packageQuantity = parseFloat(formData.packageQuantity) || 1;
      finalPrice = packageCost / packageQuantity;
    } else {
      finalPrice = parseFloat(formData.price) || 0;
      packageCost = 0;
      packageQuantity = 1;
    }

    onSave({
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      unit: formData.unit,
      packageCost,
      packageQuantity,
      price: finalPrice,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? '✏️ Modifica Prodotto' : '🛒 Nuovo Prodotto'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Nome Prodotto</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="es. Carta Igienica"
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Descrizione (opzionale)</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="es. Marca XXX qualità premium"
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Categoria</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Seleziona categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {getCategoryEmoji(cat.name)} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Unità di Misura</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="rotolo">Rotolo</option>
            <option value="pz">Pezzo</option>
            <option value="set">Set</option>
            <option value="flacone">Flacone</option>
            <option value="capsula">Capsula</option>
            <option value="bustina">Bustina</option>
            <option value="fetta">Fetta</option>
            <option value="litro">Litro</option>
            <option value="ml">ml</option>
            <option value="kg">Kg</option>
            <option value="g">Grammi</option>
          </select>
        </div>

        {/* Price Type Selection */}
        <div className="space-y-3">
          <label className="block text-base font-medium text-gray-700">Come vuoi inserire il prezzo?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, priceType: 'direct' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.priceType === 'direct'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-base font-semibold text-gray-900">Prezzo Diretto</div>
              <div className="text-sm text-gray-500">Inserisci il costo per unità</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, priceType: 'package' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.priceType === 'package'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-base font-semibold text-gray-900">Confezione</div>
              <div className="text-sm text-gray-500">Calcola il costo dalla confezione</div>
            </button>
          </div>
        </div>

        {/* Direct Price */}
        {formData.priceType === 'direct' && (
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Costo Unitario (€/{formData.unit})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="1.50"
                className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>
        )}

        {/* Package Price */}
        {formData.priceType === 'package' && (
          <div className="p-5 bg-amber-50 rounded-xl border-2 border-amber-200 space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 text-base">Calcolo dalla Confezione</h4>
              <p className="text-sm text-gray-600">
                Inserisci il costo totale e le unità contenute
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Confezione</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.packageCost}
                    onChange={(e) => setFormData({ ...formData, packageCost: e.target.value })}
                    placeholder="2.00"
                    className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantità ({formData.unit})</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.packageQuantity}
                  onChange={(e) => setFormData({ ...formData, packageQuantity: e.target.value })}
                  placeholder="6"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            {formData.packageCost && formData.packageQuantity && (
              <div className="p-4 bg-white rounded-xl border-2 border-primary-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-700">Costo Unitario:</span>
                  <span className="text-xl font-bold text-primary-600">
                    €{unitPrice} / {formData.unit}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth className="py-3 text-base">
            Annulla
          </Button>
          <Button type="submit" fullWidth disabled={isLoading} className="py-3 text-base">
            {isLoading ? 'Salvataggio...' : 'Salva Prodotto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ isOpen, onClose, onSave, isLoading }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    });
    setName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📁 Nuova Categoria">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Nome Categoria</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Colazione, Bagno, Pulizia..."
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-3">Suggerimenti categorie:</p>
          <div className="flex flex-wrap gap-2">
            {['☕ Colazione', '🛁 Bagno', '🧹 Pulizia', '🍳 Cucina', '🛏️ Camera', '🎁 Benvenuto'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setName(cat.slice(2).trim())}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth className="py-3 text-base">
            Annulla
          </Button>
          <Button type="submit" fullWidth disabled={isLoading} className="py-3 text-base">
            {isLoading ? 'Creazione...' : 'Crea Categoria'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Products;
