import React from 'react';
import { repository } from './lib/repository.js';
import { calculateOverallStats, calculateSubjectStats } from './lib/calculations.js';
import { getSupabaseClient, getCurrentUser, signOutUser } from './lib/supabase.js';
import { demoStorage } from './lib/storage.js';

import Navbar from './components/layout/Navbar.jsx';
import OverallStats from './components/dashboard/OverallStats.jsx';
import QuickBatchBar from './components/attendance/QuickBatchBar.jsx';
import SubjectGrid from './components/dashboard/SubjectGrid.jsx';

import MarkAttendanceModal from './components/attendance/MarkAttendanceModal.jsx';
import AttendanceHistoryModal from './components/attendance/AttendanceHistoryModal.jsx';
import BatchSelectModal from './components/attendance/BatchSelectModal.jsx';
import WhatIfSimulatorModal from './components/simulator/WhatIfSimulatorModal.jsx';
import SemesterManagerModal from './components/semester/SemesterManagerModal.jsx';
import SubjectFormModal from './components/semester/SubjectFormModal.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import AuthGate from './components/auth/AuthGate.jsx';
import SupabaseConfigModal from './components/auth/SupabaseConfigModal.jsx';
import ConfirmDialog from './components/common/ConfirmDialog.jsx';

import { Sparkles, Database, Info, Check } from 'lucide-react';
import './App.css';

