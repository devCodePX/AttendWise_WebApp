/**
 * Automated Test Runner for AttendWise Calculations
 */
import { calculateSubjectStats, ATTENDANCE_STATUS } from './calculations.js';

function createRecords(present, absent, cancelled) {
  const records = [];
  for (let i = 0; i < present; i++) records.push({ status: ATTENDANCE_STATUS.PRESENT });
  for (let i = 0; i < absent; i++) records.push({ status: ATTENDANCE_STATUS.ABSENT });
  for (let i = 0; i < cancelled; i++) records.push({ status: ATTENDANCE_STATUS.CANCELLED });
  return records;
}

let passed = 0;
let total = 0;

function assert(description, actual, expected) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
  }
}

console.log('--- Running AttendWise Calculations Unit Tests ---\n');

// Test 1: 30 present + 10 absent = 75% attendance; 0 allowable absences.
{
  const stats = calculateSubjectStats(createRecords(30, 10, 0), 75);
  assert('Test 1: Percentage is 75%', stats.percentage, 75);
  assert('Test 1: Allowable absences is 0', stats.allowableAbsences, 0);
  assert('Test 1: Recovery needed is 0', stats.recoveryNeeded, 0);
  assert('Test 1: Total held is 40', stats.heldCount, 40);
}

// Test 2: 30 present + 10 absent + 2 cancelled = still 75% attendance (cancelled excluded from denominator)
{
  const stats = calculateSubjectStats(createRecords(30, 10, 2), 75);
  assert('Test 2: Percentage is still 75% with 2 cancelled', stats.percentage, 75);
  assert('Test 2: Total held remains 40', stats.heldCount, 40);
  assert('Test 2: Cancelled count is 2', stats.cancelledCount, 2);
  assert('Test 2: Allowable absences is 0', stats.allowableAbsences, 0);
}

// Test 3: 27 present + 13 absent + 3 cancelled = 67.5% attendance; 12 consecutive present classes for recovery
{
  const stats = calculateSubjectStats(createRecords(27, 13, 3), 75);
  assert('Test 3: Percentage is 67.5%', stats.percentage, 67.5);
  assert('Test 3: Total held is 40', stats.heldCount, 40);
  assert('Test 3: 12 consecutive recovery classes needed', stats.recoveryNeeded, 12);
  assert('Test 3: Allowable absences is 0 when in shortage', stats.allowableAbsences, 0);
}

// Test 4: 36 present + 4 absent + 2 cancelled = 90% attendance; at 80% threshold, 5 additional absences allowed
{
  const stats = calculateSubjectStats(createRecords(36, 4, 2), 80);
  assert('Test 4: Percentage is 90%', stats.percentage, 90);
  assert('Test 4: Total held is 40', stats.heldCount, 40);
  assert('Test 4: 5 additional absences allowed at 80% threshold', stats.allowableAbsences, 5);
  assert('Test 4: Recovery needed is 0', stats.recoveryNeeded, 0);
}

// Test 5: Only cancelled classes (0 present, 0 absent, 4 cancelled) -> "No classes held yet"
{
  const stats = calculateSubjectStats(createRecords(0, 0, 4), 75);
  assert('Test 5: Percentage is null for 0 held classes', stats.percentage, null);
  assert('Test 5: Display text is "No classes held yet"', stats.displayText, 'No classes held yet');
  assert('Test 5: Total held is 0', stats.heldCount, 0);
  assert('Test 5: Cancelled count is 4', stats.cancelledCount, 4);
}

// Test 6: Toggle ABSENT -> CANCELLED updates immediately
{
  const records = createRecords(29, 11, 0);
  const before = calculateSubjectStats(records, 75);
  // Change 1 absent to cancelled
  records[29].status = ATTENDANCE_STATUS.CANCELLED;
  const after = calculateSubjectStats(records, 75);
  assert('Test 6: Before toggle percentage is 72.5%', before.percentage, 72.5);
  assert('Test 6: After toggle percentage is 74.4%', after.percentage, 74.4);
  assert('Test 6: Held count decreased from 40 to 39', after.heldCount, 39);
}

// Test 7: Toggle CANCELLED -> ABSENT updates immediately
{
  const records = createRecords(30, 10, 2);
  const before = calculateSubjectStats(records, 75);
  // Change 1 cancelled to absent
  records[40].status = ATTENDANCE_STATUS.ABSENT;
  const after = calculateSubjectStats(records, 75);
  assert('Test 7: Before toggle percentage is 75%', before.percentage, 75);
  assert('Test 7: After toggle percentage drops to 73.2%', after.percentage, 73.2);
  assert('Test 7: Held count increased from 40 to 41', after.heldCount, 41);
}

console.log(`\nResults: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 All AttendWise mathematical specifications verified successfully!');
} else {
  process.exit(1);
}
