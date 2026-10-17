import React from 'react';
import { X, Check, CheckCheck, AlertTriangle, Calendar, BookOpen, AlertOctagon, Ban } from 'lucide-react';
import { ATTENDANCE_STATUS } from '../../lib/calculations.js';
import './BatchSelectModal.css';

export default function BatchSelectModal({
  isOpen,
  subjects = [],
  records = [],
  selectedDate,
  onClose,
  onConfirmBatch,
}) {
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [confirmOverwriteCancelled, setConfirmOverwriteCancelled] = React.useState(false);
  const [validationError, setValidationError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Group existing records for selectedDate by subject_id
  const recordsForDateBySubject = React.useMemo(() => {
    const map = new Map();
    for (const record of records) {
      if (record.class_date === selectedDate) {
        map.set(record.subject_id, record);
      }
    }
    return map;
  }, [records, selectedDate]);

  // Initialize selected subjects when modal opens (select all conducted by default, or all non-cancelled)
  React.useEffect(() => {
    if (isOpen) {
      // By default, select all subjects that are not cancelled for this date
      const initial = new Set();
      subjects.forEach((s) => {
        const existingRecord = recordsForDateBySubject.get(s.id);
        // If it's not cancelled, select it by default for quick 1-tap experience
        if (!existingRecord || existingRecord.status !== ATTENDANCE_STATUS.CANCELLED) {
          initial.add(s.id);
        }
      });
      setSelectedIds(initial);
      setConfirmOverwriteCancelled(false);
      setValidationError('');
      setIsSubmitting(false);
    }
  }, [isOpen, subjects, recordsForDateBySubject]);

  if (!isOpen) return null;

  // Identify any selected subjects that currently have a CANCELLED record on selectedDate
  const cancelledConflicts = subjects.filter((s) => {
    if (!selectedIds.has(s.id)) return false;
    const existing = recordsForDateBySubject.get(s.id);
    return existing && existing.status === ATTENDANCE_STATUS.CANCELLED;
  });

  const toggleSubject = (id) => {
    setValidationError('');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setValidationError('');
    setSelectedIds(new Set(subjects.map((s) => s.id)));
  };

  const clearSelection = () => {
    setValidationError('');
    setSelectedIds(new Set());
    setConfirmOverwriteCancelled(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setValidationError('Please select at least one subject to mark present.');
      return;
    }

    // Check for unresolved cancelled conflicts
    if (cancelledConflicts.length > 0 && !confirmOverwriteCancelled) {
      setValidationError(
        `Please confirm overwriting the ${cancelledConflicts.length} cancelled class${
          cancelledConflicts.length > 1 ? 'es' : ''
        } or uncheck them before proceeding.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmBatch(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error('Batch present error:', err);
      setValidationError('Failed to mark attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content batch-select-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="batch-select-title-wrap">
            <h2 className="modal-title">Select Today's Classes</h2>
            <div className="batch-date-indicator">
              <Calendar size={13} />
              <span>Classes for {formattedDate}</span>
            </div>
          </div>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="batch-select-form">
          <div className="modal-body batch-select-modal-body">
            <p className="batch-select-instruction">
              Select only the subjects whose classes were actually held and conducted on this date. Unselected subjects will remain unchanged.
            </p>

            {/* Selection Toolbar: Select All / Clear Selection & Count */}
            <div className="batch-selection-toolbar">
              <div className="batch-actions-left">
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={selectAll}
                >
                  <CheckCheck size={14} />
                  <span>Select All</span>
                </button>
                <span className="toolbar-dot">·</span>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={clearSelection}
                >
                  <span>Clear Selection</span>
                </button>
              </div>

              <div className="batch-counter-badge tabular-nums">
                <strong>{selectedIds.size}</strong> of {subjects.length} selected
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div className="batch-validation-alert">
                <AlertTriangle size={15} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Cancelled Conflict Warning Banner */}
            {cancelledConflicts.length > 0 && (
              <div className="cancelled-conflict-box">
                <div className="conflict-box-header">
                  <AlertTriangle size={16} className="text-caution" />
                  <strong>Cancelled Class Conflict Warning</strong>
                </div>
                <p className="conflict-box-desc">
                  {cancelledConflicts.length === 1
                    ? `"${cancelledConflicts[0].name}" was previously recorded as CANCELLED (Not Held) for ${selectedDate}.`
                    : `${cancelledConflicts.length} selected subjects were previously recorded as CANCELLED (Not Held) for ${selectedDate}: ${cancelledConflicts
                        .map((c) => c.code || c.name)
                        .join(', ')}.`}
                </p>
                <label className="conflict-confirm-label">
                  <input
                    type="checkbox"
                    checked={confirmOverwriteCancelled}
                    onChange={(e) => {
                      setConfirmOverwriteCancelled(e.target.checked);
                      if (e.target.checked) setValidationError('');
                    }}
                  />
                  <span>
                    I confirm {cancelledConflicts.length > 1 ? 'these classes were' : 'this class was'} actually held and want to overwrite from Cancelled to Present.
                  </span>
                </label>
              </div>
            )}

            {/* Checklist of Subjects */}
            <div className="batch-checklist-container">
              {subjects.map((subject) => {
                const isChecked = selectedIds.has(subject.id);
                const existing = recordsForDateBySubject.get(subject.id);
                const isCancelled = existing && existing.status === ATTENDANCE_STATUS.CANCELLED;
                const isAbsent = existing && existing.status === ATTENDANCE_STATUS.ABSENT;
                const isPresent = existing && existing.status === ATTENDANCE_STATUS.PRESENT;

                return (
                  <label
                    key={subject.id}
                    className={`batch-check-item ${isChecked ? 'item-checked' : ''} ${
                      isCancelled ? 'item-has-cancelled' : ''
                    }`}
                  >
                    <div className="item-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSubject(subject.id)}
                      />
                    </div>

                    <div className="item-text-wrap">
                      <div className="item-title-row">
                        {subject.code && (
                          <span className="batch-subject-code">{subject.code}</span>
                        )}
                        <span className="batch-subject-name">{subject.name}</span>
                      </div>

                      <div className="item-status-footnote">
                        {isCancelled && (
                          <span className="status-note-cancelled">
                            <Ban size={12} />
                            <span>Currently Cancelled (Not Held)</span>
                          </span>
                        )}
                        {isAbsent && (
                          <span className="status-note-absent">
                            <AlertOctagon size={12} />
                            <span>Currently Absent (Will update to Present)</span>
                          </span>
                        )}
                        {isPresent && (
                          <span className="status-note-present">
                            <Check size={12} />
                            <span>Already marked Present</span>
                          </span>
                        )}
                        {!existing && (
                          <span className="status-note-none">
                            <span>Not recorded yet</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="modal-footer batch-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              <CheckCheck size={16} />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : selectedIds.size > 0
                  ? `Mark ${selectedIds.size} Selected Present`
                  : 'Mark Selected Present'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
