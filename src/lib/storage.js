/**
 * AttendWise Demo Mode Storage Provider
 * 
 * Provides local storage persistence that mirrors the Supabase PostgreSQL
 * data schema and relationships, including UUIDs, timestamps, and cascade deletes.
 */

const STORAGE_KEY = 'attendwise_demo_data_v2';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'demo-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

function getFormattedDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Creates realistic initial sample data for a college student in Semester 6
 */
function createInitialDemoData() {
  const semesterId = generateId();
  const userId = 'demo-user-priyanshu';

  const semester = {
    id: semesterId,
    user_id: userId,
    name: 'Semester 6 — Computer Science',
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subject1 = {
    id: generateId(),
    user_id: userId,
    semester_id: semesterId,
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    required_percentage: 75,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subject2 = {
    id: generateId(),
    user_id: userId,
    semester_id: semesterId,
    name: 'Operating Systems',
    code: 'CS302',
    required_percentage: 75,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subject3 = {
    id: generateId(),
    user_id: userId,
    semester_id: semesterId,
    name: 'Database Management Systems',
    code: 'CS303',
    required_percentage: 75,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subject4 = {
    id: generateId(),
    user_id: userId,
    semester_id: semesterId,
    name: 'Computer Networks',
    code: 'CS304',
    required_percentage: 80,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subject5 = {
    id: generateId(),
    user_id: userId,
    semester_id: semesterId,
    name: 'Software Engineering',
    code: 'CS305',
    required_percentage: 75,
    created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subjects = [subject1, subject2, subject3, subject4, subject5];
  const attendance_records = [];

  // Helper to push records
  const addRecords = (subId, pattern) => {
    // pattern: array of { offset, status, notes }
    pattern.forEach(({ offset, status, notes }) => {
      attendance_records.push({
        id: generateId(),
        user_id: userId,
        subject_id: subId,
        class_date: getFormattedDate(offset),
        status,
        notes: notes || null,
        created_at: new Date(Date.now() - offset * 86400000).toISOString(),
        updated_at: new Date(Date.now() - offset * 86400000).toISOString(),
      });
    });
  };

  // Subject 1: DSA (30 Present, 5 Absent, 2 Cancelled) -> 30/35 = 85.7% (Safe)
  const dsaPattern = [];
  for (let i = 40; i >= 1; i--) {
    if (i === 15 || i === 28) {
      dsaPattern.push({ offset: i, status: 'CANCELLED', notes: 'Prof out of station for symposium' });
    } else if (i % 7 === 0) {
      dsaPattern.push({ offset: i, status: 'ABSENT', notes: 'Sick leave / fever' });
    } else {
      dsaPattern.push({ offset: i, status: 'PRESENT' });
    }
  }
  addRecords(subject1.id, dsaPattern);

  // Subject 2: OS (22 Present, 7 Absent, 1 Cancelled) -> 22/29 = 75.9% (Caution: within 5% above 75%)
  const osPattern = [];
  for (let i = 32; i >= 1; i--) {
    if (i === 12) {
      osPattern.push({ offset: i, status: 'CANCELLED', notes: 'Department lab maintenance' });
    } else if (i % 4 === 0) {
      osPattern.push({ offset: i, status: 'ABSENT', notes: 'Missed early 8 AM lecture' });
    } else {
      osPattern.push({ offset: i, status: 'PRESENT' });
    }
  }
  addRecords(subject2.id, osPattern);

  // Subject 3: DBMS (17 Present, 9 Absent, 2 Cancelled) -> 17/26 = 65.4% (Shortage! Needs recovery)
  const dbmsPattern = [];
  for (let i = 28; i >= 1; i--) {
    if (i === 8 || i === 22) {
      dbmsPattern.push({ offset: i, status: 'CANCELLED', notes: 'Holiday / Campus Sports Meet' });
    } else if (i % 3 === 0) {
      dbmsPattern.push({ offset: i, status: 'ABSENT', notes: 'Personal work / skipped' });
    } else {
      dbmsPattern.push({ offset: i, status: 'PRESENT' });
    }
  }
  addRecords(subject3.id, dbmsPattern);

  // Subject 4: Computer Networks (27 Present, 3 Absent, 2 Cancelled) -> 27/30 = 90% (Threshold 80%, Safe)
  const cnPattern = [];
  for (let i = 35; i >= 1; i--) {
    if (i === 18 || i === 31) {
      cnPattern.push({ offset: i, status: 'CANCELLED', notes: 'Power outage in networking lab' });
    } else if (i === 5 || i === 14 || i === 25) {
      cnPattern.push({ offset: i, status: 'ABSENT' });
    } else {
      cnPattern.push({ offset: i, status: 'PRESENT' });
    }
  }
  addRecords(subject4.id, cnPattern);

  // Subject 5: Software Engineering (6 Present, 1 Absent, 1 Cancelled) -> 6/7 = 85.7% (Safe)
  const sePattern = [
    { offset: 12, status: 'PRESENT' },
    { offset: 10, status: 'PRESENT' },
    { offset: 8, status: 'CANCELLED', notes: 'Industry guest lecture clash' },
    { offset: 6, status: 'PRESENT' },
    { offset: 4, status: 'ABSENT', notes: 'Overslept' },
    { offset: 3, status: 'PRESENT' },
    { offset: 2, status: 'PRESENT' },
    { offset: 1, status: 'PRESENT' },
  ];
  addRecords(subject5.id, sePattern);

  return {
    semesters: [semester],
    subjects,
    attendance_records,
  };
}

export const demoStorage = {
  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load demo data from localStorage, falling back to defaults', e);
    }
    const initial = createInitialDemoData();
    this.saveData(initial);
    return initial;
  },

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save demo data to localStorage', e);
    }
  },

  resetToDefaults() {
    const fresh = createInitialDemoData();
    this.saveData(fresh);
    return fresh;
  },

  // Semester Operations
  async getSemesters() {
    const data = this.loadData();
    return data.semesters.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async createSemester(name) {
    const data = this.loadData();
    const newSemester = {
      id: generateId(),
      user_id: 'demo-user',
      name: name.trim(),
      is_active: data.semesters.length === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.semesters.push(newSemester);
    this.saveData(data);
    return newSemester;
  },

  async updateSemester(id, updates) {
    const data = this.loadData();
    const idx = data.semesters.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Semester not found');
    
    // If setting active, deactivate others
    if (updates.is_active) {
      data.semesters.forEach(s => s.is_active = false);
    }

    data.semesters[idx] = {
      ...data.semesters[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveData(data);
    return data.semesters[idx];
  },

  async deleteSemester(id) {
    const data = this.loadData();
    // Cascade delete subjects and records
    const subjectIds = data.subjects.filter(s => s.semester_id === id).map(s => s.id);
    data.attendance_records = data.attendance_records.filter(r => !subjectIds.includes(r.subject_id));
    data.subjects = data.subjects.filter(s => s.semester_id !== id);
    data.semesters = data.semesters.filter(s => s.id !== id);
    
    // If deleted semester was active, activate the first remaining
    if (data.semesters.length > 0 && !data.semesters.some(s => s.is_active)) {
      data.semesters[0].is_active = true;
    }
    this.saveData(data);
  },

  // Subject Operations
  async getSubjects(semesterId) {
    const data = this.loadData();
    return data.subjects
      .filter(s => s.semester_id === semesterId)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async createSubject({ semester_id, name, code, required_percentage }) {
    const data = this.loadData();
    const newSubject = {
      id: generateId(),
      user_id: 'demo-user',
      semester_id,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : '',
      required_percentage: Number(required_percentage) || 75,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.subjects.push(newSubject);
    this.saveData(data);
    return newSubject;
  },

  async updateSubject(id, updates) {
    const data = this.loadData();
    const idx = data.subjects.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Subject not found');
    data.subjects[idx] = {
      ...data.subjects[idx],
      ...updates,
      name: updates.name ? updates.name.trim() : data.subjects[idx].name,
      code: updates.code !== undefined ? (updates.code ? updates.code.trim().toUpperCase() : '') : data.subjects[idx].code,
      required_percentage: updates.required_percentage !== undefined ? Number(updates.required_percentage) : data.subjects[idx].required_percentage,
      updated_at: new Date().toISOString(),
    };
    this.saveData(data);
    return data.subjects[idx];
  },

  async deleteSubject(id) {
    const data = this.loadData();
    // Cascade delete records
    data.attendance_records = data.attendance_records.filter(r => r.subject_id !== id);
    data.subjects = data.subjects.filter(s => s.id !== id);
    this.saveData(data);
  },

  // Attendance Record Operations
  async getAttendanceRecords(subjectId = null, semesterId = null) {
    const data = this.loadData();
    let records = data.attendance_records;

    if (subjectId) {
      records = records.filter(r => r.subject_id === subjectId);
    } else if (semesterId) {
      const subjectIds = data.subjects.filter(s => s.semester_id === semesterId).map(s => s.id);
      records = records.filter(r => subjectIds.includes(r.subject_id));
    }

    return records.sort((a, b) => new Date(b.class_date) - new Date(a.class_date));
  },

  async logAttendance({ subject_id, class_date, status, notes = null }) {
    const data = this.loadData();
    
    // Check for existing record on this date for this subject (upsert behavior)
    const existingIdx = data.attendance_records.findIndex(
      r => r.subject_id === subject_id && r.class_date === class_date
    );

    if (existingIdx !== -1) {
      // Update existing record
      data.attendance_records[existingIdx] = {
        ...data.attendance_records[existingIdx],
        status,
        notes: notes !== undefined ? notes : data.attendance_records[existingIdx].notes,
        updated_at: new Date().toISOString(),
      };
      this.saveData(data);
      return data.attendance_records[existingIdx];
    }

    const newRecord = {
      id: generateId(),
      user_id: 'demo-user',
      subject_id,
      class_date,
      status,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    data.attendance_records.push(newRecord);
    this.saveData(data);
    return newRecord;
  },

  async updateAttendanceRecord(id, updates) {
    const data = this.loadData();
    const idx = data.attendance_records.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Record not found');

    data.attendance_records[idx] = {
      ...data.attendance_records[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveData(data);
    return data.attendance_records[idx];
  },

  async deleteAttendanceRecord(id) {
    const data = this.loadData();
    data.attendance_records = data.attendance_records.filter(r => r.id !== id);
    this.saveData(data);
  },

  async batchLogAttendance(entries = []) {
    const results = [];
    for (const entry of entries) {
      const rec = await this.logAttendance(entry);
      results.push(rec);
    }
    return results;
  },
};
