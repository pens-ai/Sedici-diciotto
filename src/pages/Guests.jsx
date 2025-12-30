import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Users,
  Search,
  FileText,
  CheckCircle,
  Copy,
  Download,
  RotateCcw,
  Link as LinkIcon,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as bookingsApi from '../api/bookings.api';
import * as checkinApi from '../api/checkin.api';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import Button from '../components/Button';

export const Guests = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCheckInLink, setShowCheckInLink] = useState(false);
  const [checkInUrl, setCheckInUrl] = useState('');

  // Fetch all bookings
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getBookings(),
  });

  const bookings = bookingsData?.data || [];

  // Fetch guests for selected booking
  const { data: guestsData, refetch: refetchGuests } = useQuery({
    queryKey: ['booking-guests', selectedBooking?.id],
    queryFn: () => checkinApi.getBookingGuests(selectedBooking.id),
    enabled: !!selectedBooking?.id,
  });

  // Generate check-in token mutation
  const generateTokenMutation = useMutation({
    mutationFn: () => checkinApi.generateCheckInToken(selectedBooking.id),
    onSuccess: (data) => {
      setCheckInUrl(data.url);
      setShowCheckInLink(true);
      refetchGuests();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('✅ Link creato! Copialo e invialo agli ospiti');
    },
    onError: () => {
      toast.error('Errore nella generazione del link');
    },
  });

  // Confirm all guests mutation
  const confirmAllMutation = useMutation({
    mutationFn: () => checkinApi.confirmAllGuests(selectedBooking.id),
    onSuccess: () => {
      refetchGuests();
      toast.success('✅ Tutti gli ospiti confermati');
    },
    onError: () => {
      toast.error('Errore nella conferma');
    },
  });

  // Reset guest data mutation
  const resetGuestsMutation = useMutation({
    mutationFn: () => checkinApi.resetGuestData(selectedBooking.id),
    onSuccess: () => {
      refetchGuests();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('🔄 Dati eliminati. Il link è nuovamente attivo.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante il reset');
    },
  });

  // Download Alloggiati TXT
  const handleDownloadAlloggiati = async () => {
    try {
      const blob = await checkinApi.downloadAlloggiatiTxt(selectedBooking.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alloggiati_${format(parseISO(selectedBooking.checkIn), 'yyyyMMdd')}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('📄 File scaricato');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore durante il download');
    }
  };

  const copyToClipboard = () => {
    const url = checkInUrl || `${window.location.origin}/checkin/${guestsData?.checkInToken}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Link copiato!');
  };

  // Get all bookings sorted by check-in date (most recent first)
  const sortedBookings = useMemo(() => {
    return [...bookings]
      .filter(b => b.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  }, [bookings]);

  // Filter bookings by search
  const filteredBookings = useMemo(() => {
    if (!searchTerm) return sortedBookings;
    const search = searchTerm.toLowerCase();
    return sortedBookings.filter(
      (b) =>
        b.guestName?.toLowerCase().includes(search) ||
        b.guestEmail?.toLowerCase().includes(search) ||
        b.guestPhone?.includes(search) ||
        b.property?.name?.toLowerCase().includes(search)
    );
  }, [sortedBookings, searchTerm]);

  // Stats
  const uniqueGuests = useMemo(() => {
    const guestSet = new Set();
    bookings.forEach(b => {
      const key = b.guestEmail || b.guestName?.toLowerCase().trim();
      if (key) guestSet.add(key);
    });
    return guestSet.size;
  }, [bookings]);

  const recurringGuests = useMemo(() => {
    const guestCount = {};
    bookings.forEach(b => {
      const key = b.guestEmail || b.guestName?.toLowerCase().trim();
      if (key) guestCount[key] = (guestCount[key] || 0) + 1;
    });
    return Object.values(guestCount).filter(c => c > 1).length;
  }, [bookings]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
  };

  // Get document status for a booking
  const getDocumentStatus = (booking) => {
    if (booking.checkInCompleted) {
      return { icon: '✅', label: 'Documenti ricevuti', color: 'bg-green-100 text-green-700 border-green-200' };
    } else if (booking.checkInToken) {
      return { icon: '⏳', label: 'In attesa documenti', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
    return { icon: '📄', label: 'Da richiedere', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const handleOpenDocuments = (booking, e) => {
    e?.stopPropagation();
    setSelectedBooking(booking);
    setShowCheckInLink(false);
    setCheckInUrl('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Caricamento ospiti...</p>
        </div>
      </div>
    );
  }

  const bookingGuests = guestsData?.guests || [];
  const hasCheckInToken = guestsData?.checkInToken;
  const confirmedGuests = bookingGuests.filter(g => g.isConfirmed).length;

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              👥 Ospiti
            </h1>
            <p className="text-indigo-100 mt-2 text-lg">
              Gestisci i documenti e lo storico dei tuoi ospiti
            </p>
          </div>
        </div>
      </div>

      {/* Stats con icone grandi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">👥</div>
            <div>
              <p className="text-blue-600 text-base font-medium">Totale Ospiti</p>
              <p className="text-3xl font-bold text-blue-800">{uniqueGuests}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📅</div>
            <div>
              <p className="text-green-600 text-base font-medium">Prenotazioni</p>
              <p className="text-3xl font-bold text-green-800">{sortedBookings.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔁</div>
            <div>
              <p className="text-amber-600 text-base font-medium">Ospiti Ricorrenti</p>
              <p className="text-3xl font-bold text-amber-800">{recurringGuests}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-2 border-gray-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Cerca per nome, email o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </Card>

      {/* Booking List */}
      {filteredBookings.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun ospite trovato</h3>
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? 'Prova con un termine di ricerca diverso'
                : 'Gli ospiti appariranno qui dopo la prima prenotazione'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const docStatus = getDocumentStatus(booking);
            return (
              <Card
                key={booking.id}
                hover
                className="border-2 border-gray-200 hover:border-indigo-300"
              >
                {/* Mobile Layout */}
                <div className="block sm:hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">
                        {booking.guestName?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{booking.guestName}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{booking.property?.name || 'N/A'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${docStatus.color}`}>
                      {docStatus.icon}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm text-gray-600 mb-3">
                    <span>📅 {format(parseISO(booking.checkIn), 'd MMM', { locale: it })} - {format(parseISO(booking.checkOut), 'd MMM', { locale: it })}</span>
                    <span className="font-semibold text-green-600">{formatCurrency(booking.grossRevenue)}</span>
                  </div>

                  <button
                    onClick={(e) => handleOpenDocuments(booking, e)}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Gestisci Documenti
                  </button>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                  {/* Guest info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-white">
                        {booking.guestName?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-xl truncate">{booking.guestName}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          🏠 {booking.property?.name || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          📅 {format(parseISO(booking.checkIn), 'd MMM', { locale: it })} - {format(parseISO(booking.checkOut), 'd MMM yyyy', { locale: it })}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-green-600">
                          💰 {formatCurrency(booking.grossRevenue)}
                        </span>
                      </div>
                      {/* Document status badge */}
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${docStatus.color}`}>
                          {docStatus.icon} {docStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={(e) => handleOpenDocuments(booking, e)}
                      className="whitespace-nowrap"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Gestisci Documenti
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Booking Documents Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="📄 Documenti Ospiti"
          size="lg"
        >
          <div className="space-y-6">
            {/* Booking Info Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">{selectedBooking.guestName}</h3>
                <span className="text-lg font-bold text-green-600">{formatCurrency(selectedBooking.grossRevenue)}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-base text-gray-600">
                <span>🏠 {selectedBooking.property?.name}</span>
                <span>📅 {format(parseISO(selectedBooking.checkIn), 'd MMM', { locale: it })} - {format(parseISO(selectedBooking.checkOut), 'd MMM yyyy', { locale: it })}</span>
                <span>👥 {selectedBooking.numberOfGuests} ospiti</span>
              </div>
            </div>

            {/* Document Management Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Registrazione Ospiti</h4>
                  <p className="text-sm text-gray-500">Per la comunicazione obbligatoria in Questura</p>
                </div>
              </div>

              {/* No token generated */}
              {!hasCheckInToken && bookingGuests.length === 0 && (
                <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Send className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-base text-blue-800 font-medium mb-1">
                        Invia un link agli ospiti
                      </p>
                      <p className="text-sm text-blue-700">
                        Gli ospiti potranno compilare i loro dati anagrafici e caricare foto dei documenti in modo semplice dal telefono.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => generateTokenMutation.mutate()}
                    disabled={generateTokenMutation.isPending}
                    className="w-full py-3 text-base"
                  >
                    <LinkIcon className="w-5 h-5 mr-2" />
                    {generateTokenMutation.isPending ? '⏳ Generazione...' : '🔗 Crea Link per gli Ospiti'}
                  </Button>
                </div>
              )}

              {/* Token generated, waiting for guests */}
              {(showCheckInLink || hasCheckInToken) && bookingGuests.length === 0 && (
                <div className="bg-yellow-50 rounded-xl p-5 border-2 border-yellow-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <p className="text-base font-semibold text-yellow-800">⏳ In attesa dei dati degli ospiti</p>
                  </div>
                  <p className="text-sm text-yellow-700 mb-4">
                    Copia il link qui sotto e invialo via WhatsApp, SMS o email:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={checkInUrl || `${window.location.origin}/checkin/${guestsData?.checkInToken}`}
                      className="flex-1 px-4 py-3 text-base bg-white border-2 border-yellow-300 rounded-xl text-gray-700 font-mono text-sm"
                    />
                    <Button onClick={copyToClipboard} className="px-6">
                      <Copy className="w-5 h-5 mr-2" />
                      Copia
                    </Button>
                  </div>
                </div>
              )}

              {/* Guests received */}
              {bookingGuests.length > 0 && (
                <div className="space-y-4">
                  {/* Status bar */}
                  <div className="flex items-center justify-between bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-base font-semibold text-green-800">
                        ✅ Dati ricevuti: {bookingGuests.length} {bookingGuests.length === 1 ? 'ospite' : 'ospiti'}
                      </span>
                    </div>
                    <span className="text-sm text-green-700 bg-green-200 px-3 py-1 rounded-full font-medium">
                      {confirmedGuests}/{bookingGuests.length} confermati
                    </span>
                  </div>

                  {/* Guest list */}
                  <div className="space-y-3">
                    {bookingGuests.map((guest) => (
                      <div
                        key={guest.id}
                        className={`p-4 rounded-xl border-2 ${
                          guest.isConfirmed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              guest.isConfirmed ? 'bg-green-200' : 'bg-gray-200'
                            }`}>
                              {guest.isConfirmed ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <Users className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-gray-900">
                                {guest.firstName} {guest.lastName}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {guest.isMainGuest && (
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">👑 Principale</span>
                                )}
                                {guest.birthDate && (
                                  <span className="text-xs text-gray-500">
                                    🎂 {format(new Date(guest.birthDate), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {guest.documentType && (
                                  <span className="text-xs text-gray-500">
                                    🪪 {guest.documentType}: {guest.documentNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                            guest.isConfirmed ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {guest.isConfirmed ? '✅ OK' : '⏳ Da confermare'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for documents */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {confirmedGuests < bookingGuests.length && (
                      <Button
                        onClick={() => confirmAllMutation.mutate()}
                        disabled={confirmAllMutation.isPending}
                        className="py-3 text-base"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {confirmAllMutation.isPending ? '⏳ Conferma...' : '✅ Conferma Tutti'}
                      </Button>
                    )}
                    {confirmedGuests > 0 && (
                      <Button
                        variant="secondary"
                        onClick={handleDownloadAlloggiati}
                        className="py-3 text-base"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        📄 Scarica per Questura
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm('⚠️ Vuoi eliminare i dati degli ospiti?\n\nIl link tornerà attivo e potrai reinviarlo.')) {
                          resetGuestsMutation.mutate();
                        }
                      }}
                      disabled={resetGuestsMutation.isPending}
                      className="py-3 text-base"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      {resetGuestsMutation.isPending ? '⏳ Eliminazione...' : '🔄 Ricomincia'}
                    </Button>
                  </div>

                  {/* Link to resend */}
                  {hasCheckInToken && (
                    <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-sm text-gray-600">🔗 Link per gli ospiti (se devi reinviarlo)</span>
                      <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copia Link
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Guests;
