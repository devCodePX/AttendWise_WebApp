import React from 'react';
import './StatusBadge.css';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

export default function StatusBadge({ statusCategory, size = 'medium' }) {
  let label = 'Safe';
  let icon = <CheckCircle2 size={size === 'small' ? 12 : 14} />;
  let className = 'status-badge-safe';

  switch (statusCategory) {
    case 'SHORTAGE':
      label = 'Attendance Shortage';
      icon = <AlertOctagon size={size === 'small' ? 12 : 14} />;
      className = 'status-badge-shortage';
      break;
    case 'CAUTION':
      label = 'Caution Buffer';
      icon = <AlertTriangle size={size === 'small' ? 12 : 14} />;
      className = 'status-badge-caution';
      break;
    case 'UNRECORDED':
      label = 'No Classes Held';
      icon = <HelpCircle size={size === 'small' ? 12 : 14} />;
      className = 'status-badge-unrecorded';
      break;
    case 'SAFE':
    default:
      label = 'On Track';
      icon = <CheckCircle2 size={size === 'small' ? 12 : 14} />;
      className = 'status-badge-safe';
      break;
  }

  return (
    <span className={`status-badge ${className} status-badge-${size}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
