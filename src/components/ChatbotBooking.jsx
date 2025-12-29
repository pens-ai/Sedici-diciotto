import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  X,
  Send,
  Home,
  Calendar,
  Users,
  Euro,
  User,
  Mail,
  Phone,
  MessageSquare,
  ChevronRight,
  Check,
  ArrowLeft,
  Sparkles,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import * as propertiesApi from '../api/properties.api';
import * as bookingsApi from '../api/bookings.api';

const STEPS = [
  { id: 'property', question: 'In quale casa arriverà l\'ospite?', icon: Home },
  { id: 'channel', question: 'Da quale canale arriva la prenotazione?', icon: MessageSquare },
  { id: 'checkIn', question: 'Quando arriva l\'ospite?', icon: Calendar },
  { id: 'checkOut', question: 'Quando riparte?', icon: Calendar },
  { id: 'guests', question: 'Quanti ospiti saranno?', icon: Users },
  { id: 'guestName', question: 'Come si chiama l\'ospite principale?', icon: User },
  { id: 'guestEmail', question: 'Qual è la sua email? (opzionale)', icon: Mail },
  { id: 'guestPhone', question: 'E il numero di telefono? (opzionale)', icon: Phone },
  { id: 'grossRevenue', question: 'Qual è l\'importo totale della prenotazione?', icon: Euro },
  { id: 'confirm', question: 'Perfetto! Ecco il riepilogo:', icon: Check },
];

