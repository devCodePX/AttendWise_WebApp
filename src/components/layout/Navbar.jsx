import React from 'react';
import { GraduationCap, Database, User, LogOut, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import './Navbar.css';

export default function Navbar({
  semesters = [],
  activeSemesterId,
  onSelectSemester,
  onOpenSemesterManager,
  onOpenWhatIf,
  onOpenAuth,
  onOpenSupabaseConfig,
  authUser,
  onSignOut,
  isDemoMode,
  onResetDemoData,
}) {
  const activeSemester = semesters.find(s => s.id === activeSemesterId);

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Zone 1: Brand Wordmark */}
        <div className="brand-zone">
          <div className="brand-logo-wrap">
            <GraduationCap className="brand-icon" size={22} />
          </div>
          <span className="brand-title">AttendWise</span>
          <span className="brand-badge-subtle">College</span>
        </div>

        {/* Zone 2: Navigation & Context Controls */}
        <div className="header-nav-zone">
          <div className="semester-selector-wrap">
            <span className="semester-label">Semester:</span>
            <select
              className="semester-select"
              value={activeSemesterId || ''}
              onChange={(e) => onSelectSemester(e.target.value)}
              disabled={semesters.length === 0}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={onOpenSemesterManager}
              title="Manage Semesters"
              aria-label="Manage Semesters"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          <button
            type="button"
            className="btn-simulator-shortcut"
            onClick={onOpenWhatIf}
            title="What-If Bunk Planner"
          >
            <Sparkles size={15} className="sparkle-anim" />
            <span className="btn-sim-text-full">What-If Bunk Planner</span>
            <span className="btn-sim-text-short">Bunk Planner</span>
          </button>
        </div>

        {/* Zone 3: Account & Cloud Integration */}
        <div className="header-actions-zone">
          {authUser ? (
            <div className="user-profile-pill">
              {authUser.user_metadata?.avatar_url ? (
                <img
                  src={authUser.user_metadata.avatar_url}
                  alt="Avatar"
                  className="user-avatar-img"
                />
              ) : (
                <User size={15} className="user-avatar-icon" />
              )}
              <span className="user-email-text" title={authUser.email}>
                {authUser.user_metadata?.full_name || authUser.email.split('@')[0]}
              </span>
              <span className="cloud-sync-tag" title="Connected to Supabase PostgreSQL">
                <span className="sync-dot" />
                Cloud
              </span>
              <button
                type="button"
                className="btn-signout"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button
                type="button"
                className="btn-secondary btn-header-action"
                onClick={onOpenSupabaseConfig}
                title="Configure Supabase Cloud"
              >
                <Database size={15} />
                <span className="btn-text-desktop">Supabase Setup</span>
              </button>

              <button
                type="button"
                className="btn-primary btn-header-action"
                onClick={onOpenAuth}
              >
                <User size={15} />
                <span>Sign In / Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
