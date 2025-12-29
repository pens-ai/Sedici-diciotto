import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Input } from '../../components/Input';

const schema = z.object({
  email: z.string().email('Email non valida'),
});

export default function ForgotPassword() {
  const [success, setSuccess] = useState(false);
  const { forgotPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await forgotPassword(data.email);
    if (result.success) {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Password dimenticata</h1>
            <p className="text-gray-500 mt-1">
              {success
                ? 'Controlla la tua email'
                : 'Inserisci la tua email per ricevere le istruzioni'}
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">
                  Se l'email esiste nel sistema, riceverai le istruzioni per reimpostare la password.
                </p>
              </div>
              <Link to="/login">
                <Button variant="secondary" fullWidth>
                  <ArrowLeft size={18} className="mr-2" />
                  Torna al Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
              />

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Invio in corso...
                  </span>
                ) : (
                  'Invia istruzioni'
                )}
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
                <ArrowLeft size={16} />
                Torna al Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
