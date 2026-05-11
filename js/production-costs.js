// ===== PRODUCTION COSTS MODULE =====
// Manajemen cost produksi per batch kandang (Staff/Owner/Manager only)

const ProductionCosts = {

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async getAll(kandangId = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      let q = client
        .from('production_costs')
        .select('*, kandang:kandangs(id, name)')
        .order('periode_mulai', { ascending: false });
      if (kandangId) q = q.eq('kandang_id', kandangId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[ProductionCosts] getAll error:', e.message);
      return [];
    }
  },

  async getById(id) {
    const client = AUTH.getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('production_costs')
        .select('*, kandang:kandangs(id, name)')
        .eq('id', id).single();
      if (error) throw error;
      return data;
    } catch (e) {
      return null;
    }
  },

  async create(data) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('cost.create')) return { success: false, error: 'Tidak punya izin' };
    try {
      const { data: row, error } = await client
        .from('production_costs')
        .insert([{ ...data, input_by: AUTH.userId }])
        .select().single();
      if (error) throw error;
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async update(id, updates) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('cost.edit')) return { success: false, error: 'Tidak punya izin edit cost' };
    try {
      const { data, error } = await client
        .from('production_costs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async delete(id) {
    const client = AUTH.getSupabase();
    if (!client) return { success: false, error: 'Supabase tidak tersedia' };
    if (!AUTH.can('cost.delete')) return { success: false, error: 'Tidak punya izin hapus cost' };
    try {
      const { error } = await client.from('production_costs').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async finalize(id) {
    if (!AUTH.can('cost.finalize')) return { success: false, error: 'Tidak punya izin finalisasi' };
    return this.update(id, { is_final: true });
  },

  // ── Auto-calculate dari deliveries ────────────────────────────────────────
  async calculateFromDeliveries(kandangId, startDate, endDate) {
    const client = AUTH.getSupabase();
    if (!client) return {};
    try {
      const { data, error } = await client.rpc('calculate_cost_from_deliveries', {
        p_kandang_id: kandangId,
        p_start_date: startDate,
        p_end_date:   endDate
      });
      if (error) throw error;
      // Convert array ke object: { pakan: 1500000, obat: 200000, ... }
      const result = {};
      (data || []).forEach(row => { result[row.delivery_type] = row.total_cost; });
      return result;
    } catch (e) {
      console.error('[ProductionCosts] calculateFromDeliveries error:', e.message);
      return {};
    }
  },

  // ── Profit/Loss summary ───────────────────────────────────────────────────
  async getProfitLoss(kandangId = null) {
    const client = AUTH.getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client.rpc('get_profit_loss_summary', {
        p_kandang_id: kandangId
      });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[ProductionCosts] getProfitLoss error:', e.message);
      return [];
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  formatCurrency(amount) {
    if (!amount && amount !== 0) return 'Rp 0';
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  },

  formatCurrencyShort(amount) {
    if (!amount) return 'Rp 0';
    const n = Number(amount);
    if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'M';
    if (n >= 1_000_000)     return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
    if (n >= 1_000)         return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
    return 'Rp ' + n;
  },

  profitColor(profit) {
    if (profit > 0)  return '#10B981';
    if (profit < 0)  return '#EF4444';
    return '#6B7280';
  },

  profitIcon(profit) {
    if (profit > 0)  return 'trending_up';
    if (profit < 0)  return 'trending_down';
    return 'trending_flat';
  },

  // Komponen cost untuk form & display
  COST_COMPONENTS: [
    { key: 'cost_pakan',         label: 'Pakan',         icon: 'grain',          color: '#F59E0B' },
    { key: 'cost_obat',          label: 'Obat',          icon: 'medication',     color: '#EF4444' },
    { key: 'cost_vitamin',       label: 'Vitamin',       icon: 'nutrition',      color: '#10B981' },
    { key: 'cost_vaksin',        label: 'Vaksin',        icon: 'vaccines',       color: '#8B5CF6' },
    { key: 'cost_supplies',      label: 'Supplies',      icon: 'inventory_2',    color: '#3B82F6' },
    { key: 'cost_doc',           label: 'DOC (Bibit)',   icon: 'egg_alt',        color: '#F97316' },
    { key: 'cost_listrik',       label: 'Listrik',       icon: 'bolt',           color: '#FBBF24' },
    { key: 'cost_gas',           label: 'Gas/BBM',       icon: 'local_gas_station', color: '#6B7280' },
    { key: 'cost_tenaga_kerja',  label: 'Tenaga Kerja',  icon: 'people',         color: '#06B6D4' },
    { key: 'cost_lainnya',       label: 'Lainnya',       icon: 'more_horiz',     color: '#9CA3AF' }
  ]
};
