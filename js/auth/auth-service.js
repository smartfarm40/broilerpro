// ===== AUTH SERVICE =====
// Menggunakan Supabase Auth — menggantikan implementasi localStorage

const AuthService = {

  // ---- Shortcut ke Supabase client ----
  _sb() { return AUTH.getSupabase(); },

  // ---- Register user baru ----
  async register({ email, password, nama, role, kandangId }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };

    // Validasi dasar
    if (!email || !password || !nama)
      return { error: 'Email, password, dan nama wajib diisi' };
    if (password.length < 8)
      return { error: 'Password minimal 8 karakter' };
    if (!email.includes('@'))
      return { error: 'Format email tidak valid' };

    // Daftar ke Supabase Auth
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama:       nama,
          role:       role || 'operator',
          kandang_id: kandangId || null
        }
      }
    });

    if (error) return { error: this._translateError(error.message) };

    // Trigger on_auth_user_created akan buat profil otomatis.
    // Tapi kita update manual untuk pastikan kandang_id tersimpan.
    if (data.user && kandangId) {
      await sb.from('profiles').upsert({
        id:         data.user.id,
        nama:       nama,
        role:       role || 'operator',
        kandang_id: kandangId
      });
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      needsEmailConfirm: !data.session  // true jika email confirmation aktif
    };
  },

  // ---- Login ----
  async login({ email, password }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };

    if (!email || !password)
      return { error: 'Email dan password wajib diisi' };

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: this._translateError(error.message) };

    // Muat profil
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (pErr || !profile) {
      // Profil belum ada — buat dari metadata
      const meta = data.user.user_metadata || {};
      const newProfile = {
        id:         data.user.id,
        nama:       meta.nama || data.user.email,
        role:       meta.role || 'operator',
        kandang_id: meta.kandang_id || null
      };
      await sb.from('profiles').upsert(newProfile);
      await AUTH.setSession(data.session, newProfile);
    } else {
      await AUTH.setSession(data.session, profile);
    }

    return { success: true, user: data.user, profile: AUTH._profile };
  },

  // ---- Logout ----
  async logout() {
    await AUTH.clearSession();
  },

  // ---- Ambil semua user (untuk manajemen tim — hanya owner) ----
  async getMembers() {
    const sb = this._sb();
    if (!sb) return [];
    if (!AUTH.can('member.view')) return [];

    const { data, error } = await sb
      .from('profiles')
      .select('id, nama, email, role, kandang_id, created_at, tenant_id')
      .eq('tenant_id', AUTH.tenantId)
      .order('created_at', { ascending: true });

    if (error) { console.warn('[AUTH] getMembers error:', error.message); return []; }
    return (data || []).map(p => ({
      user_id:   p.id,
      full_name: p.nama || '',
      email:     p.email || '',
      role:      p.role || 'viewer',
      kandang_id: p.kandang_id,
      created_at: p.created_at
    }));
  },

  // ---- Update role anggota ----
  async updateMemberRole({ userId, newRole }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };
    if (!AUTH.can('member.edit')) return { error: 'Tidak punya izin' };
    if (userId === AUTH.userId) return { error: 'Tidak bisa ubah role sendiri' };

    const { error } = await sb
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
  },

  // ---- Hapus anggota dari organisasi ----
  async removeMember({ userId }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };
    if (!AUTH.can('member.remove')) return { error: 'Tidak punya izin' };
    if (userId === AUTH.userId) return { error: 'Tidak bisa hapus diri sendiri' };

    // Hard delete - Hapus dari profiles
    // Foreign keys sudah di-set ON DELETE SET NULL, jadi aman
    const { error } = await sb
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
  },

  // ---- Undang anggota via Edge Function (service_role di server) ----
  async inviteMember({ email, role, kandangId }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };
    if (!AUTH.can('member.invite')) return { error: 'Tidak punya izin mengundang anggota' };

    // Ambil JWT caller untuk dikirim ke Edge Function
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { error: 'Sesi tidak valid, silakan login ulang' };

    try {
      const res = await fetch(
        'https://rsqbxzhrainejnbxnvfw.supabase.co/functions/v1/invite-member',
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify({
            email,
            role:       role || 'operator',
            kandang_id: kandangId || null
          })
        }
      );

      const data = await res.json();

      if (!res.ok) return { error: data.error || 'Gagal mengirim undangan' };

      return {
        success:  true,
        message:  data.message,
        type:     data.type,   // 'invite_sent' | 'role_updated'
        email,
        role
      };
    } catch (e) {
      return { error: 'Gagal terhubung ke server: ' + e.message };
    }
  },

  // ---- Ganti password ----
  async changePassword({ newPassword }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };
    if (newPassword.length < 8) return { error: 'Password baru minimal 8 karakter' };

    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) return { error: this._translateError(error.message) };
    return { success: true };
  },

  // ---- Reset password via email ----
  async resetPassword({ email }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/login.html`
    });
    if (error) return { error: this._translateError(error.message) };
    return { success: true };
  },

  // ---- Update profil ----
  async updateProfile({ nama, kandangId }) {
    const sb = this._sb();
    if (!sb) return { error: 'Supabase tidak tersedia' };

    const updates = {};
    if (nama !== undefined)      updates.nama       = nama;
    if (kandangId !== undefined)  updates.kandang_id = kandangId;

    const { error } = await sb
      .from('profiles')
      .update(updates)
      .eq('id', AUTH.userId);

    if (error) return { error: error.message };

    // Update local state
    if (AUTH._profile) Object.assign(AUTH._profile, updates);
    return { success: true };
  },

  // ---- Terjemahkan pesan error Supabase ke Bahasa Indonesia ----
  _translateError(msg) {
    if (!msg) return 'Terjadi kesalahan';
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
      return 'Email atau password salah';
    if (m.includes('email not confirmed'))
      return 'Email belum dikonfirmasi. Cek inbox Anda.';
    if (m.includes('user already registered') || m.includes('already been registered'))
      return 'Email sudah terdaftar';
    if (m.includes('password should be at least'))
      return 'Password minimal 8 karakter';
    if (m.includes('unable to validate email'))
      return 'Format email tidak valid';
    if (m.includes('email rate limit'))
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    if (m.includes('network') || m.includes('fetch'))
      return 'Gagal terhubung ke server. Periksa koneksi internet.';
    return msg;
  }
};
