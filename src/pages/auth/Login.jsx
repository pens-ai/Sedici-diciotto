import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Input } from '../../components/Input';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta'),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);

    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.code === 'EMAIL_NOT_VERIFIED') {
      setNeedsVerification(true);
      setVerificationEmail(data.email);
    }
  };

  const handleResendVerification = async () => {
    await resendVerification(verificationEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏠</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Bentornato</h1>
            <p className="text-gray-500 mt-1">Accedi al tuo gestionale</p>
          </div>

          {needsVerification ? (
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  La tua email non è ancora verificata. Controlla la tua casella di posta.
                </p>
              </div>
              <Button onClick={handleResendVerification} variant="secondary" fullWidth>
                Reinvia email di verifica
              </Button>
              <button
                onClick={() => setNeedsVerification(false)}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm"
              >
                Torna al login
              </button>
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

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  error={errors.password?.message}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Password dimenticata?
                </Link>
              </div>

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Accesso in corso...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn size={18} />
                    Accedi
                  </span>
                )}
              </Button>
            </form>
          )}

          <p className="text-center mt-6 text-gray-500 text-sm">
            Non hai un account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
