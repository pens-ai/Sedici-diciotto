import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  User,
  Building2,
  Palette,
  Shield,
  Save,
  Eye,
  EyeOff,
  Check,
  Plus,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  getProfile,
  updateProfile,
  getCompany,
  updateCompany,
  updateTheme,
  changePassword,
} from '../api/settings.api';
import { getChannels, createChannel, updateChannel, deleteChannel } from '../api/bookings.api';
import { register as createUser, getUsers } from '../api/auth.api';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Nome richiesto'),
  lastName: z.string().min(2, 'Cognome richiesto'),
  phone: z.string().optional(),
});

const companySchema = z.object({
  companyName: z.string().min(2, 'Nome azienda richiesto'),
  vatNumber: z.string().optional(),
  fiscalCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  companyEmail: z.string().email('Email non valida').optional().or(z.literal('')),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password attuale richiesta'),
    newPassword: z
      .string()
      .min(8, 'Almeno 8 caratteri')
      .regex(/[A-Z]/, 'Almeno una maiuscola')
      .regex(/[0-9]/, 'Almeno un numero'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  });

const tabs = [
  { id: 'profile', label: 'Profilo', icon: User },
  { id: 'company', label: 'Azienda', icon: Building2 },
  { id: 'theme', label: 'Aspetto', icon: Palette },
  { id: 'security', label: 'Sicurezza', icon: Shield },
  { id: 'users', label: 'Utenti', icon: Users },
];

const newUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'Almeno 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
  firstName: z.string().min(2, 'Nome richiesto'),
  lastName: z.string().min(2, 'Cognome richiesto'),
});

const themeColors = [
  { name: 'Viola', primary: '#6b4ce6', secondary: '#5a3ec4' },
  { name: 'Blu', primary: '#3B82F6', secondary: '#2563EB' },
  { name: 'Verde', primary: '#10B981', secondary: '#059669' },
  { name: 'Rosso', primary: '#EF4444', secondary: '#DC2626' },
  { name: 'Arancione', primary: '#F97316', secondary: '#EA580C' },
  { name: 'Teal', primary: '#14B8A6', secondary: '#0D9488' },
];

