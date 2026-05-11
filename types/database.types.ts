export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      data_harian: {
        Row: {
          activities: Json | null
          berat_rata_rata: number | null
          blower_nyala: number | null
          catatan: string | null
          checklist: Json | null
          created_at: string | null
          culling: number | null
          feed_am: number | null
          feed_code: string | null
          feed_pm: number | null
          hari: number
          id: string
          input_oleh: string | null
          inverter_hz: number | null
          inverter_status: string | null
          is_complete: boolean | null
          kandang_id: string
          kondisi_umum: string | null
          listrik_status: string | null
          mati: number | null
          obat_nama: string | null
          obat_petugas: string | null
          obat_stock: number | null
          obat_tipe: string | null
          pakan_jadwal_ts: number | null
          pakan_masuk_bongkar: string | null
          pakan_masuk_jumlah: number | null
          pakan_masuk_kendaraan: string | null
          pakan_masuk_sopir: string | null
          pakan_selisih: number | null
          pakan_stock_sebelum: number | null
          pakan_stock_sesudah: number | null
          pakan_total: number | null
          panen_bakul: string | null
          panen_kendaraan: string | null
          panen_penimbang: string | null
          pengeluaran_keterangan: string | null
          penyebab_mati: string | null
          peralatan_keterangan: string | null
          sekam_datang: number | null
          sekam_pakai: number | null
          solar_datang: number | null
          solar_pakai: number | null
          suhu_pagi: number | null
          suhu_sore: number | null
          tanggal: string
          timbang_ekor: number | null
          timbang_keterangan: string | null
          timbang_petugas: string | null
          timbang_rows: Json | null
          timbang_total_berat: number | null
        }
        Insert: {
          activities?: Json | null
          berat_rata_rata?: number | null
          blower_nyala?: number | null
          catatan?: string | null
          checklist?: Json | null
          created_at?: string | null
          culling?: number | null
          feed_am?: number | null
          feed_code?: string | null
          feed_pm?: number | null
          hari: number
          id?: string
          input_oleh?: string | null
          inverter_hz?: number | null
          inverter_status?: string | null
          is_complete?: boolean | null
          kandang_id: string
          kondisi_umum?: string | null
          listrik_status?: string | null
          mati?: number | null
          obat_nama?: string | null
          obat_petugas?: string | null
          obat_stock?: number | null
          obat_tipe?: string | null
          pakan_jadwal_ts?: number | null
          pakan_masuk_bongkar?: string | null
          pakan_masuk_jumlah?: number | null
          pakan_masuk_kendaraan?: string | null
          pakan_masuk_sopir?: string | null
          pakan_selisih?: number | null
          pakan_stock_sebelum?: number | null
          pakan_stock_sesudah?: number | null
          pakan_total?: number | null
          panen_bakul?: string | null
          panen_kendaraan?: string | null
          panen_penimbang?: string | null
          pengeluaran_keterangan?: string | null
          penyebab_mati?: string | null
          peralatan_keterangan?: string | null
          sekam_datang?: number | null
          sekam_pakai?: number | null
          solar_datang?: number | null
          solar_pakai?: number | null
          suhu_pagi?: number | null
          suhu_sore?: number | null
          tanggal: string
          timbang_ekor?: number | null
          timbang_keterangan?: string | null
          timbang_petugas?: string | null
          timbang_rows?: Json | null
          timbang_total_berat?: number | null
        }
        Update: {
          activities?: Json | null
          berat_rata_rata?: number | null
          blower_nyala?: number | null
          catatan?: string | null
          checklist?: Json | null
          created_at?: string | null
          culling?: number | null
          feed_am?: number | null
          feed_code?: string | null
          feed_pm?: number | null
          hari?: number
          id?: string
          input_oleh?: string | null
          inverter_hz?: number | null
          inverter_status?: string | null
          is_complete?: boolean | null
          kandang_id?: string
          kondisi_umum?: string | null
          listrik_status?: string | null
          mati?: number | null
          obat_nama?: string | null
          obat_petugas?: string | null
          obat_stock?: number | null
          obat_tipe?: string | null
          pakan_jadwal_ts?: number | null
          pakan_masuk_bongkar?: string | null
          pakan_masuk_jumlah?: number | null
          pakan_masuk_kendaraan?: string | null
          pakan_masuk_sopir?: string | null
          pakan_selisih?: number | null
          pakan_stock_sebelum?: number | null
          pakan_stock_sesudah?: number | null
          pakan_total?: number | null
          panen_bakul?: string | null
          panen_kendaraan?: string | null
          panen_penimbang?: string | null
          pengeluaran_keterangan?: string | null
          penyebab_mati?: string | null
          peralatan_keterangan?: string | null
          sekam_datang?: number | null
          sekam_pakai?: number | null
          solar_datang?: number | null
          solar_pakai?: number | null
          suhu_pagi?: number | null
          suhu_sore?: number | null
          tanggal?: string
          timbang_ekor?: number | null
          timbang_keterangan?: string | null
          timbang_petugas?: string | null
          timbang_rows?: Json | null
          timbang_total_berat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_harian_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_targets: {
        Row: {
          breed: string
          created_at: string | null
          day_number: number
          feed_per_thousand: number
          id: string
        }
        Insert: {
          breed: string
          created_at?: string | null
          day_number: number
          feed_per_thousand: number
          id?: string
        }
        Update: {
          breed?: string
          created_at?: string | null
          day_number?: number
          feed_per_thousand?: number
          id?: string
        }
        Relationships: []
      }
      growth_targets: {
        Row: {
          breed: string
          created_at: string | null
          day_number: number
          id: string
          target_weight: number
        }
        Insert: {
          breed: string
          created_at?: string | null
          day_number: number
          id?: string
          target_weight: number
        }
        Update: {
          breed?: string
          created_at?: string | null
          day_number?: number
          id?: string
          target_weight?: number
        }
        Relationships: []
      }
      harga_referensi: {
        Row: {
          biaya_lainnya: number | null
          biaya_listrik: number | null
          biaya_obat_vaksin: number | null
          created_at: string | null
          harga_doc: number | null
          harga_jual: number | null
          harga_pakan: number | null
          hpp_doc: number | null
          id: string
          target_fcr: number | null
          upah_tenaga_kerja: number | null
        }
        Insert: {
          biaya_lainnya?: number | null
          biaya_listrik?: number | null
          biaya_obat_vaksin?: number | null
          created_at?: string | null
          harga_doc?: number | null
          harga_jual?: number | null
          harga_pakan?: number | null
          hpp_doc?: number | null
          id?: string
          target_fcr?: number | null
          upah_tenaga_kerja?: number | null
        }
        Update: {
          biaya_lainnya?: number | null
          biaya_listrik?: number | null
          biaya_obat_vaksin?: number | null
          created_at?: string | null
          harga_doc?: number | null
          harga_jual?: number | null
          harga_pakan?: number | null
          hpp_doc?: number | null
          id?: string
          target_fcr?: number | null
          upah_tenaga_kerja?: number | null
        }
        Relationships: []
      }
      kandangs: {
        Row: {
          breed: string | null
          created_at: string | null
          doc: number | null
          id: string
          kapasitas: number | null
          lat: number | null
          lng: number | null
          name: string
          officer: string | null
          peternak: string | null
          pj_user_id: string | null
          status: string | null
          tanggal_chick_in: string | null
          tanggal_target_panen: string | null
          ts_user_id: string | null
          usia: number | null
        }
        Insert: {
          breed?: string | null
          created_at?: string | null
          doc?: number | null
          id: string
          kapasitas?: number | null
          lat?: number | null
          lng?: number | null
          name: string
          officer?: string | null
          peternak?: string | null
          pj_user_id?: string | null
          status?: string | null
          tanggal_chick_in?: string | null
          tanggal_target_panen?: string | null
          ts_user_id?: string | null
          usia?: number | null
        }
        Update: {
          created_at?: string | null
          doc?: number | null
          id?: string
          kapasitas?: number | null
          lat?: number | null
          lng?: number | null
          name?: string
          officer?: string | null
          peternak?: string | null
          pj_user_id?: string | null
          status?: string | null
          ts_user_id?: string | null
          usia?: number | null
        }
        Relationships: []
      }
      keuangan_kandang: {
        Row: {
          biaya_air: number | null
          biaya_lainnya: number | null
          biaya_listrik: number | null
          biaya_obat: number | null
          biaya_sekam: number | null
          biaya_solar: number | null
          biaya_vaksin: number | null
          catatan: string | null
          created_at: string | null
          doc_ekor: number | null
          doc_harga: number | null
          doc_supplier: string | null
          hari_ke: number | null
          id: string
          input_oleh: string | null
          jual_harga: number | null
          jual_kg: number | null
          jual_pembeli: string | null
          jual_tanggal: string | null
          kandang_id: string
          laba_rugi: number | null
          lainnya_keterangan: string | null
          obat_keterangan: string | null
          pakan_harga: number | null
          pakan_jenis: string | null
          pakan_kg: number | null
          pakan_supplier: string | null
          pendapatan: number | null
          tanggal: string
          tk_jumlah: number | null
          tk_keterangan: string | null
          tk_upah: number | null
          total_biaya: number | null
        }
        Insert: {
          biaya_air?: number | null
          biaya_lainnya?: number | null
          biaya_listrik?: number | null
          biaya_obat?: number | null
          biaya_sekam?: number | null
          biaya_solar?: number | null
          biaya_vaksin?: number | null
          catatan?: string | null
          created_at?: string | null
          doc_ekor?: number | null
          doc_harga?: number | null
          doc_supplier?: string | null
          hari_ke?: number | null
          id?: string
          input_oleh?: string | null
          jual_harga?: number | null
          jual_kg?: number | null
          jual_pembeli?: string | null
          jual_tanggal?: string | null
          kandang_id: string
          laba_rugi?: number | null
          lainnya_keterangan?: string | null
          obat_keterangan?: string | null
          pakan_harga?: number | null
          pakan_jenis?: string | null
          pakan_kg?: number | null
          pakan_supplier?: string | null
          pendapatan?: number | null
          tanggal: string
          tk_jumlah?: number | null
          tk_keterangan?: string | null
          tk_upah?: number | null
          total_biaya?: number | null
        }
        Update: {
          biaya_air?: number | null
          biaya_lainnya?: number | null
          biaya_listrik?: number | null
          biaya_obat?: number | null
          biaya_sekam?: number | null
          biaya_solar?: number | null
          biaya_vaksin?: number | null
          catatan?: string | null
          created_at?: string | null
          doc_ekor?: number | null
          doc_harga?: number | null
          doc_supplier?: string | null
          hari_ke?: number | null
          id?: string
          input_oleh?: string | null
          jual_harga?: number | null
          jual_kg?: number | null
          jual_pembeli?: string | null
          jual_tanggal?: string | null
          kandang_id?: string
          laba_rugi?: number | null
          lainnya_keterangan?: string | null
          obat_keterangan?: string | null
          pakan_harga?: number | null
          pakan_jenis?: string | null
          pakan_kg?: number | null
          pakan_supplier?: string | null
          pendapatan?: number | null
          tanggal?: string
          tk_jumlah?: number | null
          tk_keterangan?: string | null
          tk_upah?: number | null
          total_biaya?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keuangan_kandang_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifikasi: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          kandang_id: string | null
          text: string
          time: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          kandang_id?: string | null
          text: string
          time?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          kandang_id?: string | null
          text?: string
          time?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifikasi_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifikasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      penyakit: {
        Row: {
          created_at: string | null
          diagnosa: string | null
          dosis: string | null
          durasi: string | null
          gejala: string | null
          id: string
          kandang_id: string
          obat: string | null
          tanggal: string
        }
        Insert: {
          created_at?: string | null
          diagnosa?: string | null
          dosis?: string | null
          durasi?: string | null
          gejala?: string | null
          id?: string
          kandang_id: string
          obat?: string | null
          tanggal: string
        }
        Update: {
          created_at?: string | null
          diagnosa?: string | null
          dosis?: string | null
          durasi?: string | null
          gejala?: string | null
          id?: string
          kandang_id?: string
          obat?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "penyakit_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          kandang_id: string | null
          nama: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          kandang_id?: string | null
          nama?: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kandang_id?: string | null
          nama?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_pakan: {
        Row: {
          id: string
          jumlah_kg: number | null
          kandang_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          jumlah_kg?: number | null
          kandang_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          jumlah_kg?: number | null
          kandang_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_pakan_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: true
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      target_periode: {
        Row: {
          created_at: string | null
          dosis_obat: string | null
          dosis_vitamin: string | null
          hari: number
          id: string
          kandang_id: string
          obat: string | null
          pakan_kg: number | null
          pakan_sak: number | null
          target_berat: number | null
          vaksin: string | null
          vaksin_dosis: string | null
          vaksin_metode: string | null
          vitamin: string | null
        }
        Insert: {
          created_at?: string | null
          dosis_obat?: string | null
          dosis_vitamin?: string | null
          hari: number
          id?: string
          kandang_id: string
          obat?: string | null
          pakan_kg?: number | null
          pakan_sak?: number | null
          target_berat?: number | null
          vaksin?: string | null
          vaksin_dosis?: string | null
          vaksin_metode?: string | null
          vitamin?: string | null
        }
        Update: {
          created_at?: string | null
          dosis_obat?: string | null
          dosis_vitamin?: string | null
          hari?: number
          id?: string
          kandang_id?: string
          obat?: string | null
          pakan_kg?: number | null
          pakan_sak?: number | null
          target_berat?: number | null
          vaksin?: string | null
          vaksin_dosis?: string | null
          vaksin_metode?: string | null
          vitamin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "target_periode_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          kandang_id: string | null
          nama: string
          password: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id: string
          kandang_id?: string | null
          nama: string
          password: string
          role: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kandang_id?: string | null
          nama?: string
          password?: string
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
      vaksinasi: {
        Row: {
          created_at: string | null
          hari_ke: number | null
          id: string
          kandang_id: string
          metode: string | null
          nama: string
          tanggal: string
        }
        Insert: {
          created_at?: string | null
          hari_ke?: number | null
          id?: string
          kandang_id: string
          metode?: string | null
          nama: string
          tanggal: string
        }
        Update: {
          created_at?: string | null
          hari_ke?: number | null
          id?: string
          kandang_id?: string
          metode?: string | null
          nama?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaksinasi_kandang_id_fkey"
            columns: ["kandang_id"]
            isOneToOne: false
            referencedRelation: "kandangs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
