import React from 'react';
import { X, Database, Key, Copy, Check, ExternalLink, ShieldAlert, RotateCcw } from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  SQL_MIGRATION_SCRIPT,
} from '../../lib/supabase.js';
import './SupabaseConfigModal.css';

export default function SupabaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}) {
  const [url, setUrl] = React.useState('');
  const [anonKey, setAnonKey] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState('');
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const current = getStoredSupabaseConfig();
      setUrl(current.url || 'https://cyipllurnaomoshhurbq.supabase.co');
      setAnonKey(current.anonKey || '');
      setStatusMsg('');
      setIsError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg('Both Project URL and Anon Key are required.');
      setIsError(true);
      return;
    }

    try {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      setStatusMsg('Supabase configuration saved! Reloading connection...');
      setIsError(false);
      setTimeout(() => {
        onConfigSaved();
        onClose();
      }, 1000);
    } catch (err) {
      setStatusMsg(err.message);
      setIsError(true);
    }
  };

  const handleResetToDemo = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatusMsg('Reset to Demo Mode. Local persistence active.');
    setIsError(false);
    setTimeout(() => {
      onConfigSaved();
      onClose();
    }, 1000);
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content supabase-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="supabase-header-title">
            <h2 className="modal-title">Supabase Database & Auth Setup</h2>
            <p className="auth-header-sub">Connect your cloud PostgreSQL database and RLS policies</p>
          </div>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body supabase-modal-body">
          {statusMsg && (
            <div className={`config-status-banner ${isError ? 'banner-error' : 'banner-success'}`}>
              {statusMsg}
            </div>
          )}

          {/* Step 1: SQL Migration Script */}
          <div className="config-step-card">
            <div className="step-badge">Step 1</div>
            <div className="step-content">
              <h3 className="step-title">Run PostgreSQL Schema in Supabase</h3>
              <p className="step-desc">
                Paste our pre-built schema into your Supabase project's <strong>SQL Editor</strong>. It creates the <code>semesters</code>, <code>subjects</code>, and <code>attendance_records</code> tables with full Row Level Security (RLS) policies.
              </p>
              <button
                type="button"
                className="btn-secondary btn-copy-sql"
                onClick={copySqlSchema}
              >
                {copied ? <Check size={14} className="text-safe" /> : <Copy size={14} />}
                <span>{copied ? 'SQL Schema Copied to Clipboard!' : 'Copy SQL Schema Script'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Google OAuth Setup & 403 Troubleshooting */}
          <div className="config-step-card">
            <div className="step-badge">Step 2</div>
            <div className="step-content">
              <h3 className="step-title">Configure Google OAuth in Supabase (Fixing 403 Error)</h3>
              
              <div className="alert-403-guide" style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                color: '#78350f'
              }}>
                <strong>⚠️ Why Google shows "403 Error":</strong>
                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                  <li>
                    <strong>Case-sensitive URL:</strong> Callback URL must use lowercase <code>/auth/v1/callback</code> (NOT capital <code>V1</code>).
                  </li>
                  <li>
                    <strong>OAuth Consent Screen "Testing" Mode:</strong> By default, Google blocks everyone with 403 unless their email is in <em>Test users</em> or the app is published.
                  </li>
                  <li>
                    <strong>App URL:</strong> In Google Authorized JavaScript origins &amp; Supabase Redirect URLs, use this app's URL (not only localhost:5173).
                  </li>
                </ul>
              </div>

              <p className="step-desc">
                1. In <strong>Google Cloud Console</strong> &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client ID:
                <br />
                Under <strong>Authorized redirect URIs</strong>, paste (exact lowercase <code>v1</code>):
              </p>
              <code className="code-redirect-box">
                {url ? `${url.replace(/\/$/, '')}/auth/v1/callback` : 'https://cyipllurnaomoshhurbq.supabase.co/auth/v1/callback'}
              </code>

              <p className="step-desc" style={{ marginTop: '0.65rem' }}>
                Under <strong>Authorized JavaScript origins</strong>, add both your Supabase domain and this app domain:
              </p>
              <code className="code-redirect-box">{url || 'https://cyipllurnaomoshhurbq.supabase.co'}</code>
              <code className="code-redirect-box" style={{ marginTop: '0.25rem' }}>{redirectUrl}</code>

              <p className="step-desc" style={{ marginTop: '0.65rem' }}>
                2. In <strong>Google Cloud Console</strong> &gt; <strong>OAuth consent screen</strong>:
                <br />
                Under <strong>Test users</strong>, click <strong>+ ADD USERS</strong> and add your Google email, OR click <strong>PUBLISH APP</strong> to allow any account to log in.
              </p>

              <p className="step-desc" style={{ marginTop: '0.65rem' }}>
                3. In <strong>Supabase Dashboard</strong> &gt; Authentication &gt; Providers &gt; <strong>Google</strong>:
                <br />
                Enable Google provider, paste your Google <strong>Client ID</strong> and <strong>Client Secret</strong>, and click Save.
              </p>

              <p className="step-desc" style={{ marginTop: '0.65rem' }}>
                4. In <strong>Supabase Dashboard</strong> &gt; Authentication &gt; <strong>URL Configuration</strong>:
                <br />
                Under <strong>Site URL</strong>, set: <code>{redirectUrl}</code>
                <br />
                Under <strong>Redirect URLs</strong>, add:
              </p>
              <code className="code-redirect-box">{redirectUrl}/**</code>

              <p className="step-desc" style={{ marginTop: '0.65rem' }}>
                5. In <strong>Supabase Dashboard</strong> &gt; Authentication &gt; Providers &gt; <strong>Email</strong>:
                <br />
                Turn off <strong>Confirm email</strong> if you also want instant email/password logins without confirmation links.
              </p>
            </div>
          </div>

          {/* Step 3: Enter Credentials */}
          <form onSubmit={handleSave} className="config-form">
            <div className="step-badge">Step 3</div>
            <div className="step-content form-fields-wrap">
              <h3 className="step-title">Enter Supabase API Credentials</h3>
              <p className="step-desc">
                Found in Supabase Dashboard &gt; <strong>Project Settings &gt; API</strong>:
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="supabase-url">Project URL</label>
                <div className="input-with-icon">
                  <Database size={16} className="input-field-icon" />
                  <input
                    id="supabase-url"
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="supabase-key">Anon Public Key</label>
                <div className="input-with-icon">
                  <Key size={16} className="input-field-icon" />
                  <input
                    id="supabase-key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="config-actions-row">
                <button type="submit" className="btn-primary">
                  Connect Supabase Cloud
                </button>
                <button
                  type="button"
                  className="btn-subtle text-danger"
                  onClick={handleResetToDemo}
                  title="Switch back to Demo Mode"
                >
                  <RotateCcw size={14} />
                  <span>Use Demo Mode</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
