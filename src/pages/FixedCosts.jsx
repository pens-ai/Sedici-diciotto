import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  DollarSign,
  Calendar,
  Home,
  Filter,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, StatCard } from '../components/Card';
import Button from '../components/Button';
import { Input } from '../components/Input';
import {
  getCosts,
  createCost,
  updateCost,
  deleteCost,
  getCostCategories,
} from '../api/costs.api';
import { getProperties } from '../api/properties.api';

const costSchema = z.object({
  propertyId: z.string().optional(),
  categoryId: z.string().min(1, 'Seleziona una categoria'),
  description: z.string().min(2, 'Descrizione richiesta (min. 2 caratteri)'),
  amount: z.coerce.number().positive('Importo deve essere positivo'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']),
  startDate: z.string().min(1, 'Data inizio richiesta'),
  notes: z.string().optional(),
});

const frequencyLabels = {
  MONTHLY: 'Mensile',
  QUARTERLY: 'Trimestrale',
  YEARLY: 'Annuale',
  ONE_TIME: 'Una tantum',
};

const frequencyEmojis = {
  MONTHLY: '📅',
  QUARTERLY: '📊',
  YEARLY: '🗓️',
  ONE_TIME: '1️⃣',
};

const frequencyColors = {
  MONTHLY: 'bg-blue-100 text-blue-800 border-blue-200',
  QUARTERLY: 'bg-purple-100 text-purple-800 border-purple-200',
  YEARLY: 'bg-green-100 text-green-800 border-green-200',
  ONE_TIME: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Emoji per categorie costi
const getCategoryEmoji = (categoryName) => {
  const lower = categoryName?.toLowerCase() || '';
  if (lower.includes('luce') || lower.includes('elettric') || lower.includes('energia')) return '💡';
  if (lower.includes('gas')) return '🔥';
  if (lower.includes('acqua')) return '💧';
  if (lower.includes('internet') || lower.includes('wifi') || lower.includes('telefon')) return '📶';
  if (lower.includes('assicur')) return '🛡️';
  if (lower.includes('tass') || lower.includes('imu') || lower.includes('tribut')) return '🏛️';
  if (lower.includes('manut') || lower.includes('riparaz')) return '🔧';
  if (lower.includes('pulizia') || lower.includes('pulizie')) return '🧹';
  if (lower.includes('benzina') || lower.includes('carburante') || lower.includes('auto')) return '⛽';
  if (lower.includes('affitto') || lower.includes('mutuo')) return '🏠';
  if (lower.includes('rifiuti') || lower.includes('tari')) return '🗑️';
  if (lower.includes('condominil') || lower.includes('condominio')) return '🏢';
  return '💰';
};

export const FixedCosts = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [collapsedProperties, setCollapsedProperties] = useState({});

  // Queries
  const { data: costsData, isLoading: costsLoading } = useQuery({
    queryKey: ['costs'],
    queryFn: getCosts,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: getCostCategories,
  });

  // Handle API response format
  const costs = costsData?.data || costsData || [];
  const properties = propertiesData?.data || propertiesData || [];
  const categories = categoriesData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      toast.success('✅ Costo fisso aggiunto');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Errore durante il salvataggio');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      toast.success('✅ Costo fisso aggiornato');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Errore durante l\'aggiornamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      toast.success('🗑️ Costo fisso eliminato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Errore durante l\'eliminazione');
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(costSchema),
    defaultValues: {
      frequency: 'MONTHLY',
    },
  });

  // Filtered costs
  const filteredCosts = useMemo(() => {
    return costs.filter((cost) => {
      const matchesSearch =
        cost.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cost.property?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProperty = !filterProperty || cost.propertyId === filterProperty;
      const matchesCategory = !filterCategory || cost.categoryId === filterCategory;
      return matchesSearch && matchesProperty && matchesCategory;
    });
  }, [costs, searchTerm, filterProperty, filterCategory]);

  // Statistics
  const stats = useMemo(() => {
    const monthlyTotal = filteredCosts.reduce((sum, cost) => {
      let monthlyAmount = cost.amount;
      switch (cost.frequency) {
        case 'QUARTERLY':
          monthlyAmount = cost.amount / 3;
          break;
        case 'YEARLY':
          monthlyAmount = cost.amount / 12;
          break;
        case 'ONE_TIME':
          monthlyAmount = 0;
          break;
      }
      return sum + monthlyAmount;
    }, 0);

    const yearlyTotal = filteredCosts.reduce((sum, cost) => {
      let yearlyAmount = cost.amount;
      switch (cost.frequency) {
        case 'MONTHLY':
          yearlyAmount = cost.amount * 12;
          break;
        case 'QUARTERLY':
          yearlyAmount = cost.amount * 4;
          break;
        case 'ONE_TIME':
          yearlyAmount = cost.amount;
          break;
      }
      return sum + yearlyAmount;
    }, 0);

    const byCategory = filteredCosts.reduce((acc, cost) => {
      const categoryName = cost.category?.name || 'Altro';
      acc[categoryName] = (acc[categoryName] || 0) + cost.amount;
      return acc;
    }, {});

    return { monthlyTotal, yearlyTotal, byCategory, totalCosts: filteredCosts.length };
  }, [filteredCosts]);

  // Handlers
  const handleOpenModal = (cost = null) => {
    if (cost) {
      setEditingCost(cost);
      reset({
        propertyId: cost.propertyId || '',
        categoryId: cost.categoryId,
        description: cost.description,
        amount: cost.amount,
        frequency: cost.frequency,
        startDate: cost.startDate ? format(parseISO(cost.startDate), 'yyyy-MM-dd') : '',
        notes: cost.notes || '',
      });
    } else {
      setEditingCost(null);
      reset({
        propertyId: '',
        categoryId: '',
        description: '',
        amount: '',
        frequency: 'MONTHLY',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCost(null);
    reset();
  };

  const onSubmit = (data) => {
    // Clean up empty strings to null for optional fields
    const cleanedData = {
      ...data,
      propertyId: data.propertyId || null,
      notes: data.notes || null,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleDelete = (cost) => {
    if (window.confirm(`🗑️ Eliminare il costo "${cost.description}"?`)) {
      deleteMutation.mutate(cost.id);
    }
  };

  const togglePropertyCollapse = (propertyName) => {
    setCollapsedProperties(prev => ({
      ...prev,
      [propertyName]: !prev[propertyName]
    }));
  };

  // Group costs by property (generic costs first)
  const costsByProperty = useMemo(() => {
    const grouped = {};
    filteredCosts.forEach((cost) => {
      const propertyName = cost.propertyId ? (cost.property?.name || 'Proprietà sconosciuta') : '💼 Costi Generici';
      if (!grouped[propertyName]) {
        grouped[propertyName] = [];
      }
      grouped[propertyName].push(cost);
    });
    // Sort to put generic costs first
    const sorted = {};
    if (grouped['💼 Costi Generici']) {
      sorted['💼 Costi Generici'] = grouped['💼 Costi Generici'];
    }
    Object.keys(grouped).filter(k => k !== '💼 Costi Generici').sort().forEach(k => {
      sorted[k] = grouped[k];
    });
    return sorted;
  }, [filteredCosts]);

  if (costsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Caricamento costi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              💸 Costi Fissi
            </h1>
            <p className="text-red-100 mt-2 text-lg">
              Gestisci le spese ricorrenti delle tue proprietà
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="!bg-white !text-red-600 hover:!bg-red-50 shadow-lg text-lg py-3 px-6"
          >
            <Plus size={22} className="mr-2" />
            Nuovo Costo
          </Button>
        </div>
      </div>

      {/* Stats con icone grandi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📋</div>
            <div>
              <p className="text-blue-600 text-base font-medium">Costi Totali</p>
              <p className="text-3xl font-bold text-blue-800">{stats.totalCosts}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📅</div>
            <div>
              <p className="text-orange-600 text-base font-medium">Totale Mensile</p>
              <p className="text-3xl font-bold text-orange-800">€{stats.monthlyTotal.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🗓️</div>
            <div>
              <p className="text-red-600 text-base font-medium">Totale Annuale</p>
              <p className="text-3xl font-bold text-red-800">€{stats.yearlyTotal.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏠</div>
            <div>
              <p className="text-green-600 text-base font-medium">Proprietà</p>
              <p className="text-3xl font-bold text-green-800">{Object.keys(costsByProperty).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtri con stile senior-friendly */}
      <Card className="border-2 border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Cerca costi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="pl-4 pr-10 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white min-w-[180px]"
              >
                <option value="">🏠 Tutte le proprietà</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-4 pr-10 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white min-w-[180px]"
              >
                <option value="">📂 Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryEmoji(c.name)} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Costs List Grouped by Property */}
      {filteredCosts.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun costo fisso</h3>
            <p className="text-gray-500 mb-6 text-lg">
              Aggiungi i costi ricorrenti come bollette, internet, assicurazioni, ecc.
            </p>
            <Button
              onClick={() => handleOpenModal()}
              className="text-lg py-3 px-6"
            >
              <Plus size={22} className="mr-2" />
              Aggiungi Costo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(costsByProperty).map(([propertyName, propertyCosts]) => {
            const isCollapsed = collapsedProperties[propertyName];
            const propertyMonthlyTotal = propertyCosts.reduce((sum, c) => {
              if (c.frequency === 'MONTHLY') return sum + c.amount;
              if (c.frequency === 'QUARTERLY') return sum + c.amount / 3;
              if (c.frequency === 'YEARLY') return sum + c.amount / 12;
              return sum;
            }, 0);

            return (
              <Card key={propertyName} className="border-2 border-gray-200 overflow-hidden">
                {/* Property Header - Clickable */}
                <button
                  onClick={() => togglePropertyCollapse(propertyName)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${
                    propertyName.includes('Costi Generici')
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl`}>
                      {propertyName.includes('Costi Generici') ? '💼' : '🏠'}
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-gray-900">
                        {propertyName.replace('💼 ', '')}
                      </h3>
                      <p className="text-base text-gray-600">
                        {propertyCosts.length} cost{propertyCosts.length === 1 ? 'o' : 'i'}
                        {propertyName.includes('Costi Generici') && ' - Si applicano al guadagno totale'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Totale mensile</p>
                      <p className="text-2xl font-bold text-gray-900">
                        €{propertyMonthlyTotal.toFixed(2)}
                      </p>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Costs List */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {propertyCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="text-3xl flex-shrink-0">
                              {getCategoryEmoji(cost.category?.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="text-lg font-semibold text-gray-900">{cost.description}</h4>
                                <span
                                  className={`px-3 py-1 text-sm font-medium rounded-full border ${
                                    frequencyColors[cost.frequency]
                                  }`}
                                >
                                  {frequencyEmojis[cost.frequency]} {frequencyLabels[cost.frequency]}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-base text-gray-500">
                                <span className="font-medium">{cost.category?.name || 'Senza categoria'}</span>
                                {cost.startDate && (
                                  <span>
                                    Dal {format(parseISO(cost.startDate), 'dd MMM yyyy', { locale: it })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className="text-2xl font-bold text-gray-900">
                                €{cost.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenModal(cost)}
                                className="flex items-center gap-2 px-4 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border-2 border-blue-200"
                              >
                                <Edit2 size={18} />
                                Modifica
                              </button>
                              <button
                                onClick={() => handleDelete(cost)}
                                className="flex items-center gap-2 px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-red-200"
                              >
                                <Trash2 size={18} />
                                Elimina
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal con stile migliorato */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModal}
            ></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-2xl shadow-xl transform transition-all">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {editingCost ? '✏️ Modifica Costo' : '➕ Nuovo Costo Fisso'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Proprietà */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    🏠 Proprietà
                  </label>
                  <select
                    {...register('propertyId')}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">💼 Costo Generico (tutte le proprietà)</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        🏠 {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    Lascia vuoto per costi generali (es. benzina, spese generiche)
                  </p>
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    📂 Categoria
                  </label>
                  <select
                    {...register('categoryId')}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleziona categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryEmoji(c.name)} {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-2 text-base text-red-600 font-medium">{errors.categoryId.message}</p>
                  )}
                </div>

                {/* Descrizione */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    📝 Descrizione
                  </label>
                  <input
                    {...register('description')}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="es. Bolletta luce, Assicurazione casa..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-base text-red-600 font-medium">{errors.description.message}</p>
                  )}
                </div>

                {/* Importo e Frequenza */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">
                      💶 Importo (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount')}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0.00"
                    />
                    {errors.amount && (
                      <p className="mt-2 text-base text-red-600 font-medium">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">
                      🔄 Frequenza
                    </label>
                    <select
                      {...register('frequency')}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {Object.entries(frequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {frequencyEmojis[value]} {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Data Inizio */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    📅 Data Inizio
                  </label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  {errors.startDate && (
                    <p className="mt-2 text-base text-red-600 font-medium">{errors.startDate.message}</p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    📋 Note <span className="text-gray-400 font-normal">(opzionale)</span>
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Note aggiuntive..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4 border-t-2 border-gray-100">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseModal}
                    fullWidth
                    className="py-3 text-base"
                  >
                    ❌ Annulla
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    disabled={isSubmitting}
                    className="py-3 text-base bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {isSubmitting ? '⏳ Salvataggio...' : editingCost ? '💾 Salva Modifiche' : '✅ Aggiungi Costo'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedCosts;
