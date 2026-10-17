import React from 'react';
import { X, Check, AlertOctagon, Ban, Trash2, Calendar, Filter, Plus } from 'lucide-react';
import { ATTENDANCE_STATUS } from '../../lib/calculations.js';
import './AttendanceHistoryModal.css';

export default function AttendanceHistoryModal({
  isOpen,
  subject,
  records = [],
  stats,
  onClose,
  onUpdateRecordStatus,
  onDeleteRecord,
  onOpenMarkModal,
}) {
  const [filter, setFilter] = React.useState('ALL');

  if (!isOpen || !subject) return null;

  const filteredRecords = records.filter(r => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  // Compute exact live counts directly from subject records so counts in () match immediately
  const presentCount = records.filter(r => r.status === ATTENDANCE_STATUS.PRESENT).length;
  const absentCount = records.filter(r => r.status === ATTENDANCE_STATUS.ABSENT).length;
  const cancelledCount = records.filter(r => r.status === ATTENDANCE_STATUS.CANCELLED).length;
  const heldCount = presentCount + absentCount;
  const threshold = subject?.required_percentage || 75;
  const rawPercentage = heldCount > 0 ? (presentCount / heldCount) * 100 : null;
  const displayText = rawPercentage !== null ? `${Math.round(rawPercentage * 10) / 10}%` : 'No classes held yet';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="history-modal-title-wrap">
            <span className="history-subject-code">{subject.code || 'COURSE'}</span>
            <h2 className="modal-title">{subject.name} History</h2>
          </div>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="history-stats-ribbon">
          <div className="ribbon-metric">
            <span className="ribbon-val tabular-nums">{displayText}</span>
            <span className="ribbon-lbl">Current (Target {threshold}%)</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-metric">
            <span className="ribbon-val text-safe tabular-nums">{presentCount}</span>
            <span className="ribbon-lbl">Present</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-metric">
            <span className="ribbon-val text-shortage tabular-nums">{absentCount}</span>
            <span className="ribbon-lbl">Absent</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-metric" title="Excluded from attendance denominator">
            <span className="ribbon-val text-cancelled tabular-nums">{cancelledCount}</span>
            <span className="ribbon-lbl">Cancelled</span>
          </div>
        </div>

        <div className="history-toolbar">
          <div className="history-filter-tabs">
            <button
              type="button"
              className={`history-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All ({records.length})
            </button>
            <button
              type="button"
              className={`history-tab-btn text-safe ${filter === 'PRESENT' ? 'active' : ''}`}
              onClick={() => setFilter('PRESENT')}
            >
              Present ({presentCount})
            </button>
            <button
              type="button"
              className={`history-tab-btn text-shortage ${filter === 'ABSENT' ? 'active' : ''}`}
              onClick={() => setFilter('ABSENT')}
            >
              Absent ({absentCount})
            </button>
            <button
              type="button"
              className={`history-tab-btn text-cancelled ${filter === 'CANCELLED' ? 'active' : ''}`}
              onClick={() => setFilter('CANCELLED')}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>

          <button
            type="button"
            className="btn-primary btn-add-log"
            onClick={() => onOpenMarkModal(subject)}
          >
            <Plus size={14} />
            <span>Log Date</span>
          </button>
        </div>

        <div className="modal-body history-records-list">
          {filteredRecords.length === 0 ? (
            <div className="history-empty-state">
              <Calendar size={32} className="text-muted" />
              <p className="empty-state-title">No attendance records found</p>
              <p className="empty-state-desc">
                {filter === 'ALL'
                  ? 'No classes have been recorded for this course yet.'
                  : `No records match status: ${filter}`}
              </p>
            </div>
          ) : (
            <div className="records-table">
              {filteredRecords.map((record) => {
                const isCancelled = record.status === ATTENDANCE_STATUS.CANCELLED;
                const isPresent = record.status === ATTENDANCE_STATUS.PRESENT;
                const isAbsent = record.status === ATTENDANCE_STATUS.ABSENT;

                return (
                  <div key={record.id} className={`record-row record-${record.status.toLowerCase()}`}>
                    <div className="record-date-col">
                      <span className="record-date-text tabular-nums">{record.class_date}</span>
                      {record.notes && <span className="record-notes">{record.notes}</span>}
                    </div>

                    <div className="record-status-toggle">
                      <button
                        type="button"
                        className={`status-btn-pill ${isPresent ? 'pill-present-active' : ''}`}
                        onClick={() => onUpdateRecordStatus(record.id, ATTENDANCE_STATUS.PRESENT)}
                        title="Change status to Present"
                      >
                        <Check size={12} />
                        <span>Present</span>
                      </button>

                      <button
                        type="button"
                        className={`status-btn-pill ${isAbsent ? 'pill-absent-active' : ''}`}
                        onClick={() => onUpdateRecordStatus(record.id, ATTENDANCE_STATUS.ABSENT)}
                        title="Change status to Absent"
                      >
                        <AlertOctagon size={12} />
                        <span>Absent</span>
                      </button>

                      <button
                        type="button"
                        className={`status-btn-pill ${isCancelled ? 'pill-cancelled-active' : ''}`}
                        onClick={() => onUpdateRecordStatus(record.id, ATTENDANCE_STATUS.CANCELLED)}
                        title="Mark as Cancelled / Not Held (Excluded from denominator)"
                      >
                        <Ban size={12} />
                        <span>Cancelled</span>
                      </button>
                    </div>

                    <div className="record-actions-col">
                      <button
                        type="button"
                        className="btn-delete-record"
                        onClick={() => onDeleteRecord(record.id)}
                        title="Delete this record"
                        aria-label="Delete this record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="history-footer-note">
            Cancelled records are officially excluded from total held classes and will not penalize your attendance.
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
