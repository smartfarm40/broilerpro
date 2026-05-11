// ===== DELIVERIES MODULE =====
// Manajemen pengiriman pakan/obat/vitamin ke kandang (Staff Kantor)

const Deliveries = {

  TYPES: {
    pakan:    { label: 'Pakan',    icon: 'grain',        color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
    obat:     { label: 'Obat',     icon: 'medication',   color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
    vitamin:  { label: 'Vitamin',  icon: 'nutrition',    color: '#10B981', bg: 'rgba(16,185,129,.12)' },
    vaksin:   { label: 'Vaksin',   icon: 'vaccines',     color: '#8B5CF6', bg: 'rgba(139,92,246,.12)' },
    supplies: { label: 'Supplies', icon: 'inventory_2',  color: '#3B82F6', bg: 'rgba(59,130,246,.12)' },
    lainnya:  { label: 'Lainnya',  icon: 'category',     color: '#6B7280', bg: 'rgba(107,114,128,.12)' }
  },

  STATUS: {
    pending:   { label: 'Menunggu',  color: '#F59E0B', icon: 'schedule' },
    delivered: { label: 'Dikirim',   color: '#3B82F6', icon: 'local_shipping' },
    received:  { label: 'Diterima',  color: '#10B981', icon: 'check_circle' },
    cancelled: { label: 'Dibatalkan',color: '#EF4444', icon: 'cancel' }
  },

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async getAll(filters = {}) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      let q = client
        .from('deliveries')
        .select('*, kandang:kandangs(id, name), inputter:profiles!deliveries_input_by_fkey(id, nama)')
        .order('tanggal_kirim', { ascending: false });

      if (filters.kandang_id)    q = q.eq('kandang_id', filters.kandang_id);
      if (filters.delivery_type) q = q.eq('delivery_type', filters.delivery_type);
      if (filters.status)        q = q.eq('status', filters.status);
      if (filters.start_date)    q = q.gte('tanggal_kirim', filters.start_date);
      if (filters.end_date)      q = q.lte('tanggal_kirim', filters.end_date);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Deliveries] getAll error:', e.message);
      return [];
    }
  },

  async create(data) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('delivery.create')) return { success: false, error: 'Tidak punya izin input pengiriman' };
    try {
      const payload = {
        kandang_id:    data.kandang_id,
        input_by:      AUTH.userId,
        delivery_type: data.delivery_type,
        item_name:     data.item_name,
        jumlah:        data.jumlah,
        satuan:        data.satuan,
        harga_satuan:  data.harga_satuan || 0,
        supplier:      data.supplier || null,
        no_invoice:    data.no_invoice || null,
        tanggal_kirim: data.tanggal_kirim,
        tanggal_terima: data.tanggal_terima || null,
        status:        data.status || 'pending',
        catatan:       data.catatan || null
      };
      const { data: row, error } = await client
        .from('deliveries').insert([payload]).select().single();
      if (error) throw error;
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async update(id, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('delivery.edit')) return { success: false, error: 'Tidak punya izin edit pengiriman' };
    try {
      const { data, error } = await client
        .from('deliveries').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async confirmReceived(id) {
    if (!AUTH.can('delivery.confirm')) return { success: false, error: 'Tidak punya izin konfirmasi' };
    return this.update(id, {
      status: 'received',
      tanggal_terima: new Date().toISOString().split('T')[0]
    });
  },

  async delete(id) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('delivery.delete')) return { success: false, error: 'Tidak punya izin hapus pengiriman' };
    try {
      const { error } = await client.from('deliveries').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async getSummary(kandangId, startDate = null, endDate = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client.rpc('get_delivery_summary', {
        p_kandang_id: kandangId,
        p_start_date: startDate,
        p_end_date:   endDate
      });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[Deliveries] getSummary error:', e.message);
      return [];
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  getTypeInfo(type)   { return this.TYPES[type]   || this.TYPES.lainnya; },
  getStatusInfo(status) { return this.STATUS[status] || { label: status, color: '#6B7280', icon: 'help' }; },

  formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};
