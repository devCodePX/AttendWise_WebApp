import React from 'react';
import { BookPlus, SearchX, GraduationCap } from 'lucide-react';
import SubjectCard from './SubjectCard.jsx';
import { calculateSubjectStats } from '../../lib/calculations.js';
import './SubjectGrid.css';

export default function SubjectGrid({
  subjects = [],
  recordsBySubject = new Map(),
  filterStatus = 'ALL',
  semestersCount = 1,
  onOpenSemesterManager,
  onQuickLog,
  onOpenHistory,
  onEditSubject,
  onDeleteSubject,
  onOpenMarkModal,
  onAddSubject,
  onResetFilter,
}) {
  // If no semester has been created yet (brand new signed-up user)
  if (semestersCount === 0) {
    return (
      <div className="subjects-empty-container">
        <div className="empty-icon-wrap">
          <GraduationCap size={36} className="text-primary" />
        </div>
        <h3 className="empty-heading">Welcome to AttendWise!</h3>
        <p className="empty-subtext">
          Start by creating your current college semester (e.g., "Semester 5" or "Spring 2026") to organize your courses and attendance.
        </p>
        <button type="button" className="btn-primary" onClick={onOpenSemesterManager}>
          <GraduationCap size={16} />
          <span>Create Your First Semester</span>
        </button>
      </div>
    );
  }

  // Compute stats for each subject
  const subjectStatsList = subjects.map((subject) => {
    const records = recordsBySubject.get(subject.id) || [];
    const stats = calculateSubjectStats(records, subject.required_percentage);
    return { subject, records, stats };
  });

  // Filter subjects based on selected tab
  const filteredList = subjectStatsList.filter(({ stats }) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'AT_RISK') {
      return stats.statusCategory === 'SHORTAGE' || stats.statusCategory === 'CAUTION';
    }
    if (filterStatus === 'SAFE') {
      return stats.statusCategory === 'SAFE';
    }
    return true;
  });

  if (subjects.length === 0) {
    return (
      <div className="subjects-empty-container">
        <div className="empty-icon-wrap">
          <BookPlus size={36} className="text-primary" />
        </div>
        <h3 className="empty-heading">No Subjects in this Semester</h3>
        <p className="empty-subtext">
          Add the 5–6 courses you are taking this semester (along with their minimum required attendance percentage) to start tracking.
        </p>
        <button type="button" className="btn-primary" onClick={onAddSubject}>
          <BookPlus size={16} />
          <span>Add First Subject</span>
        </button>
      </div>
    );
  }

  if (filteredList.length === 0) {
    return (
      <div className="subjects-empty-container">
        <div className="empty-icon-wrap">
          <SearchX size={36} className="text-muted" />
        </div>
        <h3 className="empty-heading">No Subjects Match Filter</h3>
        <p className="empty-subtext">
          None of your courses currently match the "{filterStatus === 'AT_RISK' ? 'Needs Attention' : 'Safe'}" status.
        </p>
        <button type="button" className="btn-secondary" onClick={onResetFilter}>
          Show All Subjects
        </button>
      </div>
    );
  }

  return (
    <div className="subjects-grid">
      {filteredList.map(({ subject, records, stats }) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          records={records}
          stats={stats}
          onQuickLog={onQuickLog}
          onOpenHistory={onOpenHistory}
          onEditSubject={onEditSubject}
          onDeleteSubject={onDeleteSubject}
          onOpenMarkModal={onOpenMarkModal}
        />
      ))}
    </div>
  );
}
