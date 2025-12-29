import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Input } from '../../components/Input';

const schema = z.object({
  firstName: z.string().min(2, 'Nome richiesto (min. 2 caratteri)'),
  lastName: z.string().min(2, 'Cognome richiesto (min. 2 caratteri)'),
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'Almeno 8 caratteri')
    .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
    .regex(/[0-9]/, 'Almeno un numero'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await registerUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    if (result.success) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Controlla la tua email</h1>
            <p className="text-gray-500 mb-6">
              Ti abbiamo inviato un link per verificare il tuo indirizzo email.
              Clicca sul link per completare la registrazione.
            </p>
            <Button onClick={() => navigate('/login')} fullWidth>
              Vai al Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏠</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Crea un account</h1>
            <p className="text-gray-500 mt-1">Inizia a gestire le tue case vacanza</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Cognome"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                error={errors.password?.message}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Input
              label="Conferma Password"
              type="password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <div className="text-xs text-gray-500 space-y-1">
              <p>La password deve contenere:</p>
              <ul className="list-disc list-inside">
                <li>Almeno 8 caratteri</li>
                <li>Almeno una lettera maiuscola</li>
                <li>Almeno un numero</li>
              </ul>
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Registrazione in corso...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus size={18} />
                  Registrati
                </span>
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm">
            Hai già un account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
