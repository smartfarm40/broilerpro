/**
 * Supabase Client Configuration
 *
 * Menyediakan satu shared Supabase client (window._sbClient / sb)
 * yang dipakai oleh auth-store.js, app.js, dan halaman lainnya.
 *
 * PENTING: Supabase SDK (window.supabase) harus dimuat via CDN sebelum file ini.
 */

const SUPABASE_URL     = 'https://rsqbxzhrainejnbxnvfw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcWJ4emhyYWluZWpuYnhudmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDY5MjAsImV4cCI6MjA5MzgyMjkyMH0.0o25fsGcqHjND5_m0r0WOUQsl4go-7LX4H3VCdsZ4bc';

// Buat satu shared client — cegah duplikasi instance
if (!window._sbClient) {
  window._sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession:      true,
      autoRefreshToken:    true,
      detectSessionInUrl:  true
    }
  });
}

// Alias global `sb` — dipakai di console dan halaman lain
const sb = window._sbClient;

// ─── Edge Functions Helper ────────────────────────────────────────────────────
const EdgeFunctions = {
  async calculateFCR(kandangId, tanggalMulai = null, tanggalAkhir = null) {
    const { data, error } = await sb.functions.invoke('calculate-fcr', {
      body: { kandang_id: kandangId, tanggal_mulai: tanggalMulai, tanggal_akhir: tanggalAkhir }
    });
    if (error) throw error;
    return data;
  },

  async getDailyReport(kandangId, tanggal) {
    const { data, error } = await sb.functions.invoke('daily-report', {
      body: { kandang_id: kandangId, tanggal }
    });
    if (error) throw error;
    return data;
  },

  async inviteMember(memberData) {
    const { data, error } = await sb.functions.invoke('invite-member', { body: memberData });
    if (error) throw error;
    return data;
  }
};

// ─── Database Queries Helper ──────────────────────────────────────────────────
const DBHelper = {
  async getActiveKandangs() {
    const { data, error } = await sb.from('kandangs').select('*').eq('status', 'aktif').order('name');
    if (error) throw error;
    return data;
  },

  async getDataHarian(kandangId, tanggal) {
    const { data, error } = await sb.from('data_harian').select('*')
      .eq('kandang_id', kandangId).eq('tanggal', tanggal).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertDataHarian(dataHarian) {
    const { data, error } = await sb.from('data_harian')
      .upsert(dataHarian, { onConflict: 'kandang_id,tanggal' }).select().single();
    if (error) throw error;
    return data;
  },

  async getPanenByKandang(kandangId) {
    const { data, error } = await sb.from('panen').select('*')
      .eq('kandang_id', kandangId).order('tanggal_panen', { ascending: false });
    if (error) throw error;
    return data;
  },

  async insertPanen(panenData) {
    const { data, error } = await sb.from('panen').insert(panenData).select().single();
    if (error) throw error;
    return data;
  },

  async getStockPakan(kandangId) {
    const { data, error } = await sb.from('stock_pakan').select('*').eq('kandang_id', kandangId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateStockPakan(kandangId, jumlahKg) {
    const { data, error } = await sb.from('stock_pakan')
      .upsert({ kandang_id: kandangId, jumlah_kg: jumlahKg, updated_at: new Date().toISOString() },
               { onConflict: 'kandang_id' }).select().single();
    if (error) throw error;
    return data;
  },

  async getHargaReferensi() {
    const { data, error } = await sb.from('harga_referensi').select('*').limit(1).single();
    if (error) throw error;
    return data;
  }
};

// ─── Realtime Subscriptions Helper ───────────────────────────────────────────
const Realtime = {
  subscribeDataHarian(kandangId, callback) {
    return sb.channel(`data_harian:${kandangId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_harian',
          filter: `kandang_id=eq.${kandangId}` }, callback)
      .subscribe();
  },

  subscribeStockPakan(kandangId, callback) {
    return sb.channel(`stock_pakan:${kandangId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_pakan',
          filter: `kandang_id=eq.${kandangId}` }, callback)
      .subscribe();
  },

  unsubscribe(subscription) {
    sb.removeChannel(subscription);
  }
};

// Export
window.SupabaseClient = { sb, EdgeFunctions, DBHelper, Realtime };

console.log('✅ Supabase Client initialized');