export const Settings = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const { setCustomization, setCompanyInfo } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [showNewChannelForm, setShowNewChannelForm] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', commissionRate: 0, color: '#6B7280' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // Queries
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: getCompany,
  });

  const { data: channelsData = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const channels = channelsData?.data || channelsData || [];

  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  // Find current theme color on mount
  useEffect(() => {
    if (company?.primaryColor) {
      const index = themeColors.findIndex(c => c.primary === company.primaryColor);
      if (index !== -1) setSelectedColorIndex(index);
    }
  }, [company]);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phone: profile.phone || '',
        }
      : undefined,
  });

  // Company form
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    formState: { errors: companyErrors },
  } = useForm({
    resolver: zodResolver(companySchema),
    values: company
      ? {
          companyName: company.companyName || '',
          vatNumber: company.vatNumber || '',
          fiscalCode: company.fiscalCode || '',
          address: company.address || '',
          phone: company.phone || '',
          companyEmail: company.companyEmail || '',
        }
      : undefined,
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  // New user form
  const {
    register: registerNewUser,
    handleSubmit: handleSubmitNewUser,
    reset: resetNewUser,
    formState: { errors: newUserErrors },
  } = useForm({
    resolver: zodResolver(newUserSchema),
  });

  // Mutations
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (updateUser) {
        updateUser({ firstName: data.firstName, lastName: data.lastName });
      }
      toast.success('Profilo aggiornato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const companyMutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      // Update AppContext
      setCompanyInfo({
        name: data.companyName || 'La Mia Azienda',
        logo: data.companyLogo || '',
        vat: data.vatNumber || '',
        fiscalCode: data.fiscalCode || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.companyEmail || '',
      });
      toast.success('Dati azienda aggiornati');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const themeMutation = useMutation({
    mutationFn: updateTheme,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      // Update AppContext customization
      setCustomization({
        primaryColor: data.primaryColor || '#6b4ce6',
        secondaryColor: data.secondaryColor || '#5a3ec4',
        logoIcon: data.logoIcon || '🏠',
      });
      toast.success('Tema aggiornato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      resetPassword();
      toast.success('Password aggiornata');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setShowNewChannelForm(false);
      setNewChannel({ name: '', commissionRate: 0, color: '#6B7280' });
      toast.success('Canale creato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }) => updateChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'aggiornamento');
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canale eliminato');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante l\'eliminazione');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowNewUserForm(false);
      resetNewUser();
      toast.success('Utente creato con successo');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Errore durante la creazione');
    },
  });

  // Handlers
  const onSubmitProfile = (data) => {
    profileMutation.mutate(data);
  };

  const onSubmitCompany = (data) => {
    companyMutation.mutate(data);
  };

  const onSubmitPassword = (data) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleThemeChange = (index) => {
    setSelectedColorIndex(index);
    const color = themeColors[index];
    themeMutation.mutate({
      primaryColor: color.primary,
      secondaryColor: color.secondary,
    });
  };

  const handleCreateChannel = () => {
    if (!newChannel.name) return;
    createChannelMutation.mutate({
      name: newChannel.name,
      commissionRate: parseFloat(newChannel.commissionRate) || 0,
      color: newChannel.color,
    });
  };

  const handleUpdateChannelCommission = (channel, newRate) => {
    updateChannelMutation.mutate({
      id: channel.id,
      data: { commissionRate: parseFloat(newRate) || 0 },
    });
  };

  const onSubmitNewUser = (data) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Impostazioni</h1>
        <p className="text-gray-500">Gestisci il tuo account e le preferenze</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 sm:gap-4 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Informazioni Profilo</h2>
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
            <div className="flex items-center gap-4 sm:gap-6 pb-6 border-b border-gray-200">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-primary-600">
                  {user?.firstName?.[0] || 'U'}
                  {user?.lastName?.[0] || ''}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Nome"
                {...registerProfile('firstName')}
                error={profileErrors.firstName?.message}
              />
              <Input
                label="Cognome"
                {...registerProfile('lastName')}
                error={profileErrors.lastName?.message}
              />
            </div>

            <Input
              label="Telefono"
              type="tel"
              {...registerProfile('phone')}
              error={profileErrors.phone?.message}
              placeholder="+39 123 456 7890"
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={profileMutation.isPending}>
                <Save size={18} />
                {profileMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Dati Azienda</h2>
          <form onSubmit={handleSubmitCompany(onSubmitCompany)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Nome Azienda"
                {...registerCompany('companyName')}
                error={companyErrors.companyName?.message}
              />
              <Input
                label="Partita IVA"
                {...registerCompany('vatNumber')}
                error={companyErrors.vatNumber?.message}
              />
            </div>

            <Input
              label="Codice Fiscale"
              {...registerCompany('fiscalCode')}
              error={companyErrors.fiscalCode?.message}
            />

            <Input
              label="Indirizzo"
              {...registerCompany('address')}
              error={companyErrors.address?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Email Aziendale"
                type="email"
                {...registerCompany('companyEmail')}
                error={companyErrors.companyEmail?.message}
              />
              <Input
                label="Telefono Aziendale"
                type="tel"
                {...registerCompany('phone')}
                error={companyErrors.phone?.message}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={companyMutation.isPending}>
                <Save size={18} />
                {companyMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Colore Principale</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              {themeColors.map((color, index) => (
                <button
                  key={color.name}
                  onClick={() => handleThemeChange(index)}
                  disabled={themeMutation.isPending}
                  className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    selectedColorIndex === index
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${themeMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color.primary }}
                  >
                    {selectedColorIndex === index && <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{color.name}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Canali di Prenotazione</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gestisci i canali e le relative commissioni
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowNewChannelForm(!showNewChannelForm)}
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nuovo</span>
              </Button>
            </div>

            {/* New Channel Form */}
            {showNewChannelForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
                <h3 className="font-medium text-gray-900">Nuovo Canale</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nome"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    placeholder="es. Airbnb"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Commissione %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newChannel.commissionRate}
                      onChange={(e) => setNewChannel({ ...newChannel, commissionRate: e.target.value })}
                      className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Colore</label>
                    <input
                      type="color"
                      value={newChannel.color}
                      onChange={(e) => setNewChannel({ ...newChannel, color: e.target.value })}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setShowNewChannelForm(false)}>
                    Annulla
                  </Button>
                  <Button size="sm" onClick={handleCreateChannel} disabled={createChannelMutation.isPending}>
                    {createChannelMutation.isPending ? 'Creazione...' : 'Crea Canale'}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: channel.color || '#6B7280' }}
                    >
                      {channel.name[0]}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{channel.name}</h4>
                      <p className="text-sm text-gray-500">
                        Commissione: {channel.commissionRate || 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={channel.commissionRate || 0}
                      onChange={(e) => handleUpdateChannelCommission(channel, e.target.value)}
                      className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-center text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-500">%</span>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questo canale?')) {
                          deleteChannelMutation.mutate(channel.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessun canale configurato.</p>
                  <p className="text-sm mt-1">Clicca su "Nuovo" per aggiungere un canale.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Cambia Password</h2>
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6 max-w-md">
            <div className="relative">
              <Input
                label="Password Attuale"
                type={showCurrentPassword ? 'text' : 'password'}
                {...registerPassword('currentPassword')}
                error={passwordErrors.currentPassword?.message}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Nuova Password"
                type={showNewPassword ? 'text' : 'password'}
                {...registerPassword('newPassword')}
                error={passwordErrors.newPassword?.message}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Input
              label="Conferma Nuova Password"
              type="password"
              {...registerPassword('confirmPassword')}
              error={passwordErrors.confirmPassword?.message}
            />

            <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">La password deve contenere:</p>
              <ul className="list-disc list-inside">
                <li>Almeno 8 caratteri</li>
                <li>Almeno una lettera maiuscola</li>
                <li>Almeno un numero</li>
              </ul>
            </div>

            <Button type="submit" disabled={passwordMutation.isPending}>
              <Shield size={18} />
              {passwordMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Password'}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessione Corrente</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Browser attuale</p>
                  <p className="text-sm text-gray-500">Ultima attivita: ora</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Attiva
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gestione Utenti</h2>
              <p className="text-sm text-gray-500 mt-1">
                Crea nuovi account per altri utenti
              </p>
            </div>
            <Button onClick={() => setShowNewUserForm(!showNewUserForm)}>
              <UserPlus size={18} />
              Nuovo Utente
            </Button>
          </div>

          {showNewUserForm && (
            <form onSubmit={handleSubmitNewUser(onSubmitNewUser)} className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Crea Nuovo Utente</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome"
                  {...registerNewUser('firstName')}
                  error={newUserErrors.firstName?.message}
                />
                <Input
                  label="Cognome"
                  {...registerNewUser('lastName')}
                  error={newUserErrors.lastName?.message}
                />
              </div>

              <Input
                label="Email"
                type="email"
                {...registerNewUser('email')}
                error={newUserErrors.email?.message}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showNewUserPassword ? 'text' : 'password'}
                  {...registerNewUser('password')}
                  error={newUserErrors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                >
                  {showNewUserPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="text-xs text-gray-500 space-y-1 bg-white p-3 rounded-lg">
                <p className="font-medium">La password deve contenere:</p>
                <ul className="list-disc list-inside">
                  <li>Almeno 8 caratteri</li>
                  <li>Almeno una lettera maiuscola</li>
                  <li>Almeno un numero</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowNewUserForm(false);
                    resetNewUser();
                  }}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  <UserPlus size={18} />
                  {createUserMutation.isPending ? 'Creazione...' : 'Crea Utente'}
                </Button>
              </div>
            </form>
          )}

          {/* Users List */}
          <div className="space-y-3">
            {usersLoading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-4"></div>
                <p>Caricamento utenti...</p>
              </div>
            ) : usersData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nessun utente trovato.</p>
                <p className="text-sm mt-2">Clicca "Nuovo Utente" per crearne uno.</p>
              </div>
            ) : (
              usersData.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-600">
                        {u.firstName?.[0] || u.email[0].toUpperCase()}
                        {u.lastName?.[0] || ''}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                      </h4>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Creato il</p>
                    <p className="font-medium">{new Date(u.createdAt).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
