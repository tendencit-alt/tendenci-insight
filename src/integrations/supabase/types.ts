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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          deal_id: string | null
          id: string
          notes: string | null
          type: string | null
          user_id: string | null
          when_at: string | null
        }
        Insert: {
          deal_id?: string | null
          id?: string
          notes?: string | null
          type?: string | null
          user_id?: string | null
          when_at?: string | null
        }
        Update: {
          deal_id?: string | null
          id?: string
          notes?: string | null
          type?: string | null
          user_id?: string | null
          when_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spend: {
        Row: {
          account_id: string | null
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          currency: string | null
          day: string
          id: number
          impressions: number | null
          leads: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          currency?: string | null
          day: string
          id?: number
          impressions?: number | null
          leads?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          currency?: string | null
          day?: string
          id?: number
          impressions?: number | null
          leads?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      architect_files: {
        Row: {
          architect_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          architect_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          architect_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architect_files_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
        ]
      }
      architect_history: {
        Row: {
          architect_id: string
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
        }
        Insert: {
          architect_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
        }
        Update: {
          architect_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_history_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
        ]
      }
      architect_projects: {
        Row: {
          architect_id: string
          created_at: string | null
          created_by: string | null
          data_projeto: string
          id: string
          nome_projeto: string
          observacoes: string | null
          tipo: string | null
          valor: number | null
        }
        Insert: {
          architect_id: string
          created_at?: string | null
          created_by?: string | null
          data_projeto?: string
          id?: string
          nome_projeto: string
          observacoes?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Update: {
          architect_id?: string
          created_at?: string | null
          created_by?: string | null
          data_projeto?: string
          id?: string
          nome_projeto?: string
          observacoes?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "architect_projects_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architect_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      architect_timeline: {
        Row: {
          ai_summary: string | null
          architect_id: string
          author_id: string | null
          created_at: string
          id: string
          mentioned_users: string[] | null
          message: string
          update_type: string
        }
        Insert: {
          ai_summary?: string | null
          architect_id: string
          author_id?: string | null
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          message: string
          update_type?: string
        }
        Update: {
          ai_summary?: string | null
          architect_id?: string
          author_id?: string | null
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          message?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_timeline_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architect_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      architect_timeline_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          timeline_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          timeline_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          timeline_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architect_timeline_attachments_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "architect_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      architects: {
        Row: {
          active: boolean | null
          birthday: string | null
          categoria: string
          city: string | null
          commission_percent: number | null
          company: string | null
          created_at: string | null
          created_by: string | null
          data_marcado_inativo: string | null
          data_primeiro_contato: string | null
          data_ultimo_contato: string | null
          email: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          origem: string | null
          phone: string | null
          status_funil: string | null
          tag_prospeccao: string | null
          tier: string | null
          ultimo_projeto_data: string | null
          updated_at: string | null
          vendedor_responsavel: string | null
        }
        Insert: {
          active?: boolean | null
          birthday?: string | null
          categoria?: string
          city?: string | null
          commission_percent?: number | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          data_marcado_inativo?: string | null
          data_primeiro_contato?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          origem?: string | null
          phone?: string | null
          status_funil?: string | null
          tag_prospeccao?: string | null
          tier?: string | null
          ultimo_projeto_data?: string | null
          updated_at?: string | null
          vendedor_responsavel?: string | null
        }
        Update: {
          active?: boolean | null
          birthday?: string | null
          categoria?: string
          city?: string | null
          commission_percent?: number | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          data_marcado_inativo?: string | null
          data_primeiro_contato?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          origem?: string | null
          phone?: string | null
          status_funil?: string | null
          tag_prospeccao?: string | null
          tier?: string | null
          ultimo_projeto_data?: string | null
          updated_at?: string | null
          vendedor_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architects_vendedor_responsavel_fkey"
            columns: ["vendedor_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_steps: {
        Row: {
          cadence_id: string | null
          channel: string | null
          id: string
          pos: number
          template: string | null
          wait_hours: number | null
        }
        Insert: {
          cadence_id?: string | null
          channel?: string | null
          id?: string
          pos: number
          template?: string | null
          wait_hours?: number | null
        }
        Update: {
          cadence_id?: string | null
          channel?: string | null
          id?: string
          pos?: number
          template?: string | null
          wait_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "cadences"
            referencedColumns: ["id"]
          },
        ]
      }
      cadences: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          by_user_id: string | null
          deal_id: string
          id: string
          note: string | null
          timestamp: string | null
          type: string
        }
        Insert: {
          by_user_id?: string | null
          deal_id: string
          id?: string
          note?: string | null
          timestamp?: string | null
          type: string
        }
        Update: {
          by_user_id?: string | null
          deal_id?: string
          id?: string
          note?: string | null
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadence_steps: {
        Row: {
          cadence_id: string
          channel: string
          created_at: string | null
          id: string
          position: number
          template: string | null
          wait_hours: number | null
        }
        Insert: {
          cadence_id: string
          channel: string
          created_at?: string | null
          id?: string
          position?: number
          template?: string | null
          wait_hours?: number | null
        }
        Update: {
          cadence_id?: string
          channel?: string
          created_at?: string | null
          id?: string
          position?: number
          template?: string | null
          wait_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "crm_cadences"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadences: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_deal_files: {
        Row: {
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          deal_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_history: {
        Row: {
          action_type: string | null
          created_at: string | null
          deal_id: string
          description: string | null
          field_name: string | null
          from_stage_id: string | null
          id: string
          moved_at: string | null
          moved_by: string | null
          new_value: string | null
          old_value: string | null
          to_stage_id: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          deal_id: string
          description?: string | null
          field_name?: string | null
          from_stage_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          new_value?: string | null
          old_value?: string | null
          to_stage_id: string
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          deal_id?: string
          description?: string | null
          field_name?: string | null
          from_stage_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          new_value?: string | null
          old_value?: string | null
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_history_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          ai_status: string | null
          architect_id: string | null
          categoria: string | null
          centro_custo: string | null
          conversation_history: string | null
          created_at: string | null
          from_ai: boolean | null
          id: string
          last_interaction: string | null
          lead_id: string | null
          lost_note: string | null
          lost_reason: string | null
          note: string | null
          owner_id: string | null
          pipeline_id: string
          product_type: string | null
          scheduled_call: string | null
          stage_entered_at: string | null
          stage_id: string
          stage_position: number | null
          status: string | null
          tipo_produto: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          ai_status?: string | null
          architect_id?: string | null
          categoria?: string | null
          centro_custo?: string | null
          conversation_history?: string | null
          created_at?: string | null
          from_ai?: boolean | null
          id?: string
          last_interaction?: string | null
          lead_id?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          note?: string | null
          owner_id?: string | null
          pipeline_id: string
          product_type?: string | null
          scheduled_call?: string | null
          stage_entered_at?: string | null
          stage_id: string
          stage_position?: number | null
          status?: string | null
          tipo_produto?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          ai_status?: string | null
          architect_id?: string | null
          categoria?: string | null
          centro_custo?: string | null
          conversation_history?: string | null
          created_at?: string | null
          from_ai?: boolean | null
          id?: string
          last_interaction?: string | null
          lead_id?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          note?: string | null
          owner_id?: string | null
          pipeline_id?: string
          product_type?: string | null
          scheduled_call?: string | null
          stage_entered_at?: string | null
          stage_id?: string
          stage_position?: number | null
          status?: string | null
          tipo_produto?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_stages: {
        Row: {
          cadence_id: string | null
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
          sla_hours: number | null
          updated_at: string | null
        }
        Insert: {
          cadence_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          pipeline_id: string
          position?: number
          sla_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          cadence_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          sla_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "crm_cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          deal_id: string
          due_at: string
          id: string
          note: string | null
          origem_modulo: string | null
          status: string | null
          tipo_tarefa: string
          title: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          due_at: string
          id?: string
          note?: string | null
          origem_modulo?: string | null
          status?: string | null
          tipo_tarefa?: string
          title: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          due_at?: string
          id?: string
          note?: string | null
          origem_modulo?: string | null
          status?: string | null
          tipo_tarefa?: string
          title?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_timeline: {
        Row: {
          ai_summary: string | null
          author_id: string | null
          created_at: string
          deal_id: string
          id: string
          mentioned_users: string[] | null
          message: string
          update_type: string
        }
        Insert: {
          ai_summary?: string | null
          author_id?: string | null
          created_at?: string
          deal_id: string
          id?: string
          mentioned_users?: string[] | null
          message: string
          update_type?: string
        }
        Update: {
          ai_summary?: string | null
          author_id?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          mentioned_users?: string[] | null
          message?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_timeline_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_timeline_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          timeline_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          timeline_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          timeline_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_timeline_attachments_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "crm_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards_personalizados: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          filtros: Json | null
          id: string
          layout: Json
          nome: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          filtros?: Json | null
          id?: string
          layout?: Json
          nome: string
          user_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          filtros?: Json | null
          id?: string
          layout?: Json
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          amount: number | null
          budget_value: number | null
          closed_at: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          pipeline_id: string | null
          stage_id: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          amount?: number | null
          budget_value?: number | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          amount?: number | null
          budget_value?: number | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          lead_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          lead_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          lead_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          code: string
          id: number
          name: string
        }
        Insert: {
          code: string
          id?: number
          name: string
        }
        Update: {
          code?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ad_id: string | null
          architect_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          source_id: number | null
          status: string | null
          temperature: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: string | null
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          source_id?: number | null
          status?: string | null
          temperature?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: string | null
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          source_id?: number | null
          status?: string | null
          temperature?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      msg_costs: {
        Row: {
          conversation_id: string | null
          cost: number | null
          created_at: string | null
          currency: string | null
          day: string
          deal_id: string | null
          direction: string | null
          id: number
          lead_id: string | null
          meta_category: string | null
          phone_number: string | null
        }
        Insert: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          day: string
          deal_id?: string | null
          direction?: string | null
          id?: number
          lead_id?: string | null
          meta_category?: string | null
          phone_number?: string | null
        }
        Update: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          day?: string
          deal_id?: string | null
          direction?: string | null
          id?: number
          lead_id?: string | null
          meta_category?: string | null
          phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msg_costs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msg_costs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          id: string
          name: string
          pipeline_id: string | null
          pos: number
        }
        Insert: {
          id?: string
          name: string
          pipeline_id?: string | null
          pos: number
        }
        Update: {
          id?: string
          name?: string
          pipeline_id?: string | null
          pos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          especializacao: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          especializacao?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          especializacao?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          project_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          project_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          project_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_quotes: {
        Row: {
          created_at: string | null
          id: string
          item: string
          project_id: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item: string
          project_id: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item?: string
          project_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          approved_date: string | null
          architect_id: string | null
          client_id: string | null
          created_at: string | null
          crm_deal_id: string | null
          deadline: string | null
          deal_id: string | null
          id: string
          lost_date: string | null
          lost_reason: string | null
          name: string | null
          presented_at: string | null
          sent_at: string | null
          sent_date: string | null
          stage: string | null
          value: number | null
        }
        Insert: {
          approved_date?: string | null
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          crm_deal_id?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          name?: string | null
          presented_at?: string | null
          sent_at?: string | null
          sent_date?: string | null
          stage?: string | null
          value?: number | null
        }
        Update: {
          approved_date?: string | null
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          crm_deal_id?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          name?: string | null
          presented_at?: string | null
          sent_at?: string | null
          sent_date?: string | null
          stage?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          created_by: string | null
          done: boolean | null
          due_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          done?: boolean | null
          due_at: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          done?: boolean | null
          due_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      tendenci_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          percentual_atingido: number | null
          seller_goal_id: string | null
          vendedor_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          percentual_atingido?: number | null
          seller_goal_id?: string | null
          vendedor_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          percentual_atingido?: number | null
          seller_goal_id?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_badges_seller_goal_id_fkey"
            columns: ["seller_goal_id"]
            isOneToOne: false
            referencedRelation: "tendenci_seller_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_badges_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_company_goals: {
        Row: {
          created_at: string | null
          criado_por: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          quantidade_meta: number | null
          status: string | null
          tipo_meta: string | null
          updated_at: string | null
          valor_meta_total: number
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          quantidade_meta?: number | null
          status?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta_total: number
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          quantidade_meta?: number | null
          status?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta_total?: number
        }
        Relationships: []
      }
      tendenci_daily_architect_goals: {
        Row: {
          captacoes_realizadas: number
          created_at: string | null
          data: string
          id: string
          meta_captacoes: number
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          captacoes_realizadas?: number
          created_at?: string | null
          data: string
          id?: string
          meta_captacoes?: number
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          captacoes_realizadas?: number
          created_at?: string | null
          data?: string
          id?: string
          meta_captacoes?: number
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_daily_architect_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_goal_progress: {
        Row: {
          atualizado_em: string | null
          company_goal_id: string | null
          id: string
          percentual: number | null
          quantidade_alcancada: number | null
          seller_goal_id: string | null
          valor_vendido: number | null
        }
        Insert: {
          atualizado_em?: string | null
          company_goal_id?: string | null
          id?: string
          percentual?: number | null
          quantidade_alcancada?: number | null
          seller_goal_id?: string | null
          valor_vendido?: number | null
        }
        Update: {
          atualizado_em?: string | null
          company_goal_id?: string | null
          id?: string
          percentual?: number | null
          quantidade_alcancada?: number | null
          seller_goal_id?: string | null
          valor_vendido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_goal_progress_company_goal_id_fkey"
            columns: ["company_goal_id"]
            isOneToOne: false
            referencedRelation: "tendenci_company_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_goal_progress_seller_goal_id_fkey"
            columns: ["seller_goal_id"]
            isOneToOne: true
            referencedRelation: "tendenci_seller_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_agendamentos: {
        Row: {
          architect_id: string
          campanha_id: string | null
          canal: string | null
          client_id: string | null
          created_at: string | null
          criado_por_ia: boolean | null
          data_agendamento: string
          id: string
          metadata: Json | null
          observacoes: string | null
          status: string | null
          tipo_tarefa: string
          updated_at: string | null
          vendedor_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          architect_id: string
          campanha_id?: string | null
          canal?: string | null
          client_id?: string | null
          created_at?: string | null
          criado_por_ia?: boolean | null
          data_agendamento: string
          id?: string
          metadata?: Json | null
          observacoes?: string | null
          status?: string | null
          tipo_tarefa?: string
          updated_at?: string | null
          vendedor_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          architect_id?: string
          campanha_id?: string | null
          canal?: string | null
          client_id?: string | null
          created_at?: string | null
          criado_por_ia?: boolean | null
          data_agendamento?: string
          id?: string
          metadata?: Json | null
          observacoes?: string | null
          status?: string | null
          tipo_tarefa?: string
          updated_at?: string | null
          vendedor_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_agendamentos_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_agendamentos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_agendamentos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_agendamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_campaign_architects: {
        Row: {
          agendamento_id: string | null
          architect_id: string
          campanha_id: string
          created_at: string | null
          data_envio: string | null
          data_interesse: string | null
          data_resposta: string | null
          id: string
          interessado: boolean | null
          metadata: Json | null
          respondeu: boolean | null
          status: string | null
        }
        Insert: {
          agendamento_id?: string | null
          architect_id: string
          campanha_id: string
          created_at?: string | null
          data_envio?: string | null
          data_interesse?: string | null
          data_resposta?: string | null
          id?: string
          interessado?: boolean | null
          metadata?: Json | null
          respondeu?: boolean | null
          status?: string | null
        }
        Update: {
          agendamento_id?: string | null
          architect_id?: string
          campanha_id?: string
          created_at?: string | null
          data_envio?: string | null
          data_interesse?: string | null
          data_resposta?: string | null
          id?: string
          interessado?: boolean | null
          metadata?: Json | null
          respondeu?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_campaign_architects_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaign_architects_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_campaign_dispatches: {
        Row: {
          architect_id: string
          campanha_id: string
          created_at: string | null
          enviado_em: string | null
          id: string
          mensagem_erro: string | null
          status: string
          tentativas: number | null
        }
        Insert: {
          architect_id: string
          campanha_id: string
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          mensagem_erro?: string | null
          status: string
          tentativas?: number | null
        }
        Update: {
          architect_id?: string
          campanha_id?: string
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          mensagem_erro?: string | null
          status?: string
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_campaign_dispatches_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaign_dispatches_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_campaigns: {
        Row: {
          agendar_automatico: boolean | null
          arquitetos_selecionados: string[] | null
          conteudo_audio_url: string | null
          conteudo_imagem_url: string | null
          conteudo_texto: string | null
          created_at: string | null
          created_by: string | null
          criterio_interesse: Json | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          dias_semana: number[] | null
          horarios: Json | null
          id: string
          intervalo_minimo_minutos: number | null
          nome: string
          segmento_id: string | null
          sequencia_id: string | null
          status: string | null
          tipo_envio: string | null
          updated_at: string | null
          vendedor_id: string | null
          webhook_n8n: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          agendar_automatico?: boolean | null
          arquitetos_selecionados?: string[] | null
          conteudo_audio_url?: string | null
          conteudo_imagem_url?: string | null
          conteudo_texto?: string | null
          created_at?: string | null
          created_by?: string | null
          criterio_interesse?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          horarios?: Json | null
          id?: string
          intervalo_minimo_minutos?: number | null
          nome: string
          segmento_id?: string | null
          sequencia_id?: string | null
          status?: string | null
          tipo_envio?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          webhook_n8n?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          agendar_automatico?: boolean | null
          arquitetos_selecionados?: string[] | null
          conteudo_audio_url?: string | null
          conteudo_imagem_url?: string | null
          conteudo_texto?: string | null
          created_at?: string | null
          created_by?: string | null
          criterio_interesse?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          horarios?: Json | null
          id?: string
          intervalo_minimo_minutos?: number | null
          nome?: string
          segmento_id?: string | null
          sequencia_id?: string | null
          status?: string | null
          tipo_envio?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          webhook_n8n?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaigns_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaigns_sequencia_id_fkey"
            columns: ["sequencia_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaigns_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "tendenci_whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_logs: {
        Row: {
          architect_id: string
          campanha_id: string | null
          canal: string | null
          created_at: string | null
          enviado_por: string | null
          id: string
          mensagem: string | null
          metadata: Json | null
          tipo: string
        }
        Insert: {
          architect_id: string
          campanha_id?: string | null
          canal?: string | null
          created_at?: string | null
          enviado_por?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          tipo: string
        }
        Update: {
          architect_id?: string
          campanha_id?: string | null
          canal?: string | null
          created_at?: string | null
          enviado_por?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_logs_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_logs_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_segments: {
        Row: {
          architect_ids: string[] | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          filtros: Json
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          architect_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          filtros?: Json
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          architect_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          filtros?: Json
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_sequences: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          mensagens: Json
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          mensagens?: Json
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          mensagens?: Json
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_stages: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string | null
          editavel: boolean
          id: string
          nome: string
          position: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean
          cor?: string
          created_at?: string | null
          editavel?: boolean
          id?: string
          nome: string
          position: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string | null
          editavel?: boolean
          id?: string
          nome?: string
          position?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tendenci_prospec_settings: {
        Row: {
          id: string
          metadata: Json | null
          numero_whatsapp: string | null
          status_conexao: string | null
          token: string | null
          ultima_verificacao: string | null
          updated_at: string | null
          updated_by: string | null
          webhook_envio: string | null
          webhook_retorno: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          numero_whatsapp?: string | null
          status_conexao?: string | null
          token?: string | null
          ultima_verificacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
          webhook_envio?: string | null
          webhook_retorno?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          numero_whatsapp?: string | null
          status_conexao?: string | null
          token?: string | null
          ultima_verificacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
          webhook_envio?: string | null
          webhook_retorno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_seller_goals: {
        Row: {
          created_at: string | null
          criado_por: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          quantidade_meta: number | null
          status: string | null
          tipo_meta: string | null
          updated_at: string | null
          valor_meta: number
          vendedor_id: string
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          quantidade_meta?: number | null
          status?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta: number
          vendedor_id: string
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          quantidade_meta?: number | null
          status?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_seller_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_seller_ranking: {
        Row: {
          atualizado_em: string | null
          id: string
          percentual_meta_atualizado: number | null
          periodo_fim: string
          periodo_inicio: string
          posicao_atual: number | null
          valor_total_vendido: number | null
          vendedor_id: string
        }
        Insert: {
          atualizado_em?: string | null
          id?: string
          percentual_meta_atualizado?: number | null
          periodo_fim: string
          periodo_inicio: string
          posicao_atual?: number | null
          valor_total_vendido?: number | null
          vendedor_id: string
        }
        Update: {
          atualizado_em?: string | null
          id?: string
          percentual_meta_atualizado?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          posicao_atual?: number | null
          valor_total_vendido?: number | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_seller_ranking_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_user_permissions: {
        Row: {
          acesso_arquitetos: boolean | null
          acesso_configuracoes: boolean | null
          acesso_crm_kanban: boolean | null
          acesso_leads: boolean | null
          acesso_metas: boolean | null
          acesso_projetos: boolean | null
          active: boolean | null
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acesso_arquitetos?: boolean | null
          acesso_configuracoes?: boolean | null
          acesso_crm_kanban?: boolean | null
          acesso_leads?: boolean | null
          acesso_metas?: boolean | null
          acesso_projetos?: boolean | null
          active?: boolean | null
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acesso_arquitetos?: boolean | null
          acesso_configuracoes?: boolean | null
          acesso_crm_kanban?: boolean | null
          acesso_leads?: boolean | null
          acesso_metas?: boolean | null
          acesso_projetos?: boolean | null
          active?: boolean | null
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tendenci_whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          created_by: string | null
          id: string
          instance_id: string | null
          instance_name: string
          last_sync: string | null
          metadata: Json | null
          phone_number: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string | null
          instance_name: string
          last_sync?: string | null
          metadata?: Json | null
          phone_number?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string
          last_sync?: string | null
          metadata?: Json | null
          phone_number?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role_id: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role_id?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      architect_approved_value: {
        Args: never
        Returns: {
          name: string
          sum_value: number
        }[]
      }
      architect_birthdays_upcoming: {
        Args: never
        Returns: {
          birthday: string
          city: string
          days_remaining: number
          email: string
          id: string
          name: string
          phone: string
          tier: string
        }[]
      }
      architect_inactivity: {
        Args: { days_threshold?: number }
        Returns: {
          contact_count: number
          days_since_last: number
          email: string
          id: string
          last_project_at: string
          name: string
          phone: string
        }[]
      }
      architect_performance_metrics: {
        Args: { period_days?: number }
        Returns: {
          approval_rate: number
          approved_projects: number
          architect_id: string
          architect_name: string
          categoria: string
          in_progress_projects: number
          lost_projects: number
          total_projects: number
          total_value: number
        }[]
      }
      architect_projects_count: {
        Args: never
        Returns: {
          count: number
          name: string
        }[]
      }
      architects_aggregates: { Args: never; Returns: Json }
      calculate_seller_rankings: { Args: never; Returns: undefined }
      check_and_update_inactive_architects: { Args: never; Returns: undefined }
      create_daily_architect_goals: { Args: never; Returns: undefined }
      crm_agg: {
        Args: { p_end?: string; p_pipeline_id: string; p_start?: string }
        Returns: Json
      }
      crm_sla_alerts: {
        Args: { p_pipeline_id: string }
        Returns: {
          deal_id: string
          delay_h: number
          lead_name: string
          owner_name: string
          stage_name: string
          title: string
        }[]
      }
      crm_stage_funnel: {
        Args: { p_end?: string; p_pipeline_id: string; p_start?: string }
        Returns: {
          count: number
          stage: string
          value: number
        }[]
      }
      crm_time_in_stage: {
        Args: { p_pipeline_id: string }
        Returns: {
          avg_h: number
          stage: string
        }[]
      }
      crm_timeseries: {
        Args: { p_metric?: string; p_pipeline_id: string }
        Returns: {
          period: string
          value: number
        }[]
      }
      dashboard_architect_response_time: { Args: never; Returns: Json }
      dashboard_architects_without_projects: {
        Args: { days_threshold?: number }
        Returns: {
          days_since_last: number
          email: string
          id: string
          last_project_at: string
          name: string
          phone: string
        }[]
      }
      dashboard_crm_metrics:
        | { Args: never; Returns: Json }
        | { Args: { p_end?: string; p_start?: string }; Returns: Json }
      dashboard_lead_origins: {
        Args: never
        Returns: {
          count: number
          origin: string
        }[]
      }
      dashboard_meta_ad_spend: { Args: never; Returns: Json }
      dashboard_meta_initiated_messages: { Args: never; Returns: Json }
      dashboard_meta_message_cost: { Args: never; Returns: Json }
      dashboard_projects_by_stage: {
        Args: never
        Returns: {
          count: number
          stage: string
          value: number
        }[]
      }
      generate_username_from_email: {
        Args: { email_input: string }
        Returns: string
      }
      get_architect_ranking_by_type: {
        Args: { p_tipo?: string }
        Returns: {
          architect_id: string
          architect_name: string
          quantidade_projetos: number
          ticket_medio: number
          valor_total: number
        }[]
      }
      get_daily_architect_goal_progress: {
        Args: { p_date?: string; p_vendedor_id: string }
        Returns: Json
      }
      get_project_stats_by_type: {
        Args: never
        Returns: {
          quantidade: number
          ticket_medio: number
          tipo: string
          valor_total: number
        }[]
      }
      get_seller_goal_stats: { Args: { p_vendedor_id: string }; Returns: Json }
      get_seller_performance_by_goal: {
        Args: { p_seller_goal_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_weekly_architect_goal_progress: {
        Args: { p_vendedor_id: string }
        Returns: Json
      }
      has_module_permission: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_master: { Args: { _user_id: string }; Returns: boolean }
      leads_aggregates: { Args: never; Returns: Json }
      mark_inactive_architects: { Args: never; Returns: undefined }
      project_deadline_alerts: { Args: never; Returns: Json }
      project_deadline_alerts_detailed: {
        Args: never
        Returns: {
          architect_name: string
          client_name: string
          days_remaining: number
          deadline: string
          id: string
          name: string
          stage: string
          status: string
        }[]
      }
      projects_aggregates: { Args: never; Returns: Json }
      projects_metrics: {
        Args: never
        Returns: {
          aguardando_aprovacao_count: number
          aprovado_count: number
          aprovado_value: number
          em_desenvolvimento_count: number
          near_due_count: number
          overdue_count: number
          perdido_count: number
          recebido_count: number
        }[]
      }
      user_can_access_module: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_role: { Args: { required_role: string }; Returns: boolean }
      user_has_role_check: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "prospeccao"
        | "crm"
        | "projetos"
        | "metas"
        | "leads"
        | "dashboards_personalizados"
        | "gestao_usuarios"
        | "configuracoes"
        | "arquitetos"
      user_role: "admin" | "vendedor" | "arquiteto"
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
    Enums: {
      app_module: [
        "dashboard",
        "prospeccao",
        "crm",
        "projetos",
        "metas",
        "leads",
        "dashboards_personalizados",
        "gestao_usuarios",
        "configuracoes",
        "arquitetos",
      ],
      user_role: ["admin", "vendedor", "arquiteto"],
    },
  },
} as const
