import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Search, Calendar, Filter, Eye,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Package, Upload, X,
  Sparkles, FileText
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import * as bookingsApi from '../api/bookings.api';
import * as propertiesApi from '../api/properties.api';
import * as productsApi from '../api/products.api';
import * as templatesApi from '../api/templates.api';
import Button from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';
import { ChatbotBooking } from '../components/ChatbotBooking';

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Confermata', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancellata', color: 'bg-orange-100 text-orange-800', icon: XCircle },
};

export const Bookings = () => {
  const [view, setView] = useState('list'); // list, calendar
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isImporting, setIsImporting] = useState(false);
  const [dayBookingsPopup, setDayBookingsPopup] = useState(null); // { day, bookings }
  const [newBookingDate, setNewBookingDate] = useState(null); // Pre-fill date when creating from calendar
  const [showChatbotBooking, setShowChatbotBooking] = useState(false);

  const fileInputRef = useRef(null);

  // Property colors for calendar
  const PROPERTY_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', border: 'border-blue-300' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', border: 'border-emerald-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', border: 'border-purple-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', border: 'border-pink-300' },
    { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200', border: 'border-amber-300' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', border: 'border-cyan-300' },
  ];

  const getPropertyColor = (propertyId) => {
    const properties = propertiesData?.data || [];
    const index = properties.findIndex(p => p.id === propertyId);
    return PROPERTY_COLORS[index % PROPERTY_COLORS.length] || PROPERTY_COLORS[0];
  };
  const queryClient = useQueryClient();

  // Queries
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings', filterProperty, filterStatus],
    queryFn: () => bookingsApi.getBookings({
      propertyId: filterProperty || undefined,
      status: filterStatus || undefined,
    }),
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.getProperties(),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: bookingsApi.getChannels,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getProducts(),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getTemplates,
  });

  const bookings = bookingsData?.data || [];
  const properties = propertiesData?.data || [];
  const products = productsData?.data || productsData || [];
  const templates = templatesData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: bookingsApi.createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Prenotazione creata');
      setShowBookingModal(false);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        // Show detailed validation errors
        const messages = errorData.details.map(d => d.message).join('\n');
        toast.error(`Controlla i dati:\n${messages}`, { duration: 5000 });
      } else {
        toast.error(errorData?.error || 'Errore nella creazione');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => bookingsApi.updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Prenotazione aggiornata');
      setShowBookingModal(false);
      setEditingBooking(null);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const messages = errorData.details.map(d => d.message).join('\n');
        toast.error(`Controlla i dati:\n${messages}`, { duration: 5000 });
      } else {
        toast.error(errorData?.error || 'Errore nell\'aggiornamento');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bookingsApi.deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Prenotazione eliminata');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingsApi.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Stato aggiornato');
    },
  });

  // Handle file import
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await bookingsApi.importBookings(file);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(result.message);
      if (result.errors?.length > 0) {
        console.warn('Import errors:', result.errors);
        toast.error(`${result.errors.length} errori durante l'import`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore durante l\'import');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!b.guestName.toLowerCase().includes(search) &&
          !b.property?.name.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookingsForDay = (day) => {
    return bookings.filter(b => {
      const checkIn = parseISO(b.checkIn);
      const checkOut = parseISO(b.checkOut);
      return day >= checkIn && day < checkOut;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Prenotazioni</h1>
          <p className="text-sm text-gray-500">Gestisci le prenotazioni delle tue case</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setView('list')}
              className={`px-3 sm:px-4 py-2 text-sm ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 sm:px-4 py-2 text-sm ${view === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Calendario
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="text-sm"
          >
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{isImporting ? 'Importando...' : 'Import XLS'}</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => setShowChatbotBooking(true)}
            className="text-sm bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 border-0"
          >
            <Sparkles className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Inserimento Rapido</span>
          </Button>
          <Button onClick={() => setShowBookingModal(true)} className="text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuova Prenotazione</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:flex-wrap">
          <div className="flex-1 min-w-0 sm:min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca ospite o casa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 sm:gap-4">
            <Select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="flex-1 sm:flex-initial sm:w-48 text-sm"
            >
              <option value="">Tutte le case</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-initial sm:w-48 text-sm"
            >
              <option value="">Tutti gli stati</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* List View */}
      {view === 'list' && (
        <>
          {filteredBookings.length === 0 ? (
            <Card>
              <div className="text-center py-8 sm:py-12">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Nessuna prenotazione trovata</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-4 md:hidden">
                {filteredBookings.map(booking => {
                  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
                  return (
                    <Card key={booking.id} className="p-5">
                      {/* Header con nome e stato */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-semibold text-gray-900">{booking.guestName}</div>
                          <div className="text-base text-gray-600">{booking.property?.name}</div>
                        </div>
                        <span className={`ml-2 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Date e info */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-gray-500 text-sm mb-1">Arrivo</div>
                          <div className="font-semibold text-base">{format(parseISO(booking.checkIn), 'dd MMM yyyy', { locale: it })}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-gray-500 text-sm mb-1">Partenza</div>
                          <div className="font-semibold text-base">{format(parseISO(booking.checkOut), 'dd MMM yyyy', { locale: it })}</div>
                        </div>
                      </div>

                      {/* Info economiche */}
                      <div className="flex items-center justify-between py-3 border-t border-b mb-4">
                        <div>
                          <span className="text-gray-500">Totale: </span>
                          <span className="font-semibold text-lg">€{parseFloat(booking.grossRevenue || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Guadagno: </span>
                          <span className="font-semibold text-lg text-green-600">€{parseFloat(booking.netMargin || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Stato documenti ospiti */}
                      {booking.status !== 'CANCELLED' && (
                        <div className={`mb-4 p-3 rounded-lg border-2 border-dashed ${
                          booking.checkInCompleted ? 'border-green-300 bg-green-50' :
                          booking.checkInToken ? 'border-yellow-300 bg-yellow-50' :
                          'border-gray-300 bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {booking.checkInCompleted ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-700">Documenti ospiti ricevuti</span>
                              </>
                            ) : booking.checkInToken ? (
                              <>
                                <FileText className="w-5 h-5 text-yellow-600" />
                                <span className="font-medium text-yellow-700">In attesa dei documenti</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-5 h-5 text-gray-500" />
                                <span className="font-medium text-gray-600">Documenti da richiedere</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Azioni - bottoni grandi e chiari */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setViewingBooking(booking)}
                          className="flex flex-col items-center gap-1 p-3 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl transition-colors"
                        >
                          <Eye className="w-6 h-6" />
                          <span className="text-xs font-medium">Dettagli</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingBooking(booking);
                            setShowBookingModal(true);
                          }}
                          className="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-6 h-6" />
                          <span className="text-xs font-medium">Modifica</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
                              deleteMutation.mutate(booking.id);
                            }
                          }}
                          className="flex flex-col items-center gap-1 p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-6 h-6" />
                          <span className="text-xs font-medium">Elimina</span>
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden md:block p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-5 py-4 text-base font-semibold text-gray-700">Ospite</th>
                        <th className="text-left px-5 py-4 text-base font-semibold text-gray-700">Casa</th>
                        <th className="text-left px-5 py-4 text-base font-semibold text-gray-700">Periodo</th>
                        <th className="text-right px-5 py-4 text-base font-semibold text-gray-700">Importo</th>
                        <th className="text-center px-5 py-4 text-base font-semibold text-gray-700">Stato</th>
                        <th className="text-center px-5 py-4 text-base font-semibold text-gray-700">Cosa vuoi fare?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBookings.map(booking => {
                        const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
                        return (
                          <tr key={booking.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="text-base font-semibold text-gray-900">{booking.guestName}</div>
                              {booking.guestPhone && (
                                <div className="text-sm text-gray-500 mt-1">{booking.guestPhone}</div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-base text-gray-700">{booking.property?.name}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-base text-gray-900">
                                {format(parseISO(booking.checkIn), 'd MMM', { locale: it })} → {format(parseISO(booking.checkOut), 'd MMM yyyy', { locale: it })}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {booking.nights} {booking.nights === 1 ? 'notte' : 'notti'} · {booking.numberOfGuests} {booking.numberOfGuests === 1 ? 'ospite' : 'ospiti'}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="text-lg font-semibold text-gray-900">€{parseFloat(booking.grossRevenue || 0).toFixed(2)}</div>
                              <div className="text-sm text-green-600 font-medium mt-1">
                                Guadagno: €{parseFloat(booking.netMargin || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                                {booking.status !== 'CANCELLED' && (
                                  booking.checkInCompleted ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                      <CheckCircle className="w-4 h-4" />
                                      Documenti OK
                                    </span>
                                  ) : booking.checkInToken ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                                      <FileText className="w-4 h-4" />
                                      In attesa
                                    </span>
                                  ) : null
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setViewingBooking(booking)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors text-sm font-medium"
                                >
                                  <Eye className="w-4 h-4" />
                                  Dettagli
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBooking(booking);
                                    setShowBookingModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Modifica
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
                                      deleteMutation.mutate(booking.id);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h2>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Property Legend */}
          {properties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600 mr-2">Legenda:</span>
              {properties.map((p, index) => {
                const color = PROPERTY_COLORS[index % PROPERTY_COLORS.length];
                return (
                  <div key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded ${color.bg} ${color.text}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${color.bg.replace('100', '500')}`}></div>
                    <span className="text-xs font-medium">{p.name}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-100 text-orange-800">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium">Cancellata</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const handleDayClick = (e) => {
                // Always open the day popup when clicking on the day
                if (e.target === e.currentTarget || e.target.classList.contains('day-number')) {
                  setDayBookingsPopup({ day, bookings: dayBookings });
                }
              };
              return (
                <div
                  key={day.toISOString()}
                  onClick={handleDayClick}
                  className={`min-h-28 p-1.5 border-2 rounded-lg cursor-pointer transition-colors ${
                    isToday(day) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  } ${!isSameMonth(day, currentMonth) ? 'bg-gray-100 opacity-60' : ''}`}
                >
                  <div className="day-number text-sm font-semibold text-gray-700 mb-1.5">
                    {format(day, 'd')}
                  </div>
                  {dayBookings.slice(0, 2).map(b => {
                    const propColor = getPropertyColor(b.propertyId);
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingBooking(b);
                        }}
                        className={`text-xs rounded-md px-1.5 py-1 truncate mb-1 cursor-pointer font-medium border ${
                          b.status === 'CANCELLED'
                            ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300'
                            : `${propColor.bg} ${propColor.text} ${propColor.hover} ${propColor.border}`
                        }`}
                      >
                        {b.guestName}
                      </div>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayBookingsPopup({ day, bookings: dayBookings });
                      }}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold cursor-pointer"
                    >
                      +{dayBookings.length - 2} altri
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setEditingBooking(null);
          setNewBookingDate(null);
        }}
        booking={editingBooking}
        defaultCheckIn={newBookingDate ? format(newBookingDate, 'yyyy-MM-dd') : null}
        properties={properties}
        channels={channels}
        products={products}
        templates={templates}
        onSave={(data) => {
          if (editingBooking) {
            updateMutation.mutate({ id: editingBooking.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
        booking={viewingBooking}
        onStatusChange={(status) => {
          updateStatusMutation.mutate({ id: viewingBooking.id, status });
          setViewingBooking(null);
        }}
      />

      {/* Day Bookings Popup */}
      {dayBookingsPopup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setDayBookingsPopup(null)}
            />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Prenotazioni del {format(dayBookingsPopup.day, 'd MMMM yyyy', { locale: it })}
                </h3>
                <button
                  onClick={() => setDayBookingsPopup(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {dayBookingsPopup.bookings.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {dayBookingsPopup.bookings.map(b => {
                    const statusConfig = STATUS_CONFIG[b.status] || STATUS_CONFIG.CONFIRMED;
                    return (
                      <div
                        key={b.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setDayBookingsPopup(null);
                          setViewingBooking(b);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{b.guestName}</div>
                            <div className="text-sm text-gray-500 truncate">{b.property?.name}</div>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 mb-4">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Nessuna prenotazione per questo giorno</p>
                </div>
              )}
              <button
                onClick={() => {
                  setNewBookingDate(dayBookingsPopup.day);
                  setDayBookingsPopup(null);
                  setShowBookingModal(true);
                }}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                + Aggiungi nuova prenotazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Booking */}
      <ChatbotBooking
        isOpen={showChatbotBooking}
        onClose={() => setShowChatbotBooking(false)}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              setShowChatbotBooking(false);
            },
          });
        }}
        isLoading={createMutation.isPending}
      />
    </div>
  );
};

function BookingModal({ isOpen, onClose, booking, defaultCheckIn, properties, channels, products, templates = [], onSave, isLoading }) {
  const [formData, setFormData] = useState({
    propertyId: '',
    channelId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    grossRevenue: '',
    notes: '',
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Global templates are available for all properties
  const availableTemplates = templates;

  useEffect(() => {
    if (booking) {
      setFormData({
        propertyId: booking.propertyId,
        channelId: booking.channelId || '',
        guestName: booking.guestName,
        guestEmail: booking.guestEmail || '',
        guestPhone: booking.guestPhone || '',
        checkIn: booking.checkIn.split('T')[0],
        checkOut: booking.checkOut.split('T')[0],
        numberOfGuests: booking.numberOfGuests,
        grossRevenue: booking.grossRevenue.toString(),
        notes: booking.notes || '',
      });
      // Load existing product costs
      if (booking.productCosts?.length > 0) {
        setSelectedProducts(booking.productCosts.map(pc => ({
          productId: pc.productId,
          product: pc.product || { name: pc.productName, price: pc.unitPrice, unit: '' },
          quantity: pc.quantity,
        })));
      } else {
        setSelectedProducts([]);
      }
      setSelectedTemplateId('');
    } else {
      setFormData({
        propertyId: properties[0]?.id || '',
        channelId: '',
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        checkIn: defaultCheckIn || '',
        checkOut: '',
        numberOfGuests: 1,
        grossRevenue: '',
        notes: '',
      });
      setSelectedProducts([]);
      setSelectedTemplateId('');
    }
    setProductSearchTerm('');
  }, [booking, properties, isOpen, defaultCheckIn]);

  // Apply template when selected
  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setSelectedProducts([]);
      return;
    }

    const template = availableTemplates.find(t => t.id === templateId);
    if (template?.products) {
      setSelectedProducts(template.products.map(tp => ({
        productId: tp.productId,
        product: tp.product,
        quantity: tp.quantity,
      })));
    }
  };

  // Add product
  const handleAddProduct = (product) => {
    if (selectedProducts.some(p => p.productId === product.id)) {
      return;
    }
    setSelectedProducts(prev => [...prev, {
      productId: product.id,
      product,
      quantity: 1,
    }]);
    setProductSearchTerm('');
    setSelectedTemplateId('custom'); // Mark as custom
  };

  // Remove product
  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
    setSelectedTemplateId('custom');
  };

  // Update quantity
  const handleQuantityChange = (productId, quantity) => {
    setSelectedProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, quantity: parseInt(quantity) || 1 } : p
    ));
    setSelectedTemplateId('custom');
  };

  // Calculations
  const selectedChannel = channels.find(c => c.id === formData.channelId);
  const commissionRate = selectedChannel ? parseFloat(selectedChannel.commissionRate) : 0;
  const grossRevenue = parseFloat(formData.grossRevenue) || 0;
  const commission = grossRevenue * (commissionRate / 100);
  const netRevenue = grossRevenue - commission;

  const variableCosts = selectedProducts.reduce((sum, p) => {
    return sum + (p.product?.price || 0) * p.quantity;
  }, 0);

  const netMargin = netRevenue - variableCosts;

  // Filter products for search
  const filteredProducts = productSearchTerm
    ? products.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) &&
        !selectedProducts.some(sp => sp.productId === p.id)
      )
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      // Convert empty strings to null for optional fields
      channelId: formData.channelId || null,
      guestEmail: formData.guestEmail?.trim() || null,
      guestPhone: formData.guestPhone?.trim() || null,
      products: selectedProducts.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={booking ? 'Modifica Prenotazione' : 'Nuova Prenotazione'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Select
            label="Casa *"
            value={formData.propertyId}
            onChange={(e) => {
              setFormData({ ...formData, propertyId: e.target.value });
            }}
            required
            className="text-sm"
          >
            <option value="">Seleziona casa</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          <Select
            label="Canale"
            value={formData.channelId}
            onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
            className="text-sm"
          >
            <option value="">Diretto (0%)</option>
            {channels.filter(c => !c.name?.toLowerCase().includes('dirett')).map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.commissionRate}%)</option>
            ))}
          </Select>
        </div>

        <Input
          label="Nome Ospite *"
          value={formData.guestName}
          onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
          required
          className="text-sm"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.guestEmail}
            onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
            className="text-sm"
          />
          <Input
            label="Telefono"
            value={formData.guestPhone}
            onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Input
            label="Check-in *"
            type="date"
            value={formData.checkIn}
            onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
            required
            className="text-sm"
          />
          <Input
            label="Check-out *"
            type="date"
            value={formData.checkOut}
            onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
            required
            className="text-sm"
          />
          <Input
            label="Ospiti"
            type="number"
            min="1"
            value={formData.numberOfGuests}
            onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })}
            required
            className="text-sm col-span-2 sm:col-span-1"
          />
        </div>

        <Input
          label="Ricavo Lordo (€) *"
          type="number"
          step="0.01"
          min="0"
          value={formData.grossRevenue}
          onChange={(e) => setFormData({ ...formData, grossRevenue: e.target.value })}
          required
          className="text-sm"
        />

        {/* Template & Products Section */}
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3 border-b border-primary-200">
            <h4 className="font-semibold text-primary-800 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Costi Prodotti
            </h4>
          </div>

          <div className="p-4 space-y-4">
            {/* Template Selection - Card Style */}
            {availableTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applica un template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableTemplates.map(t => {
                    const isSelected = selectedTemplateId === t.id;
                    const templateCost = t.products?.reduce((sum, tp) =>
                      sum + (tp.product?.price || 0) * tp.quantity, 0) || 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplateChange(isSelected ? '' : t.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-sm truncate">{t.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{t.minGuests}-{t.maxGuests} ospiti</span>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-primary-600' : 'text-gray-600'}`}>
                            €{templateCost.toFixed(0)}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center justify-center">
                            <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                              Applicato
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider with "or" */}
            {availableTemplates.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-sm text-gray-500">oppure aggiungi singoli prodotti</span>
                </div>
              </div>
            )}

            {/* Product search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca prodotto da aggiungere..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredProducts.slice(0, 10).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-primary-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <span className="text-sm text-primary-600 font-medium">
                        €{parseFloat(product.price).toFixed(2)}/{product.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected products */}
            {selectedProducts.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {availableTemplates.length > 0
                    ? 'Seleziona un template o cerca prodotti'
                    : 'Cerca prodotti da aggiungere'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Prodotti selezionati ({selectedProducts.length})
                  </span>
                  {selectedTemplateId && selectedTemplateId !== 'custom' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      da template
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                  {selectedProducts.map(p => (
                    <div key={p.productId} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{p.product?.name}</p>
                        <p className="text-xs text-gray-500">
                          €{parseFloat(p.product?.price || 0).toFixed(2)} / {p.product?.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(p.productId, Math.max(1, p.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={Math.round(p.quantity)}
                          onChange={(e) => handleQuantityChange(p.productId, e.target.value)}
                          className="w-14 px-2 py-1.5 text-center border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(p.productId, p.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold"
                        >
                          +
                        </button>
                        <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                          €{(p.quantity * (p.product?.price || 0)).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(p.productId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variable costs total */}
            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-100">
                <span className="font-semibold text-gray-700">Totale Costi Prodotti:</span>
                <span className="text-xl font-bold text-red-600">€{variableCosts.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial summary */}
        {grossRevenue > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Lordo:</span>
              <span>€{grossRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Commissione ({commissionRate}%):</span>
              <span>-€{commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Netto:</span>
              <span>€{netRevenue.toFixed(2)}</span>
            </div>
            {variableCosts > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Costi variabili:</span>
                <span>-€{variableCosts.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Margine Netto:</span>
              <span className={netMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                €{netMargin.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <Input
          label="Note"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="text-sm"
        />

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth className="text-sm">
            Annulla
          </Button>
          <Button type="submit" fullWidth disabled={isLoading} className="text-sm">
            {isLoading ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BookingDetailsModal({ isOpen, onClose, booking, onStatusChange }) {
  if (!booking) return null;

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dettagli Prenotazione" size="lg">
      <div className="space-y-6">
        {/* Intestazione con nome e stato */}
        <div className="bg-gray-50 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900">{booking.guestName}</h3>
              <p className="text-base text-gray-600 mt-1">{booking.property?.name}</p>
            </div>
            <span className={`flex-shrink-0 px-4 py-2 rounded-full text-base font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Date e info principali */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-gray-500 text-sm mb-1">Arrivo</p>
              <p className="text-lg font-semibold">{format(parseISO(booking.checkIn), 'dd MMMM yyyy', { locale: it })}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-gray-500 text-sm mb-1">Partenza</p>
              <p className="text-lg font-semibold">{format(parseISO(booking.checkOut), 'dd MMMM yyyy', { locale: it })}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-gray-900">{booking.nights}</p>
              <p className="text-sm text-gray-500">{booking.nights === 1 ? 'Notte' : 'Notti'}</p>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-gray-900">{booking.numberOfGuests}</p>
              <p className="text-sm text-gray-500">{booking.numberOfGuests === 1 ? 'Ospite' : 'Ospiti'}</p>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-green-600">€{parseFloat(booking.netMargin).toFixed(0)}</p>
              <p className="text-sm text-gray-500">Guadagno</p>
            </div>
          </div>
        </div>

        {/* Riepilogo economico */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-lg font-semibold mb-4">Riepilogo Economico</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-base">
              <span className="text-gray-600">Totale incassato</span>
              <span className="font-semibold">€{parseFloat(booking.grossRevenue).toFixed(2)}</span>
            </div>
            {parseFloat(booking.commissionAmount) > 0 && (
              <div className="flex justify-between items-center text-base text-red-600">
                <span>Commissione ({booking.commissionRate}%)</span>
                <span>-€{parseFloat(booking.commissionAmount).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(booking.variableCosts) > 0 && (
              <div className="flex justify-between items-center text-base text-red-600">
                <span>Spese</span>
                <span>-€{parseFloat(booking.variableCosts).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-bold pt-3 border-t-2 border-gray-300">
              <span>Il tuo guadagno</span>
              <span className="text-green-600">€{parseFloat(booking.netMargin).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Azioni sulla prenotazione */}
        <div className="border-t-2 pt-5">
          <h4 className="text-lg font-semibold mb-3">Vuoi modificare lo stato?</h4>
          <div className="flex gap-3">
            {booking.status === 'CANCELLED' ? (
              <Button
                onClick={() => onStatusChange('CONFIRMED')}
                className="py-3 px-6 text-base"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Ripristina Prenotazione
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
                    onStatusChange('CANCELLED');
                  }
                }}
                className="py-3 px-6 text-base"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Cancella Prenotazione
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default Bookings;