export function ChatbotBooking({ isOpen, onClose, onSubmit, isLoading }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    propertyId: '',
    channelId: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 2,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    grossRevenue: '',
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [editMode, setEditMode] = useState(false); // True when editing from summary
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Queries
  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.getProperties(),
    enabled: isOpen,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: bookingsApi.getChannels,
    enabled: isOpen,
  });

  const properties = propertiesData?.data || [];

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setEditMode(false);
      setFormData({
        propertyId: '',
        channelId: '',
        checkIn: '',
        checkOut: '',
        numberOfGuests: 2,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        grossRevenue: '',
      });
    }
  }, [isOpen]);

  // Focus input when step changes
  useEffect(() => {
    if (inputRef.current && !isAnimating) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentStep, isAnimating]);

  const CONFIRM_STEP = STEPS.length - 1; // Index of confirm step

  const goToNextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        // If in edit mode, go back to confirm step instead of next step
        if (editMode) {
          setCurrentStep(CONFIRM_STEP);
          setEditMode(false);
        } else {
          setCurrentStep(prev => prev + 1);
        }
        setIsAnimating(false);
      }, 200);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        // If in edit mode, go back to confirm instead of previous step
        if (editMode) {
          setCurrentStep(CONFIRM_STEP);
          setEditMode(false);
        } else {
          setCurrentStep(prev => prev - 1);
        }
        setIsAnimating(false);
      }, 200);
    }
  };

  // Go to a specific step for editing (sets edit mode)
  const goToStepForEdit = (stepIndex) => {
    setEditMode(true);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(stepIndex);
      setIsAnimating(false);
    }, 200);
  };

  const handlePropertySelect = (propertyId) => {
    setFormData(prev => ({ ...prev, propertyId }));
    goToNextStep();
  };

  const handleChannelSelect = (channelId) => {
    setFormData(prev => ({ ...prev, channelId }));
    goToNextStep();
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Don't auto-advance - let user click "Continua" button
  };

  const handleGuestsSelect = (num) => {
    setFormData(prev => ({ ...prev, numberOfGuests: num }));
    goToNextStep();
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    const step = STEPS[currentStep];

    if (step.id === 'guestName' && !formData.guestName.trim()) return;
    if (step.id === 'grossRevenue' && !formData.grossRevenue) return;

    goToNextStep();
  };

  const handleSkip = () => {
    goToNextStep();
  };

  const handleSubmit = () => {
    // Validate all required fields
    const errors = [];

    if (!formData.propertyId) {
      errors.push('Seleziona una casa');
    }
    if (!formData.guestName || formData.guestName.trim().length < 2) {
      errors.push('Inserisci il nome dell\'ospite (almeno 2 caratteri)');
    }
    if (!formData.checkIn) {
      errors.push('Seleziona la data di arrivo');
    }
    if (!formData.checkOut) {
      errors.push('Seleziona la data di partenza');
    }
    if (formData.checkIn && formData.checkOut && new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      errors.push('La data di partenza deve essere successiva all\'arrivo');
    }
    if (!formData.numberOfGuests || formData.numberOfGuests < 1) {
      errors.push('Inserisci il numero di ospiti');
    }
    if (!formData.grossRevenue || parseFloat(formData.grossRevenue) <= 0) {
      errors.push('Inserisci l\'importo della prenotazione');
    }
    if (formData.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
      errors.push('L\'email inserita non è valida');
    }

    if (errors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Controlla questi campi:
          </div>
          {errors.map((e, i) => (
            <div key={i} className="text-sm">• {e}</div>
          ))}
        </div>,
        { duration: 5000 }
      );
      return;
    }

    onSubmit({
      ...formData,
      // Convert empty strings to null for optional fields
      channelId: formData.channelId || null,
      guestEmail: formData.guestEmail?.trim() || null,
      guestPhone: formData.guestPhone?.trim() || null,
      grossRevenue: parseFloat(formData.grossRevenue),
      products: [],
    });
  };

  const selectedProperty = properties.find(p => p.id === formData.propertyId);
  const selectedChannel = channels.find(c => c.id === formData.channelId);
  const nights = formData.checkIn && formData.checkOut
    ? differenceInDays(new Date(formData.checkOut), new Date(formData.checkIn))
    : 0;

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button
          onClick={() => {
            // If in edit mode, always go back to confirm step
            if (editMode) {
              setCurrentStep(CONFIRM_STEP);
              setEditMode(false);
            } else if (currentStep > 0) {
              goToPrevStep();
            } else {
              onClose();
            }
          }}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          {(currentStep > 0 || editMode) ? <ArrowLeft className="w-6 h-6" /> : <X className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-2 text-white/80">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium">Prenotazione Rapida</span>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-16 left-0 right-0 px-4">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/60">
          <span>Passo {currentStep + 1} di {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        className="h-full flex flex-col items-center justify-center px-4 pt-24 pb-8"
      >
        <div
          className={`w-full max-w-lg transition-all duration-300 ${
            isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Question Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <StepIcon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
            {step.question}
          </h2>

          {/* Answer Area */}
          <div className="space-y-4">
            {/* Property Selection */}
            {step.id === 'property' && (
              <div className="grid gap-3">
                {properties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertySelect(property.id)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 ${
                      formData.propertyId === property.id
                        ? 'bg-white text-primary-700 shadow-lg scale-[1.02]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.propertyId === property.id ? 'bg-primary-100' : 'bg-white/10'
                      }`}>
                        <Home className={`w-5 h-5 ${
                          formData.propertyId === property.id ? 'text-primary-600' : 'text-white/80'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold">{property.name}</div>
                        {property.address && (
                          <div className={`text-sm ${
                            formData.propertyId === property.id ? 'text-primary-500' : 'text-white/60'
                          }`}>
                            {property.address}
                          </div>
                        )}
                      </div>
                      <ChevronRight className={`w-5 h-5 ml-auto ${
                        formData.propertyId === property.id ? 'text-primary-500' : 'text-white/40'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Channel Selection */}
            {step.id === 'channel' && (
              <div className="grid gap-3">
                <button
                  onClick={() => handleChannelSelect('')}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-200 ${
                    formData.channelId === ''
                      ? 'bg-white text-primary-700 shadow-lg scale-[1.02]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.channelId === '' ? 'bg-primary-100' : 'bg-white/10'
                    }`}>
                      <User className={`w-5 h-5 ${
                        formData.channelId === '' ? 'text-primary-600' : 'text-white/80'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold">Prenotazione Diretta</div>
                      <div className={`text-sm ${
                        formData.channelId === '' ? 'text-primary-500' : 'text-white/60'
                      }`}>
                        Nessuna commissione
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ml-auto ${
                      formData.channelId === '' ? 'text-primary-500' : 'text-white/40'
                    }`} />
                  </div>
                </button>
                {channels.filter(channel => !channel.name?.toLowerCase().includes('dirett')).map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 ${
                      formData.channelId === channel.id
                        ? 'bg-white text-primary-700 shadow-lg scale-[1.02]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.channelId === channel.id ? 'bg-primary-100' : 'bg-white/10'
                      }`}>
                        <MessageSquare className={`w-5 h-5 ${
                          formData.channelId === channel.id ? 'text-primary-600' : 'text-white/80'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold">{channel.name}</div>
                        <div className={`text-sm ${
                          formData.channelId === channel.id ? 'text-primary-500' : 'text-white/60'
                        }`}>
                          {channel.commissionRate}% commissione
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ml-auto ${
                        formData.channelId === channel.id ? 'text-primary-500' : 'text-white/40'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Check-in Date */}
            {step.id === 'checkIn' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <input
                    ref={inputRef}
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => handleDateChange('checkIn', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full max-w-xs px-6 py-4 text-lg bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all [color-scheme:dark]"
                  />
                </div>
                <button
                  onClick={goToNextStep}
                  disabled={!formData.checkIn}
                  className="w-full py-4 bg-white hover:bg-white/90 text-primary-700 font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continua
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Check-out Date */}
            {step.id === 'checkOut' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <input
                    ref={inputRef}
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => handleDateChange('checkOut', e.target.value)}
                    min={formData.checkIn ? format(addDays(new Date(formData.checkIn), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                    className="w-full max-w-xs px-6 py-4 text-lg bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all [color-scheme:dark]"
                  />
                </div>
                {formData.checkIn && (
                  <div className="flex justify-center gap-2 flex-wrap">
                    {[1, 2, 3, 7].map((days) => (
                      <button
                        key={days}
                        onClick={() => handleDateChange('checkOut', format(addDays(new Date(formData.checkIn), days), 'yyyy-MM-dd'))}
                        className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                          formData.checkOut === format(addDays(new Date(formData.checkIn), days), 'yyyy-MM-dd')
                            ? 'bg-white text-primary-700 font-semibold'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {days} {days === 1 ? 'notte' : 'notti'}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={goToNextStep}
                  disabled={!formData.checkOut}
                  className="w-full py-4 bg-white hover:bg-white/90 text-primary-700 font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continua
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Guests Selection */}
            {step.id === 'guests' && (
              <div className="flex justify-center gap-3 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleGuestsSelect(num)}
                    className={`w-14 h-14 rounded-2xl text-lg font-semibold transition-all duration-200 ${
                      formData.numberOfGuests === num
                        ? 'bg-white text-primary-700 shadow-lg scale-110'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}

            {/* Text Inputs */}
            {['guestName', 'guestEmail', 'guestPhone'].includes(step.id) && (
              <form onSubmit={handleInputSubmit} className="space-y-4">
                <input
                  ref={inputRef}
                  type={step.id === 'guestEmail' ? 'email' : step.id === 'guestPhone' ? 'tel' : 'text'}
                  value={formData[step.id]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder={
                    step.id === 'guestName' ? 'es. Mario Rossi' :
                    step.id === 'guestEmail' ? 'es. mario@email.com' :
                    'es. +39 333 1234567'
                  }
                  className="w-full px-6 py-4 text-lg bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all"
                  autoComplete="off"
                />
                <div className="flex gap-3">
                  {(step.id === 'guestEmail' || step.id === 'guestPhone') && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl transition-colors"
                    >
                      Salta
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={step.id === 'guestName' && !formData.guestName.trim()}
                    className="flex-1 py-4 bg-white hover:bg-white/90 text-primary-700 font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Continua
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* Revenue Input */}
            {step.id === 'grossRevenue' && (
              <form onSubmit={handleInputSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-white/60">€</span>
                  <input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.grossRevenue}
                    onChange={(e) => setFormData(prev => ({ ...prev, grossRevenue: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-14 pr-6 py-4 text-2xl bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all"
                    autoComplete="off"
                  />
                </div>
                {nights > 0 && formData.grossRevenue && (
                  <div className="text-center text-white/60">
                    €{(parseFloat(formData.grossRevenue) / nights).toFixed(2)} / notte
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!formData.grossRevenue}
                  className="w-full py-4 bg-white hover:bg-white/90 text-primary-700 font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continua
                  <ChevronRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {/* Confirmation */}
            {step.id === 'confirm' && (
              <div className="flex flex-col max-h-[calc(100vh-200px)]">
                {/* Scrollable summary area */}
                <div className="overflow-y-auto flex-1 space-y-3 pb-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
                    {/* Casa */}
                    <button
                      onClick={() => goToStepForEdit(0)}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <Home className="w-5 h-5 text-white/60" />
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Casa</div>
                          <div className="text-white font-medium">{selectedProperty?.name}</div>
                        </div>
                      </div>
                      <Pencil className="w-4 h-4 text-white/40" />
                    </button>

                    {/* Date */}
                    <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10">
                      <button
                        onClick={() => goToStepForEdit(2)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Arrivo</div>
                          <div className="text-white font-medium text-sm">
                            {formData.checkIn && format(new Date(formData.checkIn), 'd MMM yyyy', { locale: it })}
                          </div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                      <button
                        onClick={() => goToStepForEdit(3)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Partenza</div>
                          <div className="text-white font-medium text-sm">
                            {formData.checkOut && format(new Date(formData.checkOut), 'd MMM yyyy', { locale: it })}
                          </div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                    </div>

                    {/* Ospiti e Notti */}
                    <button
                      onClick={() => goToStepForEdit(4)}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-white/60" />
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Ospiti</div>
                          <div className="text-white font-medium">{formData.numberOfGuests} {formData.numberOfGuests === 1 ? 'persona' : 'persone'} · {nights} {nights === 1 ? 'notte' : 'notti'}</div>
                        </div>
                      </div>
                      <Pencil className="w-4 h-4 text-white/40" />
                    </button>

                    {/* Nome ospite */}
                    <button
                      onClick={() => goToStepForEdit(5)}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-white/60" />
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Nome ospite</div>
                          <div className="text-white font-medium">{formData.guestName}</div>
                        </div>
                      </div>
                      <Pencil className="w-4 h-4 text-white/40" />
                    </button>

                    {/* Email e Telefono in una riga */}
                    <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10">
                      <button
                        onClick={() => goToStepForEdit(6)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Email</div>
                          <div className="text-white font-medium text-sm truncate max-w-[120px]">{formData.guestEmail || '—'}</div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                      <button
                        onClick={() => goToStepForEdit(7)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Telefono</div>
                          <div className="text-white font-medium text-sm">{formData.guestPhone || '—'}</div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                    </div>

                    {/* Canale e Importo in una riga */}
                    <div className="grid grid-cols-2 divide-x divide-white/10">
                      <button
                        onClick={() => goToStepForEdit(1)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Canale</div>
                          <div className="text-white font-medium text-sm">
                            {selectedChannel?.name || 'Diretto'}
                          </div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                      <button
                        onClick={() => goToStepForEdit(8)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-white/60 text-xs">Importo</div>
                          <div className="text-white text-lg font-bold">€{parseFloat(formData.grossRevenue || 0).toFixed(2)}</div>
                        </div>
                        <Pencil className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fixed button area */}
                <div className="flex-shrink-0 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-4 bg-white hover:bg-white/90 text-primary-700 font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-700 border-t-transparent"></div>
                        Creazione in corso...
                      </>
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        Conferma e Crea
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard hint - hide on confirm step */}
      {step.id !== 'confirm' && (
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-sm">
          Premi Invio per continuare
        </div>
      )}
    </div>
  );
}

export default ChatbotBooking;
