/**
 * AttendWise Attendance Calculation Engine
 * 
 * Rules:
 * - PRESENT: Class held and attended. (Increments attended and total held)
 * - ABSENT: Class held and missed/bunked. (Increments total held only)
 * - CANCELLED: Class officially not held by college/faculty. (EXCLUDED from denominator T)
 */

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  CANCELLED: 'CANCELLED',
};

/**
 * Calculates attendance metrics for a single subject.
 * 
 * @param {Array<{ status: string }>} records List of attendance records for the subject
 * @param {number} requiredPercentage Target percentage threshold (e.g., 75)
 * @returns {Object} Comprehensive attendance statistics
 */
export function calculateSubjectStats(records = [], requiredPercentage = 75) {
  const threshold = Number(requiredPercentage) || 75;

  let presentCount = 0;
  let absentCount = 0;
  let cancelledCount = 0;

  for (const record of records) {
    if (record.status === ATTENDANCE_STATUS.PRESENT) {
      presentCount++;
    } else if (record.status === ATTENDANCE_STATUS.ABSENT) {
      absentCount++;
    } else if (record.status === ATTENDANCE_STATUS.CANCELLED) {
      cancelledCount++;
    }
  }

  const heldCount = presentCount + absentCount; // Total held classes (excluding CANCELLED)
  const totalLogged = records.length;

  if (heldCount === 0) {
    return {
      presentCount: 0,
      absentCount: 0,
      cancelledCount,
      heldCount: 0,
      totalLogged,
      percentage: null,
      formattedPercentage: '—',
      displayText: 'No classes held yet',
      statusCategory: 'UNRECORDED', // 'UNRECORDED' | 'SAFE' | 'CAUTION' | 'SHORTAGE'
      allowableAbsences: 0,
      recoveryNeeded: 0,
      isEligible: true,
      isImpossibleRecovery: false,
      threshold,
      recommendation: cancelledCount > 0 
        ? `${cancelledCount} class${cancelledCount > 1 ? 'es were' : ' was'} cancelled; no held classes recorded yet.`
        : 'Log your first class to see attendance recommendations.',
    };
  }

  // Raw floating-point percentage
  const rawPercentage = (presentCount / heldCount) * 100;
  // Round to 1 decimal place for clean display
  const roundedPercentage = Math.round(rawPercentage * 10) / 10;
  const isEligible = rawPercentage >= threshold;

  let allowableAbsences = 0;
  let recoveryNeeded = 0;
  let isImpossibleRecovery = false;

  if (isEligible) {
    // Student is at or above required threshold
    // floor((100 * A / R) - T)
    const maxAbsences = Math.floor((100 * presentCount / threshold) - heldCount);
    allowableAbsences = Math.max(0, maxAbsences);
    recoveryNeeded = 0;
  } else {
    // Student is below threshold
    allowableAbsences = 0;
    if (threshold >= 100) {
      isImpossibleRecovery = true;
      recoveryNeeded = Infinity;
    } else {
      // ceil((R * T - 100 * A) / (100 - R))
      const needed = Math.ceil((threshold * heldCount - 100 * presentCount) / (100 - threshold));
      recoveryNeeded = Math.max(0, needed);
    }
  }

  // Status classification with 5% caution buffer
  let statusCategory = 'SAFE';
  let recommendation = '';

  if (rawPercentage < threshold) {
    statusCategory = 'SHORTAGE';
    if (isImpossibleRecovery) {
      recommendation = `Attendance is ${roundedPercentage}%. With a 100% requirement, recovery is mathematically impossible once a class is missed.`;
    } else {
      recommendation = `Attendance is below ${threshold}%. Attend the next ${recoveryNeeded} consecutive class${recoveryNeeded > 1 ? 'es' : ''} to reach ${threshold}%.`;
    }
  } else if (rawPercentage < threshold + 5) {
    statusCategory = 'CAUTION';
    if (allowableAbsences === 0) {
      recommendation = `Attendance is ${roundedPercentage}%. You cannot miss any upcoming classes without falling below ${threshold}%.`;
    } else {
      recommendation = `Attendance is ${roundedPercentage}%. In caution zone: you can safely miss ${allowableAbsences} class${allowableAbsences > 1 ? 'es' : ''} max.`;
    }
  } else {
    statusCategory = 'SAFE';
    recommendation = allowableAbsences > 0
      ? `On track! You can safely miss up to ${allowableAbsences} class${allowableAbsences > 1 ? 'es' : ''} and remain at or above ${threshold}%.`
      : `On track! Maintain your current attendance to stay above ${threshold}%.`;
  }

  return {
    presentCount,
    absentCount,
    cancelledCount,
    heldCount,
    totalLogged,
    percentage: roundedPercentage,
    rawPercentage,
    formattedPercentage: `${roundedPercentage}%`,
    displayText: `${roundedPercentage}%`,
    statusCategory,
    allowableAbsences,
    recoveryNeeded,
    isEligible,
    isImpossibleRecovery,
    threshold,
    recommendation,
  };
}

