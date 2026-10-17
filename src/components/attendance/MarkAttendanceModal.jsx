import React from 'react';
import { X, Check, AlertOctagon, Ban, Calendar, FileText } from 'lucide-react';
import { ATTENDANCE_STATUS } from '../../lib/calculations.js';
import './MarkAttendanceModal.css';

export default function MarkAttendanceModal({
  isOpen,
  subject,
  subjects = [],
  onClose,
  onSubmit,
}) {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState('');
  const [classDate, setClassDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = React.useState(ATTENDANCE_STATUS.PRESENT);
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (subject) {
      setSelectedSubjectId(subject.id);
    } else if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subject, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubjectId || !classDate) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        subject_id: selectedSubjectId,
        class_date: classDate,
        status,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error('Error logging class:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content mark-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Log Class Attendance</h2>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body mark-modal-body">
            {/* Subject Selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="mark-subject-select">Subject</label>
              <select
                id="mark-subject-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `[${s.code}] ` : ''}{s.name} (Goal: {s.required_percentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="form-group">
              <label className="form-label" htmlFor="mark-class-date">Class Date</label>
              <div className="input-with-icon">
                <Calendar size={16} className="input-field-icon" />
                <input
                  id="mark-class-date"
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Attendance Status Selection */}
            <div className="form-group">
              <label className="form-label">Attendance Status</label>
              <div className="status-selector-grid">
                <label className={`status-option ${status === ATTENDANCE_STATUS.PRESENT ? 'option-present-active' : ''}`}>
                  <input
                    type="radio"
                    name="attendance-status"
                    value={ATTENDANCE_STATUS.PRESENT}
                    checked={status === ATTENDANCE_STATUS.PRESENT}
                    onChange={() => setStatus(ATTENDANCE_STATUS.PRESENT)}
                  />
                  <div className="status-option-content">
                    <Check size={16} className="text-safe" />
                    <span className="status-option-title">Present</span>
                    <span className="status-option-desc">Class attended</span>
                  </div>
                </label>

                <label className={`status-option ${status === ATTENDANCE_STATUS.ABSENT ? 'option-absent-active' : ''}`}>
                  <input
                    type="radio"
                    name="attendance-status"
                    value={ATTENDANCE_STATUS.ABSENT}
                    checked={status === ATTENDANCE_STATUS.ABSENT}
                    onChange={() => setStatus(ATTENDANCE_STATUS.ABSENT)}
                  />
                  <div className="status-option-content">
                    <AlertOctagon size={16} className="text-shortage" />
                    <span className="status-option-title">Absent</span>
                    <span className="status-option-desc">Class missed / bunked</span>
                  </div>
                </label>

                <label className={`status-option ${status === ATTENDANCE_STATUS.CANCELLED ? 'option-cancelled-active' : ''}`}>
                  <input
                    type="radio"
                    name="attendance-status"
                    value={ATTENDANCE_STATUS.CANCELLED}
                    checked={status === ATTENDANCE_STATUS.CANCELLED}
                    onChange={() => setStatus(ATTENDANCE_STATUS.CANCELLED)}
                  />
                  <div className="status-option-content">
                    <Ban size={16} className="text-cancelled" />
                    <span className="status-option-title">Cancelled</span>
                    <span className="status-option-desc">Not held / faculty leave</span>
                  </div>
                </label>
              </div>

              {/* Status Explanation Box */}
              <div className="status-clarification-box">
                {status === ATTENDANCE_STATUS.CANCELLED ? (
                  <p className="clarification-cancelled">
                    <strong>Excluded from percentage:</strong> A cancelled class does not count in total held classes and will not lower your attendance.
                  </p>
                ) : status === ATTENDANCE_STATUS.ABSENT ? (
                  <p className="clarification-absent">
                    <strong>Absence recorded:</strong> Class was conducted by professor and missed. Bunks count towards your total held classes denominator.
                  </p>
                ) : (
                  <p className="clarification-present">
                    <strong>Present recorded:</strong> Increments both attended classes and held classes numerator and denominator.
                  </p>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="mark-notes">Notes (Optional)</label>
              <div className="input-with-icon">
                <FileText size={16} className="input-field-icon" />
                <input
                  id="mark-notes"
                  type="text"
                  placeholder="e.g., Lab session 3, Sick leave, Holiday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
