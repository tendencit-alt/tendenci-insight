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
      architects: {
        Row: {
          active: boolean | null
          birthday: string | null
          city: string | null
          commission_percent: number | null
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          phone: string | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          birthday?: string | null
          city?: string | null
          commission_percent?: number | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          birthday?: string | null
          city?: string | null
          commission_percent?: number | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          conversation_history: string | null
          created_at: string | null
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
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          ai_status?: string | null
          architect_id?: string | null
          conversation_history?: string | null
          created_at?: string | null
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
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          ai_status?: string | null
          architect_id?: string | null
          conversation_history?: string | null
          created_at?: string | null
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
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          due_at: string
          id?: string
          note?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          due_at?: string
          id?: string
          note?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
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
          architect_id: string | null
          client_id: string | null
          created_at: string | null
          deadline: string | null
          deal_id: string | null
          id: string
          name: string | null
          presented_at: string | null
          sent_at: string | null
          stage: string | null
          value: number | null
        }
        Insert: {
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          name?: string | null
          presented_at?: string | null
          sent_at?: string | null
          stage?: string | null
          value?: number | null
        }
        Update: {
          architect_id?: string | null
          client_id?: string | null
          created_at?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          name?: string | null
          presented_at?: string | null
          sent_at?: string | null
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
      architect_projects_count: {
        Args: never
        Returns: {
          count: number
          name: string
        }[]
      }
      architects_aggregates: { Args: never; Returns: Json }
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
      dashboard_crm_metrics: { Args: never; Returns: Json }
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
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      leads_aggregates: { Args: never; Returns: Json }
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
      user_has_role: { Args: { required_role: string }; Returns: boolean }
      user_has_role_check: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
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
      user_role: ["admin", "vendedor", "arquiteto"],
    },
  },
} as const
