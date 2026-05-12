// ===== AUTH STORE =====
// Mengelola session Supabase — menggantikan localStorage-based auth

const AUTH = {

  // ---- State ----
  _session:     null,   // Supabase session object
  _profile:     null,   // data dari tabel profiles
  _supabase:    null,   // Supabase client instance
  _permissions: null,   // cached permissions dari database

  // ---- Inisialisasi Supabase client ----
  _getClient() {
    if (this._supabase) return this._supabase;

    // Gunakan shared client dari supabase-client.js jika sudah ada
    if (window._sbClient) {
      this._supabase = window._sbClient;
      return this._supabase;
    }

    // Fallback: buat client baru
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('[AUTH] Supabase SDK belum dimuat');
      return null;
    }
    const url = 'https://rsqbxzhrainejnbxnvfw.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcWJ4emhyYWluZWpuYnhudmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDY5MjAsImV4cCI6MjA5MzgyMjkyMH0.0o25fsGcqHjND5_m0r0WOUQsl4go-7LX4H3VCdsZ4bc';

    if (!window._sbClient) {
      window._sbClient = supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    this._supabase = window._sbClient;
    return this._supabase;
  },

  // ---- Init: cek session aktif dari Supabase ----
  async init() {
    const client = this._getClient();
    if (!client) return false;

    try {
      // Cek cache session lokal dulu (lebih cepat)
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session) return false;

      this._session = session;

      // Load profile & permissions secara paralel
      await Promise.all([
        this._loadProfile(session.user.id),
        this._loadPermissions(session.user.id)
      ]);

      return true;
    } catch (e) {
      console.warn('[AUTH] init error:', e.message);
      return false;
    }
  },

  // ---- Muat profil dari tabel profiles ----
  async _loadProfile(userId) {
    const client = this._getClient();
    if (!client) return;
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        this._profile = data;
      } else {
        // Fallback: coba dari tabel users
        const { data: userData, error: userErr } = await client
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (!userErr && userData) {
          this._profile = {
            id:         userData.id,
            nama:       userData.nama,
            role:       userData.role,
            kandang_id: userData.kandang_id
          };
        }
      }
    } catch (e) {
      console.warn('[AUTH] loadProfile error:', e.message);
    }
  },

  // ---- Muat permissions dari database ----
  async _loadPermissions(userId) {
    const client = this._getClient();
    if (!client) return;
    
    // Coba dari cache localStorage dulu
    const cacheKey = 'bt_permissions_' + userId;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Cache valid 1 jam
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 3600000) && Array.isArray(parsed.permissions)) {
          // ⚠️ Harus convert ke Set — localStorage hanya bisa simpan array
          this._permissions = new Set(parsed.permissions);
          return;
        }
      } catch (e) {
        // Invalid cache, hapus dan lanjut query
        localStorage.removeItem(cacheKey);
      }
    }

    // Query dari database menggunakan function
    try {
      const { data, error } = await client.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (!error && data) {
        // Convert array of objects ke Set untuk O(1) lookup
        this._permissions = new Set(data.map(p => p.permission_code));
        
        // Simpan ke cache sebagai array (Set tidak bisa di-JSON.stringify)
        localStorage.setItem(cacheKey, JSON.stringify({
          permissions: Array.from(this._permissions),
          timestamp: Date.now()
        }));
      } else {
        console.warn('[AUTH] loadPermissions error:', error?.message);
        this._permissions = new Set();
      }
    } catch (e) {
      console.warn('[AUTH] loadPermissions exception:', e.message);
      this._permissions = new Set();
    }
  },

  // ---- Set session setelah login/register ----
  async setSession(session, profile) {
    this._session = session;
    this._profile = profile;
    if (session?.user?.id) {
      await this._loadPermissions(session.user.id);
    }
  },

  // ---- Logout ----
  async clearSession() {
    const client = this._getClient();
    if (client) await client.auth.signOut();
    
    // Clear cache
    if (this.userId) {
      localStorage.removeItem('bt_permissions_' + this.userId);
    }
    
    this._session = null;
    this._profile = null;
    this._permissions = null;
  },

  // ---- Getters ----
  get isLoggedIn()  { return this._session !== null; },
  get userId()      { return this._session?.user?.id; },
  get userEmail()   { return this._session?.user?.email; },
  get userName()    { return this._profile?.nama || this._session?.user?.email || ''; },
  get role()        { return this._profile?.role || 'kandang'; },
  get kandangId()   { return this._profile?.kandang_id || null; },

  // tenantId & tenantName: untuk kompatibilitas kode lama
  get tenantId()    { return this._session?.user?.id || null; },
  get tenantName()  { return this._profile?.nama || 'BroilerTrack'; },

  // ---- Permission check (NEW: menggunakan database permissions) ----
  can(permission) {
    // Jika permissions belum dimuat, return false
    if (!this._permissions) return false;

    // Handle jika _permissions adalah Array (dari cache lama) bukan Set
    if (Array.isArray(this._permissions)) {
      // Convert ke Set dan simpan
      this._permissions = new Set(this._permissions);
    }

    // Check dari Set (O(1) lookup)
    return this._permissions.has(permission);
  },

  // ---- Get all permissions ----
  getPermissions() {
    if (!this._permissions) return [];
    if (Array.isArray(this._permissions)) {
      this._permissions = new Set(this._permissions);
    }
    return Array.from(this._permissions);
  },

  // ---- Check multiple permissions (OR logic) ----
  canAny(...permissions) {
    if (!this._permissions) return false;
    if (Array.isArray(this._permissions)) this._permissions = new Set(this._permissions);
    return permissions.some(p => this._permissions.has(p));
  },

  // ---- Check multiple permissions (AND logic) ----
  canAll(...permissions) {
    if (!this._permissions) return false;
    if (Array.isArray(this._permissions)) this._permissions = new Set(this._permissions);
    return permissions.every(p => this._permissions.has(p));
  },

  // ---- Reload permissions (jika role berubah) ----
  async reloadPermissions() {
    if (this.userId) {
      // Clear cache
      localStorage.removeItem('bt_permissions_' + this.userId);
      await this._loadPermissions(this.userId);
    }
  },

  // ---- Quota check (kompatibilitas - deprecated, gunakan can() instead) ----
  canAddFlock()  { return this.can('kandang.create'); },
  canAddMember() { return this.can('member.invite'); },

  // ---- Ambil Supabase client (untuk dipakai AuthService & app) ----
  getSupabase() { return this._getClient(); }
};
