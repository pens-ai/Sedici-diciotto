import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Bed, Bath, Calendar, Link, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';
import * as propertiesApi from '../api/properties.api';
import * as icalApi from '../api/ical.api';

// Emoji delle case per rendere più visivo
const HOUSE_EMOJIS = ['🏠', '🏡', '🏘️', '🏢', '🏰', '🏨', '🏪', '⛺'];

export const Properties = () => {
  const queryClient = useQueryClient();
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    beds: '',
    bathrooms: '',
    description: ''
  });

  // iCal management
  const [expandedIcal, setExpandedIcal] = useState({});
  const [newIcalUrl, setNewIcalUrl] = useState({ name: '', url: '' });
  const [addingIcalTo, setAddingIcalTo] = useState(null);

  // Queries
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.getProperties,
  });

  const properties = propertiesData?.data || propertiesData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: propertiesApi.createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Casa creata con successo');
      setIsPropertyModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => propertiesApi.updateProperty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Casa aggiornata');
      setIsPropertyModalOpen(false);
      setEditingProperty(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: propertiesApi.deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Casa eliminata');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'eliminazione');
    },
  });

  // iCal mutations
  const generateTokenMutation = useMutation({
    mutationFn: (propertyId) => icalApi.generateICalToken(propertyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigator.clipboard.writeText(data.url);
      toast.success('Link iCal generato e copiato!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la generazione');
    },
  });

  const addIcalUrlMutation = useMutation({
    mutationFn: ({ propertyId, data }) => icalApi.addICalUrl(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setNewIcalUrl({ name: '', url: '' });
      setAddingIcalTo(null);
      toast.success('Calendario esterno aggiunto');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiunta');
    },
  });

  const removeIcalUrlMutation = useMutation({
    mutationFn: ({ propertyId, urlId }) => icalApi.removeICalUrl(propertyId, urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Calendario esterno rimosso');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la rimozione');
    },
  });

  const syncIcalMutation = useMutation({
    mutationFn: (propertyId) => icalApi.syncICalendar(propertyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(`Sincronizzazione completata: ${data.imported} importate, ${data.skipped} già presenti`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la sincronizzazione');
    },
  });

  const resetCalendarMutation = useMutation({
    mutationFn: (propertyId) => icalApi.resetCalendarBlocks(propertyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(`Calendario azzerato: ${data.deletedCount} blocchi rimossi`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'azzeramento');
    },
  });

  const handleResetCalendar = (propertyId) => {
    if (window.confirm('Sei sicuro di voler azzerare il calendario?\n\nTutti i blocchi importati da calendari esterni verranno eliminati.')) {
      resetCalendarMutation.mutate(propertyId);
    }
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setPropertyForm({ name: '', beds: '', bathrooms: '', description: '' });
    setIsPropertyModalOpen(true);
  };

  const handleEditProperty = (property) => {
    setEditingProperty(property);
    setPropertyForm({
      name: property.name,
      beds: property.beds?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      description: property.description || ''
    });
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = () => {
    const data = {
      name: propertyForm.name,
      beds: parseInt(propertyForm.beds) || 1,
      bathrooms: parseInt(propertyForm.bathrooms) || 1,
      description: propertyForm.description,
    };

    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteProperty = (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questa casa?\n\nTutte le prenotazioni associate verranno eliminate.')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleIcalExpand = (propertyId) => {
    setExpandedIcal(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiato!');
  };

  // Get emoji for property (based on index)
  const getPropertyEmoji = (index) => {
    return HOUSE_EMOJIS[index % HOUSE_EMOJIS.length];
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
            🏠 Le Tue Case
          </h1>
          <p className="text-base text-gray-600 mt-1">
            Gestisci le tue proprietà
          </p>
        </div>
        <Button onClick={handleAddProperty} className="text-base py-3 px-6 w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          Aggiungi Casa
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessuna casa registrata</h3>
            <p className="text-base text-gray-600 mb-6">
              Inizia aggiungendo la tua prima casa vacanza
            </p>
            <Button onClick={handleAddProperty} className="text-base py-3 px-6">
              <Plus className="w-5 h-5 mr-2" />
              Aggiungi la Prima Casa
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property, index) => {
            const emoji = getPropertyEmoji(index);

            return (
              <Card key={property.id} className="overflow-hidden">
                {/* Property header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start gap-4">
                    {/* Emoji icon */}
                    <div className="text-4xl sm:text-5xl flex-shrink-0">
                      {emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                        {property.name}
                      </h3>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-3 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <Bed className="w-4 h-4" />
                          {property.beds} {property.beds === 1 ? 'letto' : 'letti'}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms} {property.bathrooms === 1 ? 'bagno' : 'bagni'}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          {property._count?.bookings || 0} prenotazioni
                        </div>
                      </div>

                      {property.description && (
                        <p className="text-base text-gray-600 line-clamp-2">{property.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditProperty(property)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Modifica</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Elimina</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* iCal Sync section */}
                <div className="border-t-2 border-dashed border-gray-200">
                  <button
                    onClick={() => toggleIcalExpand(property.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-base font-semibold text-gray-900">
                          Sincronizzazione Calendario
                        </div>
                        <div className="text-sm text-gray-500">
                          Collega Booking.com, Airbnb e altri
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(property.iCalUrls?.length > 0) && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                          {property.iCalUrls.length} collegati
                        </span>
                      )}
                      {expandedIcal[property.id] ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedIcal[property.id] && (
                    <div className="px-4 sm:px-5 pb-5 space-y-4">
                      {/* Export Section */}
                      <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Esporta il tuo calendario
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Copia questo link su Booking.com e Airbnb per bloccare le date delle tue prenotazioni
                        </p>
                        {property.iCalToken ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/api/ical/export/${property.iCalToken}.ics`}
                              className="flex-1 px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/api/ical/export/${property.iCalToken}.ics`)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copia
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => generateTokenMutation.mutate(property.id)}
                            disabled={generateTokenMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            <Link className="w-4 h-4 mr-2" />
                            {generateTokenMutation.isPending ? 'Generazione...' : 'Genera Link iCal'}
                          </Button>
                        )}
                      </div>

                      {/* Import Section */}
                      <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Importa calendari esterni
                        </h4>
                        <p className="text-sm text-green-700 mb-3">
                          Incolla i link iCal di Booking.com, Airbnb per sincronizzare le prenotazioni
                        </p>

                        {/* Existing iCal URLs */}
                        {property.iCalUrls?.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {property.iCalUrls.map((ical) => (
                              <div key={ical.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">
                                    {ical.name.charAt(0).toUpperCase()}
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-900">{ical.name}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{ical.url}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeIcalUrlMutation.mutate({ propertyId: property.id, urlId: ical.id })}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add new iCal URL */}
                        {addingIcalTo === property.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Nome (es. Booking.com, Airbnb)"
                              value={newIcalUrl.name}
                              onChange={(e) => setNewIcalUrl({ ...newIcalUrl, name: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm"
                            />
                            <input
                              type="url"
                              placeholder="URL iCal (https://...)"
                              value={newIcalUrl.url}
                              onChange={(e) => setNewIcalUrl({ ...newIcalUrl, url: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setAddingIcalTo(null);
                                  setNewIcalUrl({ name: '', url: '' });
                                }}
                              >
                                Annulla
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => addIcalUrlMutation.mutate({
                                  propertyId: property.id,
                                  data: newIcalUrl
                                })}
                                disabled={!newIcalUrl.name || !newIcalUrl.url || addIcalUrlMutation.isPending}
                              >
                                {addIcalUrlMutation.isPending ? 'Aggiunta...' : 'Aggiungi'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => setAddingIcalTo(property.id)}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Aggiungi Calendario Esterno
                          </Button>
                        )}
                      </div>

                      {/* Sync Button */}
                      {property.iCalUrls?.length > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Sincronizza ora</p>
                            <p className="text-sm text-gray-500">
                              {property.iCalLastSync
                                ? `Ultima sync: ${new Date(property.iCalLastSync).toLocaleString('it-IT')}`
                                : 'Mai sincronizzato'}
                            </p>
                          </div>
                          <Button
                            onClick={() => syncIcalMutation.mutate(property.id)}
                            disabled={syncIcalMutation.isPending}
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncIcalMutation.isPending ? 'animate-spin' : ''}`} />
                            {syncIcalMutation.isPending ? 'Sincronizzazione...' : 'Sincronizza'}
                          </Button>
                        </div>
                      )}

                      {/* Reset Calendar Blocks - always visible */}
                      <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border-2 border-red-200">
                        <div>
                          <p className="font-medium text-red-900">Azzera calendario</p>
                          <p className="text-sm text-red-700">
                            Elimina tutti i blocchi importati da calendari esterni
                          </p>
                        </div>
                        <button
                          onClick={() => handleResetCalendar(property.id)}
                          disabled={resetCalendarMutation.isPending}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          {resetCalendarMutation.isPending ? 'Azzeramento...' : 'Azzera'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Property Modal */}
      <Modal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        title={editingProperty ? 'Modifica Casa' : 'Nuova Casa'}
      >
        <div className="space-y-5">
          <Input
            label="Come si chiama la tua casa?"
            value={propertyForm.name}
            onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
            placeholder="es. Villa sul Mare, Appartamento Centro..."
            required
            className="text-base"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Quanti posti letto?
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPropertyForm({ ...propertyForm, beds: Math.max(1, parseInt(propertyForm.beds || 1) - 1).toString() })}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={propertyForm.beds}
                  onChange={(e) => setPropertyForm({ ...propertyForm, beds: e.target.value })}
                  className="w-20 h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPropertyForm({ ...propertyForm, beds: (parseInt(propertyForm.beds || 0) + 1).toString() })}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Quanti bagni?
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPropertyForm({ ...propertyForm, bathrooms: Math.max(1, parseInt(propertyForm.bathrooms || 1) - 1).toString() })}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={propertyForm.bathrooms}
                  onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })}
                  className="w-20 h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPropertyForm({ ...propertyForm, bathrooms: (parseInt(propertyForm.bathrooms || 0) + 1).toString() })}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <Textarea
            label="Descrizione (opzionale)"
            value={propertyForm.description}
            onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
            placeholder="Aggiungi una descrizione della proprietà..."
            className="text-base"
          />
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPropertyModalOpen(false)}
              className="flex-1 py-3 text-base"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveProperty}
              disabled={createMutation.isPending || updateMutation.isPending || !propertyForm.name}
              className="flex-1 py-3 text-base"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Salvataggio...'
                : editingProperty ? 'Salva Modifiche' : 'Crea Casa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Properties;
