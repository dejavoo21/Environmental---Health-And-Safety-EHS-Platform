import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TwoFactorPrompt } from '../components/security';
import AppIcon from '../components/AppIcon';
import api from '../api/client';

const LoginPage = () => {
  const { login, twoFactorRequired, tempToken, complete2FALogin, cancel2FA } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoProvider, setSsoProvider] = useState(null);
  const [ssoError, setSsoError] = useState('');

  // Check for SSO error in URL params
  useEffect(() => {
    const ssoErrorParam = searchParams.get('sso_error');
    if (ssoErrorParam) {
      setSsoError(decodeURIComponent(ssoErrorParam));
    }
  }, [searchParams]);

  // Check if SSO is available for this org
  useEffect(() => {
    const checkSSO = async () => {
      try {
        // Get org slug from subdomain or use default
        const hostname = window.location.hostname;
        const orgSlug = hostname.split('.')[0];
        if (orgSlug && orgSlug !== 'localhost' && orgSlug !== 'www') {
          const res = await api.get(`/auth/sso/check/${orgSlug}`);
          if (res.data.ssoEnabled) {
            setSsoProvider(res.data);
          }
        }
      } catch {
        // SSO not available, that's fine
      }
    };
    checkSSO();
  }, []);

  const handleSSO = () => {
    // Redirect to SSO login
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    window.location.href = `${apiBase}/auth/sso/login`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.requires2FA) {
        navigate('/');
      }
      // If 2FA required, the TwoFactorPrompt will show automatically
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = (response) => {
    complete2FALogin(response);
    navigate('/');
  };

  // Show 2FA prompt if required
  if (twoFactorRequired && tempToken) {
    return (
      <div className="login-page">
        <div className="login-card">
          <TwoFactorPrompt
            tempToken={tempToken}
            onSuccess={handle2FASuccess}
            onCancel={cancel2FA}
          />
        </div>
      </div>
    );
  }

  // Show SSO-only mode if enforced
  if (ssoProvider?.ssoOnlyMode) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="pill">Phase 10 SSO</div>
            <h1>EHS Portal</h1>
            <p>Your organisation requires Single Sign-On authentication</p>
          </div>

          {ssoError && <div className="error-text">{ssoError}</div>}

          <button className="btn primary sso-btn" type="button" onClick={handleSSO}><span className="inline-icon"><AppIcon name="lock" size={16} />Sign in with {ssoProvider.providerName || 'Corporate SSO'}</span></button>

          <div className="login-footer">
            <p className="sso-help">Having trouble? Contact your IT administrator</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="pill">Phase 10 Access</div>
          <h1>EHS Portal</h1>
          <p>Log in to track incidents, inspections, and safety KPIs.</p>
        </div>

        {ssoError && <div className="error-text">{ssoError}</div>}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />
        </label>

        {error && <div className="error-text">{error}</div>}

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>

        {ssoProvider && (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>
            <button className="btn secondary sso-btn" type="button" onClick={handleSSO}><span className="inline-icon"><AppIcon name="lock" size={16} />Sign in with {ssoProvider.providerName || 'Corporate SSO'}</span></button>
          </>
        )}

        <div className="login-footer">
          <Link to="/forgot-password" className="btn link">
            Forgot password?
          </Link>
          <span className="separator">|</span>
          <Link to="/request-access" className="btn link">
            Request access
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;