export default function App() {
  const [loading, setLoading] = React.useState(true);
  const [authUser, setAuthUser] = React.useState(null);
  const [isDemoPreview, setIsDemoPreview] = React.useState(false);

  // Semesters & Subjects Data
  const [semesters, setSemesters] = React.useState([]);
  const [activeSemesterId, setActiveSemesterId] = React.useState(null);
  const [subjects, setSubjects] = React.useState([]);
  const [attendanceRecords, setAttendanceRecords] = React.useState([]);

  // UI state
  const [filterStatus, setFilterStatus] = React.useState('ALL');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [toastMessage, setToastMessage] = React.useState('');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = React.useState(false);
  const [isSemesterManagerOpen, setIsSemesterManagerOpen] = React.useState(false);
  const [subjectFormState, setSubjectFormState] = React.useState({ isOpen: false, subject: null });
  const [historySubject, setHistorySubject] = React.useState(null);
  const [markModalSubject, setMarkModalSubject] = React.useState(null);
  const [isWhatIfOpen, setIsWhatIfOpen] = React.useState(false);
  const [whatIfSubjectId, setWhatIfSubjectId] = React.useState(null);
  const [isBatchSelectOpen, setIsBatchSelectOpen] = React.useState(false);

  // Accessible confirmation dialog
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 1. Initial Load & Auth Setup
  React.useEffect(() => {
    let authListener = null;

    async function init() {
      const client = getSupabaseClient();
      if (client) {
        try {
          // If returning from OAuth in same tab, parse and apply tokens
          if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
            try {
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const access_token = hashParams.get('access_token');
              const refresh_token = hashParams.get('refresh_token');
              if (access_token && refresh_token) {
                await client.auth.setSession({ access_token, refresh_token });
              }
            } catch (e) {
              console.warn('Hash session parse warning:', e);
            }
            window.history.replaceState(null, '', window.location.pathname);
          }

          const user = await getCurrentUser();
          setAuthUser(user);
          if (user) {
            setIsDemoPreview(false);
          }

          const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
            const user = session ? session.user : null;
            setAuthUser(user);
            if (user) {
              setIsDemoPreview(false);
              await loadSemesters(user);
            }
          });
          authListener = subscription;
        } catch (e) {
          console.warn('Supabase auth initialization error', e);
        }
      }
      await loadSemesters();
      setLoading(false);
    }

    // Listen for popup auth completion and apply cross-frame session
    const handleAuthMessage = async (event) => {
      if (event.data?.type === 'ATTENDWISE_AUTH_SUCCESS') {
        const receivedSession = event.data.session;
        const client = getSupabaseClient();
        if (client && receivedSession?.access_token && receivedSession?.refresh_token) {
          try {
            await client.auth.setSession({
              access_token: receivedSession.access_token,
              refresh_token: receivedSession.refresh_token,
            });
          } catch (e) {
            console.warn('Set session from popup warning:', e);
          }
        }

        const user = receivedSession?.user || await getCurrentUser();
        if (user) {
          setAuthUser(user);
          setIsDemoPreview(false);
          await loadSemesters(user);
          showToast(`Welcome back, ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'}!`);
        }
      }
    };

    const handleStorageChange = async () => {
      const user = await getCurrentUser();
      if (user) {
        setAuthUser(user);
        setIsDemoPreview(false);
        await loadSemesters(user);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('storage', handleStorageChange);

    init();

    return () => {
      if (authListener) authListener.unsubscribe();
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Reload data when auth user changes
  React.useEffect(() => {
    if (!loading) {
      loadSemesters();
    }
  }, [authUser]);

  // Reload subjects & records when active semester changes
  React.useEffect(() => {
    if (activeSemesterId) {
      loadSemesterData(activeSemesterId);
    } else {
      setSubjects([]);
      setAttendanceRecords([]);
    }
  }, [activeSemesterId]);

  // Data Loading Helpers
  const loadSemesters = async (overrideUser = authUser) => {
    try {
      const sems = await repository.getSemesters(overrideUser);
      setSemesters(sems);
      if (sems.length > 0) {
        const active = sems.find(s => s.is_active) || sems[0];
        setActiveSemesterId(active.id);
        await loadSemesterData(active.id, overrideUser);
      } else {
        setActiveSemesterId(null);
        setSubjects([]);
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error('Failed to load semesters:', err);
    }
  };

  const loadSemesterData = async (semesterId, overrideUser = authUser) => {
    try {
      const [subs, records] = await Promise.all([
        repository.getSubjects(semesterId, overrideUser),
        repository.getAttendanceRecords(semesterId, overrideUser),
      ]);
      setSubjects(subs);
      setAttendanceRecords(records);
    } catch (err) {
      console.error('Failed to load semester details:', err);
    }
  };

  // Group records by subject for O(1) card lookups
  const recordsBySubject = React.useMemo(() => {
    const map = new Map();
    for (const sub of subjects) {
      map.set(sub.id, []);
    }
    for (const record of attendanceRecords) {
      if (map.has(record.subject_id)) {
        map.get(record.subject_id).push(record);
      }
    }
    return map;
  }, [subjects, attendanceRecords]);

  // Calculate Overall Weighted Stats
  const overallStats = React.useMemo(() => {
    return calculateOverallStats(subjects, attendanceRecords);
  }, [subjects, attendanceRecords]);

  // Quick Attendance Actions
  const handleQuickLog = async (subjectId, status) => {
    const subject = subjects.find(s => s.id === subjectId);
    try {
      const savedRecord = await repository.logAttendance({
        subject_id: subjectId,
        class_date: selectedDate,
        status,
        notes: null,
      }, authUser);

      // Optimistic state update
      setAttendanceRecords((prev) => {
        const existingIdx = prev.findIndex(r => r.subject_id === subjectId && r.class_date === selectedDate);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = savedRecord;
          return updated;
        }
        return [savedRecord, ...prev];
      });

      const label = status === 'PRESENT' ? 'Present' : status === 'ABSENT' ? 'Absent' : 'Cancelled';
      showToast(`${subject ? subject.name : 'Class'} marked as ${label} for ${selectedDate}`);
    } catch (err) {
      console.error('Failed to log attendance:', err);
      showToast('Error recording class. Please try again.');
    }
  };

  const handleOpenBatchSelect = () => {
    if (subjects.length === 0) {
      showToast('No subjects in this semester to mark.');
      return;
    }
    setIsBatchSelectOpen(true);
  };

  const handleBatchPresentAll = () => {
    handleOpenBatchSelect();
  };

  const handleConfirmBatchPresent = async (selectedSubjectIds) => {
    if (!selectedSubjectIds || selectedSubjectIds.length === 0) return;
    try {
      const entries = selectedSubjectIds.map(subId => ({
        subject_id: subId,
        class_date: selectedDate,
        status: 'PRESENT',
        notes: 'Batch recorded present',
      }));

      await repository.batchLogAttendance(entries, authUser);
      await loadSemesterData(activeSemesterId);
      showToast(`Attendance marked for ${selectedSubjectIds.length} subject${selectedSubjectIds.length > 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('Failed to batch log attendance:', err);
      showToast('Error recording batch attendance.');
    }
  };

  const handleUpdateRecordStatus = async (recordId, newStatus) => {
    try {
      const updated = await repository.updateAttendanceRecord(recordId, { status: newStatus }, authUser);
      setAttendanceRecords((prev) => prev.map(r => r.id === recordId ? updated : r));
      showToast(`Record updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update record:', err);
      showToast('Error updating record status.');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Attendance Record',
      message: 'Are you sure you want to delete this recorded class date? Calculations will update immediately.',
      onConfirm: async () => {
        try {
          await repository.deleteAttendanceRecord(recordId, authUser);
          setAttendanceRecords((prev) => prev.filter(r => r.id !== recordId));
          showToast('Attendance record deleted.');
        } catch (err) {
          console.error('Failed to delete record:', err);
          showToast('Error deleting attendance record.');
        }
      },
    });
  };

  // Semester Operations
  const handleCreateSemester = async (name) => {
    try {
      const newSem = await repository.createSemester(name, authUser);
      setSemesters((prev) => [newSem, ...prev]);
      setActiveSemesterId(newSem.id);
      showToast(`Semester "${newSem.name}" created!`);
    } catch (err) {
      console.error('Failed to create semester:', err);
      showToast('Error creating semester.');
    }
  };

  const handleUpdateSemester = async (id, updates) => {
    try {
      const updated = await repository.updateSemester(id, updates, authUser);
      setSemesters((prev) => prev.map(s => s.id === id ? updated : s));
      showToast('Semester updated.');
    } catch (err) {
      console.error('Failed to update semester:', err);
    }
  };

  const handleDeleteSemester = (semester) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${semester.name}`,
      message: `Are you sure you want to delete "${semester.name}"? All courses and attendance logs inside this semester will be permanently removed.`,
      onConfirm: async () => {
        try {
          await repository.deleteSemester(semester.id, authUser);
          const remaining = semesters.filter(s => s.id !== semester.id);
          setSemesters(remaining);
          if (activeSemesterId === semester.id) {
            setActiveSemesterId(remaining.length > 0 ? remaining[0].id : null);
          }
          showToast(`Deleted semester "${semester.name}".`);
        } catch (err) {
          console.error('Failed to delete semester:', err);
          showToast('Error deleting semester.');
        }
      },
    });
  };

  const handleSetActiveSemester = async (id) => {
    try {
      await repository.updateSemester(id, { is_active: true }, authUser);
      setActiveSemesterId(id);
      setSemesters((prev) => prev.map(s => ({ ...s, is_active: s.id === id })));
    } catch (err) {
      console.error('Failed to switch semester:', err);
    }
  };

  // Subject Operations
  const handleSaveSubject = async (subjectData) => {
    try {
      if (subjectFormState.subject) {
        // Edit
        const updated = await repository.updateSubject(subjectFormState.subject.id, subjectData, authUser);
        setSubjects((prev) => prev.map(s => s.id === updated.id ? updated : s));
        showToast(`Subject "${updated.name}" updated!`);
      } else {
        // Create
        const created = await repository.createSubject(subjectData, authUser);
        setSubjects((prev) => [...prev, created]);
        showToast(`Subject "${created.name}" added to semester!`);
      }
    } catch (err) {
      console.error('Failed to save subject:', err);
      showToast('Error saving subject.');
    }
  };

  const handleDeleteSubject = (subject) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${subject.name}`,
      message: `Are you sure you want to delete "${subject.name}"? All associated class attendance history will be deleted.`,
      onConfirm: async () => {
        try {
          await repository.deleteSubject(subject.id, authUser);
          setSubjects((prev) => prev.filter(s => s.id !== subject.id));
          setAttendanceRecords((prev) => prev.filter(r => r.subject_id !== subject.id));
          showToast(`Deleted "${subject.name}".`);
        } catch (err) {
          console.error('Failed to delete subject:', err);
          showToast('Error deleting subject.');
        }
      },
    });
  };

  const handleResetDemoData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Demo Data',
      message: 'Reset demo courses and attendance history back to initial sample state?',
      onConfirm: () => {
        demoStorage.resetToDefaults();
        loadSemesters();
        showToast('Demo data reset to defaults.');
      },
    });
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setAuthUser(null);
    setIsDemoPreview(false);
    showToast('Signed out successfully.');
  };

  const handleOpenAddSubject = () => {
    if (semesters.length === 0) {
      setIsSemesterManagerOpen(true);
      showToast('Please create a semester first (e.g. Semester 1).');
      return;
    }
    setSubjectFormState({ isOpen: true, subject: null });
  };

  const isOAuthPopup = typeof window !== 'undefined' && (
    window.name === 'AttendWiseGoogleOAuth' ||
    (Boolean(window.opener) && (window.location.hash.includes('access_token') || window.location.search.includes('code=')))
  );

  React.useEffect(() => {
    if (isOAuthPopup) {
      let hashSession = null;
      if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          if (access_token && refresh_token) {
            hashSession = { access_token, refresh_token };
          }
        } catch (e) {
          console.warn('Hash session extraction error:', e);
        }
      }

      const handlePopupDone = (sessionToSend) => {
        const finalSession = sessionToSend || hashSession;
        try {
          if (window.opener) {
            window.opener.postMessage({
              type: 'ATTENDWISE_AUTH_SUCCESS',
              session: finalSession,
            }, '*');
            try { window.opener.focus(); } catch (e) {}
          }
        } catch (e) {}
        setTimeout(() => {
          try { window.close(); } catch (e) {}
        }, 350);
      };

      const client = getSupabaseClient();
      if (client) {
        client.auth.getSession().then(({ data: { session } }) => {
          if (session) handlePopupDone(session);
        });
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
          if (session) handlePopupDone(session);
        });
        const safetyTimeout = setTimeout(() => handlePopupDone(null), 2500);
        return () => {
          subscription.unsubscribe();
          clearTimeout(safetyTimeout);
        };
      } else {
        handlePopupDone(null);
      }
    }
  }, [isOAuthPopup]);

  if (isOAuthPopup) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Google Login Completed!
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '300px', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
          Syncing your account and returning to your main AttendWise window...
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'ATTENDWISE_AUTH_SUCCESS' }, '*');
                window.opener.focus();
              }
            } catch (e) {}
            window.close();
          }}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Close Window
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-spinner" />
        <span className="loading-text">Loading AttendWise...</span>
      </div>
    );
  }

  // Authentication Gate: Only signed up / logged in users or users exploring demo
  if (!authUser && !isDemoPreview) {
    return (
      <>
        <AuthGate
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
          onExploreDemo={() => setIsDemoPreview(true)}
          onAuthSuccess={async (user) => {
            setAuthUser(user);
            setIsDemoPreview(false);
            await loadSemesters(user);
            showToast(`Welcome back, ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'}!`);
          }}
        />
        {isSupabaseConfigOpen && (
          <SupabaseConfigModal
            isOpen={isSupabaseConfigOpen}
            onClose={() => setIsSupabaseConfigOpen(false)}
            onConfigSaved={async () => {
              showToast('Supabase configuration saved.');
              const client = getSupabaseClient();
              if (client) {
                const user = await getCurrentUser();
                setAuthUser(user);
              }
            }}
          />
        )}
      </>
    );
  }

  const isDemo = !authUser;

  return (
    <div className="app-shell">
      {/* Navbar with 3-Zone Layout */}
      <Navbar
        semesters={semesters}
        activeSemesterId={activeSemesterId}
        onSelectSemester={setActiveSemesterId}
        onOpenSemesterManager={() => setIsSemesterManagerOpen(true)}
        onOpenWhatIf={() => {
          setWhatIfSubjectId(subjects.length > 0 ? subjects[0].id : null);
          setIsWhatIfOpen(true);
        }}
        onOpenAuth={() => {
          if (!authUser) {
            setIsDemoPreview(false);
          } else {
            setIsAuthOpen(true);
          }
        }}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        authUser={authUser}
        onSignOut={handleSignOut}
        isDemoMode={isDemo}
        onResetDemoData={handleResetDemoData}
      />

      {/* Demo Notice Bar if in Demo Mode */}
      {isDemo && (
        <div className="demo-mode-notice-bar">
          <div className="demo-notice-text">
            <Info size={14} />
            <span>
              <strong>Demo Mode Preview:</strong> You are browsing sample attendance records. Sign in with Google or create an account to activate personal cloud sync.
            </span>
          </div>
          <div className="demo-notice-actions">
            <button
              type="button"
              className="btn-link-notice"
              onClick={() => setIsDemoPreview(false)}
            >
              Sign In / Sign Up &rarr;
            </button>
            <button
              type="button"
              className="btn-reset-demo"
              onClick={handleResetDemoData}
              title="Reset sample courses and attendance"
            >
              Reset Demo
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main-content">
        {/* Overall Semester Metric Banner */}
        <OverallStats
          stats={overallStats}
          onAddSubject={handleOpenAddSubject}
          onOpenWhatIf={() => {
            setWhatIfSubjectId(subjects.length > 0 ? subjects[0].id : null);
            setIsWhatIfOpen(true);
          }}
        />

        {/* Date Selector & Quick Batch Daily Logging Strip */}
        <QuickBatchBar
          subjects={subjects}
          selectedDate={selectedDate}
          onChangeDate={setSelectedDate}
          onOpenBatchSelect={handleOpenBatchSelect}
          onBatchPresentAll={handleBatchPresentAll}
          filterStatus={filterStatus}
          onChangeFilter={setFilterStatus}
          atRiskCount={overallStats.shortageCount + overallStats.cautionCount}
          safeCount={overallStats.safeCount}
        />

        {/* Subjects Cards Grid */}
        <SubjectGrid
          subjects={subjects}
          recordsBySubject={recordsBySubject}
          filterStatus={filterStatus}
          semestersCount={semesters.length}
          onOpenSemesterManager={() => setIsSemesterManagerOpen(true)}
          onQuickLog={handleQuickLog}
          onOpenHistory={(subject) => setHistorySubject(subject)}
          onEditSubject={(subject) => setSubjectFormState({ isOpen: true, subject })}
          onDeleteSubject={handleDeleteSubject}
          onOpenMarkModal={(subject) => setMarkModalSubject(subject)}
          onAddSubject={handleOpenAddSubject}
          onResetFilter={() => setFilterStatus('ALL')}
        />
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <Check size={16} className="text-safe" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <span className="footer-brand">AttendWise — College Attendance Tracker</span>
          <span className="footer-tip">
            Tip: Cancelled classes do not lower your attendance percentage! Mark <strong>Cancelled</strong> when a lecture is officially not conducted.
          </span>
        </div>
      </footer>

      {/* Modals */}
      {isWhatIfOpen && (
        <WhatIfSimulatorModal
          isOpen={isWhatIfOpen}
          subjects={subjects}
          recordsBySubject={recordsBySubject}
          initialSubjectId={whatIfSubjectId}
          onClose={() => setIsWhatIfOpen(false)}
        />
      )}

      {historySubject && (
        <AttendanceHistoryModal
          isOpen={Boolean(historySubject)}
          subject={historySubject}
          records={recordsBySubject.get(historySubject.id) || []}
          stats={calculateSubjectStats(recordsBySubject.get(historySubject.id) || [], historySubject.required_percentage)}
          onClose={() => setHistorySubject(null)}
          onUpdateRecordStatus={handleUpdateRecordStatus}
          onDeleteRecord={handleDeleteRecord}
          onOpenMarkModal={(subject) => {
            setMarkModalSubject(subject);
          }}
        />
      )}

      {markModalSubject && (
        <MarkAttendanceModal
          isOpen={Boolean(markModalSubject)}
          subject={markModalSubject}
          subjects={subjects}
          onClose={() => setMarkModalSubject(null)}
          onSubmit={async ({ subject_id, class_date, status, notes }) => {
            const saved = await repository.logAttendance({ subject_id, class_date, status, notes }, authUser);
            setAttendanceRecords((prev) => {
              const existingIdx = prev.findIndex(r => r.subject_id === subject_id && r.class_date === class_date);
              if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = saved;
                return updated;
              }
              return [saved, ...prev];
            });
            showToast(`Recorded ${status} for ${class_date}!`);
          }}
        />
      )}

      {isSemesterManagerOpen && (
        <SemesterManagerModal
          isOpen={isSemesterManagerOpen}
          semesters={semesters}
          activeSemesterId={activeSemesterId}
          onClose={() => setIsSemesterManagerOpen(false)}
          onCreateSemester={handleCreateSemester}
          onUpdateSemester={handleUpdateSemester}
          onDeleteSemester={handleDeleteSemester}
          onSetActiveSemester={handleSetActiveSemester}
        />
      )}

      {subjectFormState.isOpen && (
        <SubjectFormModal
          isOpen={subjectFormState.isOpen}
          subject={subjectFormState.subject}
          activeSemesterId={activeSemesterId}
          onClose={() => setSubjectFormState({ isOpen: false, subject: null })}
          onSubmit={handleSaveSubject}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        />
      )}

      {isSupabaseConfigOpen && (
        <SupabaseConfigModal
          isOpen={isSupabaseConfigOpen}
          onClose={() => setIsSupabaseConfigOpen(false)}
          onConfigSaved={() => {
            loadSemesters();
            showToast('Supabase connection updated!');
          }}
        />
      )}

      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        />
      )}

      {isBatchSelectOpen && (
        <BatchSelectModal
          isOpen={isBatchSelectOpen}
          subjects={subjects}
          records={attendanceRecords}
          selectedDate={selectedDate}
          onClose={() => setIsBatchSelectOpen(false)}
          onConfirmBatch={handleConfirmBatchPresent}
        />
      )}
    </div>
  );
}
