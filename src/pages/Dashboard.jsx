import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar,
  TrendingUp,
  Home,
  ChevronDown,
  ArrowRight,
  X,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { getOverview } from '../api/analytics.api';
import { getBookings } from '../api/bookings.api';
import { getProperties } from '../api/properties.api';
import { getCosts } from '../api/costs.api';

// Emoji per le proprietà
const HOUSE_EMOJIS = ['🏠', '🏡', '🏘️', '🏢', '🏰', '🏨', '🏪', '⛺'];

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
  if (lower.includes('affitto') || lower.includes('mutuo')) return '🏠';
  if (lower.includes('rifiuti') || lower.includes('tari')) return '🗑️';
  if (lower.includes('condominil') || lower.includes('condominio')) return '🏢';
  return '💰';
};

export const Dashboard = () => {
  // Default to current month
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // State for cost detail popup
  const [costDetailModal, setCostDetailModal] = useState({ isOpen: false, type: null, title: '' });

  // Quick date presets
  const datePresets = [
    { label: 'Questo mese', start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
    { label: 'Mese scorso', start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
    { label: 'Quest\'anno', start: startOfYear(new Date()), end: endOfYear(new Date()) },
  ];

  const applyPreset = (preset) => {
    setDateRange({
      startDate: format(preset.start, 'yyyy-MM-dd'),
      endDate: format(preset.end, 'yyyy-MM-dd'),
    });
  };

  // Queries
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: () => getOverview(dateRange),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  });

  const { data: costsData } = useQuery({
    queryKey: ['costs'],
    queryFn: getCosts,
  });

  const fixedCosts = costsData?.data || costsData || [];

  // Upcoming bookings
  const upcomingBookings = useMemo(() => {
    const today = new Date();
    const bookingList = bookings?.data || bookings || [];
    return bookingList
      .filter((b) => new Date(b.checkIn) >= today && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
      .slice(0, 5);
  }, [bookings]);

  // Calculate monthly fixed costs per property
  const fixedCostsByProperty = useMemo(() => {
    const result = {};
    const genericCosts = [];

    fixedCosts.forEach(cost => {
      // Calculate monthly equivalent
      let monthlyAmount = parseFloat(cost.amount || 0);
      switch (cost.frequency) {
        case 'QUARTERLY':
          monthlyAmount = monthlyAmount / 3;
          break;
        case 'YEARLY':
          monthlyAmount = monthlyAmount / 12;
          break;
        case 'ONE_TIME':
          monthlyAmount = 0; // Don't include one-time costs in monthly calculation
          break;
      }

      if (cost.propertyId) {
        if (!result[cost.propertyId]) {
          result[cost.propertyId] = { costs: [], monthly: 0 };
        }
        result[cost.propertyId].costs.push(cost);
        result[cost.propertyId].monthly += monthlyAmount;
      } else {
        genericCosts.push({ ...cost, monthlyAmount });
      }
    });

    // Store generic costs for distribution
    result._generic = genericCosts;
    result._genericMonthly = genericCosts.reduce((sum, c) => sum + c.monthlyAmount, 0);

    return result;
  }, [fixedCosts]);

  // Per property statistics - excluding cancelled bookings and filtering by date range
  const propertyStats = useMemo(() => {
    const propertyList = properties?.data || properties || [];
    const bookingList = bookings?.data || bookings || [];
    const propertyCount = propertyList.length || 1;

    // Parse date range
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);

    // Calculate months in the date range
    const monthsDiff = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)));

    return propertyList.map((property) => {
      // Filter: same property, not cancelled, and checkIn within date range
      const propertyBookings = bookingList.filter((b) => {
        if (b.propertyId !== property.id) return false;
        if (b.status === 'CANCELLED') return false;

        const checkIn = parseISO(b.checkIn);
        return isWithinInterval(checkIn, { start: startDate, end: endDate });
      });

      const revenue = propertyBookings.reduce((sum, b) => sum + parseFloat(b.grossRevenue || 0), 0);
      const commissions = propertyBookings.reduce((sum, b) => sum + parseFloat(b.commissionAmount || 0), 0);
      const netRevenue = propertyBookings.reduce((sum, b) => sum + parseFloat(b.netRevenue || 0), 0);
      const variableCosts = propertyBookings.reduce((sum, b) => sum + parseFloat(b.variableCosts || 0), 0);

      // Calculate fixed costs for this property for the period
      const propertyFixedCosts = fixedCostsByProperty[property.id]?.monthly || 0;
      const genericFixedCostsShare = (fixedCostsByProperty._genericMonthly || 0) / propertyCount;
      const totalFixedCosts = (propertyFixedCosts + genericFixedCostsShare) * monthsDiff;

      const margin = netRevenue - variableCosts - totalFixedCosts;

      return {
        ...property,
        bookingsCount: propertyBookings.length,
        revenue,
        commissions,
        netRevenue,
        variableCosts,
        fixedCosts: totalFixedCosts,
        margin,
      };
    });
  }, [properties, bookings, dateRange, fixedCostsByProperty]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
  };

  // Get emoji for property
  const getPropertyEmoji = (index) => {
    return HOUSE_EMOJIS[index % HOUSE_EMOJIS.length];
  };

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  const bookingList = bookings?.data || bookings || [];

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              📊 Dashboard
            </h1>
            <p className="text-primary-100 mt-2 text-lg">
              Panoramica generale del tuo business
            </p>
          </div>

          {/* Date range controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Quick presets */}
            <div className="flex gap-2">
              {datePresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date inputs */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-primary-100">📅 Periodo:</span>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 bg-transparent border-0 text-white text-base focus:outline-none focus:ring-0 [color-scheme:dark]"
            />
            <ArrowRight className="w-5 h-5 text-white/60" />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 bg-transparent border-0 text-white text-base focus:outline-none focus:ring-0 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid - Big cards con emoji */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
          <div className="flex items-center gap-4">
            <div className="text-5xl">💰</div>
            <div>
              <p className="text-green-700 text-base font-medium">Ricavi Totali</p>
              <p className="text-3xl font-bold text-green-800">
                {formatCurrency(overview?.grossRevenue?.total || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 border-2 border-emerald-200">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📈</div>
            <div>
              <p className="text-emerald-700 text-base font-medium">Margine Netto</p>
              <p className="text-3xl font-bold text-emerald-800">
                {formatCurrency(overview?.netMargin?.total || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📋</div>
            <div>
              <p className="text-blue-700 text-base font-medium">Prenotazioni</p>
              <p className="text-3xl font-bold text-blue-800">
                {overview?.bookings?.total || bookingList.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📊</div>
            <div>
              <p className="text-orange-700 text-base font-medium">Tasso Occupazione</p>
              <p className="text-3xl font-bold text-orange-800">
                {overview?.occupancyRate || 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <Card className="border-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            💸 Dettaglio Costi
          </h2>
          <p className="text-sm text-gray-500 mb-3">Clicca su una voce per vedere i dettagli</p>
          {(() => {
            const variableCostsTotal = overview?.variableCosts?.total || 0;
            const fixedCostsTotal = overview?.fixedCosts?.total || 0;
            const channelFees = (overview?.grossRevenue?.total || 0) - (overview?.netRevenue?.total || 0);
            const totalCosts = variableCostsTotal + fixedCostsTotal + channelFees;
            return (
              <div className="space-y-3">
                <button
                  onClick={() => setCostDetailModal({ isOpen: true, type: 'variable', title: '📦 Costi Variabili' })}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <span className="text-base text-gray-700 font-medium">Costi Variabili</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(variableCostsTotal)}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
                <button
                  onClick={() => setCostDetailModal({ isOpen: true, type: 'fixed', title: '🏠 Costi Fissi' })}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏠</span>
                    <span className="text-base text-gray-700 font-medium">Costi Fissi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(fixedCostsTotal)}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
                <button
                  onClick={() => setCostDetailModal({ isOpen: true, type: 'commissions', title: '🏷️ Commissioni Canali' })}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏷️</span>
                    <span className="text-base text-gray-700 font-medium">Commissioni Canali</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(channelFees)}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <span className="text-lg font-bold text-gray-900">Totale Costi</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalCosts)}
                  </span>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Upcoming Bookings */}
        <Card className="border-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            📅 Prossime Prenotazioni
          </h2>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg text-gray-500">Nessuna prenotazione in arrivo</p>
              <p className="text-sm text-gray-400 mt-2">Le nuove prenotazioni appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getPropertyEmoji(index)}</span>
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {booking.property?.name || 'Proprietà'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>👤 {booking.guestName}</span>
                        <span>·</span>
                        <span>👥 {booking.numberOfGuests}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg font-semibold text-base">
                      {format(new Date(booking.checkIn), 'dd MMM', { locale: it })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Check-in</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Properties Stats */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          🏘️ Statistiche per Proprietà
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {propertyStats.length === 0 ? (
            <Card className="col-span-1 md:col-span-2 border-2 border-dashed border-gray-300">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessuna proprietà</h3>
                <p className="text-base text-gray-500">Aggiungi le tue case vacanza per vedere le statistiche</p>
              </div>
            </Card>
          ) : (
            propertyStats.map((property, index) => (
              <Card key={property.id} className="border-2 border-gray-200 hover:border-primary-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getPropertyEmoji(index)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{property.name}</h3>
                      <p className="text-sm text-gray-500">
                        🛏️ {property.beds} letti · 🚿 {property.bathrooms} bagni
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm">
                    📋 {property.bookingsCount}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-base text-gray-700">💰 Ricavi</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(property.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-base text-gray-700">🏷️ Commissioni</span>
                    <span className="text-lg font-bold text-red-500">
                      -{formatCurrency(property.commissions)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-base text-gray-700">📦 Costi variabili</span>
                    <span className="text-lg font-bold text-orange-600">
                      -{formatCurrency(property.variableCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-base text-gray-700">🏠 Costi fissi</span>
                    <span className="text-lg font-bold text-purple-600">
                      -{formatCurrency(property.fixedCosts)}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${
                    property.margin >= 0
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                      : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
                  }`}>
                    <span className="text-lg font-bold text-gray-900">✨ Margine</span>
                    <span className={`text-2xl font-bold ${
                      property.margin >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(property.margin)}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Cost Detail Modal */}
      <Modal
        isOpen={costDetailModal.isOpen}
        onClose={() => setCostDetailModal({ isOpen: false, type: null, title: '' })}
        title={costDetailModal.title}
        size="lg"
      >
        <div className="space-y-4">
          {/* Fixed Costs List */}
          {costDetailModal.type === 'fixed' && (
            <>
              {fixedCosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🏠</div>
                  <p className="text-lg text-gray-500">Nessun costo fisso registrato</p>
                  <p className="text-sm text-gray-400 mt-2">Vai alla pagina Costi Fissi per aggiungerne</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-auto">
                  {fixedCosts.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryEmoji(cost.category?.name)}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{cost.description}</p>
                          <p className="text-sm text-gray-500">
                            {cost.property?.name || '💼 Costo generico'} · {cost.category?.name || 'Altro'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(cost.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {cost.frequency === 'MONTHLY' && '📅 Mensile'}
                          {cost.frequency === 'QUARTERLY' && '📊 Trimestrale'}
                          {cost.frequency === 'YEARLY' && '🗓️ Annuale'}
                          {cost.frequency === 'ONE_TIME' && '1️⃣ Una tantum'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Variable Costs List */}
          {costDetailModal.type === 'variable' && (
            <>
              {(() => {
                const bookingList = bookings?.data || bookings || [];
                const startDate = parseISO(dateRange.startDate);
                const endDate = parseISO(dateRange.endDate);

                const bookingsWithCosts = bookingList.filter((b) => {
                  if (b.status === 'CANCELLED') return false;
                  const checkIn = parseISO(b.checkIn);
                  if (!isWithinInterval(checkIn, { start: startDate, end: endDate })) return false;
                  return parseFloat(b.variableCosts || 0) > 0;
                });

                if (bookingsWithCosts.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4">📦</div>
                      <p className="text-lg text-gray-500">Nessun costo variabile nel periodo</p>
                      <p className="text-sm text-gray-400 mt-2">I costi variabili sono legati alle prenotazioni (prodotti, servizi extra)</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[60vh] overflow-auto">
                    {bookingsWithCosts.map((booking) => (
                      <div key={booking.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏠</span>
                            <div>
                              <p className="font-semibold text-gray-900">{booking.property?.name}</p>
                              <p className="text-sm text-gray-500">
                                👤 {booking.guestName} · {format(parseISO(booking.checkIn), 'dd MMM', { locale: it })} - {format(parseISO(booking.checkOut), 'dd MMM', { locale: it })}
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(booking.variableCosts)}</p>
                        </div>
                        {booking.products?.length > 0 && (
                          <div className="mt-2 pl-11 space-y-1">
                            {booking.products.map((p, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-gray-600">
                                <span>• {p.productName} ×{p.quantity}</span>
                                <span>{formatCurrency(p.totalPrice)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {/* Commission Costs List */}
          {costDetailModal.type === 'commissions' && (
            <>
              {(() => {
                const bookingList = bookings?.data || bookings || [];
                const startDate = parseISO(dateRange.startDate);
                const endDate = parseISO(dateRange.endDate);

                const bookingsWithCommissions = bookingList.filter((b) => {
                  if (b.status === 'CANCELLED') return false;
                  const checkIn = parseISO(b.checkIn);
                  if (!isWithinInterval(checkIn, { start: startDate, end: endDate })) return false;
                  return parseFloat(b.commissionAmount || 0) > 0;
                });

                if (bookingsWithCommissions.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4">🏷️</div>
                      <p className="text-lg text-gray-500">Nessuna commissione nel periodo</p>
                      <p className="text-sm text-gray-400 mt-2">Le prenotazioni dirette non hanno commissioni</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[60vh] overflow-auto">
                    {bookingsWithCommissions.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏠</span>
                          <div>
                            <p className="font-semibold text-gray-900">{booking.property?.name}</p>
                            <p className="text-sm text-gray-500">
                              👤 {booking.guestName} · {format(parseISO(booking.checkIn), 'dd MMM', { locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{formatCurrency(booking.commissionAmount)}</p>
                          <p className="text-xs text-gray-500">
                            {booking.channel?.name || 'Canale'} ({booking.commissionRate || 0}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
