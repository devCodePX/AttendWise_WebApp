import React from 'react';
import { Calendar, CheckCheck, Sparkles, Filter, ChevronDown, Check } from 'lucide-react';
import './QuickBatchBar.css';

export default function QuickBatchBar({
  subjects = [],
  selectedDate,
  onChangeDate,
  onOpenBatchSelect,
  onBatchPresentAll,
  filterStatus,
  onChangeFilter,
  atRiskCount = 0,
  safeCount = 0,
}) {
  const handleBatchClick = onOpenBatchSelect || onBatchPresentAll;

  return (
    <div className="quick-batch-bar">
      <div className="batch-controls-left">
        <div className="date-picker-input-wrap">
          <Calendar size={15} className="calendar-icon" />
          <input
            type="date"
            className="batch-date-picker"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            title="Selected class date for logging"
          />
        </div>

        <button
          type="button"
          className="btn-secondary btn-batch-present"
          onClick={handleBatchClick}
          disabled={subjects.length === 0}
          title="Select classes conducted today to mark present"
        >
          <CheckCheck size={15} />
          <span>Mark All Present</span>
        </button>
      </div>

      <div className="batch-controls-right">
        <div className="filter-segmented-control">
          <span className="filter-label">
            <Filter size={13} />
            <span>Filter:</span>
          </span>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => onChangeFilter('ALL')}
          >
            All ({subjects.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'AT_RISK' ? 'active' : ''}`}
            onClick={() => onChangeFilter('AT_RISK')}
          >
            <span className="filter-text-full">Needs Attention ({atRiskCount})</span>
            <span className="filter-text-short">Attention ({atRiskCount})</span>
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'SAFE' ? 'active' : ''}`}
            onClick={() => onChangeFilter('SAFE')}
          >
            Safe ({safeCount})
          </button>
        </div>
      </div>
    </div>
  );
}
