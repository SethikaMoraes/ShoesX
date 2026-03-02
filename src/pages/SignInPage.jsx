import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from '../components/Login';
import Signup from '../components/Signup';
import { useAuth } from '../context/AuthContext';

const normalizeError = (value, fallback) => {
  const text = String(value || '').trim();
  return text || fallback;
};

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, signup, authError } = useAuth();

  const [authMode, setAuthMode] = useState('login');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    identity: '',
    password: '',
    confirmPassword: '',
  });

  const targetPath = useMemo(() => {
    const from = location.state?.from;
    if (typeof from !== 'string' || !from.trim() || from === '/signin') return '/';
    return from;
  }, [location.state?.from]);

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(targetPath, { replace: true });
  }, [isAuthenticated, navigate, targetPath]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    const identity = form.identity.trim();
    const password = form.password;

    if (!identity || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    if (authMode === 'signup' && password !== form.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (authMode === 'signup') {
        const username = identity.includes('@') ? identity.split('@')[0] : identity;
        await signup(identity, password, username);
      } else {
        await login(identity, password);
      }
    } catch (error) {
      setLocalError(normalizeError(error?.message, `Unable to ${authMode}.`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="panel">
        {authMode === 'signup' ? (
          <Signup
            form={form}
            setForm={setForm}
            onSubmit={handleAuthSubmit}
            onSwitch={() => {
              setLocalError('');
              setAuthMode('login');
            }}
            error={localError || authError}
            submitting={submitting}
          />
        ) : (
          <Login
            form={form}
            setForm={setForm}
            onSubmit={handleAuthSubmit}
            onSwitch={() => {
              setLocalError('');
              setAuthMode('signup');
            }}
            error={localError || authError}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
