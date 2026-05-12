// ===== PANEN.JS - Manajemen Panen Ayam =====

const Panen = {
  // ---- Get all panen records ----
  async getAll(filters = {}) {
    const sb = window._sbClient;
    if (!sb) return [];

    let query = sb
      .from('panen')
      .select(`
        *,
        kandang:kandangs(id, name, breed),
        penimbang:profiles!panen_penimbang_id_fkey(id, nama)
      `)
      .order('tanggal_panen', { ascending: false });

    // Filter by kandang
    if (filters.kandang_id) {
      query = query.eq('kandang_id', filters.kandang_id);
    }

    // Filter by date range
    if (filters.start_date) {
      query = query.gte('tanggal_panen', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('tanggal_panen', filters.end_date);
    }

    // Filter by status
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Panen] getAll error:', error);
      return [];
    }

    return data || [];
  },

  // ---- Get single panen by ID ----
  async getById(panenId) {
    const sb = window._sbClient;
    if (!sb) return null;

    const { data, error } = await sb
      .from('panen')
      .select(`
        *,
        kandang:kandangs(id, name, breed, qty),
        penimbang:profiles!panen_penimbang_id_fkey(id, nama),
        timbang_rows:panen_timbang(*)
      `)
      .eq('id', panenId)
      .single();

    if (error) {
      console.error('[Panen] getById error:', error);
      return null;
    }

    return data;
  },

  // ---- Create new panen ----
  async create(panenData) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { data, error } = await sb
      .from('panen')
      .insert({
        kandang_id: panenData.kandang_id,
        tanggal_panen: panenData.tanggal_panen,
        umur_hari: panenData.umur_hari,
        penimbang_id: panenData.penimbang_id || AUTH.userId,
        status: 'draft',
        created_by: AUTH.userId
      })
      .select()
      .single();

    if (error) {
      console.error('[Panen] create error:', error);
      return { error: error.message };
    }

    return { data };
  },

  // ---- Update panen ----
  async update(panenId, updates) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { data, error } = await sb
      .from('panen')
      .update(updates)
      .eq('id', panenId)
      .select()
      .single();

    if (error) {
      console.error('[Panen] update error:', error);
      return { error: error.message };
    }

    return { data };
  },

  // ---- Complete panen (finalize) ----
  async complete(panenId, summary) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { data, error } = await sb
      .from('panen')
      .update({
        status: 'completed',
        total_ekor: summary.total_ekor,
        total_berat: summary.total_berat,
        berat_rata_rata: summary.berat_rata_rata,
        berat_min: summary.berat_min,
        berat_max: summary.berat_max,
        completed_at: new Date().toISOString()
      })
      .eq('id', panenId)
      .select()
      .single();

    if (error) {
      console.error('[Panen] complete error:', error);
      return { error: error.message };
    }

    return { data };
  },

  // ---- Delete panen ----
  async delete(panenId) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { error } = await sb
      .from('panen')
      .delete()
      .eq('id', panenId);

    if (error) {
      console.error('[Panen] delete error:', error);
      return { error: error.message };
    }

    return { success: true };
  },

  // ---- Add timbang row ----
  async addTimbang(panenId, timbangData) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { data, error } = await sb
      .from('panen_timbang')
      .insert({
        panen_id: panenId,
        berat: timbangData.berat,
        jumlah_ekor: timbangData.jumlah_ekor || 1,
        catatan: timbangData.catatan || null
      })
      .select()
      .single();

    if (error) {
      console.error('[Panen] addTimbang error:', error);
      return { error: error.message };
    }

    return { data };
  },

  // ---- Update timbang row ----
  async updateTimbang(timbangId, updates) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { data, error } = await sb
      .from('panen_timbang')
      .update(updates)
      .eq('id', timbangId)
      .select()
      .single();

    if (error) {
      console.error('[Panen] updateTimbang error:', error);
      return { error: error.message };
    }

    return { data };
  },

  // ---- Delete timbang row ----
  async deleteTimbang(timbangId) {
    const sb = window._sbClient;
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { error } = await sb
      .from('panen_timbang')
      .delete()
      .eq('id', timbangId);

    if (error) {
      console.error('[Panen] deleteTimbang error:', error);
      return { error: error.message };
    }

    return { success: true };
  },

  // ---- Get timbang rows for panen ----
  async getTimbangRows(panenId) {
    const sb = window._sbClient;
    if (!sb) return [];

    const { data, error } = await sb
      .from('panen_timbang')
      .select('*')
      .eq('panen_id', panenId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Panen] getTimbangRows error:', error);
      return [];
    }

    return data || [];
  },

  // ---- Calculate summary from timbang rows ----
  calculateSummary(timbangRows) {
    if (!timbangRows || timbangRows.length === 0) {
      return {
        total_ekor: 0,
        total_berat: 0,
        berat_rata_rata: 0,
        berat_min: 0,
        berat_max: 0
      };
    }

    const total_ekor = timbangRows.reduce((sum, row) => sum + (row.jumlah_ekor || 1), 0);
    const total_berat = timbangRows.reduce((sum, row) => sum + (row.berat * (row.jumlah_ekor || 1)), 0);
    const berat_rata_rata = total_ekor > 0 ? total_berat / total_ekor : 0;
    const berats = timbangRows.map(row => row.berat);
    const berat_min = Math.min(...berats);
    const berat_max = Math.max(...berats);

    return {
      total_ekor,
      total_berat: Math.round(total_berat * 100) / 100,
      berat_rata_rata: Math.round(berat_rata_rata * 100) / 100,
      berat_min,
      berat_max
    };
  },

  // ---- Format status ----
  formatStatus(status) {
    const labels = {
      draft: 'Draft',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return labels[status] || status;
  },

  // ---- Get status color ----
  getStatusColor(status) {
    const colors = {
      draft: '#F59E0B',
      completed: '#10B981',
      cancelled: '#EF4444'
    };
    return colors[status] || '#6B7280';
  },

  // ---- Format date ----
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  },

  // ---- Generate PDF report ----
  async generatePDF(panenId) {
    const panen = await this.getById(panenId);
    if (!panen) {
      return { error: 'Data panen tidak ditemukan' };
    }

    // TODO: Implement PDF generation using jsPDF or similar
    // For now, return data for manual PDF generation
    return { data: panen };
  }
};
