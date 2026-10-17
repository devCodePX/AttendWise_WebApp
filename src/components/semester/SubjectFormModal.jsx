import React from 'react';
import { X, BookOpen, Hash, Target } from 'lucide-react';
import './SubjectFormModal.css';

export default function SubjectFormModal({
  isOpen,
  subject = null, // null for create, object for edit
  activeSemesterId,
  onClose,
  onSubmit,
}) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [requiredPercentage, setRequiredPercentage] = React.useState(75);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (subject) {
      setName(subject.name || '');
      setCode(subject.code || '');
      setRequiredPercentage(subject.required_percentage || 75);
    } else {
      setName('');
      setCode('');
      setRequiredPercentage(75);
    }
  }, [subject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        semester_id: activeSemesterId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        required_percentage: Number(requiredPercentage) || 75,
      });
      onClose();
    } catch (err) {
      console.error('Error saving subject:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content subject-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {subject ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body subject-modal-body">
            {/* Subject Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="subject-name">Subject / Course Name</label>
              <div className="input-with-icon">
                <BookOpen size={16} className="input-field-icon" />
                <input
                  id="subject-name"
                  type="text"
                  placeholder="e.g., Database Management Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Subject Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="subject-code">Subject Code (Optional)</label>
              <div className="input-with-icon">
                <Hash size={16} className="input-field-icon" />
                <input
                  id="subject-code"
                  type="text"
                  placeholder="e.g., CS303"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={12}
                />
              </div>
            </div>

            {/* Attendance Threshold */}
            <div className="form-group">
              <div className="threshold-header-row">
                <label className="form-label" htmlFor="subject-threshold">
                  Required Attendance Threshold
                </label>
                <div className="threshold-val-display tabular-nums">
                  <strong>{requiredPercentage}%</strong>
                </div>
              </div>

              <div className="threshold-slider-row">
                <input
                  id="subject-threshold"
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={requiredPercentage}
                  onChange={(e) => setRequiredPercentage(Number(e.target.value))}
                  className="slider-input slider-safe"
                />
              </div>

              <div className="preset-thresholds-strip">
                <span className="preset-label">Standard College Targets:</span>
                <button
                  type="button"
                  className={`preset-btn ${requiredPercentage === 75 ? 'preset-active' : ''}`}
                  onClick={() => setRequiredPercentage(75)}
                >
                  75% (Standard)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${requiredPercentage === 80 ? 'preset-active' : ''}`}
                  onClick={() => setRequiredPercentage(80)}
                >
                  80% (Strict)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${requiredPercentage === 85 ? 'preset-active' : ''}`}
                  onClick={() => setRequiredPercentage(85)}
                >
                  85% (Honors)
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (subject ? 'Save Changes' : 'Create Subject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
