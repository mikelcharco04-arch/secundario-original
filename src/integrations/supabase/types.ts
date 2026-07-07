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
      active_users: {
        Row: {
          blocked: boolean
          expires_at: string | null
          id: string
          key: string
          login_at: string
          name: string
          type: string
        }
        Insert: {
          blocked?: boolean
          expires_at?: string | null
          id?: string
          key: string
          login_at?: string
          name: string
          type: string
        }
        Update: {
          blocked?: boolean
          expires_at?: string | null
          id?: string
          key?: string
          login_at?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      banned_payments: {
        Row: {
          created_at: string
          payment_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          payment_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          payment_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_by: string | null
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          assigned_key: string | null
          binance_order_id: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          deeplink: string | null
          duration: string
          email: string | null
          id: string
          key_type: string
          merchant_trade_no: string
          paid_at: string | null
          plan_id: string
          plan_label: string
          prepay_id: string | null
          qr_url: string | null
          raw_webhook: Json | null
          status: string
        }
        Insert: {
          amount: number
          assigned_key?: string | null
          binance_order_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          deeplink?: string | null
          duration: string
          email?: string | null
          id?: string
          key_type: string
          merchant_trade_no: string
          paid_at?: string | null
          plan_id: string
          plan_label: string
          prepay_id?: string | null
          qr_url?: string | null
          raw_webhook?: Json | null
          status?: string
        }
        Update: {
          amount?: number
          assigned_key?: string | null
          binance_order_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          deeplink?: string | null
          duration?: string
          email?: string | null
          id?: string
          key_type?: string
          merchant_trade_no?: string
          paid_at?: string | null
          plan_id?: string
          plan_label?: string
          prepay_id?: string | null
          qr_url?: string | null
          raw_webhook?: Json | null
          status?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_notes: string | null
          ai_notes: string | null
          ai_verdict: string | null
          amount: number
          created_at: string
          currency: string
          delivered_key: string | null
          device_fingerprint: string | null
          duration: string
          duration_ms: number
          email: string | null
          id: string
          key_type: string
          payment_method: string
          plan_id: string
          plan_label: string
          proof_url: string | null
          receipt_type: string
          resolved_at: string | null
          status: string
          telegram_chat_id: string | null
          telegram_message_id: number | null
          updated_at: string
          user_name: string
        }
        Insert: {
          admin_notes?: string | null
          ai_notes?: string | null
          ai_verdict?: string | null
          amount: number
          created_at?: string
          currency?: string
          delivered_key?: string | null
          device_fingerprint?: string | null
          duration: string
          duration_ms: number
          email?: string | null
          id?: string
          key_type?: string
          payment_method?: string
          plan_id: string
          plan_label: string
          proof_url?: string | null
          receipt_type?: string
          resolved_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          updated_at?: string
          user_name: string
        }
        Update: {
          admin_notes?: string | null
          ai_notes?: string | null
          ai_verdict?: string | null
          amount?: number
          created_at?: string
          currency?: string
          delivered_key?: string | null
          device_fingerprint?: string | null
          duration?: string
          duration_ms?: number
          email?: string | null
          id?: string
          key_type?: string
          payment_method?: string
          plan_id?: string
          plan_label?: string
          proof_url?: string | null
          receipt_type?: string
          resolved_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      proxy_keys: {
        Row: {
          activated_at: string | null
          created_at: string
          device_fingerprint: string | null
          duration: string
          duration_ms: number
          email: string | null
          expires_at: string | null
          id: string
          key: string
          payment_request_id: string | null
          status: string
          type: string
          used_by: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          duration: string
          duration_ms?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          key: string
          payment_request_id?: string | null
          status?: string
          type: string
          used_by?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          duration?: string
          duration_ms?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          payment_request_id?: string | null
          status?: string
          type?: string
          used_by?: string | null
        }
        Relationships: []
      }
      referral_users: {
        Row: {
          blocked: boolean
          code: string
          created_at: string
          id: string
          key_expires_at: string | null
          key_generated: string | null
          last_activity_at: string | null
          link: string
          name: string
          owner_fingerprint: string
          owner_ip_hash: string | null
          rejected_count: number
          updated_at: string
          valid_count: number
        }
        Insert: {
          blocked?: boolean
          code: string
          created_at?: string
          id?: string
          key_expires_at?: string | null
          key_generated?: string | null
          last_activity_at?: string | null
          link: string
          name: string
          owner_fingerprint: string
          owner_ip_hash?: string | null
          rejected_count?: number
          updated_at?: string
          valid_count?: number
        }
        Update: {
          blocked?: boolean
          code?: string
          created_at?: string
          id?: string
          key_expires_at?: string | null
          key_generated?: string | null
          last_activity_at?: string | null
          link?: string
          name?: string
          owner_fingerprint?: string
          owner_ip_hash?: string | null
          rejected_count?: number
          updated_at?: string
          valid_count?: number
        }
        Relationships: []
      }
      referral_visits: {
        Row: {
          combined_hash: string
          created_at: string
          id: string
          referral_code: string
          rejection_reason: string | null
          user_agent_hash: string
          valid: boolean
          visitor_fingerprint: string
          visitor_ip_hash: string
        }
        Insert: {
          combined_hash: string
          created_at?: string
          id?: string
          referral_code: string
          rejection_reason?: string | null
          user_agent_hash: string
          valid: boolean
          visitor_fingerprint: string
          visitor_ip_hash: string
        }
        Update: {
          combined_hash?: string
          created_at?: string
          id?: string
          referral_code?: string
          rejection_reason?: string | null
          user_agent_hash?: string
          valid?: boolean
          visitor_fingerprint?: string
          visitor_ip_hash?: string
        }
        Relationships: []
      }
      telegram_admins: {
        Row: {
          added_by: string | null
          created_at: string
          telegram_id: number
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          telegram_id: number
        }
        Update: {
          added_by?: string | null
          created_at?: string
          telegram_id?: number
        }
        Relationships: []
      }
      telegram_bot_sessions: {
        Row: {
          authed: boolean
          chat_id: number
          duration: string | null
          key_type: string | null
          step: string | null
          updated_at: string
        }
        Insert: {
          authed?: boolean
          chat_id: number
          duration?: string | null
          key_type?: string | null
          step?: string | null
          updated_at?: string
        }
        Update: {
          authed?: boolean
          chat_id?: number
          duration?: string | null
          key_type?: string | null
          step?: string | null
          updated_at?: string
        }
        Relationships: []
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
