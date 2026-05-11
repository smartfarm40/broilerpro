// ===== TS VISITS MODULE =====
// Mengelola jadwal kunjungan Technical Service (TS) ke kandang

const TSVisits = {

  // ---- Get all visits ----
  async getAll(filters = {}) {
    const client = AUTH.getSupabase();
    if (!client) return [];

    try {
      let query = client
        .from('ts_visits')
        .select(`
          *,
          kandang:kandangs(id, nama, lokasi, populasi_awal, hari_ke),
          ts_user:users!ts_visits_ts_user_id_fkey(id, nama, email)
        `)
        .order('tanggal_kunjungan', { ascending: true });

      // Apply filters
      if (filters.kandang_id) {
        query = query.eq('kandang_id', filters.kandang_id);
      }
      if (filters.ts_user_id) {
        query = query.eq('ts_user_id', filters.ts_user_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.tujuan) {
        query = query.eq('tujuan', filters.tujuan);
      }
      if (filters.start_date) {
        query = query.gte('tanggal_kunjungan', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('tanggal_kunjungan', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[TSVisits] getAll error:', e.message);
      return [];
    }
  },

  // ---- Get visit by ID ----
  async getById(visitId) {
    const client = AUTH.getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('ts_visits')
        .select(`
          *,
          kandang:kandangs(id, nama, lokasi, populasi_awal, hari_ke, breed),
          ts_user:users!ts_visits_ts_user_id_fkey(id, nama, email)
        `)
        .eq('id', visitId)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('[TSVisits] getById error:', e.message);
      return null;
    }
  },

  // ---- Get upcoming visits for current TS ----
  async getUpcoming(daysAhead = 7) {
    const client = AUTH.getSupabase();
    if (!client || !AUTH.userId) return [];

    try {
      const { data, error } = await client.rpc('get_upcoming_visits_for_ts', {
        p_ts_user_id: AUTH.userId,
        p_days_ahead: daysAhead
      });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[TSVisits] getUpcoming error:', e.message);
      return [];
    }
  },

  // ---- Get visits for today ----
  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll({
      start_date: today,
      end_date: today,
      ts_user_id: AUTH.userId
    });
  },

  // ---- Check if TS has visit today ----
  async hasVisitToday() {
    const client = AUTH.getSupabase();
    if (!client || !AUTH.userId) return false;

    try {
      const { data, error } = await client.rpc('has_visit_today', {
        p_ts_user_id: AUTH.userId
      });

      if (error) throw error;
      return data || false;
    } catch (e) {
      console.error('[TSVisits] hasVisitToday error:', e.message);
      return false;
    }
  },

  // ---- Get visit statistics ----
  async getStatistics(startDate = null, endDate = null) {
    const client = AUTH.getSupabase();
    if (!client || !AUTH.tenantId) return null;

    try {
      const { data, error } = await client.rpc('get_visit_statistics', {
        p_tenant_id: AUTH.tenantId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.error('[TSVisits] getStatistics error:', e.message);
      return null;
    }
  },

  // ---- Create new visit ----
  async create(visitData) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    // Check permission
    if (!AUTH.can('visit.create')) {
      return { success: false, error: 'Anda tidak punya izin untuk membuat jadwal kunjungan' };
    }

    try {
      const newVisit = {
        kandang_id: visitData.kandang_id,
        ts_user_id: visitData.ts_user_id || AUTH.userId,
        tenant_id: AUTH.tenantId,
        tanggal_kunjungan: visitData.tanggal_kunjungan,
        waktu_mulai: visitData.waktu_mulai || null,
        waktu_selesai: visitData.waktu_selesai || null,
        tujuan: visitData.tujuan || 'rutin',
        status: 'scheduled',
        catatan_sebelum: visitData.catatan_sebelum || null,
        checklist_items: visitData.checklist_items || [],
        created_by: AUTH.userId
      };

      const { data, error } = await client
        .from('ts_visits')
        .insert([newVisit])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[TSVisits] create error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ---- Update visit ----
  async update(visitId, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    // Check permission
    if (!AUTH.can('visit.edit')) {
      return { success: false, error: 'Anda tidak punya izin untuk edit jadwal kunjungan' };
    }

    try {
      const { data, error } = await client
        .from('ts_visits')
        .update(updates)
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[TSVisits] update error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ---- Start visit (change status to in_progress) ----
  async startVisit(visitId) {
    return this.update(visitId, {
      status: 'in_progress',
      waktu_mulai: new Date().toTimeString().split(' ')[0]
    });
  },

  // ---- Complete visit ----
  async completeVisit(visitId, completionData) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    // Check permission
    if (!AUTH.can('visit.complete')) {
      return { success: false, error: 'Anda tidak punya izin untuk menyelesaikan kunjungan' };
    }

    try {
      const updates = {
        status: 'completed',
        waktu_selesai: new Date().toTimeString().split(' ')[0],
        completed_at: new Date().toISOString(),
        catatan_sesudah: completionData.catatan_sesudah || null,
        findings: completionData.findings || null,
        recommendations: completionData.recommendations || null,
        checklist_items: completionData.checklist_items || []
      };

      const { data, error } = await client
        .from('ts_visits')
        .update(updates)
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[TSVisits] completeVisit error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ---- Cancel visit ----
  async cancelVisit(visitId, reason) {
    return this.update(visitId, {
      status: 'cancelled',
      cancelled_reason: reason
    });
  },

  // ---- Reschedule visit ----
  async rescheduleVisit(visitId, newDate, newTime) {
    return this.update(visitId, {
      status: 'rescheduled',
      tanggal_kunjungan: newDate,
      waktu_mulai: newTime
    });
  },

  // ---- Delete visit ----
  async delete(visitId) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    // Check permission
    if (!AUTH.can('visit.delete')) {
      return { success: false, error: 'Anda tidak punya izin untuk hapus jadwal kunjungan' };
    }

    try {
      const { error } = await client
        .from('ts_visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('[TSVisits] delete error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ---- Update checklist item ----
  async updateChecklistItem(visitId, itemIndex, checked) {
    const visit = await this.getById(visitId);
    if (!visit) return { success: false, error: 'Visit not found' };

    const checklist = visit.checklist_items || [];
    if (itemIndex >= 0 && itemIndex < checklist.length) {
      checklist[itemIndex].checked = checked;
      return this.update(visitId, { checklist_items: checklist });
    }

    return { success: false, error: 'Invalid checklist item index' };
  },

  // ---- Format helpers ----
  formatTujuan(tujuan) {
    const labels = {
      'rutin': 'Rutin',
      'emergency': 'Emergency',
      'konsultasi': 'Konsultasi',
      'monitoring': 'Monitoring',
      'training': 'Training'
    };
    return labels[tujuan] || tujuan;
  },

  formatStatus(status) {
    const labels = {
      'scheduled': 'Terjadwal',
      'in_progress': 'Sedang Berlangsung',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan',
      'rescheduled': 'Dijadwal Ulang'
    };
    return labels[status] || status;
  },

  getStatusColor(status) {
    const colors = {
      'scheduled': '#3B82F6',    // blue
      'in_progress': '#F59E0B',  // orange
      'completed': '#10B981',    // green
      'cancelled': '#EF4444',    // red
      'rescheduled': '#8B5CF6'   // purple
    };
    return colors[status] || '#6B7280';
  },

  getTujuanIcon(tujuan) {
    const icons = {
      'rutin': '📅',
      'emergency': '🚨',
      'konsultasi': '💬',
      'monitoring': '📊',
      'training': '🎓'
    };
    return icons[tujuan] || '📋';
  }
};
