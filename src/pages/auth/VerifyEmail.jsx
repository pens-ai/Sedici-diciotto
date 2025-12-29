import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const { token } = useParams();
  const { verifyEmail } = useAuth();

  useEffect(() => {
    const verify = async () => {
      const result = await verifyEmail(token);
      setStatus(result.success ? 'success' : 'error');
    };

    verify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifica in corso...</h1>
              <p className="text-gray-500">Stiamo verificando il tuo indirizzo email</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verificata!</h1>
              <p className="text-gray-500 mb-6">
                Il tuo account è stato verificato con successo. Ora puoi accedere.
              </p>
              <Link to="/login">
                <Button fullWidth>Vai al Login</Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifica fallita</h1>
              <p className="text-gray-500 mb-6">
                Il link di verifica non è valido o è scaduto. Prova a richiedere un nuovo link.
              </p>
              <Link to="/login">
                <Button fullWidth>Torna al Login</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