/**
 * Calculates overall weighted attendance across all subjects in a semester.
 * Weighted by actual held classes (sum of present / sum of held).
 * 
 * @param {Array<Object>} subjects List of subjects
 * @param {Array<Object>} allRecords List of all attendance records for current semester
 * @returns {Object} Overall weighted statistics
 */
export function calculateOverallStats(subjects = [], allRecords = []) {
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalCancelled = 0;

  // Map records by subject
  const recordsBySubject = new Map();
  for (const subject of subjects) {
    recordsBySubject.set(subject.id, []);
  }

  for (const record of allRecords) {
    if (recordsBySubject.has(record.subject_id)) {
      recordsBySubject.get(record.subject_id).push(record);
    }
  }

  let shortageCount = 0;
  let cautionCount = 0;
  let safeCount = 0;
  let unrecordedCount = 0;

  for (const subject of subjects) {
    const subjectRecords = recordsBySubject.get(subject.id) || [];
    const stats = calculateSubjectStats(subjectRecords, subject.required_percentage || 75);

    totalPresent += stats.presentCount;
    totalAbsent += stats.absentCount;
    totalCancelled += stats.cancelledCount;

    if (stats.statusCategory === 'SHORTAGE') shortageCount++;
    else if (stats.statusCategory === 'CAUTION') cautionCount++;
    else if (stats.statusCategory === 'SAFE') safeCount++;
    else unrecordedCount++;
  }

  const totalHeld = totalPresent + totalAbsent;

  if (totalHeld === 0) {
    return {
      totalSubjects: subjects.length,
      totalPresent: 0,
      totalAbsent: 0,
      totalCancelled,
      totalHeld: 0,
      totalRecords: allRecords.length,
      overallPercentage: null,
      formattedPercentage: '—',
      displayText: 'No classes held yet',
      statusCategory: 'UNRECORDED',
      shortageCount: 0,
      cautionCount: 0,
      safeCount: 0,
      unrecordedCount: subjects.length,
    };
  }

  const rawOverall = (totalPresent / totalHeld) * 100;
  const roundedOverall = Math.round(rawOverall * 10) / 10;

  let statusCategory = 'SAFE';
  if (shortageCount > 0 || rawOverall < 75) {
    statusCategory = 'SHORTAGE';
  } else if (cautionCount > 0 || rawOverall < 80) {
    statusCategory = 'CAUTION';
  }

  return {
    totalSubjects: subjects.length,
    totalPresent,
    totalAbsent,
    totalCancelled,
    totalHeld,
    totalRecords: allRecords.length,
    overallPercentage: roundedOverall,
    rawOverall,
    formattedPercentage: `${roundedOverall}%`,
    displayText: `${roundedOverall}%`,
    statusCategory,
    shortageCount,
    cautionCount,
    safeCount,
    unrecordedCount,
  };
}

/**
 * Simulates future attendance scenarios (What-If Bunk Planner).
 * 
 * @param {number} currentPresent Current attended classes
 * @param {number} currentHeld Current held classes (present + absent)
 * @param {number} requiredPercentage Target threshold
 * @param {number} futurePresent Future classes student plans to attend
 * @param {number} futureAbsent Future classes student plans to miss (bunk)
 * @returns {Object} Simulated prospective metrics
 */
export function simulateWhatIf(currentPresent, currentHeld, requiredPercentage = 75, futurePresent = 0, futureAbsent = 0) {
  const p = Math.max(0, Number(currentPresent) || 0);
  const h = Math.max(0, Number(currentHeld) || 0);
  const threshold = Number(requiredPercentage) || 75;

  const fp = Math.max(0, Number(futurePresent) || 0);
  const fa = Math.max(0, Number(futureAbsent) || 0);

  const projectedPresent = p + fp;
  const projectedHeld = h + fp + fa;

  if (projectedHeld === 0) {
    return {
      projectedPercentage: null,
      formattedPercentage: '—',
      projectedPresent: 0,
      projectedHeld: 0,
      deltaPercentage: 0,
      isEligible: true,
      statusCategory: 'UNRECORDED',
      description: 'No held classes in projection.',
    };
  }

  const currentPercentage = h > 0 ? (p / h) * 100 : null;
  const projectedRaw = (projectedPresent / projectedHeld) * 100;
  const projectedRounded = Math.round(projectedRaw * 10) / 10;

  const deltaPercentage = currentPercentage !== null
    ? Math.round((projectedRaw - currentPercentage) * 10) / 10
    : 0;

  const isEligible = projectedRaw >= threshold;
  let statusCategory = 'SAFE';

  if (projectedRaw < threshold) {
    statusCategory = 'SHORTAGE';
  } else if (projectedRaw < threshold + 5) {
    statusCategory = 'CAUTION';
  }

  return {
    projectedPercentage: projectedRounded,
    rawPercentage: projectedRaw,
    formattedPercentage: `${projectedRounded}%`,
    projectedPresent,
    projectedHeld,
    deltaPercentage,
    isEligible,
    statusCategory,
    futurePresent: fp,
    futureAbsent: fa,
    threshold,
  };
}
