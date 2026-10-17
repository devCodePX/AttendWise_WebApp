import React from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import './SemesterManagerModal.css';

export default function SemesterManagerModal({
  isOpen,
  semesters = [],
  activeSemesterId,
  onClose,
  onCreateSemester,
  onUpdateSemester,
  onDeleteSemester,
  onSetActiveSemester,
}) {
  const [newSemesterName, setNewSemesterName] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;
    onCreateSemester(newSemesterName.trim());
    setNewSemesterName('');
  };

  const startEdit = (semester) => {
    setEditingId(semester.id);
    setEditName(semester.name);
  };

  const saveEdit = (id) => {
    if (!editName.trim()) return;
    onUpdateSemester(id, { name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content semester-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Manage Semesters</h2>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body semester-modal-body">
          {/* Create New Semester Form */}
          <form className="create-semester-row" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="e.g., Semester 7 (Fall 2026)"
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">
              <Plus size={15} />
              <span>Add Semester</span>
            </button>
          </form>

          {/* Semesters List */}
          <div className="semesters-list">
            {semesters.map((semester) => {
              const isActive = semester.id === activeSemesterId;
              const isEditing = editingId === semester.id;

              return (
                <div key={semester.id} className={`semester-item-row ${isActive ? 'semester-row-active' : ''}`}>
                  <div className="semester-info-left">
                    <button
                      type="button"
                      className="btn-toggle-active"
                      onClick={() => onSetActiveSemester(semester.id)}
                      title={isActive ? 'Active Semester' : 'Click to make active'}
                    >
                      {isActive ? (
                        <CheckCircle2 size={18} className="text-safe" />
                      ) : (
                        <Circle size={18} className="text-faint" />
                      )}
                    </button>

                    {isEditing ? (
                      <div className="edit-semester-inline">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-primary btn-save-inline"
                          onClick={() => saveEdit(semester.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-cancel-inline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="semester-text-wrap" onClick={() => onSetActiveSemester(semester.id)}>
                        <span className="semester-name-title">{semester.name}</span>
                        {isActive && <span className="active-tag">Active</span>}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="semester-actions-right">
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => startEdit(semester)}
                        title="Rename Semester"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action text-danger"
                        onClick={() => onDeleteSemester(semester)}
                        disabled={semesters.length <= 1}
                        title={semesters.length <= 1 ? 'Cannot delete only semester' : 'Delete Semester'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
