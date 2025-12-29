import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  User,
  Calendar,
  MapPin,
  Users,
  FileText,
  Camera,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { getBookingByToken, submitGuestData, uploadDocumentPhoto } from '../api/checkin.api';

const EMPTY_GUEST = {
  firstName: '',
  lastName: '',
  sex: '',
  birthDate: '',
  birthCity: '',
  birthProvince: '',
  birthCountry: '100',
  citizenship: '100',
  documentType: 'IDENT',
  documentNumber: '',
  documentIssuer: '',
  documentExpiry: '',
};

export const GuestCheckIn = () => {
  const { token } = useParams();
  const [guests, setGuests] = useState([{ ...EMPTY_GUEST }]);
  const [expandedGuest, setExpandedGuest] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['checkin', token],
    queryFn: () => getBookingByToken(token),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (guestData) => submitGuestData(token, guestData),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  // Initialize guests from booking if available
  useEffect(() => {
    if (data?.booking?.guests?.length > 0) {
      setGuests(
        data.booking.guests.map((g) => ({
          ...EMPTY_GUEST,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          sex: g.sex || '',
          birthDate: g.birthDate ? format(new Date(g.birthDate), 'yyyy-MM-dd') : '',
          birthCity: g.birthCity || '',
          birthProvince: g.birthProvince || '',
          birthCountry: g.birthCountry || '100',
          citizenship: g.citizenship || '100',
          documentType: g.documentType || 'IDENT',
          documentNumber: g.documentNumber || '',
          documentIssuer: g.documentIssuer || '',
          documentExpiry: g.documentExpiry ? format(new Date(g.documentExpiry), 'yyyy-MM-dd') : '',
        }))
      );
    } else if (data?.booking?.numberOfGuests) {
      // Pre-populate with empty guests based on number of guests
      const numGuests = data.booking.numberOfGuests;
      const guestArray = Array(numGuests)
        .fill(null)
        .map(() => ({ ...EMPTY_GUEST }));
      // Pre-fill first guest name from booking
      if (data.booking.guestName) {
        const nameParts = data.booking.guestName.split(' ');
        guestArray[0].firstName = nameParts[0] || '';
        guestArray[0].lastName = nameParts.slice(1).join(' ') || '';
      }
      setGuests(guestArray);
    }
  }, [data]);

  const updateGuest = (index, field, value) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  const addGuest = () => {
    setGuests([...guests, { ...EMPTY_GUEST }]);
    setExpandedGuest(guests.length);
  };

  const removeGuest = (index) => {
    if (guests.length > 1) {
      const newGuests = guests.filter((_, i) => i !== index);
      setGuests(newGuests);
      if (expandedGuest >= newGuests.length) {
        setExpandedGuest(newGuests.length - 1);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(guests);
  };

  const isItalian = (countryCode) => countryCode === '100';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link non valido</h1>
          <p className="text-gray-600">
            {error.response?.data?.error || 'Il link potrebbe essere scaduto o non esistere.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted || data?.booking?.checkInCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dati inviati!</h1>
          <p className="text-gray-600">
            Grazie per aver completato la registrazione. Il proprietario verificherà i tuoi dati.
          </p>
        </div>
      </div>
    );
  }

  const { booking, documentTypes, countries, provinces } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Check-in Online</h1>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-primary-600" />
              <span className="font-medium">{booking.property?.name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-5 h-5 text-primary-600" />
              <span>
                {format(new Date(booking.checkIn), 'd MMMM yyyy', { locale: it })} -{' '}
                {format(new Date(booking.checkOut), 'd MMMM yyyy', { locale: it })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Users className="w-5 h-5 text-primary-600" />
              <span>
                {booking.numberOfGuests} {booking.numberOfGuests === 1 ? 'ospite' : 'ospiti'} -{' '}
                {booking.nights} {booking.nights === 1 ? 'notte' : 'notti'}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Informazioni richieste per legge</p>
              <p>
                In Italia è obbligatorio comunicare i dati degli ospiti alle autorità di pubblica
                sicurezza. Compila i dati per ogni ospite.
              </p>
            </div>
          </div>
        </div>

        {/* Guest Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            {guests.map((guest, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Guest Header */}
                <button
                  type="button"
                  onClick={() => setExpandedGuest(expandedGuest === index ? -1 : index)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {guest.firstName && guest.lastName
                          ? `${guest.firstName} ${guest.lastName}`
                          : `Ospite ${index + 1}`}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-primary-600">Capofamiglia</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {guests.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuest(index);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {expandedGuest === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Guest Fields */}
                {expandedGuest === index && (
                  <div className="p-4 space-y-4">
                    {/* Nome e Cognome */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.firstName}
                          onChange={(e) => updateGuest(index, 'firstName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cognome *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.lastName}
                          onChange={(e) => updateGuest(index, 'lastName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Sesso e Data di nascita */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sesso *
                        </label>
                        <select
                          required
                          value={guest.sex}
                          onChange={(e) => updateGuest(index, 'sex', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Seleziona</option>
                          <option value="M">Maschio</option>
                          <option value="F">Femmina</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data di nascita *
                        </label>
                        <input
                          type="date"
                          required
                          value={guest.birthDate}
                          onChange={(e) => updateGuest(index, 'birthDate', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Luogo di nascita */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stato di nascita *
                      </label>
                      <select
                        required
                        value={guest.birthCountry}
                        onChange={(e) => updateGuest(index, 'birthCountry', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isItalian(guest.birthCountry) && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comune di nascita *
                          </label>
                          <input
                            type="text"
                            required
                            value={guest.birthCity}
                            onChange={(e) => updateGuest(index, 'birthCity', e.target.value)}
                            placeholder="es. Roma"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Provincia *
                          </label>
                          <select
                            required
                            value={guest.birthProvince}
                            onChange={(e) => updateGuest(index, 'birthProvince', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">--</option>
                            {provinces.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {!isItalian(guest.birthCountry) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Città di nascita *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.birthCity}
                          onChange={(e) => updateGuest(index, 'birthCity', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}

                    {/* Cittadinanza */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cittadinanza *
                      </label>
                      <select
                        required
                        value={guest.citizenship}
                        onChange={(e) => updateGuest(index, 'citizenship', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Documento (solo per capofamiglia) */}
                    {index === 0 && (
                      <>
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-medium text-gray-900 mb-3">Documento di identità</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo documento *
                            </label>
                            <select
                              required
                              value={guest.documentType}
                              onChange={(e) => updateGuest(index, 'documentType', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              {documentTypes.map((dt) => (
                                <option key={dt.code} value={dt.code}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Numero documento *
                            </label>
                            <input
                              type="text"
                              required
                              value={guest.documentNumber}
                              onChange={(e) => updateGuest(index, 'documentNumber', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rilasciato da
                            </label>
                            <input
                              type="text"
                              value={guest.documentIssuer}
                              onChange={(e) => updateGuest(index, 'documentIssuer', e.target.value)}
                              placeholder="es. Comune di Roma"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Scadenza
                            </label>
                            <input
                              type="date"
                              value={guest.documentExpiry}
                              onChange={(e) => updateGuest(index, 'documentExpiry', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Guest Button */}
          <button
            type="button"
            onClick={addGuest}
            className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Aggiungi ospite
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Invio in corso...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Invia dati
              </>
            )}
          </button>

          {submitMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {submitMutation.error?.response?.data?.error ||
                'Si è verificato un errore. Riprova.'}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          I tuoi dati saranno trattati nel rispetto della normativa sulla privacy.
        </div>
      </div>
    </div>
  );
};

export default GuestCheckIn;
