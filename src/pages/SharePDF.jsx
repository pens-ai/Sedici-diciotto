import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import * as bookingsApi from '../api/bookings.api';
import * as propertiesApi from '../api/properties.api';
import Button from '../components/Button';
import { Input, Select } from '../components/Input';
import { Card } from '../components/Card';

export function SharePDF() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sharedFile, setSharedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [editedData, setEditedData] = useState({});

  // Fetch properties
  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.getProperties,
  });
  const properties = propertiesData?.data || [];

  // Handle shared file from Share Target API
  useEffect(() => {
    const handleSharedFile = async () => {
      // Check if we have a shared file in the service worker cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          // Request the shared file from service worker
          const cache = await caches.open('share-target-cache');
          const cachedResponse = await cache.match('/shared-pdf');

          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            const file = new File([blob], 'booking.pdf', { type: 'application/pdf' });
            setSharedFile(file);

            // Clear the cache
            await cache.delete('/shared-pdf');

            // Auto-parse the file
            await parseFile(file);
          }
        } catch (err) {
          console.error('Error retrieving shared file:', err);
        }
      }

      // Also check URL params (fallback method)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('shared')) {
        // File was shared, but we need to get it from somewhere
        // This is a placeholder for when the file comes via different methods
      }
    };

    handleSharedFile();
  }, []);

  const parseFile = async (file) => {
    setIsParsing(true);
    setError(null);

    try {
      const result = await bookingsApi.parsePDF(file);
      if (result.success && result.data) {
        setParsedData(result.data);
        initializeEditedData(result.data);
      } else {
        setError('Impossibile estrarre i dati dal PDF');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante l\'analisi del PDF');
    } finally {
      setIsParsing(false);
    }
  };

  const initializeEditedData = (data) => {
    const formatDateForInput = (date) => {
      if (!date) return '';
      try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    setEditedData({
      guestName: data.guestName || '',
      numberOfGuests: data.numberOfGuests || 1,
      checkIn: formatDateForInput(data.checkIn),
      checkOut: formatDateForInput(data.checkOut),
      nights: data.nights || 0,
      grossRevenue: data.grossRevenue || 0,
      commissionAmount: data.commissionAmount || 0,
      commissionRate: data.commissionRate || 15,
      netRevenue: data.netRevenue || 0,
      bookingNumber: data.bookingNumber || '',
      country: data.country || '',
      arrivalTime: data.arrivalTime || '',
    });

    // Auto-select property if matched
    if (properties.length > 0) {
      if (data.propertyName) {
        const match = properties.find(p =>
          p.name.toLowerCase().includes(data.propertyName.toLowerCase()) ||
          data.propertyName.toLowerCase().includes(p.name.toLowerCase())
        );
        if (match) {
          setSelectedPropertyId(match.id);
          return;
        }
      }
      setSelectedPropertyId(properties[0]?.id || '');
    }
  };

  // Recalculate nights when dates change
  useEffect(() => {
    if (editedData.checkIn && editedData.checkOut) {
      const checkIn = new Date(editedData.checkIn);
      const checkOut = new Date(editedData.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (nights > 0 && nights !== editedData.nights) {
        setEditedData(prev => ({ ...prev, nights }));
      }
    }
  }, [editedData.checkIn, editedData.checkOut]);

  // Recalculate net revenue
  useEffect(() => {
    const gross = parseFloat(editedData.grossRevenue) || 0;
    const commission = parseFloat(editedData.commissionAmount) || 0;
    const net = gross - commission;
    if (net !== editedData.netRevenue) {
      setEditedData(prev => ({ ...prev, netRevenue: net }));
    }
  }, [editedData.grossRevenue, editedData.commissionAmount]);

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSharedFile(file);
      await parseFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedPropertyId) {
      toast.error('Seleziona una proprietà');
      return;
    }
    if (!editedData.checkIn || !editedData.checkOut) {
      toast.error('Inserisci le date di check-in e check-out');
      return;
    }

    setIsImporting(true);
    try {
      const dataToSubmit = {
        ...editedData,
        checkIn: new Date(editedData.checkIn),
        checkOut: new Date(editedData.checkOut),
        source: parsedData?.source || 'PDF Import',
      };

      const result = await bookingsApi.importBookingFromPDF(selectedPropertyId, dataToSubmit);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      setImportSuccess({
        checkInUrl: result.checkInUrl,
        guestName: editedData.guestName || 'Ospite',
      });

      toast.success('Prenotazione importata con successo!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Errore durante l\'importazione');
    } finally {
      setIsImporting(false);
    }
  };

  // Success view
  if (importSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prenotazione Importata!</h2>
            <p className="text-gray-600">
              Invia questo link a <span className="font-semibold">{importSuccess.guestName}</span> per il check-in
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Link Check-in</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={importSuccess.checkInUrl}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(importSuccess.checkInUrl);
                  toast.success('Link copiato!');
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Copia
              </button>
            </div>
          </div>

          <Button onClick={() => navigate('/bookings')} fullWidth>
            <Home className="w-4 h-4 mr-2" />
            Vai alle Prenotazioni
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Import PDF Prenotazione</h1>
            <p className="text-gray-600 text-sm">
              Carica o condividi un PDF di Booking.com per importare automaticamente la prenotazione
            </p>
          </div>

          {/* File upload area */}
          {!parsedData && !isParsing && (
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Tocca per selezionare un PDF</p>
                  <p className="text-xs text-gray-400">oppure condividi direttamente dall'app Booking</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Loading state */}
          {isParsing && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analizzando il PDF...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setParsedData(null);
                  setSharedFile(null);
                }}
                className="mt-3"
              >
                Riprova
              </Button>
            </div>
          )}

          {/* Parsed data form */}
          {parsedData && !error && (
            <div className="space-y-4">
              {/* Source badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">{parsedData.source || 'PDF Import'}</p>
                  {editedData.bookingNumber && (
                    <p className="text-xs text-blue-700">#{editedData.bookingNumber}</p>
                  )}
                </div>
              </div>

              {/* Property selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proprietà *</label>
                <Select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                >
                  <option value="">Seleziona proprietà</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              {/* Guest info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome ospite</label>
                  <Input
                    type="text"
                    value={editedData.guestName}
                    onChange={(e) => handleFieldChange('guestName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N. ospiti</label>
                  <Input
                    type="number"
                    min="1"
                    value={editedData.numberOfGuests}
                    onChange={(e) => handleFieldChange('numberOfGuests', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check-in *</label>
                  <Input
                    type="date"
                    value={editedData.checkIn}
                    onChange={(e) => handleFieldChange('checkIn', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check-out *</label>
                  <Input
                    type="date"
                    value={editedData.checkOut}
                    onChange={(e) => handleFieldChange('checkOut', e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Notti: <span className="font-semibold">{editedData.nights || 0}</span>
              </p>

              {/* Financial */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Totale (EUR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.grossRevenue}
                    onChange={(e) => handleFieldChange('grossRevenue', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Commissione</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.commissionAmount}
                    onChange={(e) => handleFieldChange('commissionAmount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium text-gray-700">Netto</span>
                <span className="font-bold text-lg text-green-600">EUR {(editedData.netRevenue || 0).toFixed(2)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/bookings')}
                  fullWidth
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleImport}
                  fullWidth
                  disabled={!selectedPropertyId || isImporting || !editedData.checkIn || !editedData.checkOut}
                >
                  {isImporting ? 'Importazione...' : 'Importa'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Back to app link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default SharePDF;
