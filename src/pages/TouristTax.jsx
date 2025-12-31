import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Calculator, ChevronLeft, ChevronRight, Euro, Users, Moon, Home, AlertCircle } from 'lucide-react';
import * as bookingsApi from '../api/bookings.api';

const RATE_PER_PERSON_PER_NIGHT = 2;
const MAX_NIGHTS = 3;
const MIN_AGE = 14;

// Calculate age at a given date
const calculateAgeAtDate = (birthDate, referenceDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Check if channel is taxable (Booking.com or Airbnb, NOT direct)
const isTaxableChannel = (booking) => {
  const channelName = booking.channel?.name?.toLowerCase() || '';
  const iCalSource = booking.iCalSource?.toLowerCase() || '';

  // Check if it's from Booking.com or Airbnb
  const isBookingCom = channelName.includes('booking') || iCalSource.includes('booking');
  const isAirbnb = channelName.includes('airbnb') || iCalSource.includes('airbnb');

  // Exclude direct bookings
  const isDirect = channelName.includes('dirett') || channelName.includes('direct') ||
                   iCalSource.includes('dirett') || iCalSource.includes('direct');

  return (isBookingCom || isAirbnb) && !isDirect;
};

export const TouristTax = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedProperty, setSelectedProperty] = useState('all');

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Get bookings for selected month with guests data
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings', 'tourist-tax', selectedYear, selectedMonth],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const response = await bookingsApi.getBookings({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 500 // Get all bookings for the month
      });

      return response.data || response;
    },
  });

  // Calculate tax for each booking
  const taxCalculation = useMemo(() => {
    if (!bookingsData) return { bookings: [], totals: { totalTax: 0, totalNights: 0, totalGuests: 0, totalExempt: 0 } };

    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    const processedBookings = bookingsData
      .filter(booking => {
        // Only include taxable channels
        if (!isTaxableChannel(booking)) return false;

        // Only include bookings that have check-in within the selected month
        const checkIn = new Date(booking.checkIn);
        return checkIn >= monthStart && checkIn <= monthEnd;
      })
      .map(booking => {
        const checkIn = new Date(booking.checkIn);
        const guests = booking.guests || [];

        // Count eligible guests (over 14 at check-in)
        let eligibleGuests = 0;
        let exemptGuests = 0;

        if (guests.length > 0) {
          guests.forEach(guest => {
            const age = calculateAgeAtDate(guest.birthDate, checkIn);
            if (age !== null && age >= MIN_AGE) {
              eligibleGuests++;
            } else if (age !== null && age < MIN_AGE) {
              exemptGuests++;
            }
          });
        } else {
          // If no guest registry, assume all guests are adults
          eligibleGuests = booking.numberOfGuests;
        }

        // Calculate taxable nights (max 3)
        const taxableNights = Math.min(booking.nights, MAX_NIGHTS);

        // Calculate tax
        const taxAmount = eligibleGuests * taxableNights * RATE_PER_PERSON_PER_NIGHT;

        return {
          ...booking,
          eligibleGuests,
          exemptGuests,
          taxableNights,
          taxAmount,
          channelDisplay: booking.channel?.name || booking.iCalSource || 'N/A'
        };
      });

    // Calculate totals
    const totals = processedBookings.reduce((acc, booking) => ({
      totalTax: acc.totalTax + booking.taxAmount,
      totalNights: acc.totalNights + booking.nights,
      totalTaxableNights: acc.totalTaxableNights + booking.taxableNights,
      totalAllGuests: acc.totalAllGuests + booking.numberOfGuests,
      totalPayingGuests: acc.totalPayingGuests + booking.eligibleGuests,
      totalExempt: acc.totalExempt + booking.exemptGuests,
      totalBookings: acc.totalBookings + 1
    }), { totalTax: 0, totalNights: 0, totalTaxableNights: 0, totalAllGuests: 0, totalPayingGuests: 0, totalExempt: 0, totalBookings: 0 });

    // Get unique properties
    const properties = [...new Map(processedBookings.map(b => [b.propertyId, { id: b.propertyId, name: b.property?.name || 'N/A' }])).values()];

    return { bookings: processedBookings, totals, properties };
  }, [bookingsData, selectedYear, selectedMonth]);

  // Calculate nights breakdown for selected property
  const nightsBreakdown = useMemo(() => {
    const filteredBookings = selectedProperty === 'all'
      ? taxCalculation.bookings
      : taxCalculation.bookings.filter(b => b.propertyId === selectedProperty);

    const breakdown = {
      '1': { label: '1 notte', totalGuests: 0, payingGuests: 0, exemptGuests: 0, bookings: 0 },
      '2': { label: '2 notti', totalGuests: 0, payingGuests: 0, exemptGuests: 0, bookings: 0 },
      '3+': { label: '3 o più notti', totalGuests: 0, payingGuests: 0, exemptGuests: 0, bookings: 0 },
    };

    filteredBookings.forEach(booking => {
      const nights = booking.nights;
      let category;
      if (nights === 1) category = '1';
      else if (nights === 2) category = '2';
      else category = '3+';

      breakdown[category].totalGuests += booking.numberOfGuests;
      breakdown[category].payingGuests += booking.eligibleGuests;
      breakdown[category].exemptGuests += booking.exemptGuests;
      breakdown[category].bookings += 1;
    });

    return breakdown;
  }, [taxCalculation.bookings, selectedProperty]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
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
            <Calculator className="w-8 h-8 text-primary-600" />
            Tassa di Soggiorno
          </h1>
          <p className="text-base text-gray-600 mt-1">
            Calcolo mensile per Booking.com e Airbnb
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Regole di calcolo:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>€{RATE_PER_PERSON_PER_NIGHT}</strong> a persona a notte</li>
              <li>Massimo <strong>{MAX_NIGHTS} notti</strong> (max €{RATE_PER_PERSON_PER_NIGHT * MAX_NIGHTS} a persona)</li>
              <li>Esenti i minori di <strong>{MIN_AGE} anni</strong></li>
              <li>Solo prenotazioni da <strong>Booking.com</strong> e <strong>Airbnb</strong></li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Month Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {months[selectedMonth]} {selectedYear}
            </h2>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Euro className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700">Totale Tassa</p>
              <p className="text-2xl font-bold text-green-900">€{taxCalculation.totals.totalTax.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Ospiti Paganti</p>
              <p className="text-2xl font-bold text-blue-900">
                {taxCalculation.totals.totalPayingGuests}
                <span className="text-sm font-normal text-blue-600 ml-1">/ {taxCalculation.totals.totalAllGuests}</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700">Notti Totali</p>
              <p className="text-2xl font-bold text-purple-900">{taxCalculation.totals.totalNights}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-700">Prenotazioni</p>
              <p className="text-2xl font-bold text-orange-900">{taxCalculation.totals.totalBookings}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Exempt guests info */}
      {taxCalculation.totals.totalExempt > 0 && (
        <Card className="p-4 bg-yellow-50 border-2 border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>{taxCalculation.totals.totalExempt}</strong> ospiti esenti (minori di {MIN_AGE} anni)
          </p>
        </Card>
      )}

      {/* Bookings Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dettaglio Prenotazioni</h3>
        </div>

        {taxCalculation.bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna prenotazione tassabile per {months[selectedMonth]} {selectedYear}</p>
            <p className="text-sm mt-2">Le prenotazioni dirette non sono incluse nel calcolo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ospite</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Casa</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Canale</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Check-in</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Notti</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ospiti Totali</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ospiti Paganti</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tassa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {taxCalculation.bookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{booking.guestName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {booking.property?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        booking.channelDisplay.toLowerCase().includes('booking')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {booking.channelDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(booking.checkIn).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">
                      {booking.nights}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {booking.numberOfGuests}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">
                      {booking.eligibleGuests}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      €{booking.taxAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-right font-semibold text-gray-700">
                    Totale:
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {taxCalculation.totals.totalNights}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {taxCalculation.totals.totalAllGuests}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">
                    {taxCalculation.totals.totalPayingGuests}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
                    €{taxCalculation.totals.totalTax.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Breakdown by nights */}
      {taxCalculation.bookings.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Riepilogo per Numero di Notti</h3>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tutte le case</option>
              {taxCalculation.properties.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.name}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notti</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ospiti Totali</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ospiti Paganti</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Esenzioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(nightsBreakdown).map(([key, data]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{data.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{data.totalGuests}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{data.payingGuests}</td>
                    <td className="px-4 py-3 text-center text-orange-600">
                      {data.exemptGuests > 0 ? data.exemptGuests : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700">Totale</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {Object.values(nightsBreakdown).reduce((sum, d) => sum + d.totalGuests, 0)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">
                    {Object.values(nightsBreakdown).reduce((sum, d) => sum + d.payingGuests, 0)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-orange-600">
                    {Object.values(nightsBreakdown).reduce((sum, d) => sum + d.exemptGuests, 0) || '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TouristTax;
