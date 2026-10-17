/**
 * AttendWise Unified Data Repository
 * 
 * Routes queries to Supabase when authenticated, or to Demo Local Storage
 * when in demo mode or unauthenticated.
 */
import { getSupabaseClient } from './supabase.js';
import { demoStorage } from './storage.js';

export const repository = {
  // Check if we should use Supabase
  isCloudMode(user) {
    return Boolean(user && getSupabaseClient());
  },

  async getSemesters(user, allowDemoFallback = false) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      try {
        const { data, error } = await client
          .from('semesters')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch semesters notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('Failed to query semesters from Supabase:', err);
        return [];
      }
    }
    // Only return sample data if explicitly requested in Demo Preview mode
    if (allowDemoFallback) {
      return demoStorage.getSemesters();
    }
    return [];
  },

  async createSemester(name, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      // If this is the first semester, make it active
      const { count } = await client.from('semesters').select('*', { count: 'exact', head: true });
      const isActive = count === 0;

      const { data, error } = await client
        .from('semesters')
        .insert([{
          user_id: user.id,
          name: name.trim(),
          is_active: isActive,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.createSemester(name);
  },

  async updateSemester(id, updates, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();

      if (updates.is_active) {
        // Set all others to false first
        await client.from('semesters').update({ is_active: false }).eq('user_id', user.id);
      }

      const { data, error } = await client
        .from('semesters')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.updateSemester(id, updates);
  },

  async deleteSemester(id, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const { error } = await client.from('semesters').delete().eq('id', id);
      if (error) throw error;

      // If active semester was deleted, activate remaining
      const { data: remaining } = await client
        .from('semesters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await client.from('semesters').update({ is_active: true }).eq('id', remaining[0].id);
      }
      return;
    }
    return demoStorage.deleteSemester(id);
  },

  async getSubjects(semesterId, user, allowDemoFallback = false) {
    if (!semesterId) return [];
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      try {
        const { data, error } = await client
          .from('subjects')
          .select('*')
          .eq('semester_id', semesterId)
          .order('name', { ascending: true });

        if (error) {
          console.warn('Supabase fetch subjects notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('Failed to query subjects from Supabase:', err);
        return [];
      }
    }
    if (allowDemoFallback) {
      return demoStorage.getSubjects(semesterId);
    }
    return [];
  },

  async createSubject({ semester_id, name, code, required_percentage }, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('subjects')
        .insert([{
          user_id: user.id,
          semester_id,
          name: name.trim(),
          code: code ? code.trim().toUpperCase() : '',
          required_percentage: Number(required_percentage) || 75,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.createSubject({ semester_id, name, code, required_percentage });
  },

  async updateSubject(id, updates, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (cleanUpdates.name) cleanUpdates.name = cleanUpdates.name.trim();
      if (cleanUpdates.code !== undefined) cleanUpdates.code = cleanUpdates.code ? cleanUpdates.code.trim().toUpperCase() : '';
      if (cleanUpdates.required_percentage !== undefined) cleanUpdates.required_percentage = Number(cleanUpdates.required_percentage);

      const { data, error } = await client
        .from('subjects')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.updateSubject(id, updates);
  },

  async deleteSubject(id, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const { error } = await client.from('subjects').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return demoStorage.deleteSubject(id);
  },

  async getAttendanceRecords(semesterId, user, allowDemoFallback = false) {
    if (!semesterId) return [];
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      try {
        // Join or fetch records for subjects in this semester
        const { data: subjects, error: subError } = await client
          .from('subjects')
          .select('id')
          .eq('semester_id', semesterId);

        if (subError || !subjects || subjects.length === 0) return [];

        const subjectIds = subjects.map(s => s.id);
        if (subjectIds.length === 0) return [];

        const { data, error } = await client
          .from('attendance_records')
          .select('*')
          .in('subject_id', subjectIds)
          .order('class_date', { ascending: false });

        if (error) {
          console.warn('Supabase fetch attendance notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('Failed to query attendance from Supabase:', err);
        return [];
      }
    }
    if (allowDemoFallback) {
      return demoStorage.getAttendanceRecords(null, semesterId);
    }
    return [];
  },

  async logAttendance({ subject_id, class_date, status, notes }, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      // Upsert by subject_id & class_date
      const { data, error } = await client
        .from('attendance_records')
        .upsert([{
          user_id: user.id,
          subject_id,
          class_date,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'subject_id,class_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.logAttendance({ subject_id, class_date, status, notes });
  },

  async updateAttendanceRecord(id, updates, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('attendance_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return demoStorage.updateAttendanceRecord(id, updates);
  },

  async deleteAttendanceRecord(id, user) {
    if (this.isCloudMode(user)) {
      const client = getSupabaseClient();
      const { error } = await client.from('attendance_records').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return demoStorage.deleteAttendanceRecord(id);
  },

  async batchLogAttendance(entries, user) {
    const results = [];
    for (const entry of entries) {
      const res = await this.logAttendance(entry, user);
      results.push(res);
    }
    return results;
  },
};
