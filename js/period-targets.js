// ===== PERIOD TARGETS MODULE =====
// Mengelola target custom per periode yang dibuat oleh TS

const PeriodTargets = {

  // ── Template bawaan per breed ──────────────────────────────────────────────
  TEMPLATES: {
    'Cobb 500': {
      pakan: { 1:13,2:20,3:29,4:40,5:53,6:68,7:85,8:104,9:124,10:146,11:169,12:193,13:218,14:244,15:270,16:297,17:324,18:351,19:378,20:405,21:431,22:457,23:482,24:506,25:529,26:551,27:572,28:592,29:611,30:629,31:645,32:661,33:675,34:688,35:700 },
      berat: { 1:42,2:57,3:76,4:100,5:129,6:162,7:200,8:243,9:291,10:344,11:401,12:463,13:529,14:598,15:671,16:747,17:826,18:907,19:990,20:1075,21:1162,22:1250,23:1340,24:1431,25:1523,26:1616,27:1709,28:1803,29:1897,30:1991,31:2084,32:2177,33:2268,34:2358,35:2446 }
    },
    'Ross 308': {
      pakan: { 1:12,2:19,3:27,4:38,5:50,6:65,7:82,8:100,9:120,10:141,11:163,12:186,13:210,14:235,15:260,16:286,17:312,18:338,19:364,20:390,21:415,22:440,23:464,24:487,25:509,26:530,27:550,28:569,29:587,30:604,31:620,32:635,33:649,34:662,35:674 },
      berat: { 1:40,2:54,3:72,4:95,5:123,6:156,7:194,8:237,9:285,10:338,11:395,12:456,13:521,14:589,15:660,16:734,17:810,18:888,19:968,20:1050,21:1133,22:1218,23:1304,24:1391,25:1479,26:1568,27:1657,28:1747,29:1837,30:1927,31:2016,32:2105,33:2193,34:2280,35:2365 }
    }
  },

  // ── Get all targets untuk kandang tertentu ─────────────────────────────────
  async getByKandang(kandangId, targetType = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      let q = client
        .from('period_targets')
        .select('*')
        .eq('kandang_id', kandangId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (targetType) q = q.eq('target_type', targetType);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[PeriodTargets] getByKandang error:', e.message);
      return [];
    }
  },

  // ── Get semua targets (untuk TS melihat semua kandang) ─────────────────────
  async getAll() {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('period_targets')
        .select('*, kandang:kandangs(id, name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[PeriodTargets] getAll error:', e.message);
      return [];
    }
  },

  // ── Get target aktif untuk hari tertentu ──────────────────────────────────
  async getForDay(kandangId, targetType, tanggal = null) {
    const client = AUTH.getSupabase();
    if (!client) return null;
    try {
      const tgl = tanggal || new Date().toISOString().split('T')[0];
      const { data, error } = await client.rpc('get_target_for_day', {
        p_kandang_id:  kandangId,
        p_target_type: targetType,
        p_tanggal:     tgl
      });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.error('[PeriodTargets] getForDay error:', e.message);
      return null;
    }
  },

  // ── Create target baru ─────────────────────────────────────────────────────
  async create(targetData) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('target.create')) return { success: false, error: 'Tidak punya izin membuat target' };

    try {
      const payload = {
        kandang_id:     targetData.kandang_id,
        created_by:     AUTH.userId,
        periode_mulai:  targetData.periode_mulai,
        periode_selesai: targetData.periode_selesai,
        hari_mulai:     targetData.hari_mulai || 1,
        target_type:    targetData.target_type,
        breed:          targetData.breed || 'Cobb 500',
        target_values:  targetData.target_values || [],
        nama_target:    targetData.nama_target || null,
        catatan:        targetData.catatan || null,
        is_active:      true
      };
      const { data, error } = await client
        .from('period_targets').insert([payload]).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[PeriodTargets] create error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Update target ──────────────────────────────────────────────────────────
  async update(targetId, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('target.edit')) return { success: false, error: 'Tidak punya izin edit target' };
    try {
      const { data, error } = await client
        .from('period_targets').update(updates).eq('id', targetId).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[PeriodTargets] update error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Soft delete (set is_active = false) ───────────────────────────────────
  async delete(targetId) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('target.edit')) return { success: false, error: 'Tidak punya izin hapus target' };
    try {
      const { error } = await client
        .from('period_targets').update({ is_active: false }).eq('id', targetId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('[PeriodTargets] delete error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // ── Generate target values dari template breed ─────────────────────────────
  generateFromTemplate(breed, targetType, hariMulai, hariSelesai) {
    const tmpl = this.TEMPLATES[breed] || this.TEMPLATES['Cobb 500'];
    const src  = tmpl[targetType] || {};
    const values = [];
    for (let h = hariMulai; h <= hariSelesai; h++) {
      values.push({ hari: h, nilai: src[h] || 0 });
    }
    return values;
  },

  // ── Copy target dari periode sebelumnya ───────────────────────────────────
  async copyFromPrevious(kandangId, targetType) {
    const targets = await this.getByKandang(kandangId, targetType);
    if (!targets.length) return null;
    // Ambil yang terbaru
    return targets[0];
  },

  // ── Hitung nilai target untuk hari tertentu dari target_values JSONB ───────
  getValueForDay(targetValues, hari) {
    if (!Array.isArray(targetValues)) return null;
    const entry = targetValues.find(v => v.hari === hari);
    return entry ? entry.nilai : null;
  },

  // ── Format helpers ─────────────────────────────────────────────────────────
  formatType(type) {
    return { pakan: 'Target Pakan', berat: 'Target Berat', fcr: 'Target FCR' }[type] || type;
  },
  formatTypeUnit(type) {
    return { pakan: 'g/ekor/hari', berat: 'gram', fcr: 'rasio' }[type] || '';
  },
  getTypeIcon(type) {
    return { pakan: 'grain', berat: 'monitor_weight', fcr: 'analytics' }[type] || 'flag';
  },
  getTypeColor(type) {
    return { pakan: '#F59E0B', berat: '#10B981', fcr: '#3B82F6' }[type] || '#6B7280';
  }
};
