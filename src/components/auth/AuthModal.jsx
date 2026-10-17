import React from 'react';
import { X, Mail, Lock, LogIn, UserPlus, ShieldCheck, AlertCircle, Database, Send, RefreshCw, Info, ExternalLink } from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resendConfirmationEmail,
  isSupabaseConfigured,
} from '../../lib/supabase.js';
import './AuthModal.css';

export default function AuthModal({
  isOpen,
  onClose,
  onOpenSupabaseConfig,
}) {
  const [tab, setTab] = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = React.useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = React.useState('');
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState('');

  if (!isOpen) return null;

  const [googleOAuthUrl, setGoogleOAuthUrl] = React.useState('');
  const hasConfig = isSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setEmailNotConfirmed(false);
    if (!hasConfig) {
      setErrorMsg('Supabase is not configured yet. Please configure your Supabase URL & Anon Key first.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.url) {
        setGoogleOAuthUrl(res.url);
        if (!res.popup || res.popup.closed) {
          setErrorMsg('Popup blocked. Click "Open Google Login in New Tab" below.');
        } else {
          setSuccessMsg('Google login opened in a new window.');
        }
      }
    } catch (err) {
      console.warn('Google sign in notice:', err);
      setErrorMsg(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = (unconfirmedEmail || email).trim();
    if (!targetEmail) return;

    setResendingEmail(true);
    setResendStatus('');
    try {
      await resendConfirmationEmail(targetEmail);
      setResendStatus(`Verification link sent to ${targetEmail}!`);
    } catch (err) {
      console.warn('Resend error:', err);
      setResendStatus(`Failed to resend: ${err.message || 'Please check project settings.'}`);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setEmailNotConfirmed(false);
    setResendStatus('');

    if (!hasConfig) {
      setErrorMsg('Supabase is not configured yet. Please configure your Supabase URL & Anon Key first.');
      return;
    }

    const trimmedEmail = email.trim();
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await signInWithEmail(trimmedEmail, password);
        onClose();
      } else {
        const res = await signUpWithEmail(trimmedEmail, password);
        if (res?.session) {
          setSuccessMsg('Account created and signed in!');
          setTimeout(() => onClose(), 1200);
        } else if (res?.user && !res?.session) {
          setEmailNotConfirmed(true);
          setUnconfirmedEmail(trimmedEmail);
          setTab('login');
        } else {
          setSuccessMsg('Account created successfully! Check your email if verification is required, or sign in.');
          setTab('login');
        }
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed') || err.code === 'email_not_confirmed') {
        setEmailNotConfirmed(true);
        setUnconfirmedEmail(trimmedEmail);
      } else {
        console.warn('Email auth notice:', msg);
        let userMsg = msg || 'Authentication failed. Please check your credentials.';
        if (userMsg.includes('Invalid login credentials')) {
          userMsg = 'Invalid email or password. Need an account? Switch to "Create Account".';
        }
        setErrorMsg(userMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="auth-header-title">
            <h2 className="modal-title">Sign In to AttendWise</h2>
            <p className="auth-header-sub">Sync your college attendance across devices securely</p>
          </div>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body auth-modal-body">
          {!hasConfig && (
            <div className="auth-unconfigured-notice">
              <Database size={18} className="text-caution" />
              <div>
                <strong>Supabase Not Connected:</strong> Cloud authentication requires a Supabase project. You can continue in Demo Mode or connect Supabase credentials.
                <button
                  type="button"
                  className="btn-configure-link"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseConfig();
                  }}
                >
                  Configure Supabase Cloud &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Email Confirmation Notice Box */}
          {emailNotConfirmed && (
            <div className="auth-email-confirm-box">
              <div className="email-confirm-header">
                <Mail size={16} className="email-confirm-icon" />
                <strong>Email Confirmation Required</strong>
              </div>
              <p className="email-confirm-text">
                Supabase requires email confirmation before you can sign in. A link was sent to:
              </p>
              <div className="unconfirmed-email-badge">
                {unconfirmedEmail || email}
              </div>
              <div className="email-confirm-actions">
                <button
                  type="button"
                  className="btn-resend-confirm"
                  onClick={handleResendConfirmation}
                  disabled={resendingEmail}
                >
                  {resendingEmail ? (
                    <>
                      <RefreshCw size={13} className="spin-icon" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Resend Email</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-retry-login"
                  onClick={() => setEmailNotConfirmed(false)}
                >
                  Try Login Again
                </button>
              </div>
              {resendStatus && (
                <div className="resend-status-msg">
                  <ShieldCheck size={13} />
                  <span>{resendStatus}</span>
                </div>
              )}
              <div className="admin-email-tip">
                <Info size={13} />
                <span>
                  Tip: In Supabase Dashboard &gt; Auth &gt; Providers &gt; Email, turn off <strong>Confirm email</strong> to skip this.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="auth-error-banner">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-success-banner">
              <ShieldCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            className="btn-google-auth"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {googleOAuthUrl && (
            <div className="google-popup-helper" style={{ margin: '0.25rem 0' }}>
              <span style={{ fontSize: '0.75rem', color: '#166534' }}>Popup didn't open?</span>
              <a
                href={googleOAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-open-google-tab"
                style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', textDecoration: 'underline' }}
              >
                <ExternalLink size={13} style={{ marginRight: '0.25rem' }} />
                <span>Open Google Login in New Tab &rarr;</span>
              </a>
            </div>
          )}

          <div className="auth-separator">
            <span>or with email and password</span>
          </div>

          {/* Login / Signup Tabs */}
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-switch-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setErrorMsg(''); }}
            >
              Log In
            </button>
            <button
              type="button"
              className={`auth-switch-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setErrorMsg(''); }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="auth-form-fields">
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-field-icon" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-field-icon" />
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary btn-submit-auth" disabled={loading}>
              {loading ? (
                'Processing...'
              ) : tab === 'login' ? (
                <><LogIn size={16} /><span>Sign In</span></>
              ) : (
                <><UserPlus size={16} /><span>Register</span></>
              )}
            </button>
          </form>

          <div className="auth-privacy-notice">
            <ShieldCheck size={14} className="text-safe" />
            <span>Only basic identity and email are used for login. AttendWise never accesses your Gmail inbox.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Continue in Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}
