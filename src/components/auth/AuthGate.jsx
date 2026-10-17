import React from 'react';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Calendar,
  Database,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Send,
  Info,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resendConfirmationEmail,
  isSupabaseConfigured,
  getSupabaseClient,
  getCurrentUser,
} from '../../lib/supabase.js';
import './AuthGate.css';

export default function AuthGate({
  onOpenSupabaseConfig,
  onExploreDemo,
  onAuthSuccess,
}) {
  const [tab, setTab] = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = React.useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = React.useState('');
  const [unconfirmedPassword, setUnconfirmedPassword] = React.useState('');
  const [checkingConfirmed, setCheckingConfirmed] = React.useState(false);
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState('');

  const [googleOAuthUrl, setGoogleOAuthUrl] = React.useState('');

  const isConfigured = isSupabaseConfigured();

  // Restore any pending verification if page reloads while waiting for email
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('attendwise_pending_verification');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.password && (Date.now() - parsed.timestamp < 24 * 3600 * 1000)) {
          setEmailNotConfirmed(true);
          setUnconfirmedEmail(parsed.email);
          setUnconfirmedPassword(parsed.password);
          setEmail(parsed.email);
        }
      }
    } catch (e) {}
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setEmailNotConfirmed(false);

    if (!isConfigured) {
      setErrorMsg('Supabase is not connected yet. Click "Connect Supabase" to add your Project URL and Anon Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.url) {
        setGoogleOAuthUrl(res.url);
        const popupRef = res.popup;

        if (!popupRef || popupRef.closed) {
          setErrorMsg('Your browser blocked the popup. Click "Open Google Login in New Tab" below to proceed.');
          setLoading(false);
        } else {
          setSuccessMsg('Google login opened in a separate window. Sign in there to sync your account!');

          // Active session polling every 400ms
          const checkTimer = setInterval(async () => {
            const client = getSupabaseClient();
            if (client) {
              const { data: { session } } = await client.auth.getSession();
              if (session?.user) {
                clearInterval(checkTimer);
                setLoading(false);
                if (popupRef && !popupRef.closed) {
                  try {
                    popupRef.close();
                  } catch (e) {}
                }
                if (onAuthSuccess) {
                  onAuthSuccess(session.user);
                }
                return;
              }
            }

            if (popupRef && popupRef.closed) {
              clearInterval(checkTimer);
              setLoading(false);
            }
          }, 400);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.warn('Google sign in notice:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
      setLoading(false);
    }
  };

  // Automatically detect email confirmation in the background so the user's dashboard opens automatically
  React.useEffect(() => {
    let pollInterval = null;
    let authChannel = null;

    if (emailNotConfirmed && unconfirmedEmail) {
      // 1. Actively poll Supabase signInWithEmail every 1.8 seconds (detects mobile & laptop confirmation)
      if (unconfirmedPassword) {
        pollInterval = setInterval(async () => {
          try {
            const res = await signInWithEmail(unconfirmedEmail, unconfirmedPassword);
            const user = res?.user || (res?.session ? res.session.user : null);
            if (user) {
              clearInterval(pollInterval);
              try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
              setEmailNotConfirmed(false);
              if (onAuthSuccess) {
                onAuthSuccess(user);
              }
            }
          } catch (err) {
            // Still unconfirmed or network glitch, silently keep waiting
          }
        }, 1800);
      }

      // 2. Listen for cross-tab broadcast from the email verification link
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          authChannel = new BroadcastChannel('attendwise_auth_sync');
          authChannel.onmessage = async (event) => {
            if ((event.data?.type === 'EMAIL_CONFIRMED' || event.data?.type === 'ATTENDWISE_AUTH_SUCCESS') && event.data?.session) {
              if (pollInterval) clearInterval(pollInterval);
              try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
              setEmailNotConfirmed(false);
              const client = getSupabaseClient();
              if (client && event.data.session.access_token) {
                try {
                  await client.auth.setSession({
                    access_token: event.data.session.access_token,
                    refresh_token: event.data.session.refresh_token,
                  });
                } catch (e) {}
              }
              const user = event.data.user || event.data.session.user || (await getCurrentUser());
              if (user && onAuthSuccess) {
                onAuthSuccess(user);
              }
            }
          };
        }
      } catch (e) {}

      // 3. Listen for storage events across tabs
      const handleStorage = async (e) => {
        if (e.key === 'attendwise_email_confirmed_event' || e.key === 'attendwise_auth_session_broadcast') {
          try {
            const data = JSON.parse(e.newValue || '{}');
            if (data?.session) {
              if (pollInterval) clearInterval(pollInterval);
              try { localStorage.removeItem('attendwise_pending_verification'); } catch (err) {}
              setEmailNotConfirmed(false);
              const client = getSupabaseClient();
              if (client && data.session.access_token) {
                try {
                  await client.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                  });
                } catch (err) {}
              }
              const user = data.user || data.session.user || (await getCurrentUser());
              if (user && onAuthSuccess) {
                onAuthSuccess(user);
              }
            }
          } catch (err) {}
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (authChannel) authChannel.close();
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [emailNotConfirmed, unconfirmedEmail, unconfirmedPassword, onAuthSuccess]);

  const handleCheckConfirmedNow = async () => {
    const targetEmail = (unconfirmedEmail || email).trim();
    const targetPass = unconfirmedPassword || password;
    if (!targetEmail || !targetPass) {
      setErrorMsg('Please enter your email and password to sign in.');
      return;
    }

    setCheckingConfirmed(true);
    setErrorMsg('');
    try {
      const res = await signInWithEmail(targetEmail, targetPass);
      const user = res?.user || (res?.session ? res.session.user : null);
      if (user) {
        try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
        setEmailNotConfirmed(false);
        if (onAuthSuccess) {
          onAuthSuccess(user);
        }
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed') || err.code === 'email_not_confirmed') {
        setErrorMsg('Email is not confirmed yet. Click the confirmation link in your inbox (or on your phone), then click this button.');
      } else {
        setErrorMsg(msg || 'Could not verify confirmation yet. Please try again.');
      }
    } finally {
      setCheckingConfirmed(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = (unconfirmedEmail || email).trim();
    if (!targetEmail) {
      setErrorMsg('Please specify an email address to resend confirmation.');
      return;
    }

    setResendingEmail(true);
    setResendStatus('');
    try {
      await resendConfirmationEmail(targetEmail);
      setResendStatus(`Verification link resent to ${targetEmail}! Check your inbox and spam folder.`);
    } catch (err) {
      console.warn('Resend confirmation notice:', err);
      setResendStatus(`Could not resend verification: ${err.message || 'Please check your Supabase project settings.'}`);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setResendStatus('');
    setEmailNotConfirmed(false);

    if (!isConfigured) {
      setErrorMsg('Supabase is not connected yet. Click "Connect Supabase" to add your credentials.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await signInWithEmail(trimmedEmail, password);
        if (onAuthSuccess && res?.user) {
          try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
          onAuthSuccess(res.user);
        }
      } else {
        const res = await signUpWithEmail(trimmedEmail, password);
        if (res.session && res.user && onAuthSuccess) {
          try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
          setSuccessMsg('Account created and signed in! Loading your dashboard...');
          onAuthSuccess(res.user);
        } else if (res.user && !res.session) {
          // Email confirmation is required by Supabase project settings
          setEmailNotConfirmed(true);
          setUnconfirmedEmail(trimmedEmail);
          setUnconfirmedPassword(password);
          try {
            localStorage.setItem('attendwise_pending_verification', JSON.stringify({
              email: trimmedEmail,
              password,
              timestamp: Date.now(),
            }));
          } catch (e) {}
          setTab('login');
        } else {
          setSuccessMsg('Account created successfully! You can now log in.');
          setTab('login');
        }
      }
    } catch (err) {
      const msg = err.message || '';
      const isUnconfirmed = msg.toLowerCase().includes('email not confirmed') || err.code === 'email_not_confirmed';

      if (isUnconfirmed) {
        setEmailNotConfirmed(true);
        setUnconfirmedEmail(trimmedEmail);
        setUnconfirmedPassword(password);
        try {
          localStorage.setItem('attendwise_pending_verification', JSON.stringify({
            email: trimmedEmail,
            password,
            timestamp: Date.now(),
          }));
        } catch (e) {}
      } else {
        console.warn('Auth notice:', msg);
        let userFacingMsg = msg || 'Authentication failed. Please verify your email and password.';
        if (userFacingMsg.includes('Invalid login credentials')) {
          userFacingMsg = 'Invalid email or password. If you do not have an account yet, switch to "Create Account".';
        }
        setErrorMsg(userFacingMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate-page">
      {/* Top Bar with Brand & Supabase Status */}
      <header className="auth-gate-header">
        <div className="auth-gate-header-container">
          <div className="auth-gate-brand">
            <div className="brand-logo-wrap">
              <GraduationCap className="brand-icon" size={24} />
            </div>
            <div className="brand-text-col">
              <span className="brand-title">AttendWise</span>
              <span className="brand-subtitle">Smart College Attendance & Bunk Planner</span>
            </div>
          </div>

          <div className="auth-gate-header-actions">
            <button
              type="button"
              className={`supabase-status-pill ${isConfigured ? 'status-connected' : 'status-unconfigured'}`}
              onClick={onOpenSupabaseConfig}
              title="Click to view or edit Supabase connection"
            >
              <Database size={14} />
              <span>{isConfigured ? 'Supabase Connected' : 'Connect Supabase'}</span>
            </button>

            {onExploreDemo && (
              <button
                type="button"
                className="btn-text-subtle"
                onClick={onExploreDemo}
                title="Preview demo mode with local storage"
              >
                Try Demo Mode &rarr;
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="auth-gate-main">
        <div className="auth-gate-container">
          {/* Left / Info Panel */}
          <div className="auth-hero-panel">
            <div className="hero-pill-badge">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Never Fall Below 75% Again</span>
            </div>

            <h1 className="auth-hero-title">
              Master Your Attendance with Confidence.
            </h1>
            <p className="auth-hero-desc">
              Track classes across multiple semesters, calculate exact bunk buffers to stay safe, and sync everything securely to your personal Supabase cloud backend.
            </p>

            <div className="hero-feature-list">
              <div className="hero-feature-item">
                <div className="feature-icon-circle">
                  <ShieldCheck size={18} className="text-safe" />
                </div>
                <div>
                  <strong>75% Safety Guard & What-If Simulator</strong>
                  <p>Instantly know how many lectures you can bunk or must attend to remain safe for exams.</p>
                </div>
              </div>

              <div className="hero-feature-item">
                <div className="feature-icon-circle">
                  <Calendar size={18} className="text-primary" />
                </div>
                <div>
                  <strong>Fast Daily & Batch Logging</strong>
                  <p>Mark attendance in one click with support for Present, Absent, and Cancelled lectures.</p>
                </div>
              </div>

              <div className="hero-feature-item">
                <div className="feature-icon-circle">
                  <Database size={18} className="text-accent" />
                </div>
                <div>
                  <strong>Private PostgreSQL & Google Sign-In</strong>
                  <p>Your records are secured by Supabase Row Level Security (RLS). Only you can access your data.</p>
                </div>
              </div>
            </div>

            {/* Quick Supabase Setup Callout */}
            <div className="hero-setup-callout">
              <div className="callout-icon">
                <Database size={20} />
              </div>
              <div className="callout-body">
                <strong>First time setting up Supabase?</strong>
                <p>Add your Project URL, Anon Key, and run the SQL migration script to get started.</p>
                <button
                  type="button"
                  className="btn-callout-action"
                  onClick={onOpenSupabaseConfig}
                >
                  Open Supabase Setup Guide & SQL &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Right / Auth Form Card */}
          <div className="auth-card-panel">
            <div className="auth-card">
              <div className="auth-card-top">
                <h2 className="auth-card-title">
                  {tab === 'login' ? 'Welcome Back' : 'Create Your Account'}
                </h2>
                <p className="auth-card-subtitle">
                  {tab === 'login'
                    ? 'Sign in to access your subjects and attendance logs'
                    : 'Sign up to start tracking your college attendance'}
                </p>
              </div>

              {/* Status & Alerts */}
              {!isConfigured && (
                <div className="auth-warning-alert">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Supabase Backend Not Connected</strong>
                    <p>
                      To log in or sign up, connect your Supabase credentials first.
                    </p>
                    <button
                      type="button"
                      className="btn-alert-link"
                      onClick={onOpenSupabaseConfig}
                    >
                      Connect Supabase URL & Key &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Email Not Confirmed Dedicated Resolution Box */}
              {emailNotConfirmed && (
                <div className="auth-email-confirm-box">
                  <div className="email-confirm-header">
                    <Mail size={18} className="email-confirm-icon" />
                    <strong>Email Confirmation Required</strong>
                  </div>
                  <p className="email-confirm-text">
                    Supabase requires email verification before you can log in. A confirmation link was sent to:
                  </p>
                  <div className="unconfirmed-email-badge">
                    {unconfirmedEmail || email || 'your email'}
                  </div>
                  <p className="email-confirm-sub">
                    Please check your inbox (and spam folder) and click the verification link to activate your account.
                  </p>

                  <div className="email-confirm-auto-status" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    color: '#b45309',
                    fontWeight: 600,
                  }}>
                    <RefreshCw size={13} className="spin-icon" style={{ animationDuration: '2s' }} />
                    <span>Auto-detecting confirmation from phone or laptop...</span>
                  </div>

                  <div className="email-confirm-actions">
                    <button
                      type="button"
                      className="btn-retry-login"
                      onClick={handleCheckConfirmedNow}
                      disabled={checkingConfirmed}
                      style={{
                        flex: 1,
                        backgroundColor: '#16a34a',
                        borderColor: '#16a34a',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                    >
                      {checkingConfirmed ? (
                        <>
                          <RefreshCw size={14} className="spin-icon" />
                          <span>Checking Status...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>I've Confirmed, Open Dashboard &rarr;</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn-resend-confirm"
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail}
                    >
                      {resendingEmail ? (
                        <>
                          <RefreshCw size={14} className="spin-icon" />
                          <span>Resending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Resend Email</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.removeItem('attendwise_pending_verification'); } catch (e) {}
                      setEmailNotConfirmed(false);
                      setUnconfirmedEmail('');
                      setUnconfirmedPassword('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      textDecoration: 'underline',
                      marginTop: '0.25rem',
                      textAlign: 'center',
                    }}
                  >
                    Use a different email / Back to login
                  </button>

                  {resendStatus && (
                    <div className="resend-status-msg">
                      <CheckCircle2 size={14} />
                      <span>{resendStatus}</span>
                    </div>
                  )}

                  <div className="admin-email-tip">
                    <Info size={14} />
                    <span>
                      <strong>Supabase Owner Tip:</strong> To skip email confirmation for instant signups, open your <strong>Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email</strong> and toggle OFF <strong>Confirm email</strong>.
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="auth-alert-error">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="auth-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Continue with Google */}
              <button
                type="button"
                className="btn-auth-google"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
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

              {/* Popup Fallback Link if browser blocks popups */}
              {googleOAuthUrl && (
                <div className="google-popup-helper">
                  <span>Popup didn't open?</span>
                  <a
                    href={googleOAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-open-google-tab"
                  >
                    <ExternalLink size={14} />
                    <span>Open Google Login in New Tab &rarr;</span>
                  </a>
                </div>
              )}

              <div className="auth-divider">
                <span>or continue with email</span>
              </div>

              {/* Login / Signup Tabs */}
              <div className="auth-tab-buttons" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'login'}
                  className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'signup'}
                  className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="auth-fields-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="gate-email">
                    College or Personal Email
                  </label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-field-icon" />
                    <input
                      id="gate-email"
                      type="email"
                      placeholder="student@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-with-hint">
                    <label className="form-label" htmlFor="gate-password">
                      Password
                    </label>
                    <span className="field-hint">Min 6 characters</span>
                  </div>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-field-icon" />
                    <input
                      id="gate-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="btn-toggle-pwd"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-submit-gate"
                  disabled={loading}
                >
                  {loading ? (
                    'Processing...'
                  ) : tab === 'login' ? (
                    <>
                      <LogIn size={16} />
                      <span>Sign In to Dashboard</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Create Account & Sign In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="auth-card-footer">
                <div className="auth-security-badge">
                  <ShieldCheck size={14} className="text-safe" />
                  <span>Protected by Supabase Row Level Security</span>
                </div>

                {onExploreDemo && (
                  <div className="auth-demo-prompt">
                    <span>Just looking around?</span>
                    <button
                      type="button"
                      className="btn-demo-link"
                      onClick={onExploreDemo}
                    >
                      Preview Demo Mode
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
