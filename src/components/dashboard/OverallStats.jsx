import React from 'react';
import { Award, AlertOctagon, AlertTriangle, CheckCircle, Ban, BookOpen, Plus, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import './OverallStats.css';

export default function OverallStats({
  stats,
  onAddSubject,
  onOpenWhatIf,
}) {
  const {
    totalSubjects,
    totalPresent,
    totalAbsent,
    totalCancelled,
    totalHeld,
    overallPercentage,
    displayText,
    statusCategory,
    shortageCount,
    cautionCount,
  } = stats;

  return (
    <div className="overall-stats-card">
      <div className="stats-top-banner">
        <div className="stats-main-metric">
          <div className="metric-header">
            <span className="metric-kicker">Overall Semester Standing</span>
            <StatusBadge statusCategory={statusCategory} size="medium" />
          </div>

          <div className="metric-value-row">
            <h1 className="metric-percentage tabular-nums">
              {displayText}
            </h1>
            {overallPercentage !== null && (
              <span className="metric-subtitle">
                weighted across <strong className="tabular-nums">{totalHeld}</strong> held classes
              </span>
            )}
          </div>

          <p className="metric-explanation">
            {totalHeld === 0 ? (
              totalCancelled > 0 
                ? `${totalCancelled} class${totalCancelled > 1 ? 'es were' : ' was'} cancelled; no held classes have taken place yet.`
                : 'No classes have been logged yet for this semester. Add your subjects to start tracking.'
            ) : (
              overallPercentage >= 75 ? (
                `Your weighted attendance is above 75%. Keep up consistent attendance across all courses.`
              ) : (
                `Your overall attendance is below 75%. Prioritize classes in courses with attendance shortages.`
              )
            )}
          </p>
        </div>

        <div className="stats-actions-block">
          <button type="button" className="btn-primary" onClick={onAddSubject}>
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
          <button type="button" className="btn-secondary" onClick={onOpenWhatIf}>
            <Sparkles size={16} />
            <span>Simulate Leave</span>
          </button>
        </div>
      </div>

      <div className="stats-breakdown-grid">
        <div className="stat-sub-item">
          <div className="stat-sub-label">
            <BookOpen size={14} className="stat-sub-icon text-indigo" />
            <span>Total Subjects</span>
          </div>
          <span className="stat-sub-value tabular-nums">{totalSubjects}</span>
        </div>

        <div className="stat-sub-item">
          <div className="stat-sub-label">
            <CheckCircle size={14} className="stat-sub-icon text-safe" />
            <span>Attended (Present)</span>
          </div>
          <span className="stat-sub-value tabular-nums">{totalPresent}</span>
        </div>

        <div className="stat-sub-item">
          <div className="stat-sub-label">
            <AlertOctagon size={14} className="stat-sub-icon text-shortage" />
            <span>Missed (Absent)</span>
          </div>
          <span className="stat-sub-value tabular-nums">{totalAbsent}</span>
        </div>

        <div className="stat-sub-item stat-cancelled-item" title="Cancelled classes are excluded from the held class denominator">
          <div className="stat-sub-label">
            <Ban size={14} className="stat-sub-icon text-cancelled" />
            <span>Not Held / Cancelled</span>
          </div>
          <div className="stat-sub-value-group">
            <span className="stat-sub-value tabular-nums">{totalCancelled}</span>
            <span className="stat-sub-note">excluded from %</span>
          </div>
        </div>

        {(shortageCount > 0 || cautionCount > 0) && (
          <div className="stat-sub-item stat-attention-item">
            <div className="stat-sub-label">
              <AlertTriangle size={14} className="stat-sub-icon text-caution" />
              <span>Needs Attention</span>
            </div>
            <div className="stat-attention-chips">
              {shortageCount > 0 && (
                <span className="attention-tag-shortage tabular-nums">
                  {shortageCount} Shortage
                </span>
              )}
              {cautionCount > 0 && (
                <span className="attention-tag-caution tabular-nums">
                  {cautionCount} Caution
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
