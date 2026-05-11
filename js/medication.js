// ===== MEDICATION MODULE =====
// Mengelola program kesehatan: obat, vaksin, vitamin, suplemen

const Medication = {

  // ── Konstanta ──────────────────────────────────────────────────────────────
  TYPES: {
    obat:     { label: 'Obat',     icon: 'medication',    color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
    vaksin:   { label: 'Vaksin',   icon: 'vaccines',      color: '#8B5CF6', bg: 'rgba(139,92,246,.12)' },
    vitamin:  { label: 'Vitamin',  icon: 'nutrition',     color: '#10B981', bg: 'rgba(16,185,129,.12)' },
    suplemen: { label: 'Suplemen', icon: 'science',       color: '#F59E0B', bg: 'rgba(245,158,11,.12)' }
  },

  STATUS: {
    scheduled: { label: 'Terjadwal', color: '#3B82F6' },
    completed: { label: 'Selesai',   color: '#10B981' },
    skipped:   { label: 'Dilewati', color: '#EF4444' },
    partial:   { label: 'Sebagian', color: '#F59E0B' }
  },

  // ── Programs ───────────────────────────────────────────────────────────────
  async getAllPrograms(kandangId = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      let q = client
        .from('medication_programs')
        .select('*, items:medication_items(id, medication_type, nama_produk, hari_pemberian), kandang:kandangs(id, name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (kandangId) q = q.eq('kandang_id', kandangId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Medication] getAllPrograms error:', e.message);
      return [];
    }
  },

  async createProgram(data) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.create')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { data: row, error } = await client
        .from('medication_programs')
        .insert([{ kandang_id: data.kandang_id, created_by: AUTH.userId,
                   nama_program: data.nama_program, deskripsi: data.deskripsi || null }])
        .select().single();
      if (error) throw error;
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async updateProgram(id, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.edit')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { data, error } = await client
        .from('medication_programs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async deleteProgram(id) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.edit')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { error } = await client
        .from('medication_programs').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // ── Items ──────────────────────────────────────────────────────────────────
  async getItemsByProgram(programId) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('medication_items').select('*')
        .eq('program_id', programId).order('urutan');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Medication] getItemsByProgram error:', e.message);
      return [];
    }
  },

  async createItem(data) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.create')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { data: row, error } = await client
        .from('medication_items')
        .insert([{
          program_id:      data.program_id,
          kandang_id:      data.kandang_id,
          medication_type: data.medication_type,
          nama_produk:     data.nama_produk,
          dosis:           data.dosis || null,
          satuan:          data.satuan || null,
          hari_pemberian:  data.hari_pemberian || [],
          cara_pemberian:  data.cara_pemberian || null,
          catatan:         data.catatan || null,
          urutan:          data.urutan || 0
        }])
        .select().single();
      if (error) throw error;
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async updateItem(id, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.edit')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { data, error } = await client
        .from('medication_items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async deleteItem(id) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('health.edit')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { error } = await client.from('medication_items').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // ── Logs (realisasi pemberian) ─────────────────────────────────────────────
  async getTodaySchedule(kandangId, tanggal = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      const tgl = tanggal || new Date().toISOString().split('T')[0];
      const { data, error } = await client.rpc('get_medication_schedule_today', {
        p_kandang_id: kandangId, p_tanggal: tgl
      });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Medication] getTodaySchedule error:', e.message);
      return [];
    }
  },

  async markCompleted(itemId, kandangId, hariKe, jumlah = null, catatan = null) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await client
        .from('medication_logs')
        .upsert({
          item_id: itemId, kandang_id: kandangId,
          tanggal: today, hari_ke: hariKe,
          status: 'completed',
          jumlah_diberikan: jumlah,
          catatan_realisasi: catatan,
          input_by: AUTH.userId
        }, { onConflict: 'item_id,tanggal' })
        .select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async markSkipped(itemId, kandangId, hariKe, catatan = null) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await client
        .from('medication_logs')
        .upsert({
          item_id: itemId, kandang_id: kandangId,
          tanggal: today, hari_ke: hariKe,
          status: 'skipped',
          catatan_realisasi: catatan,
          input_by: AUTH.userId
        }, { onConflict: 'item_id,tanggal' })
        .select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async getComplianceStats(kandangId, programId = null) {
    const client = AUTH.getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await client.rpc('get_medication_compliance', {
        p_kandang_id: kandangId,
        p_program_id: programId
      });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.error('[Medication] getComplianceStats error:', e.message);
      return null;
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  getTypeInfo(type) {
    return this.TYPES[type] || { label: type, icon: 'medication', color: '#6B7280', bg: 'rgba(107,114,128,.12)' };
  },
  getStatusInfo(status) {
    return this.STATUS[status] || { label: status, color: '#6B7280' };
  },

  // Parse hari_pemberian JSONB ke array angka
  parseHariPemberian(jsonb) {
    if (!jsonb) return [];
    if (Array.isArray(jsonb)) return jsonb.map(Number).filter(n => !isNaN(n));
    try { return JSON.parse(jsonb).map(Number); } catch { return []; }
  },

  // Format hari pemberian untuk display: [1,7,14] → "H-1, H-7, H-14"
  formatHariPemberian(jsonb) {
    const hari = this.parseHariPemberian(jsonb);
    if (!hari.length) return '-';
    return hari.map(h => 'H-' + h).join(', ');
  }
};
