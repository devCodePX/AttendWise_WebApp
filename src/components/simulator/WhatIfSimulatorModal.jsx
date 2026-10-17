import React from 'react';
import { X, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { simulateWhatIf, calculateSubjectStats } from '../../lib/calculations.js';
import StatusBadge from '../common/StatusBadge.jsx';
import './WhatIfSimulatorModal.css';

export default function WhatIfSimulatorModal({
  isOpen,
  subjects = [],
  recordsBySubject = new Map(),
  initialSubjectId = null,
  onClose,
}) {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState('');
  const [futurePresent, setFuturePresent] = React.useState(0);
  const [futureAbsent, setFutureAbsent] = React.useState(0);

  React.useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    } else if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [initialSubjectId, subjects]);

  if (!isOpen) return null;

  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const currentRecords = currentSubject ? (recordsBySubject.get(currentSubject.id) || []) : [];
  const currentStats = currentSubject ? calculateSubjectStats(currentRecords, currentSubject.required_percentage) : null;

  const presentCount = currentStats ? currentStats.presentCount : 0;
  const heldCount = currentStats ? currentStats.heldCount : 0;
  const threshold = currentSubject ? currentSubject.required_percentage : 75;

  // Run What-If calculation
  const simulation = simulateWhatIf(
    presentCount,
    heldCount,
    threshold,
    futurePresent,
    futureAbsent
  );

  const resetSimulation = () => {
    setFuturePresent(0);
    setFutureAbsent(0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content whatif-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header whatif-header">
          <div className="whatif-title-wrap">
            <div className="whatif-icon-badge">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="modal-title">What-If Attendance & Bunk Planner</h2>
              <p className="whatif-subtitle">Simulate future classes to plan leaves safely without risking debarment.</p>
            </div>
          </div>
          <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body whatif-modal-body">
          {/* Subject Switcher */}
          <div className="form-group">
            <label className="form-label" htmlFor="whatif-subject-select">Select Course to Simulate</label>
            <select
              id="whatif-subject-select"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                resetSimulation();
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `[${s.code}] ` : ''}{s.name} (Goal: {s.required_percentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Current vs Projected Comparison Card */}
          <div className="simulation-comparison-card">
            <div className="sim-comparison-col">
              <span className="sim-col-label">Current Attendance</span>
              <span className="sim-col-metric tabular-nums">
                {currentStats ? currentStats.displayText : '—'}
              </span>
              <span className="sim-col-sub tabular-nums">
                {presentCount} / {heldCount} held classes
              </span>
            </div>

            <div className="sim-arrow-col">
              <ArrowRight size={22} className="sim-arrow-icon" />
              <button
                type="button"
                className="btn-subtle btn-reset-sim"
                onClick={resetSimulation}
                title="Reset simulation sliders"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            <div className={`sim-comparison-col sim-projected-col ${simulation.isEligible ? 'projected-safe' : 'projected-danger'}`}>
              <div className="sim-projected-top">
                <span className="sim-col-label">Projected Outcome</span>
                <StatusBadge statusCategory={simulation.statusCategory} size="small" />
              </div>
              <div className="sim-metric-delta-row">
                <span className="sim-col-metric tabular-nums">
                  {simulation.formattedPercentage}
                </span>
                {simulation.deltaPercentage !== 0 && (
                  <span className={`sim-delta-badge tabular-nums ${simulation.deltaPercentage > 0 ? 'delta-positive' : 'delta-negative'}`}>
                    {simulation.deltaPercentage > 0 ? (
                      <><TrendingUp size={12} /> +{simulation.deltaPercentage}%</>
                    ) : (
                      <><TrendingDown size={12} /> {simulation.deltaPercentage}%</>
                    )}
                  </span>
                )}
              </div>
              <span className="sim-col-sub tabular-nums">
                {simulation.projectedPresent} / {simulation.projectedHeld} total classes
              </span>
            </div>
          </div>

          {/* Interactive Simulation Sliders */}
          <div className="simulation-inputs-section">
            {/* Future Present Slider */}
            <div className="slider-control-card slider-present-card">
              <div className="slider-header">
                <div className="slider-label-group">
                  <span className="slider-title">Classes You Plan to Attend</span>
                  <span className="slider-desc">Additional consecutive classes present</span>
                </div>
                <div className="stepper-box">
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => setFuturePresent(Math.max(0, futurePresent - 1))}
                  >
                    -
                  </button>
                  <span className="stepper-value tabular-nums">{futurePresent}</span>
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => setFuturePresent(futurePresent + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={futurePresent}
                onChange={(e) => setFuturePresent(Number(e.target.value))}
                className="slider-input slider-safe"
              />
            </div>

            {/* Future Absent Slider */}
            <div className="slider-control-card slider-absent-card">
              <div className="slider-header">
                <div className="slider-label-group">
                  <span className="slider-title">Classes You Plan to Bunk / Miss</span>
                  <span className="slider-desc">Leaves, trips, or personal absences</span>
                </div>
                <div className="stepper-box">
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => setFutureAbsent(Math.max(0, futureAbsent - 1))}
                  >
                    -
                  </button>
                  <span className="stepper-value tabular-nums">{futureAbsent}</span>
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => setFutureAbsent(futureAbsent + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={futureAbsent}
                onChange={(e) => setFutureAbsent(Number(e.target.value))}
                className="slider-input slider-shortage"
              />
            </div>
          </div>

          {/* Quick Scenario Preset Chips */}
          <div className="quick-scenarios-strip">
            <span className="scenarios-label">Quick Scenarios:</span>
            <button
              type="button"
              className="scenario-chip"
              onClick={() => { setFuturePresent(0); setFutureAbsent(1); }}
            >
              Skip Next 1 Class
            </button>
            <button
              type="button"
              className="scenario-chip"
              onClick={() => { setFuturePresent(0); setFutureAbsent(3); }}
            >
              Bunk 3 Classes
            </button>
            <button
              type="button"
              className="scenario-chip"
              onClick={() => { setFuturePresent(5); setFutureAbsent(0); }}
            >
              Attend Next 5 Straight
            </button>
            <button
              type="button"
              className="scenario-chip"
              onClick={() => { setFuturePresent(10); setFutureAbsent(2); }}
            >
              Attend 10, Skip 2
            </button>
          </div>

          {/* Clear Mathematical Conclusion Verdict */}
          <div className={`simulation-verdict-box ${simulation.isEligible ? 'verdict-safe' : 'verdict-danger'}`}>
            <div className="verdict-icon">
              {simulation.isEligible ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="verdict-content">
              <h4 className="verdict-heading">
                {simulation.isEligible ? 'Safe Scenario' : 'Debarment Warning'}
              </h4>
              <p className="verdict-text">
                {simulation.projectedHeld === 0 ? (
                  'No classes in simulation.'
                ) : simulation.isEligible ? (
                  `Under this simulation, your attendance will stand at ${simulation.formattedPercentage}, comfortably remaining above your ${threshold}% target.`
                ) : (
                  `Warning: Under this simulation, your attendance will drop to ${simulation.formattedPercentage}, falling below your required ${threshold}% threshold!`
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close Planner
          </button>
        </div>
      </div>
    </div>
  );
}
