import React from 'react';
import {
  Check,
  X as XIcon,
  Ban,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  History,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import './SubjectCard.css';

export default function SubjectCard({
  subject,
  records = [],
  stats,
  onQuickLog,
  onOpenHistory,
  onEditSubject,
  onDeleteSubject,
  onOpenMarkModal,
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Close dropdown menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const {
    presentCount,
    absentCount,
    cancelledCount,
    heldCount,
    displayText,
    percentage,
    statusCategory,
    allowableAbsences,
    recoveryNeeded,
    threshold,
    recommendation,
  } = stats;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.class_date === todayStr);

  return (
    <div className={`subject-card subject-card-${statusCategory.toLowerCase()}`}>
      {/* Card Header */}
      <div className="card-top">
        <div className="subject-meta">
          {subject.code && <span className="subject-code-tag">{subject.code}</span>}
          <h3 className="subject-title" title={subject.name}>{subject.name}</h3>
        </div>

        <div className="card-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="btn-card-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Subject options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="card-dropdown-menu">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenHistory(subject);
                }}
              >
                <History size={14} />
                <span>Attendance History</span>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenMarkModal(subject);
                }}
              >
                <Clock size={14} />
                <span>Log Custom Date</span>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEditSubject(subject);
                }}
              >
                <Edit2 size={14} />
                <span>Edit Subject</span>
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item item-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteSubject(subject);
                }}
              >
                <Trash2 size={14} />
                <span>Delete Subject</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Score & Status Row */}
      <div className="card-score-row">
        <div className="percentage-container">
          <span className="big-percentage tabular-nums">
            {displayText}
          </span>
          <span className="required-target">
            Target: <strong>{threshold}%</strong>
          </span>
        </div>
        <StatusBadge statusCategory={statusCategory} size="small" />
      </div>

      {/* Progress Bar Visualization */}
      <div className="progress-track" title={`Current: ${displayText} | Target: ${threshold}%`}>
        <div
          className={`progress-fill progress-fill-${statusCategory.toLowerCase()}`}
          style={{ width: `${Math.min(100, percentage || 0)}%` }}
        />
        {/* Threshold Goal Marker */}
        <div
          className="threshold-marker"
          style={{ left: `${threshold}%` }}
          title={`Minimum Required: ${threshold}%`}
        />
      </div>

      {/* Counts Grid (Attended / Held / Cancelled) */}
      <div className="counts-strip">
        <div className="count-col">
          <span className="count-val text-safe tabular-nums">{presentCount}</span>
          <span className="count-lbl">Attended</span>
        </div>
        <div className="count-col-divider" />
        <div className="count-col">
          <span className="count-val tabular-nums">{heldCount}</span>
          <span className="count-lbl">Total Held</span>
        </div>
        <div className="count-col-divider" />
        <div className="count-col">
          <span className="count-val text-shortage tabular-nums">{absentCount}</span>
          <span className="count-lbl">Missed</span>
        </div>
        <div className="count-col-divider" />
        <div className="count-col" title="Cancelled classes are officially not held and excluded from total held">
          <span className="count-val text-cancelled tabular-nums">{cancelledCount}</span>
          <span className="count-lbl">Cancelled</span>
        </div>
      </div>

      {/* Recommendation / Warning Banner */}
      <div className={`recommendation-banner banner-${statusCategory.toLowerCase()}`}>
        <div className="banner-icon">
          {statusCategory === 'SHORTAGE' && <AlertCircle size={15} />}
          {statusCategory === 'CAUTION' && <AlertCircle size={15} />}
          {statusCategory === 'SAFE' && <CheckCircle2 size={15} />}
          {statusCategory === 'UNRECORDED' && <HelpCircle size={15} />}
        </div>
        <div className="banner-text">
          {recommendation}
        </div>
      </div>

      {/* Today's Attendance State Note if already recorded */}
      {todayRecord && (
        <div className="today-status-strip">
          <span>Today logged as: <strong>{todayRecord.status}</strong></span>
          <button
            type="button"
            className="btn-link-edit"
            onClick={() => onOpenHistory(subject)}
          >
            Change
          </button>
        </div>
      )}

      {/* 3-Way Quick Log Controls */}
      <div className="action-buttons-grid">
        <button
          type="button"
          className="btn-quick-log btn-present"
          onClick={() => onQuickLog(subject.id, 'PRESENT')}
          title="Mark class attended today"
        >
          <Check size={13} />
          <span>Present <span className="btn-log-count tabular-nums">({presentCount})</span></span>
        </button>

        <button
          type="button"
          className="btn-quick-log btn-absent"
          onClick={() => onQuickLog(subject.id, 'ABSENT')}
          title="Mark class missed / bunked today"
        >
          <XIcon size={13} />
          <span>Absent <span className="btn-log-count tabular-nums">({absentCount})</span></span>
        </button>

        <button
          type="button"
          className="btn-quick-log btn-cancelled"
          onClick={() => onQuickLog(subject.id, 'CANCELLED')}
          title="Class was cancelled by professor / not held"
        >
          <Ban size={13} />
          <span>Cancelled <span className="btn-log-count tabular-nums">({cancelledCount})</span></span>
        </button>
      </div>

      {/* History Trigger Footer */}
      <div className="card-footer-strip">
        <button
          type="button"
          className="btn-subtle btn-history-link"
          onClick={() => onOpenHistory(subject)}
        >
          <History size={13} />
          <span>History ({records.length} records)</span>
        </button>

        <button
          type="button"
          className="btn-subtle btn-date-link"
          onClick={() => onOpenMarkModal(subject)}
        >
          <span>Pick Date</span>
        </button>
      </div>
    </div>
  );
}
