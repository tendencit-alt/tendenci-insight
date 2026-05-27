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
      _diag_orphans_audit: {
        Row: {
          k: string | null
          v: string | null
        }
        Insert: {
          k?: string | null
          v?: string | null
        }
        Update: {
          k?: string | null
          v?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          deal_id: string | null
          id: string
          notes: string | null
          tenant_id: string | null
          type: string | null
          user_id: string | null
          when_at: string | null
        }
        Insert: {
          deal_id?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string | null
          type?: string | null
          user_id?: string | null
          when_at?: string | null
        }
        Update: {
          deal_id?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string | null
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
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decision_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          impact_after: Json | null
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          impact_after?: Json | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          impact_after?: Json | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_decision_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_financial_diagnoses: {
        Row: {
          active: boolean
          created_at: string
          description: string
          diagnosis_type: string
          estimated_impact: string | null
          id: string
          metadata: Json | null
          priority: number
          probable_cause: string | null
          severity: string
          suggested_action: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          diagnosis_type: string
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          probable_cause?: string | null
          severity?: string
          suggested_action?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          diagnosis_type?: string
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          probable_cause?: string | null
          severity?: string
          suggested_action?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_financial_diagnoses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_impact_simulations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          parameters: Json
          results: Json | null
          simulation_type: string
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          parameters?: Json
          results?: Json | null
          simulation_type: string
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          parameters?: Json
          results?: Json | null
          simulation_type?: string
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_impact_simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_operational_diagnoses: {
        Row: {
          bottlenecks: Json | null
          created_at: string
          diagnosis_type: string
          id: string
          maturity_level: string | null
          metadata: Json | null
          recommended_actions: Json | null
          tenant_id: string
        }
        Insert: {
          bottlenecks?: Json | null
          created_at?: string
          diagnosis_type: string
          id?: string
          maturity_level?: string | null
          metadata?: Json | null
          recommended_actions?: Json | null
          tenant_id: string
        }
        Update: {
          bottlenecks?: Json | null
          created_at?: string
          diagnosis_type?: string
          id?: string
          maturity_level?: string | null
          metadata?: Json | null
          recommended_actions?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_operational_diagnoses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_priority_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          priority: number
          source_module: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          source_module?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          source_module?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_priority_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_strategy_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          estimated_impact: string | null
          explanation: string | null
          id: string
          metadata: Json | null
          recommended_action: string | null
          severity: string
          tenant_id: string
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          estimated_impact?: string | null
          explanation?: string | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          severity?: string
          tenant_id: string
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          estimated_impact?: string | null
          explanation?: string | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          severity?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_strategy_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_instances: {
        Row: {
          amount: number | null
          approved_at: string | null
          cancelled_at: string | null
          created_at: string | null
          current_approver_id: string | null
          description: string | null
          executed_at: string | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          reopen_reason: string | null
          requested_by: string
          rule_id: string | null
          source_id: string
          source_table: string
          status: string
          tenant_id: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_approver_id?: string | null
          description?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reopen_reason?: string | null
          requested_by: string
          rule_id?: string | null
          source_id: string
          source_table: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_approver_id?: string | null
          description?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reopen_reason?: string | null
          requested_by?: string
          rule_id?: string | null
          source_id?: string
          source_table?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_instances_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          active: boolean | null
          condition_field: string | null
          condition_operator: string | null
          condition_value: string | null
          created_at: string | null
          description: string | null
          id: string
          module: string
          priority: number | null
          source_table: string | null
          tenant_id: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          priority?: number | null
          source_table?: string | null
          tenant_id?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          priority?: number | null
          source_table?: string | null
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          actor_id: string
          comment: string | null
          created_at: string | null
          from_status: string | null
          id: string
          instance_id: string
          step_type: string
          tenant_id: string | null
          to_status: string | null
        }
        Insert: {
          actor_id: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          instance_id: string
          step_type: string
          tenant_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          instance_id?: string
          step_type?: string
          tenant_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "approval_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_thresholds: {
        Row: {
          approver_profile_type: string | null
          approver_user_id: string | null
          created_at: string | null
          id: string
          max_value: number | null
          min_value: number | null
          requires_second_approval: boolean | null
          rule_id: string
          second_approver_profile_type: string | null
          tenant_id: string | null
        }
        Insert: {
          approver_profile_type?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          requires_second_approval?: boolean | null
          rule_id: string
          second_approver_profile_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          approver_profile_type?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          requires_second_approval?: boolean | null
          rule_id?: string
          second_approver_profile_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_thresholds_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_thresholds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          architect_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          architect_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
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
      architect_indications: {
        Row: {
          architect_id: string
          categoria: string | null
          centro_custo: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string
          id: string
          notes: string | null
          product_type: string
          value: number | null
        }
        Insert: {
          architect_id: string
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          id?: string
          notes?: string | null
          product_type: string
          value?: number | null
        }
        Update: {
          architect_id?: string
          categoria?: string | null
          centro_custo?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          id?: string
          notes?: string | null
          product_type?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "architect_indications_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architect_indications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
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
          {
            foreignKeyName: "architect_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "architect_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          tenant_id: string | null
          tier: string | null
          ultimo_projeto_data: string | null
          updated_at: string | null
          vendedor_responsavel: string | null
          whatsapp_valido: boolean | null
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
          tenant_id?: string | null
          tier?: string | null
          ultimo_projeto_data?: string | null
          updated_at?: string | null
          vendedor_responsavel?: string | null
          whatsapp_valido?: boolean | null
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
          tenant_id?: string | null
          tier?: string | null
          ultimo_projeto_data?: string | null
          updated_at?: string | null
          vendedor_responsavel?: string | null
          whatsapp_valido?: boolean | null
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
            foreignKeyName: "architects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architects_vendedor_responsavel_fkey"
            columns: ["vendedor_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architects_vendedor_responsavel_fkey"
            columns: ["vendedor_responsavel"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      architecture_layer_data_sources: {
        Row: {
          created_at: string
          id: string
          is_connected: boolean
          layer_code: string
          notes: string | null
          source_name: string
          source_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_connected?: boolean
          layer_code: string
          notes?: string | null
          source_name: string
          source_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_connected?: boolean
          layer_code?: string
          notes?: string | null
          source_name?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_layer_data_sources_layer_code_fkey"
            columns: ["layer_code"]
            isOneToOne: false
            referencedRelation: "architecture_layers_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      architecture_layer_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_layer_code: string
          id: string
          is_critical: boolean
          layer_code: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_layer_code: string
          id?: string
          is_critical?: boolean
          layer_code: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_layer_code?: string
          id?: string
          is_critical?: boolean
          layer_code?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_layer_dependencies_depends_on_layer_code_fkey"
            columns: ["depends_on_layer_code"]
            isOneToOne: false
            referencedRelation: "architecture_layers_registry"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "architecture_layer_dependencies_layer_code_fkey"
            columns: ["layer_code"]
            isOneToOne: false
            referencedRelation: "architecture_layers_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      architecture_layer_status: {
        Row: {
          actual_route: string | null
          backend_exists: string
          data_connected: string
          expected_route: string | null
          health_status: string
          id: string
          integration_connected: string
          layer_code: string
          menu_exists: string
          menu_expected: boolean | null
          menu_found: boolean | null
          notes: string | null
          route_exists: string
          sidebar_present: boolean | null
          ui_exists: string
          updated_at: string
        }
        Insert: {
          actual_route?: string | null
          backend_exists?: string
          data_connected?: string
          expected_route?: string | null
          health_status?: string
          id?: string
          integration_connected?: string
          layer_code: string
          menu_exists?: string
          menu_expected?: boolean | null
          menu_found?: boolean | null
          notes?: string | null
          route_exists?: string
          sidebar_present?: boolean | null
          ui_exists?: string
          updated_at?: string
        }
        Update: {
          actual_route?: string | null
          backend_exists?: string
          data_connected?: string
          expected_route?: string | null
          health_status?: string
          id?: string
          integration_connected?: string
          layer_code?: string
          menu_exists?: string
          menu_expected?: boolean | null
          menu_found?: boolean | null
          notes?: string | null
          route_exists?: string
          sidebar_present?: boolean | null
          ui_exists?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_layer_status_layer_code_fkey"
            columns: ["layer_code"]
            isOneToOne: true
            referencedRelation: "architecture_layers_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      architecture_layers_registry: {
        Row: {
          code: string
          created_at: string
          description: string | null
          group: string
          id: string
          name: string
          owner_area: string | null
          priority: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          group: string
          id?: string
          name: string
          owner_area?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          group?: string
          id?: string
          name?: string
          owner_area?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_import_logs: {
        Row: {
          created_at: string
          error_count: number | null
          errors: Json | null
          file_name: string
          file_type: string | null
          id: string
          metadata: Json | null
          record_count: number | null
          status: string
          success_count: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          errors?: Json | null
          file_name: string
          file_type?: string | null
          id?: string
          metadata?: Json | null
          record_count?: number | null
          status?: string
          success_count?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string
          file_type?: string | null
          id?: string
          metadata?: Json | null
          record_count?: number | null
          status?: string
          success_count?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_import_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string
          event_source: string
          event_type: string
          field_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_source?: string
          event_type?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_source?: string
          event_type?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_recovery_rules: {
        Row: {
          backoff_strategy: string
          conditions: Json | null
          cooldown_minutes: number
          created_at: string
          failure_code: string
          id: string
          is_enabled: boolean
          max_attempts: number
          recovery_code: string
          trigger_mode: string
        }
        Insert: {
          backoff_strategy?: string
          conditions?: Json | null
          cooldown_minutes?: number
          created_at?: string
          failure_code: string
          id?: string
          is_enabled?: boolean
          max_attempts?: number
          recovery_code: string
          trigger_mode?: string
        }
        Update: {
          backoff_strategy?: string
          conditions?: Json | null
          cooldown_minutes?: number
          created_at?: string
          failure_code?: string
          id?: string
          is_enabled?: boolean
          max_attempts?: number
          recovery_code?: string
          trigger_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_recovery_rules_recovery_code_fkey"
            columns: ["recovery_code"]
            isOneToOne: false
            referencedRelation: "recovery_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      automation_execution_logs: {
        Row: {
          actions_executed: Json | null
          created_at: string | null
          error_message: string | null
          event_payload: Json | null
          event_type: string
          execution_time_ms: number | null
          id: string
          rule_id: string | null
          rule_name: string | null
          source_id: string | null
          source_table: string | null
          status: string | null
          tenant_id: string | null
          triggered_by: string | null
        }
        Insert: {
          actions_executed?: Json | null
          created_at?: string | null
          error_message?: string | null
          event_payload?: Json | null
          event_type: string
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          actions_executed?: Json | null
          created_at?: string | null
          error_message?: string | null
          event_payload?: Json | null
          event_type?: string
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          active: boolean | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dry_run: boolean
          error_count: number | null
          event_module: string
          event_type: string
          execution_count: number | null
          id: string
          is_system: boolean | null
          last_executed_at: string | null
          name: string
          priority: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dry_run?: boolean
          error_count?: number | null
          event_module: string
          event_type: string
          execution_count?: number | null
          id?: string
          is_system?: boolean | null
          last_executed_at?: string | null
          name: string
          priority?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dry_run?: boolean
          error_count?: number | null
          event_module?: string
          event_type?: string
          execution_count?: number | null
          id?: string
          is_system?: boolean | null
          last_executed_at?: string | null
          name?: string
          priority?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_suggestion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          suggestion_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          suggestion_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          suggestion_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_suggestion_events_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "automation_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_suggestion_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_suggestions: {
        Row: {
          applied_resource_id: string | null
          applied_resource_type: string | null
          confidence: number | null
          created_at: string
          description: string | null
          evidence: Json | null
          expires_at: string | null
          id: string
          impact_preview: Json | null
          module: string | null
          occurrences: number | null
          proposed_action: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggestion_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_resource_id?: string | null
          applied_resource_type?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          expires_at?: string | null
          id?: string
          impact_preview?: Json | null
          module?: string | null
          occurrences?: number | null
          proposed_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_type: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_resource_id?: string | null
          applied_resource_type?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          expires_at?: string | null
          id?: string
          impact_preview?: Json | null
          module?: string | null
          occurrences?: number | null
          proposed_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_clusters: {
        Row: {
          active: boolean
          created_at: string
          criteria: Json | null
          id: string
          maturity_level: string | null
          name: string
          porte: string | null
          segment: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          criteria?: Json | null
          id?: string
          maturity_level?: string | null
          name: string
          porte?: string | null
          segment?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          criteria?: Json | null
          id?: string
          maturity_level?: string | null
          name?: string
          porte?: string | null
          segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      benchmark_metrics: {
        Row: {
          avg_value: number | null
          category: string
          cluster_id: string
          created_at: string
          id: string
          median_value: number | null
          metric_key: string
          p25_value: number | null
          p75_value: number | null
          p90_value: number | null
          period: string | null
          sample_size: number | null
          snapshot_at: string
        }
        Insert: {
          avg_value?: number | null
          category: string
          cluster_id: string
          created_at?: string
          id?: string
          median_value?: number | null
          metric_key: string
          p25_value?: number | null
          p75_value?: number | null
          p90_value?: number | null
          period?: string | null
          sample_size?: number | null
          snapshot_at?: string
        }
        Update: {
          avg_value?: number | null
          category?: string
          cluster_id?: string
          created_at?: string
          id?: string
          median_value?: number | null
          metric_key?: string
          p25_value?: number | null
          p75_value?: number | null
          p90_value?: number | null
          period?: string | null
          sample_size?: number | null
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_metrics_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "benchmark_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_percentile_scores: {
        Row: {
          calculated_at: string
          category: string
          cluster_id: string
          id: string
          metric_key: string
          percentile: number | null
          period: string | null
          tenant_id: string
          tenant_value: number | null
        }
        Insert: {
          calculated_at?: string
          category: string
          cluster_id: string
          id?: string
          metric_key: string
          percentile?: number | null
          period?: string | null
          tenant_id: string
          tenant_value?: number | null
        }
        Update: {
          calculated_at?: string
          category?: string
          cluster_id?: string
          id?: string
          metric_key?: string
          percentile?: number | null
          period?: string | null
          tenant_id?: string
          tenant_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_percentile_scores_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "benchmark_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_percentile_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_recommendations: {
        Row: {
          category: string
          created_at: string
          current_percentile: number | null
          id: string
          metadata: Json | null
          metric_key: string
          priority: number | null
          recommendation: string
          status: string
          target_percentile: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_percentile?: number | null
          id?: string
          metadata?: Json | null
          metric_key: string
          priority?: number | null
          recommendation: string
          status?: string
          target_percentile?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_percentile?: number | null
          id?: string
          metadata?: Json | null
          metric_key?: string
          priority?: number | null
          recommendation?: string
          status?: string
          target_percentile?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_discounts: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          discount_type: string
          ends_at: string | null
          id: string
          reason: string | null
          starts_at: string
          subscription_id: string | null
          tenant_id: string
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          discount_type: string
          ends_at?: string | null
          id?: string
          reason?: string | null
          starts_at?: string
          subscription_id?: string | null
          tenant_id: string
          value: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          discount_type?: string
          ends_at?: string | null
          id?: string
          reason?: string | null
          starts_at?: string
          subscription_id?: string | null
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_dunning_steps: {
        Row: {
          created_at: string
          executed_at: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          reason: string | null
          status: string
          step_level: string
          subscription_id: string | null
          tenant_id: string
          triggered_at: string
        }
        Insert: {
          created_at?: string
          executed_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          reason?: string | null
          status?: string
          step_level: string
          subscription_id?: string | null
          tenant_id: string
          triggered_at?: string
        }
        Update: {
          created_at?: string
          executed_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          reason?: string | null
          status?: string
          step_level?: string
          subscription_id?: string | null
          tenant_id?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_dunning_steps_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_dunning_steps_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_dunning_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      boleto_rates: {
        Row: {
          active: boolean | null
          carencia_dias: number
          created_at: string | null
          id: string
          installments: number
          rate_percent: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          carencia_dias: number
          created_at?: string | null
          id?: string
          installments: number
          rate_percent: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          carencia_dias?: number
          created_at?: string | null
          id?: string
          installments?: number
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boleto_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_global_costs: {
        Row: {
          active: boolean | null
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          unit: string
          updated_at: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          unit: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          active?: boolean | null
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          unit?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_global_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_product_lines: {
        Row: {
          cost_ref_code: string | null
          cost_ref_id: string | null
          created_at: string | null
          id: string
          line_name: string
          line_type: string
          notes: string | null
          position: number | null
          product_id: string
          quantity: number
          subtotal: number | null
          unit: string
          unit_cost: number
        }
        Insert: {
          cost_ref_code?: string | null
          cost_ref_id?: string | null
          created_at?: string | null
          id?: string
          line_name: string
          line_type: string
          notes?: string | null
          position?: number | null
          product_id: string
          quantity?: number
          subtotal?: number | null
          unit: string
          unit_cost?: number
        }
        Update: {
          cost_ref_code?: string | null
          cost_ref_id?: string | null
          created_at?: string | null
          id?: string
          line_name?: string
          line_type?: string
          notes?: string | null
          position?: number | null
          product_id?: string
          quantity?: number
          subtotal?: number | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_product_lines_cost_ref_id_fkey"
            columns: ["cost_ref_id"]
            isOneToOne: false
            referencedRelation: "budget_global_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_product_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "budget_products"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_product_templates: {
        Row: {
          categoria: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_product_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_product_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budget_product_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_products: {
        Row: {
          ambiente: string | null
          budget_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          position: number | null
          quantity: number | null
          total_cost: number | null
          total_price: number | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          ambiente?: string | null
          budget_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          position?: number | null
          quantity?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          ambiente?: string | null
          budget_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number | null
          quantity?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_products_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_template_lines: {
        Row: {
          cost_ref_code: string | null
          cost_ref_id: string | null
          created_at: string | null
          default_quantity: number | null
          id: string
          line_name: string
          line_type: string
          position: number | null
          template_id: string
          unit: string
        }
        Insert: {
          cost_ref_code?: string | null
          cost_ref_id?: string | null
          created_at?: string | null
          default_quantity?: number | null
          id?: string
          line_name: string
          line_type: string
          position?: number | null
          template_id: string
          unit: string
        }
        Update: {
          cost_ref_code?: string | null
          cost_ref_id?: string | null
          created_at?: string | null
          default_quantity?: number | null
          id?: string
          line_name?: string
          line_type?: string
          position?: number | null
          template_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_template_lines_cost_ref_id_fkey"
            columns: ["cost_ref_id"]
            isOneToOne: false
            referencedRelation: "budget_global_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_product_templates"
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
      capacity_preventive_actions: {
        Row: {
          action_code: string
          created_at: string
          execution_mode: string
          id: string
          metadata: Json | null
          reason: string | null
          result: string
          target_code: string
          target_type: string
          triggered_by: string | null
        }
        Insert: {
          action_code: string
          created_at?: string
          execution_mode?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          result?: string
          target_code: string
          target_type: string
          triggered_by?: string | null
        }
        Update: {
          action_code?: string
          created_at?: string
          execution_mode?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          result?: string
          target_code?: string
          target_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      capacity_risk_scores: {
        Row: {
          capacity_risk_score: number
          contributing_factors: Json | null
          id: string
          recommended_action: string | null
          severity_band: string
          target_code: string
          target_type: string
          updated_at: string
        }
        Insert: {
          capacity_risk_score?: number
          contributing_factors?: Json | null
          id?: string
          recommended_action?: string | null
          severity_band?: string
          target_code: string
          target_type: string
          updated_at?: string
        }
        Update: {
          capacity_risk_score?: number
          contributing_factors?: Json | null
          id?: string
          recommended_action?: string | null
          severity_band?: string
          target_code?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      capacity_risk_signals: {
        Row: {
          baseline_value: number
          created_at: string
          deviation_percent: number
          id: string
          metadata: Json | null
          signal_type: string
          signal_value: number
          target_code: string
          target_type: string
        }
        Insert: {
          baseline_value?: number
          created_at?: string
          deviation_percent?: number
          id?: string
          metadata?: Json | null
          signal_type: string
          signal_value?: number
          target_code: string
          target_type: string
        }
        Update: {
          baseline_value?: number
          created_at?: string
          deviation_percent?: number
          id?: string
          metadata?: Json | null
          signal_type?: string
          signal_value?: number
          target_code?: string
          target_type?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          bairro: string | null
          boleto_status: string | null
          cep: string | null
          city: string | null
          complemento: string | null
          contato_financeiro: string | null
          contribuinte_icms: boolean | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          email_financeiro: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          isento_ie: boolean | null
          logradouro: string | null
          name: string
          nome_fantasia: string | null
          notes: string | null
          numero: string | null
          phone: string | null
          razao_social: string | null
          state: string | null
          telefone_fixo: string | null
          tenant_id: string | null
          tipo_pessoa: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          bairro?: string | null
          boleto_status?: string | null
          cep?: string | null
          city?: string | null
          complemento?: string | null
          contato_financeiro?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          email_financeiro?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          isento_ie?: boolean | null
          logradouro?: string | null
          name: string
          nome_fantasia?: string | null
          notes?: string | null
          numero?: string | null
          phone?: string | null
          razao_social?: string | null
          state?: string | null
          telefone_fixo?: string | null
          tenant_id?: string | null
          tipo_pessoa?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          bairro?: string | null
          boleto_status?: string | null
          cep?: string | null
          city?: string | null
          complemento?: string | null
          contato_financeiro?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          email_financeiro?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          isento_ie?: boolean | null
          logradouro?: string | null
          name?: string
          nome_fantasia?: string | null
          notes?: string | null
          numero?: string | null
          phone?: string | null
          razao_social?: string | null
          state?: string | null
          telefone_fixo?: string | null
          tenant_id?: string | null
          tipo_pessoa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          cnpj: string | null
          company_name: string
          created_at: string
          default_project_budget_percent: number
          email: string | null
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          min_safety_balance: number | null
          onboarding_completed: boolean
          phone: string | null
          primary_color: string | null
          razao_social: string | null
          tax_regime: string
          tenant_id: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          cnpj?: string | null
          company_name?: string
          created_at?: string
          default_project_budget_percent?: number
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          min_safety_balance?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          primary_color?: string | null
          razao_social?: string | null
          tax_regime?: string
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          cnpj?: string | null
          company_name?: string
          created_at?: string
          default_project_budget_percent?: number
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          min_safety_balance?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          primary_color?: string | null
          razao_social?: string | null
          tax_regime?: string
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      config_base_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          snapshot: Json
          template_type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          snapshot?: Json
          template_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          snapshot?: Json
          template_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      config_divergence_log: {
        Row: {
          changed_by: string | null
          created_at: string
          current_value: string | null
          divergence_type: string
          id: string
          original_value: string | null
          target_key: string
          template_type: string
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          current_value?: string | null
          divergence_type: string
          id?: string
          original_value?: string | null
          target_key: string
          template_type: string
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          current_value?: string | null
          divergence_type?: string
          id?: string
          original_value?: string | null
          target_key?: string
          template_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_divergence_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      config_structural_locks: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          module_key: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          module_key: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          module_key?: string
          reason?: string | null
        }
        Relationships: []
      }
      config_tenant_overrides: {
        Row: {
          changed_by: string | null
          created_at: string
          custom_value: string | null
          id: string
          is_locked: boolean
          original_value: string | null
          override_type: string
          target_key: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          custom_value?: string | null
          id?: string
          is_locked?: boolean
          original_value?: string | null
          override_type: string
          target_key: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          custom_value?: string | null
          id?: string
          is_locked?: boolean
          original_value?: string | null
          override_type?: string
          target_key?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_tenant_overrides_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "config_base_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_tenant_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contextual_help: {
        Row: {
          common_errors: Json | null
          created_at: string | null
          description: string | null
          faq: Json | null
          how_to_fix: Json | null
          id: string
          screen_key: string
          title: string
          updated_at: string | null
          when_to_open_support: string | null
        }
        Insert: {
          common_errors?: Json | null
          created_at?: string | null
          description?: string | null
          faq?: Json | null
          how_to_fix?: Json | null
          id?: string
          screen_key: string
          title: string
          updated_at?: string | null
          when_to_open_support?: string | null
        }
        Update: {
          common_errors?: Json | null
          created_at?: string | null
          description?: string | null
          faq?: Json | null
          how_to_fix?: Json | null
          id?: string
          screen_key?: string
          title?: string
          updated_at?: string | null
          when_to_open_support?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string | null
          contract_number: number
          contract_type: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_condition: string | null
          quote_id: string | null
          signed_at: string | null
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          total_value: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          contract_number?: number
          contract_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_condition?: string | null
          quote_id?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          contract_number?: number
          contract_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_condition?: string | null
          quote_id?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contracts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_center_tags: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_center_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_rates: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          installments: number
          rate_percent: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments: number
          rate_percent: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments?: number
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "crm_deal_history_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          followup_count: number | null
          followup_enabled: boolean | null
          from_ai: boolean | null
          group_invite_sent: boolean | null
          group_invite_sent_at: string | null
          id: string
          last_followup_at: string | null
          last_interaction: string | null
          lead_id: string | null
          lost_note: string | null
          lost_reason: string | null
          max_followups: number | null
          note: string | null
          owner_id: string | null
          pipeline_id: string
          product_type: string | null
          scheduled_call: string | null
          stage_entered_at: string | null
          stage_id: string
          stage_position: number | null
          status: string | null
          tenant_id: string | null
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
          followup_count?: number | null
          followup_enabled?: boolean | null
          from_ai?: boolean | null
          group_invite_sent?: boolean | null
          group_invite_sent_at?: string | null
          id?: string
          last_followup_at?: string | null
          last_interaction?: string | null
          lead_id?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          max_followups?: number | null
          note?: string | null
          owner_id?: string | null
          pipeline_id: string
          product_type?: string | null
          scheduled_call?: string | null
          stage_entered_at?: string | null
          stage_id: string
          stage_position?: number | null
          status?: string | null
          tenant_id?: string | null
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
          followup_count?: number | null
          followup_enabled?: boolean | null
          from_ai?: boolean | null
          group_invite_sent?: boolean | null
          group_invite_sent_at?: string | null
          id?: string
          last_followup_at?: string | null
          last_interaction?: string | null
          lead_id?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          max_followups?: number | null
          note?: string | null
          owner_id?: string | null
          pipeline_id?: string
          product_type?: string | null
          scheduled_call?: string | null
          stage_entered_at?: string | null
          stage_id?: string
          stage_position?: number | null
          status?: string | null
          tenant_id?: string | null
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
            foreignKeyName: "crm_deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "crm_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposal_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_days: number | null
          id: string
          notes: string | null
          payment_condition: string | null
          proposal_id: string
          value: number | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_condition?: string | null
          proposal_id: string
          value?: number | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_condition?: string | null
          proposal_id?: string
          value?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "crm_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposals: {
        Row: {
          created_at: string | null
          created_by: string | null
          deal_id: string
          delivery_days: number | null
          id: string
          notes: string | null
          payment_condition: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          value: number | null
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_condition?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: number | null
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_condition?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: number | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_revenue_forecast: {
        Row: {
          created_at: string | null
          deal_id: string
          gross_value: number | null
          id: string
          probability_percent: number | null
          project_id: string | null
          reference_month: string
          tenant_id: string | null
          updated_at: string | null
          weighted_value: number | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          gross_value?: number | null
          id?: string
          probability_percent?: number | null
          project_id?: string | null
          reference_month: string
          tenant_id?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          gross_value?: number | null
          id?: string
          probability_percent?: number | null
          project_id?: string | null
          reference_month?: string
          tenant_id?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_revenue_forecast_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_revenue_forecast_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_revenue_forecast_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          cadence_id: string | null
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
          probability_percent: number | null
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
          probability_percent?: number | null
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
          probability_percent?: number | null
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
          archived_at: string | null
          audio_url: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string
          due_at: string
          id: string
          last_error: string | null
          note: string | null
          origem_modulo: string | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
          tipo_tarefa: string
          title: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          archived_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          due_at: string
          id?: string
          last_error?: string | null
          note?: string | null
          origem_modulo?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          tipo_tarefa?: string
          title: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          archived_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          due_at?: string
          id?: string
          last_error?: string | null
          note?: string | null
          origem_modulo?: string | null
          processed_at?: string | null
          retry_count?: number | null
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
          source_history_id: string | null
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
          source_history_id?: string | null
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
          source_history_id?: string | null
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
            foreignKeyName: "crm_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
      cross_module_events: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          source_entity: string
          source_entity_id: string
          source_module: string
          status: string
          target_entity: string | null
          target_entity_id: string | null
          target_module: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          source_entity: string
          source_entity_id: string
          source_module: string
          status?: string
          target_entity?: string | null
          target_entity_id?: string | null
          target_module: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          source_entity?: string
          source_entity_id?: string
          source_module?: string
          status?: string
          target_entity?: string | null
          target_entity_id?: string | null
          target_module?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_module_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_module_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cross_module_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activation: {
        Row: {
          completed_at: string | null
          created_at: string
          days_to_activate: number | null
          id: string
          milestone_key: string
          milestone_name: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          days_to_activate?: number | null
          id?: string
          milestone_key: string
          milestone_name: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          days_to_activate?: number | null
          id?: string
          milestone_key?: string
          milestone_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_activation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_adoption: {
        Row: {
          active_users: number
          adoption_score: number
          created_at: string
          days_without_use: number
          features_used: Json | null
          id: string
          modules_used: Json | null
          period_month: string
          tenant_id: string
        }
        Insert: {
          active_users?: number
          adoption_score?: number
          created_at?: string
          days_without_use?: number
          features_used?: Json | null
          id?: string
          modules_used?: Json | null
          period_month?: string
          tenant_id: string
        }
        Update: {
          active_users?: number
          adoption_score?: number
          created_at?: string
          days_without_use?: number
          features_used?: Json | null
          id?: string
          modules_used?: Json | null
          period_month?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_adoption_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_expansion_opportunities: {
        Row: {
          converted_at: string | null
          created_at: string
          description: string | null
          estimated_value: number | null
          id: string
          metadata: Json | null
          opportunity_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          opportunity_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          metadata?: Json | null
          opportunity_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_expansion_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_health_scores: {
        Row: {
          access_score: number
          activation_score: number
          calculated_at: string
          churn_risk_band: string | null
          churn_risk_score: number | null
          classification: string | null
          created_at: string
          dre_score: number
          engagement_band: string | null
          engagement_score: number | null
          expansion_ready_score: number | null
          id: string
          lifecycle_health_index: number | null
          lifecycle_updated_at: string | null
          maturity_stage: string | null
          payment_score: number
          reconciliation_score: number
          support_score: number
          tenant_id: string
          total_score: number | null
          usage_score: number
        }
        Insert: {
          access_score?: number
          activation_score?: number
          calculated_at?: string
          churn_risk_band?: string | null
          churn_risk_score?: number | null
          classification?: string | null
          created_at?: string
          dre_score?: number
          engagement_band?: string | null
          engagement_score?: number | null
          expansion_ready_score?: number | null
          id?: string
          lifecycle_health_index?: number | null
          lifecycle_updated_at?: string | null
          maturity_stage?: string | null
          payment_score?: number
          reconciliation_score?: number
          support_score?: number
          tenant_id: string
          total_score?: number | null
          usage_score?: number
        }
        Update: {
          access_score?: number
          activation_score?: number
          calculated_at?: string
          churn_risk_band?: string | null
          churn_risk_score?: number | null
          classification?: string | null
          created_at?: string
          dre_score?: number
          engagement_band?: string | null
          engagement_score?: number | null
          expansion_ready_score?: number | null
          id?: string
          lifecycle_health_index?: number | null
          lifecycle_updated_at?: string | null
          maturity_stage?: string | null
          payment_score?: number
          reconciliation_score?: number
          support_score?: number
          tenant_id?: string
          total_score?: number | null
          usage_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_health_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interventions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          intervention_type: string
          metadata: Json | null
          playbook_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intervention_type: string
          metadata?: Json | null
          playbook_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intervention_type?: string
          metadata?: Json | null
          playbook_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interventions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "success_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interventions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_onboarding: {
        Row: {
          chart_template: string | null
          completed_at: string | null
          created_at: string
          financial_maturity: string | null
          first_dashboard: boolean
          first_dashboard_at: string | null
          first_dre: boolean
          first_dre_at: string | null
          first_import: boolean
          first_import_at: string | null
          first_reconciliation: boolean
          first_reconciliation_at: string | null
          id: string
          primary_goal: string | null
          progress_pct: number | null
          segment: string | null
          setup_completed: boolean
          setup_completed_at: string | null
          started_at: string | null
          team_size: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          chart_template?: string | null
          completed_at?: string | null
          created_at?: string
          financial_maturity?: string | null
          first_dashboard?: boolean
          first_dashboard_at?: string | null
          first_dre?: boolean
          first_dre_at?: string | null
          first_import?: boolean
          first_import_at?: string | null
          first_reconciliation?: boolean
          first_reconciliation_at?: string | null
          id?: string
          primary_goal?: string | null
          progress_pct?: number | null
          segment?: string | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          started_at?: string | null
          team_size?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          chart_template?: string | null
          completed_at?: string | null
          created_at?: string
          financial_maturity?: string | null
          first_dashboard?: boolean
          first_dashboard_at?: string | null
          first_dre?: boolean
          first_dre_at?: string | null
          first_import?: boolean
          first_import_at?: string | null
          first_reconciliation?: boolean
          first_reconciliation_at?: string | null
          id?: string
          primary_goal?: string | null
          progress_pct?: number | null
          segment?: string | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          started_at?: string | null
          team_size?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_retention_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_retention_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          filtros?: Json | null
          id?: string
          layout?: Json
          nome: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          filtros?: Json | null
          id?: string
          layout?: Json
          nome?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_personalizados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_warnings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          message: string
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          severity: string
          status: string
          tenant_id: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          message: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          warning_type?: string
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
      decision_engine_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      decision_engine_executions: {
        Row: {
          action_payload: Json | null
          action_type: string
          confidence_band: string | null
          confidence_score: number | null
          error_message: string | null
          event_id: string | null
          event_type: string
          executed_at: string
          id: string
          result: Json | null
          rule_id: string | null
          rule_name: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          confidence_band?: string | null
          confidence_score?: number | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          executed_at?: string
          id?: string
          result?: Json | null
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          confidence_band?: string | null
          confidence_score?: number | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          executed_at?: string
          id?: string
          result?: Json | null
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_engine_executions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "decision_engine_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_engine_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "decision_engine_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_engine_rules: {
        Row: {
          action: Json
          active: boolean
          condition: Json
          confidence_band: string
          confidence_score: number
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          execution_count: number
          id: string
          is_system: boolean
          last_executed_at: string | null
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          action?: Json
          active?: boolean
          condition?: Json
          confidence_band?: string
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          execution_count?: number
          id?: string
          is_system?: boolean
          last_executed_at?: string | null
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          action?: Json
          active?: boolean
          condition?: Json
          confidence_band?: string
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          execution_count?: number
          id?: string
          is_system?: boolean
          last_executed_at?: string | null
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      deleted_records: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_by_name: string | null
          deletion_reason: string | null
          id: string
          original_data: Json
          original_id: string
          original_table: string
          record_identifier: string | null
          record_type: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_by_name?: string | null
          deletion_reason?: string | null
          id?: string
          original_data: Json
          original_id: string
          original_table: string
          record_identifier?: string | null
          record_type: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_by_name?: string | null
          deletion_reason?: string | null
          id?: string
          original_data?: Json
          original_id?: string
          original_table?: string
          record_identifier?: string | null
          record_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deleted_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          delivered_date: string | null
          endereco: string | null
          id: string
          motorista: string | null
          observacoes: string | null
          order_id: string
          production_order_id: string | null
          proof_file_url: string | null
          recebido_por: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string
          transportadora: string | null
          updated_at: string
          veiculo: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          delivered_date?: string | null
          endereco?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          order_id: string
          production_order_id?: string | null
          proof_file_url?: string | null
          recebido_por?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          transportadora?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          delivered_date?: string | null
          endereco?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          order_id?: string
          production_order_id?: string | null
          proof_file_url?: string | null
          recebido_por?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          transportadora?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dependency_impact_events: {
        Row: {
          cascade_depth: number
          created_at: string
          detected_at: string
          failed_module_code: string
          id: string
          impact_level: string
          impact_status: string
          impacted_module_code: string
          incident_group_id: string | null
          metadata: Json | null
          resolved_at: string | null
          root_cause_candidate: boolean
          source_event_type: string | null
        }
        Insert: {
          cascade_depth?: number
          created_at?: string
          detected_at?: string
          failed_module_code: string
          id?: string
          impact_level?: string
          impact_status?: string
          impacted_module_code: string
          incident_group_id?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          root_cause_candidate?: boolean
          source_event_type?: string | null
        }
        Update: {
          cascade_depth?: number
          created_at?: string
          detected_at?: string
          failed_module_code?: string
          id?: string
          impact_level?: string
          impact_status?: string
          impacted_module_code?: string
          incident_group_id?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          root_cause_candidate?: boolean
          source_event_type?: string | null
        }
        Relationships: []
      }
      dependency_impact_rules: {
        Row: {
          active: boolean
          condition_type: string
          created_at: string
          id: string
          impact_level: string
          propagation_depth: number
          source_module_code: string
          target_module_code: string
          threshold: Json | null
        }
        Insert: {
          active?: boolean
          condition_type?: string
          created_at?: string
          id?: string
          impact_level?: string
          propagation_depth?: number
          source_module_code: string
          target_module_code: string
          threshold?: Json | null
        }
        Update: {
          active?: boolean
          condition_type?: string
          created_at?: string
          id?: string
          impact_level?: string
          propagation_depth?: number
          source_module_code?: string
          target_module_code?: string
          threshold?: Json | null
        }
        Relationships: []
      }
      dependency_impact_snapshots: {
        Row: {
          active_incidents: number
          cascade_depth_max: number
          causing_count: number
          current_impact_score: number
          id: string
          impacted_by_count: number
          is_root_cause_active: boolean
          metadata: Json | null
          module_code: string
          severity_class: string
          updated_at: string
        }
        Insert: {
          active_incidents?: number
          cascade_depth_max?: number
          causing_count?: number
          current_impact_score?: number
          id?: string
          impacted_by_count?: number
          is_root_cause_active?: boolean
          metadata?: Json | null
          module_code: string
          severity_class?: string
          updated_at?: string
        }
        Update: {
          active_incidents?: number
          cascade_depth_max?: number
          causing_count?: number
          current_impact_score?: number
          id?: string
          impacted_by_count?: number
          is_root_cause_active?: boolean
          metadata?: Json | null
          module_code?: string
          severity_class?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_rules: {
        Row: {
          active: boolean
          condition: Json | null
          created_at: string
          description: string | null
          detection_type: string
          id: string
          module: string
          name: string
          probable_cause: string | null
          recommended_action: string | null
          related_article_id: string | null
          related_tutorial_id: string | null
          trigger_count: number
        }
        Insert: {
          active?: boolean
          condition?: Json | null
          created_at?: string
          description?: string | null
          detection_type: string
          id?: string
          module: string
          name: string
          probable_cause?: string | null
          recommended_action?: string | null
          related_article_id?: string | null
          related_tutorial_id?: string | null
          trigger_count?: number
        }
        Update: {
          active?: boolean
          condition?: Json | null
          created_at?: string
          description?: string | null
          detection_type?: string
          id?: string
          module?: string
          name?: string
          probable_cause?: string | null
          recommended_action?: string | null
          related_article_id?: string | null
          related_tutorial_id?: string | null
          trigger_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_rules_related_article_id_fkey"
            columns: ["related_article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_rules_related_tutorial_id_fkey"
            columns: ["related_tutorial_id"]
            isOneToOne: false
            referencedRelation: "guided_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_session_items: {
        Row: {
          client_name: string
          client_phone: string | null
          created_at: string | null
          deal_id: string
          error_message: string | null
          followup_number: number | null
          id: string
          processed_at: string | null
          processing_started_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          deal_id: string
          error_message?: string | null
          followup_number?: number | null
          id?: string
          processed_at?: string | null
          processing_started_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          deal_id?: string
          error_message?: string | null
          followup_number?: number | null
          id?: string
          processed_at?: string | null
          processing_started_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dispatch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sessions: {
        Row: {
          avg_time_per_lead_ms: number | null
          completed_at: string | null
          created_at: string | null
          estimated_duration_seconds: number | null
          failed_count: number
          id: string
          metadata: Json | null
          processed: number
          skipped_count: number
          source: string
          started_at: string | null
          status: string
          success_count: number
          tenant_id: string | null
          total_leads: number
          type: string
        }
        Insert: {
          avg_time_per_lead_ms?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_duration_seconds?: number | null
          failed_count?: number
          id?: string
          metadata?: Json | null
          processed?: number
          skipped_count?: number
          source?: string
          started_at?: string | null
          status?: string
          success_count?: number
          tenant_id?: string | null
          total_leads?: number
          type: string
        }
        Update: {
          avg_time_per_lead_ms?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_duration_seconds?: number | null
          failed_count?: number
          id?: string
          metadata?: Json | null
          processed?: number
          skipped_count?: number
          source?: string
          started_at?: string | null
          status?: string
          success_count?: number
          tenant_id?: string | null
          total_leads?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      education_certifications: {
        Row: {
          certified_at: string
          created_at: string
          criteria_snapshot: Json | null
          id: string
          level: string
          score: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          certified_at?: string
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          level?: string
          score?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          certified_at?: string
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          level?: string
          score?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      education_completion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          module_id: string | null
          tenant_id: string | null
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          tenant_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          tenant_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_completion_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "education_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_completion_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_completion_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "education_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      education_modules: {
        Row: {
          active: boolean
          content: string | null
          created_at: string
          id: string
          lesson_type: string
          position: number
          screen_key: string | null
          title: string
          track_id: string
        }
        Insert: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          lesson_type?: string
          position?: number
          screen_key?: string | null
          title: string
          track_id: string
        }
        Update: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          lesson_type?: string
          position?: number
          screen_key?: string | null
          title?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "education_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      education_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          current_module: number
          id: string
          started_at: string
          tenant_id: string | null
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          current_module?: number
          id?: string
          started_at?: string
          tenant_id?: string | null
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          current_module?: number
          id?: string
          started_at?: string
          tenant_id?: string | null
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "education_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      education_recommendations: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          recommendation: string
          related_track_id: string | null
          screen_key: string | null
          status: string
          tenant_id: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          recommendation: string
          related_track_id?: string | null
          screen_key?: string | null
          status?: string
          tenant_id: string
          trigger_type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          recommendation?: string
          related_track_id?: string | null
          screen_key?: string | null
          status?: string
          tenant_id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_recommendations_related_track_id_fkey"
            columns: ["related_track_id"]
            isOneToOne: false
            referencedRelation: "education_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      education_tracks: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          difficulty: string
          id: string
          title: string
          total_modules: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          title: string
          total_modules?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          title?: string
          total_modules?: number
          updated_at?: string
        }
        Relationships: []
      }
      entitlement_access_log: {
        Row: {
          allowed: boolean
          context: Json | null
          created_at: string
          entitlement_code: string
          id: string
          reason: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          allowed: boolean
          context?: Json | null
          created_at?: string
          entitlement_code: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          allowed?: boolean
          context?: Json | null
          created_at?: string
          entitlement_code?: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      entitlement_catalog: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_limit: number | null
          description: string | null
          entitlement_group: string
          id: string
          is_core: boolean
          is_limit_based: boolean
          is_premium: boolean
          metadata: Json
          name: string
          type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_limit?: number | null
          description?: string | null
          entitlement_group?: string
          id?: string
          is_core?: boolean
          is_limit_based?: boolean
          is_premium?: boolean
          metadata?: Json
          name: string
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_limit?: number | null
          description?: string | null
          entitlement_group?: string
          id?: string
          is_core?: boolean
          is_limit_based?: boolean
          is_premium?: boolean
          metadata?: Json
          name?: string
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_document_rules: {
        Row: {
          active: boolean | null
          condition_field: string | null
          condition_operator: string | null
          condition_value: string | null
          created_at: string | null
          description: string | null
          document_type: string
          entity_table: string
          id: string
          is_mandatory: boolean | null
          module: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          entity_table: string
          id?: string
          is_mandatory?: boolean | null
          module: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          entity_table?: string
          id?: string
          is_mandatory?: boolean | null
          module?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_document_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_documents: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_type: string
          entity_id: string
          entity_table: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_deleted: boolean | null
          is_required: boolean | null
          mime_type: string | null
          module: string
          notes: string | null
          replaced_by: string | null
          tenant_id: string | null
          updated_at: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_type: string
          entity_id: string
          entity_table: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          mime_type?: string | null
          module: string
          notes?: string | null
          replaced_by?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_type?: string
          entity_id?: string
          entity_table?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_deleted?: boolean | null
          is_required?: boolean | null
          mime_type?: string | null
          module?: string
          notes?: string | null
          replaced_by?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_documents_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "erp_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_notifications: {
        Row: {
          category: string
          channel: string | null
          created_at: string | null
          entity_id: string | null
          entity_table: string | null
          generated_by: string | null
          id: string
          is_read: boolean | null
          link_path: string | null
          message: string | null
          module: string
          priority: string | null
          read_at: string | null
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: string
          channel?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_table?: string | null
          generated_by?: string | null
          id?: string
          is_read?: boolean | null
          link_path?: string | null
          message?: string | null
          module: string
          priority?: string | null
          read_at?: string | null
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_table?: string | null
          generated_by?: string | null
          id?: string
          is_read?: boolean | null
          link_path?: string | null
          message?: string | null
          module?: string
          priority?: string | null
          read_at?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_tasks: {
        Row: {
          assignee_id: string
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by_id: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_table: string | null
          id: string
          link_path: string | null
          module: string
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id: string
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          link_path?: string | null
          module: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          link_path?: string | null
          module?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_priority_registry: {
        Row: {
          completion_score: number
          dependency_count: number
          dependency_score: number
          execution_priority_index: number
          id: string
          impact_score: number
          impacted_count: number
          incident_count: number
          incident_score: number
          integration_score: number
          layer_code: string
          priority_level: string
          priority_reason: string | null
          updated_at: string
          visibility_score: number
        }
        Insert: {
          completion_score?: number
          dependency_count?: number
          dependency_score?: number
          execution_priority_index?: number
          id?: string
          impact_score?: number
          impacted_count?: number
          incident_count?: number
          incident_score?: number
          integration_score?: number
          layer_code: string
          priority_level?: string
          priority_reason?: string | null
          updated_at?: string
          visibility_score?: number
        }
        Update: {
          completion_score?: number
          dependency_count?: number
          dependency_score?: number
          execution_priority_index?: number
          id?: string
          impact_score?: number
          impacted_count?: number
          incident_count?: number
          incident_score?: number
          integration_score?: number
          layer_code?: string
          priority_level?: string
          priority_reason?: string | null
          updated_at?: string
          visibility_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "execution_priority_registry_layer_code_fkey"
            columns: ["layer_code"]
            isOneToOne: true
            referencedRelation: "architecture_layers_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      expansion_signals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          limit_value: number | null
          metadata: Json | null
          recommended_action: string | null
          signal_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          recommended_action?: string | null
          signal_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          recommended_action?: string | null
          signal_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expansion_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_dynamic_items: {
        Row: {
          active: boolean
          answer: string
          category: string
          created_at: string
          frequency: number
          id: string
          question: string
          source_reference: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          category: string
          created_at?: string
          frequency?: number
          id?: string
          question: string
          source_reference?: string | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          category?: string
          created_at?: string
          frequency?: number
          id?: string
          question?: string
          source_reference?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flag_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          flag_id: string
          id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_id: string
          id?: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_id?: string
          id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          metadata: Json | null
          module: string | null
          name: string
          pilot_tenant_ids: string[] | null
          release_id: string | null
          rollout_percentage: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          metadata?: Json | null
          module?: string | null
          name: string
          pilot_tenant_ids?: string[] | null
          release_id?: string | null
          rollout_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          metadata?: Json | null
          module?: string | null
          name?: string
          pilot_tenant_ids?: string[] | null
          release_id?: string | null
          rollout_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "system_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_supplier_configs: {
        Row: {
          created_at: string | null
          fee_type: string
          id: string
          supplier_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fee_type: string
          id?: string
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fee_type?: string
          id?: string
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_supplier_configs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_supplier_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_assets: {
        Row: {
          acquisition_date: string
          acquisition_value: number
          category: string | null
          chart_account_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          current_book_value: number | null
          depreciation_method: string | null
          description: string | null
          id: string
          ledger_entry_id: string | null
          name: string
          notes: string | null
          payable_id: string | null
          project_id: string | null
          residual_value: number | null
          status: string | null
          supplier_id: string | null
          tenant_id: string | null
          updated_at: string | null
          useful_life_months: number
        }
        Insert: {
          acquisition_date: string
          acquisition_value: number
          category?: string | null
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_book_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          id?: string
          ledger_entry_id?: string | null
          name: string
          notes?: string | null
          payable_id?: string | null
          project_id?: string | null
          residual_value?: number | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          useful_life_months?: number
        }
        Update: {
          acquisition_date?: string
          acquisition_value?: number
          category?: string | null
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_book_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          id?: string
          ledger_entry_id?: string | null
          name?: string
          notes?: string | null
          payable_id?: string | null
          project_id?: string | null
          residual_value?: number | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_assets_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_assets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_assets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_attachments: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          tenant_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_automation_logs: {
        Row: {
          action_result: Json | null
          action_type: string
          created_at: string | null
          error_message: string | null
          event_type: string
          execution_time_ms: number | null
          id: string
          rule_id: string | null
          source_id: string | null
          source_table: string | null
          status: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action_result?: Json | null
          action_type: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_result?: Json | null
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "fin_event_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_bank_accounts: {
        Row: {
          account_number: string | null
          active: boolean | null
          agency: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          nickname: string
          opening_balance: number | null
          opening_balance_date: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          active?: boolean | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          nickname: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          active?: boolean | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          nickname?: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string
          bank_memo: string | null
          bank_transaction_id: string
          classification_reason: string | null
          classification_score: number | null
          classification_status: string | null
          created_at: string | null
          date: string
          direction: string
          duplicate_of_id: string | null
          file_hash: string | null
          id: string
          import_batch_id: string | null
          is_duplicate: boolean | null
          raw_data: Json | null
          reconciliation_method: string | null
          reconciliation_score: number | null
          status: string | null
          suggested_chart_account_id: string | null
          suggested_cost_center_id: string | null
          suggested_project_id: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_account_id: string
          bank_memo?: string | null
          bank_transaction_id: string
          classification_reason?: string | null
          classification_score?: number | null
          classification_status?: string | null
          created_at?: string | null
          date: string
          direction: string
          duplicate_of_id?: string | null
          file_hash?: string | null
          id?: string
          import_batch_id?: string | null
          is_duplicate?: boolean | null
          raw_data?: Json | null
          reconciliation_method?: string | null
          reconciliation_score?: number | null
          status?: string | null
          suggested_chart_account_id?: string | null
          suggested_cost_center_id?: string | null
          suggested_project_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string
          bank_memo?: string | null
          bank_transaction_id?: string
          classification_reason?: string | null
          classification_score?: number | null
          classification_status?: string | null
          created_at?: string | null
          date?: string
          direction?: string
          duplicate_of_id?: string | null
          file_hash?: string | null
          id?: string
          import_batch_id?: string | null
          is_duplicate?: boolean | null
          raw_data?: Json | null
          reconciliation_method?: string | null
          reconciliation_score?: number | null
          status?: string | null
          suggested_chart_account_id?: string | null
          suggested_cost_center_id?: string | null
          suggested_project_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_transactions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_transactions_suggested_chart_account_id_fkey"
            columns: ["suggested_chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_transactions_suggested_cost_center_id_fkey"
            columns: ["suggested_cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_transactions_suggested_project_id_fkey"
            columns: ["suggested_project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_budgets: {
        Row: {
          amount: number
          budget_type: string
          chart_account_id: string | null
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          month: number
          notes: string | null
          order_id: string | null
          project_id: string | null
          tenant_id: string | null
          updated_at: string | null
          vendedor_id: string | null
          version: number | null
          version_label: string
          year: number
        }
        Insert: {
          amount: number
          budget_type?: string
          chart_account_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          order_id?: string | null
          project_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          version?: number | null
          version_label?: string
          year: number
        }
        Update: {
          amount?: number
          budget_type?: string
          chart_account_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          order_id?: string | null
          project_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          version?: number | null
          version_label?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_budgets_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_budgets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_business_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          event_data: Json | null
          event_type: string
          id: string
          processed_at: string | null
          processing_result: Json | null
          processing_status: string | null
          source_id: string
          source_table: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          processed_at?: string | null
          processing_result?: Json | null
          processing_status?: string | null
          source_id: string
          source_table: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          processed_at?: string | null
          processing_result?: Json | null
          processing_status?: string | null
          source_id?: string
          source_table?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_business_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_chart_accounts: {
        Row: {
          active: boolean | null
          auto_generate_payable: boolean
          code: string
          created_at: string | null
          dre_order: number | null
          grupo_fluxo: string | null
          id: string
          in_cashflow: boolean | null
          in_dre: boolean | null
          is_core: boolean
          name: string
          nature: string | null
          pai_codigo: string | null
          parent_id: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          auto_generate_payable?: boolean
          code: string
          created_at?: string | null
          dre_order?: number | null
          grupo_fluxo?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          is_core?: boolean
          name: string
          nature?: string | null
          pai_codigo?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          auto_generate_payable?: boolean
          code?: string
          created_at?: string | null
          dre_order?: number | null
          grupo_fluxo?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          is_core?: boolean
          name?: string
          nature?: string | null
          pai_codigo?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_chart_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_chart_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_classification_history: {
        Row: {
          amount_range: string | null
          bank_account_id: string | null
          chart_account_id: string | null
          confirmation_count: number | null
          cost_center_id: string | null
          created_at: string | null
          entry_type: string | null
          id: string
          in_cashflow: boolean | null
          in_dre: boolean | null
          last_confirmed_at: string | null
          last_confirmed_by: string | null
          nature: string | null
          normalized_description: string
          origin: string | null
          original_description: string
          party_id: string | null
          party_name: string | null
          party_type: string | null
          project_id: string | null
          strength: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_range?: string | null
          bank_account_id?: string | null
          chart_account_id?: string | null
          confirmation_count?: number | null
          cost_center_id?: string | null
          created_at?: string | null
          entry_type?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          last_confirmed_at?: string | null
          last_confirmed_by?: string | null
          nature?: string | null
          normalized_description: string
          origin?: string | null
          original_description: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          project_id?: string | null
          strength?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_range?: string | null
          bank_account_id?: string | null
          chart_account_id?: string | null
          confirmation_count?: number | null
          cost_center_id?: string | null
          created_at?: string | null
          entry_type?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          last_confirmed_at?: string | null
          last_confirmed_by?: string | null
          nature?: string | null
          normalized_description?: string
          origin?: string | null
          original_description?: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          project_id?: string | null
          strength?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_classification_history_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_history_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_classification_rules: {
        Row: {
          active: boolean | null
          auto_promoted: boolean | null
          chart_account_id: string | null
          confidence_base: number
          confirmation_count: number | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          in_cashflow: boolean | null
          in_dre: boolean | null
          match_field: string
          match_operator: string
          match_value: string
          nature: string | null
          priority: number
          project_id: string | null
          rule_type: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auto_promoted?: boolean | null
          chart_account_id?: string | null
          confidence_base?: number
          confirmation_count?: number | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          match_field?: string
          match_operator?: string
          match_value: string
          nature?: string | null
          priority?: number
          project_id?: string | null
          rule_type?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auto_promoted?: boolean | null
          chart_account_id?: string | null
          confidence_base?: number
          confirmation_count?: number | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          in_cashflow?: boolean | null
          in_dre?: boolean | null
          match_field?: string
          match_operator?: string
          match_value?: string
          nature?: string | null
          priority?: number
          project_id?: string | null
          rule_type?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_classification_rules_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_classification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cost_centers: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          id: string
          is_system_default: boolean
          name: string
          owner_id: string | null
          parent_id: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          owner_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_cost_centers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_depreciation_schedule: {
        Row: {
          accumulated: number
          amount: number
          asset_id: string
          created_at: string | null
          id: string
          ledger_entry_id: string | null
          period_date: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          accumulated?: number
          amount: number
          asset_id: string
          created_at?: string | null
          id?: string
          ledger_entry_id?: string | null
          period_date: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          accumulated?: number
          amount?: number
          asset_id?: string
          created_at?: string | null
          id?: string
          ledger_entry_id?: string | null
          period_date?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_depreciation_schedule_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fin_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_depreciation_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_event_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          active: boolean
          chart_account_id: string | null
          condition_field: string | null
          condition_operator: string | null
          condition_value: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          notes: string | null
          priority: number
          project_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_config?: Json
          action_type: string
          active?: boolean
          chart_account_id?: string | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          notes?: string | null
          priority?: number
          project_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          active?: boolean
          chart_account_id?: string | null
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          priority?: number
          project_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_event_automation_rules_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_event_automation_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_event_automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_event_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_executive_kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          kpi_group: string
          kpi_name: string
          notes: string | null
          snapshot_date: string
          tenant_id: string | null
          tendencia: string | null
          updated_at: string
          valor_atual: number
          valor_forecast: number | null
          valor_meta: number | null
          variacao_percentual: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_group?: string
          kpi_name: string
          notes?: string | null
          snapshot_date?: string
          tenant_id?: string | null
          tendencia?: string | null
          updated_at?: string
          valor_atual?: number
          valor_forecast?: number | null
          valor_meta?: number | null
          variacao_percentual?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kpi_group?: string
          kpi_name?: string
          notes?: string | null
          snapshot_date?: string
          tenant_id?: string | null
          tendencia?: string | null
          updated_at?: string
          valor_atual?: number
          valor_forecast?: number | null
          valor_meta?: number | null
          variacao_percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_executive_kpi_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_financial_goals: {
        Row: {
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          goal_type: string
          id: string
          metric_key: string
          month: number
          notes: string | null
          order_id: string | null
          period_type: string | null
          project_id: string | null
          target_amount: number
          target_type: string
          tenant_id: string | null
          updated_at: string | null
          vendedor_id: string | null
          year: number
        }
        Insert: {
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          goal_type: string
          id?: string
          metric_key: string
          month: number
          notes?: string | null
          order_id?: string | null
          period_type?: string | null
          project_id?: string | null
          target_amount: number
          target_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          year: number
        }
        Update: {
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          goal_type?: string
          id?: string
          metric_key?: string
          month?: number
          notes?: string | null
          order_id?: string | null
          period_type?: string | null
          project_id?: string | null
          target_amount?: number
          target_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_financial_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_financial_goals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_financial_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_financial_versions: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string
          id: string
          reason: string | null
          snapshot_data: Json
          tenant_id: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          reason?: string | null
          snapshot_data?: Json
          tenant_id?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          reason?: string | null
          snapshot_data?: Json
          tenant_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_financial_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_forecast_entries: {
        Row: {
          chart_account_id: string | null
          cost_center_id: string | null
          created_at: string
          forecast_amount: number
          id: string
          locked: boolean
          month: number
          notes: string | null
          origin: string
          project_id: string | null
          scenario: string
          tenant_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          forecast_amount?: number
          id?: string
          locked?: boolean
          month: number
          notes?: string | null
          origin?: string
          project_id?: string | null
          scenario?: string
          tenant_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          forecast_amount?: number
          id?: string
          locked?: boolean
          month?: number
          notes?: string | null
          origin?: string
          project_id?: string | null
          scenario?: string
          tenant_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_forecast_entries_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecast_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecast_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecast_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_forecast_scenarios: {
        Row: {
          adjustments: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          scenario_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          adjustments?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scenario_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustments?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scenario_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_forecast_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_forecasts: {
        Row: {
          auto_calculated: boolean | null
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          forecast_amount: number
          gap_amount: number | null
          gap_percent: number | null
          id: string
          metric_key: string
          month: number
          notes: string | null
          order_id: string | null
          project_id: string | null
          realized_amount: number
          target_amount: number | null
          tenant_id: string | null
          updated_at: string | null
          vendedor_id: string | null
          year: number
        }
        Insert: {
          auto_calculated?: boolean | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          forecast_amount?: number
          gap_amount?: number | null
          gap_percent?: number | null
          id?: string
          metric_key: string
          month: number
          notes?: string | null
          order_id?: string | null
          project_id?: string | null
          realized_amount?: number
          target_amount?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          year: number
        }
        Update: {
          auto_calculated?: boolean | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          forecast_amount?: number
          gap_amount?: number | null
          gap_percent?: number | null
          id?: string
          metric_key?: string
          month?: number
          notes?: string | null
          order_id?: string | null
          project_id?: string | null
          realized_amount?: number
          target_amount?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_forecasts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_goal_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_value: number | null
          deviation_percent: number | null
          goal_id: string | null
          id: string
          message: string
          metric_key: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          target_value: number | null
          tenant_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          deviation_percent?: number | null
          goal_id?: string | null
          id?: string
          message: string
          metric_key: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          target_value?: number | null
          tenant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          deviation_percent?: number | null
          goal_id?: string | null
          id?: string
          message?: string
          metric_key?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          target_value?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_goal_alerts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fin_financial_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_goal_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_impact_logs: {
        Row: {
          created_at: string
          estimated_impact: number | null
          event_type: string
          field_changed: string | null
          id: string
          impact_description: string | null
          new_value: string | null
          old_value: string | null
          record_id: string | null
          source_table: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_impact?: number | null
          event_type: string
          field_changed?: string | null
          id?: string
          impact_description?: string | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          source_table: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_impact?: number | null
          event_type?: string
          field_changed?: string | null
          id?: string
          impact_description?: string | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          source_table?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_impact_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_ledger_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          cash_date: string | null
          chart_account_id: string | null
          classification_rule_id: string | null
          classification_score: number | null
          classification_source: string | null
          classification_status: string | null
          client_id: string | null
          competence_date: string
          conciliado_em: string | null
          conta_plano_codigo: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          document_number: string | null
          has_splits: boolean | null
          id: string
          installment_number: number | null
          is_recurring: boolean | null
          juros_atraso: number | null
          loan_contract_id: string | null
          motivo_cancelamento: string | null
          notes: string | null
          order_id: string | null
          origem: string | null
          parent_entry_id: string | null
          party_id: string | null
          party_type: string | null
          payment_method: string | null
          project_id: string | null
          reconciled: boolean | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          reversal_of_id: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string | null
          total_installments: number | null
          type: string | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cash_date?: string | null
          chart_account_id?: string | null
          classification_rule_id?: string | null
          classification_score?: number | null
          classification_source?: string | null
          classification_status?: string | null
          client_id?: string | null
          competence_date: string
          conciliado_em?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          document_number?: string | null
          has_splits?: boolean | null
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          juros_atraso?: number | null
          loan_contract_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          parent_entry_id?: string | null
          party_id?: string | null
          party_type?: string | null
          payment_method?: string | null
          project_id?: string | null
          reconciled?: boolean | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          reversal_of_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          total_installments?: number | null
          type?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cash_date?: string | null
          chart_account_id?: string | null
          classification_rule_id?: string | null
          classification_score?: number | null
          classification_source?: string | null
          classification_status?: string | null
          client_id?: string | null
          competence_date?: string
          conciliado_em?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          document_number?: string | null
          has_splits?: boolean | null
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          juros_atraso?: number | null
          loan_contract_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          parent_entry_id?: string | null
          party_id?: string | null
          party_type?: string | null
          payment_method?: string | null
          project_id?: string | null
          reconciled?: boolean | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          reversal_of_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          total_installments?: number | null
          type?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_ledger_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_classification_rule_id_fkey"
            columns: ["classification_rule_id"]
            isOneToOne: false
            referencedRelation: "fin_classification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_loan_contract_id_fkey"
            columns: ["loan_contract_id"]
            isOneToOne: false
            referencedRelation: "fin_loan_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_entries_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_ledger_splits: {
        Row: {
          amount: number
          chart_account_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          parent_entry_id: string
          percentage: number | null
        }
        Insert: {
          amount: number
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          parent_entry_id: string
          percentage?: number | null
        }
        Update: {
          amount?: number
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          parent_entry_id?: string
          percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_ledger_splits_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_splits_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ledger_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_ledger_splits_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_loan_contracts: {
        Row: {
          bank_name: string
          contract_number: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          installments: number | null
          interest_rate: number | null
          notes: string | null
          principal_amount: number
          start_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_name: string
          contract_number: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          notes?: string | null
          principal_amount: number
          start_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_name?: string
          contract_number?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          notes?: string | null
          principal_amount?: number
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_loan_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_loan_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_loan_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_loan_installments: {
        Row: {
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          interest_amount: number
          iof_amount: number | null
          ledger_entry_interest_id: string | null
          ledger_entry_iof_id: string | null
          ledger_entry_principal_id: string | null
          loan_id: string
          other_charges: number | null
          paid_amount: number | null
          paid_date: string | null
          payable_id: string | null
          principal_amount: number
          status: string | null
          tenant_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          interest_amount?: number
          iof_amount?: number | null
          ledger_entry_interest_id?: string | null
          ledger_entry_iof_id?: string | null
          ledger_entry_principal_id?: string | null
          loan_id: string
          other_charges?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payable_id?: string | null
          principal_amount?: number
          status?: string | null
          tenant_id?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          interest_amount?: number
          iof_amount?: number | null
          ledger_entry_interest_id?: string | null
          ledger_entry_iof_id?: string | null
          ledger_entry_principal_id?: string | null
          loan_id?: string
          other_charges?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payable_id?: string | null
          principal_amount?: number
          status?: string | null
          tenant_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "fin_loan_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_loan_installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_origin_links: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          financial_entry_id: string | null
          id: string
          impact_layer: string
          impact_type: string
          origin_id: string
          origin_type: string
          payable_id: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          impact_layer?: string
          impact_type?: string
          origin_id: string
          origin_type: string
          payable_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          impact_layer?: string
          impact_type?: string
          origin_id?: string
          origin_type?: string
          payable_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_origin_links_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_origin_links_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "fin_payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_origin_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_origin_rules: {
        Row: {
          active: boolean | null
          allowed_roles: string[] | null
          allows_auto_classification: boolean | null
          allows_recurrence: boolean | null
          allows_split: boolean | null
          audit_level: string | null
          cashflow_trigger: string | null
          created_at: string | null
          description: string | null
          dre_trigger: string | null
          generates_immediate_cash: boolean | null
          generates_provision: boolean | null
          id: string
          inherits_cost_center: boolean | null
          inherits_project: boolean | null
          origin_key: string
          origin_label: string
          position: number | null
          requires_category: boolean | null
          requires_client: boolean | null
          requires_document_link: boolean | null
          requires_justification: boolean | null
          requires_reconciliation: boolean | null
          requires_supplier: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          allowed_roles?: string[] | null
          allows_auto_classification?: boolean | null
          allows_recurrence?: boolean | null
          allows_split?: boolean | null
          audit_level?: string | null
          cashflow_trigger?: string | null
          created_at?: string | null
          description?: string | null
          dre_trigger?: string | null
          generates_immediate_cash?: boolean | null
          generates_provision?: boolean | null
          id?: string
          inherits_cost_center?: boolean | null
          inherits_project?: boolean | null
          origin_key: string
          origin_label: string
          position?: number | null
          requires_category?: boolean | null
          requires_client?: boolean | null
          requires_document_link?: boolean | null
          requires_justification?: boolean | null
          requires_reconciliation?: boolean | null
          requires_supplier?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          allowed_roles?: string[] | null
          allows_auto_classification?: boolean | null
          allows_recurrence?: boolean | null
          allows_split?: boolean | null
          audit_level?: string | null
          cashflow_trigger?: string | null
          created_at?: string | null
          description?: string | null
          dre_trigger?: string | null
          generates_immediate_cash?: boolean | null
          generates_provision?: boolean | null
          id?: string
          inherits_cost_center?: boolean | null
          inherits_project?: boolean | null
          origin_key?: string
          origin_label?: string
          position?: number | null
          requires_category?: boolean | null
          requires_client?: boolean | null
          requires_document_link?: boolean | null
          requires_justification?: boolean | null
          requires_reconciliation?: boolean | null
          requires_supplier?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_origin_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_payables: {
        Row: {
          amount: number
          bank_account_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          chart_account_id: string | null
          competence_date: string
          conciliado_em: string | null
          conciliado_por: string | null
          conta_plano_codigo: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_number: string | null
          due_date: string
          id: string
          installment: number | null
          ledger_entry_id: string | null
          motivo_cancelamento: string | null
          notes: string | null
          order_id: string | null
          origem: string | null
          paid_amount: number | null
          payment_date: string | null
          project_id: string | null
          reconciled: boolean | null
          status: string | null
          supplier_id: string | null
          tenant_id: string | null
          total_installments: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chart_account_id?: string | null
          competence_date?: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          due_date: string
          id?: string
          installment?: number | null
          ledger_entry_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          project_id?: string | null
          reconciled?: boolean | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chart_account_id?: string | null
          competence_date?: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string
          id?: string
          installment?: number | null
          ledger_entry_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          project_id?: string | null
          reconciled?: boolean | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_payables_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_period_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          month: number
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month: number
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month?: number
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_period_closings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_permission_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          label: string
          position: number | null
          profile_key: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          position?: number | null
          profile_key: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          position?: number | null
          profile_key?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_permission_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_profile_permissions: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          id: string
          permission_group: string
          permission_key: string
          permission_label: string
          profile_id: string
          tenant_id: string | null
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          permission_group: string
          permission_key: string
          permission_label: string
          profile_id: string
          tenant_id?: string | null
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          permission_group?: string
          permission_key?: string
          permission_label?: string
          profile_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "fin_permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_profile_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_projects: {
        Row: {
          budget: number | null
          budget_percent: number
          chart_account_id: string | null
          client_id: string | null
          code: string | null
          cost_center_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          order_id: string | null
          owner_id: string | null
          project_type: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          budget?: number | null
          budget_percent?: number
          chart_account_id?: string | null
          client_id?: string | null
          code?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          order_id?: string | null
          owner_id?: string | null
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          budget?: number | null
          budget_percent?: number
          chart_account_id?: string | null
          client_id?: string | null
          code?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order_id?: string | null
          owner_id?: string | null
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_projects_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_projects_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_receivables: {
        Row: {
          amount: number
          bank_account_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          chart_account_id: string | null
          competence_date: string
          conciliado_em: string | null
          conciliado_por: string | null
          conta_plano_codigo: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          description: string | null
          document_number: string | null
          due_date: string
          id: string
          installment: number | null
          ledger_entry_id: string | null
          motivo_cancelamento: string | null
          notes: string | null
          order_id: string | null
          origem: string | null
          project_id: string | null
          receipt_date: string | null
          received_amount: number | null
          reconciled: boolean | null
          status: string | null
          tenant_id: string | null
          total_installments: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chart_account_id?: string | null
          competence_date?: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          document_number?: string | null
          due_date: string
          id?: string
          installment?: number | null
          ledger_entry_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          project_id?: string | null
          receipt_date?: string | null
          received_amount?: number | null
          reconciled?: boolean | null
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chart_account_id?: string | null
          competence_date?: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_plano_codigo?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string
          id?: string
          installment?: number | null
          ledger_entry_id?: string | null
          motivo_cancelamento?: string | null
          notes?: string | null
          order_id?: string | null
          origem?: string | null
          project_id?: string | null
          receipt_date?: string | null
          received_amount?: number | null
          reconciled?: boolean | null
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_receivables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receivables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_reconciliation_links: {
        Row: {
          bank_transaction_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          ledger_entry_id: string | null
          match_type: string | null
          notes: string | null
          payable_id: string | null
          receivable_id: string | null
          reconciliation_status: string | null
          score: number | null
        }
        Insert: {
          bank_transaction_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ledger_entry_id?: string | null
          match_type?: string | null
          notes?: string | null
          payable_id?: string | null
          receivable_id?: string | null
          reconciliation_status?: string | null
          score?: number | null
        }
        Update: {
          bank_transaction_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ledger_entry_id?: string | null
          match_type?: string | null
          notes?: string | null
          payable_id?: string | null
          receivable_id?: string | null
          reconciliation_status?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_reconciliation_links_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_reconciliation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_reconciliation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fin_reconciliation_links_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_reconciliation_rules: {
        Row: {
          active: boolean | null
          chart_account_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          keywords: string[] | null
          name: string
          party_id: string | null
          party_type: string | null
          pattern_regex: string | null
          priority: number | null
        }
        Insert: {
          active?: boolean | null
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          party_id?: string | null
          party_type?: string | null
          pattern_regex?: string | null
          priority?: number | null
        }
        Update: {
          active?: boolean | null
          chart_account_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          party_id?: string | null
          party_type?: string | null
          pattern_regex?: string | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_reconciliation_rules_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_reconciliation_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_reconciliation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_reconciliation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fin_recurring_contract_timeline: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          description: string
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          tenant_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tenant_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurring_contract_timeline_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "fin_recurring_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_contract_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_recurring_contracts: {
        Row: {
          adjustment_rate: number | null
          adjustment_type: string
          amount: number
          auto_generate: boolean | null
          bank_account_id: string | null
          chart_account_id: string | null
          contract_mode: string
          contract_name: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          day_due: number | null
          description: string
          end_date: string | null
          entry_type: string
          frequency: string
          generated_count: number
          id: string
          last_adjustment_date: string | null
          next_generation_date: string
          notes: string | null
          party_id: string | null
          party_type: string
          project_id: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
          total_installments: number | null
          updated_at: string | null
        }
        Insert: {
          adjustment_rate?: number | null
          adjustment_type?: string
          amount?: number
          auto_generate?: boolean | null
          bank_account_id?: string | null
          chart_account_id?: string | null
          contract_mode?: string
          contract_name?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_due?: number | null
          description: string
          end_date?: string | null
          entry_type?: string
          frequency?: string
          generated_count?: number
          id?: string
          last_adjustment_date?: string | null
          next_generation_date: string
          notes?: string | null
          party_id?: string | null
          party_type?: string
          project_id?: string | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustment_rate?: number | null
          adjustment_type?: string
          amount?: number
          auto_generate?: boolean | null
          bank_account_id?: string | null
          chart_account_id?: string | null
          contract_mode?: string
          contract_name?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_due?: number | null
          description?: string
          end_date?: string | null
          entry_type?: string
          frequency?: string
          generated_count?: number
          id?: string
          last_adjustment_date?: string | null
          next_generation_date?: string
          notes?: string | null
          party_id?: string | null
          party_type?: string
          project_id?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurring_contracts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_contracts_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_saved_reports: {
        Row: {
          created_at: string
          created_by: string | null
          data_source: string
          description: string | null
          filters: Json
          grouping_field: string | null
          id: string
          is_public: boolean
          metrics: Json
          name: string
          report_group: string
          tenant_id: string | null
          updated_at: string
          visualization: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_source: string
          description?: string | null
          filters?: Json
          grouping_field?: string | null
          id?: string
          is_public?: boolean
          metrics?: Json
          name: string
          report_group?: string
          tenant_id?: string | null
          updated_at?: string
          visualization?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_source?: string
          description?: string | null
          filters?: Json
          grouping_field?: string | null
          id?: string
          is_public?: boolean
          metrics?: Json
          name?: string
          report_group?: string
          tenant_id?: string | null
          updated_at?: string
          visualization?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_strategic_resource_account_configs: {
        Row: {
          active: boolean
          chart_account_id: string | null
          created_at: string
          default_percentage: number | null
          description: string | null
          display_name: string | null
          id: string
          resource_type:
            | Database["public"]["Enums"]["fin_strategic_resource_type"]
            | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          chart_account_id?: string | null
          created_at?: string
          default_percentage?: number | null
          description?: string | null
          display_name?: string | null
          id?: string
          resource_type?:
            | Database["public"]["Enums"]["fin_strategic_resource_type"]
            | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          chart_account_id?: string | null
          created_at?: string
          default_percentage?: number | null
          description?: string | null
          display_name?: string | null
          id?: string
          resource_type?:
            | Database["public"]["Enums"]["fin_strategic_resource_type"]
            | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_strategic_resource_account_configs_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_strategic_resource_account_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_user_finance_profiles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          finance_profile_id: string
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          finance_profile_id: string
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          finance_profile_id?: string
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_user_finance_profiles_finance_profile_id_fkey"
            columns: ["finance_profile_id"]
            isOneToOne: false
            referencedRelation: "fin_permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_user_finance_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_logs: {
        Row: {
          created_at: string | null
          deal_id: string | null
          error_message: string | null
          followup_number: number
          id: string
          message_sent: string | null
          sent_at: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          followup_number: number
          id?: string
          message_sent?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          followup_number?: number
          id?: string
          message_sent?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          followup_number: number
          id: string
          system_prompt: string
          tenant_id: string | null
          tone: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          followup_number: number
          id?: string
          system_prompt: string
          tenant_id?: string | null
          tone: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          followup_number?: number
          id?: string
          system_prompt?: string
          tenant_id?: string | null
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_tutorials: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          screen_key: string | null
          steps: Json
          title: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string | null
          id?: string
          screen_key?: string | null
          steps?: Json
          title: string
          total_steps?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          screen_key?: string | null
          steps?: Json
          title?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: []
      }
      help_search_logs: {
        Row: {
          clicked_article_id: string | null
          created_at: string
          id: string
          query: string
          results_count: number
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_article_id?: string | null
          created_at?: string
          id?: string
          query: string
          results_count?: number
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_article_id?: string | null
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_search_logs_clicked_article_id_fkey"
            columns: ["clicked_article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_search_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          active: boolean | null
          cost_center_id: string | null
          created_at: string | null
          id: string
          manager_id: string | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          admission_date: string | null
          base_salary: number
          benefits_percent: number
          cpf: string | null
          created_at: string | null
          department_id: string | null
          hourly_cost: number | null
          id: string
          manager_id: string | null
          monthly_cost: number | null
          monthly_hours: number
          name: string
          position_id: string | null
          registration_number: string | null
          status: string
          team_id: string | null
          tenant_id: string | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          admission_date?: string | null
          base_salary?: number
          benefits_percent?: number
          cpf?: string | null
          created_at?: string | null
          department_id?: string | null
          hourly_cost?: number | null
          id?: string
          manager_id?: string | null
          monthly_cost?: number | null
          monthly_hours?: number
          name: string
          position_id?: string | null
          registration_number?: string | null
          status?: string
          team_id?: string | null
          tenant_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_date?: string | null
          base_salary?: number
          benefits_percent?: number
          cpf?: string | null
          created_at?: string | null
          department_id?: string | null
          hourly_cost?: number | null
          id?: string
          manager_id?: string | null
          monthly_cost?: number | null
          monthly_hours?: number
          name?: string
          position_id?: string | null
          registration_number?: string | null
          status?: string
          team_id?: string | null
          tenant_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "hr_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_labor_allocations: {
        Row: {
          allocated_cost: number
          allocated_hours: number
          cost_center_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          production_order_id: string | null
          project_id: string | null
          reference_month: string
          tenant_id: string | null
        }
        Insert: {
          allocated_cost?: number
          allocated_hours?: number
          cost_center_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          production_order_id?: string | null
          project_id?: string | null
          reference_month: string
          tenant_id?: string | null
        }
        Update: {
          allocated_cost?: number
          allocated_hours?: number
          cost_center_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          production_order_id?: string | null
          project_id?: string | null
          reference_month?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_labor_allocations_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_labor_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_labor_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_positions: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          max_salary: number | null
          min_salary: number | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_teams: {
        Row: {
          active: boolean | null
          created_at: string | null
          department_id: string | null
          id: string
          leader_id: string | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          leader_id?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_timesheets: {
        Row: {
          absence_hours: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          late_minutes: number | null
          notes: string | null
          overtime_hours: number | null
          planned_hours: number | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          work_date: string
          worked_hours: number | null
        }
        Insert: {
          absence_hours?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          planned_hours?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_date: string
          worked_hours?: number | null
        }
        Update: {
          absence_hours?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          planned_hours?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_date?: string
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_timesheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_client_memory: {
        Row: {
          client_name: string | null
          created_at: string
          ia_paused: boolean | null
          ia_paused_at: string | null
          ia_paused_reason: string | null
          ia_paused_until: string | null
          id: string
          instance_name: string
          interaction_count: number | null
          last_interaction: string | null
          notes: string | null
          phone_number: string
          preferences: Json | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          ia_paused?: boolean | null
          ia_paused_at?: string | null
          ia_paused_reason?: string | null
          ia_paused_until?: string | null
          id?: string
          instance_name: string
          interaction_count?: number | null
          last_interaction?: string | null
          notes?: string | null
          phone_number: string
          preferences?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          ia_paused?: boolean | null
          ia_paused_at?: string | null
          ia_paused_reason?: string | null
          ia_paused_until?: string | null
          id?: string
          instance_name?: string
          interaction_count?: number | null
          last_interaction?: string | null
          notes?: string | null
          phone_number?: string
          preferences?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ia_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          instance_name: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          phone_number: string
          role: string
          sent_product_ids: string[] | null
          tenant_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          instance_name: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          phone_number: string
          role: string
          sent_product_ids?: string[] | null
          tenant_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          instance_name?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          phone_number?: string
          role?: string
          sent_product_ids?: string[] | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      ia_metrics: {
        Row: {
          error_code: string | null
          fallback_used: boolean | null
          id: string
          model: string
          phone_number: string | null
          response_time_ms: number | null
          retry_count: number | null
          success: boolean
          timestamp: string | null
          tokens_used: number | null
        }
        Insert: {
          error_code?: string | null
          fallback_used?: boolean | null
          id?: string
          model: string
          phone_number?: string | null
          response_time_ms?: number | null
          retry_count?: number | null
          success?: boolean
          timestamp?: string | null
          tokens_used?: number | null
        }
        Update: {
          error_code?: string | null
          fallback_used?: boolean | null
          id?: string
          model?: string
          phone_number?: string | null
          response_time_ms?: number | null
          retry_count?: number | null
          success?: boolean
          timestamp?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      ia_pending_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          instance_name: string
          is_processing: boolean | null
          phone_number: string
          processed: boolean | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          instance_name: string
          is_processing?: boolean | null
          phone_number: string
          processed?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          instance_name?: string
          is_processing?: boolean | null
          phone_number?: string
          processed?: boolean | null
        }
        Relationships: []
      }
      ia_processing_failures: {
        Row: {
          ai_response: string | null
          created_at: string | null
          error_type: string | null
          history_size: number | null
          id: string
          instance_name: string | null
          model_used: string | null
          phone_number: string | null
          prompt_size: number | null
          user_message: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          error_type?: string | null
          history_size?: number | null
          id?: string
          instance_name?: string | null
          model_used?: string | null
          phone_number?: string | null
          prompt_size?: number | null
          user_message?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          error_type?: string | null
          history_size?: number | null
          id?: string
          instance_name?: string | null
          model_used?: string | null
          phone_number?: string | null
          prompt_size?: number | null
          user_message?: string | null
        }
        Relationships: []
      }
      incident_root_cause_summary: {
        Row: {
          ai_generated: boolean | null
          confidence_score: number
          created_at: string
          diagnosis: string | null
          id: string
          incident_id: string
          metadata: Json | null
          root_event_id: string | null
          root_module_code: string
          suggested_action: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          confidence_score?: number
          created_at?: string
          diagnosis?: string | null
          id?: string
          incident_id: string
          metadata?: Json | null
          root_event_id?: string | null
          root_module_code: string
          suggested_action?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          confidence_score?: number
          created_at?: string
          diagnosis?: string | null
          id?: string
          incident_id?: string
          metadata?: Json | null
          root_event_id?: string | null
          root_module_code?: string
          suggested_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_root_cause_summary_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "system_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          incident_id: string
          metadata: Json | null
          to_status: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          incident_id: string
          metadata?: Json | null
          to_status: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          incident_id?: string
          metadata?: Json | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_status_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "system_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_timeline_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string
          event_role: string | null
          event_source: string
          event_time: string
          event_type: string
          id: string
          incident_id: string
          message: string
          metadata: Json | null
          module_code: string
          severity: string | null
          source_record_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_role?: string | null
          event_source: string
          event_time?: string
          event_type: string
          id?: string
          incident_id: string
          message: string
          metadata?: Json | null
          module_code: string
          severity?: string | null
          source_record_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_role?: string | null
          event_source?: string
          event_time?: string
          event_type?: string
          id?: string
          incident_id?: string
          message?: string
          metadata?: Json | null
          module_code?: string
          severity?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_timeline_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "system_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_checklist_items: {
        Row: {
          concluido: boolean
          created_at: string
          descricao: string
          id: string
          installation_order_id: string
          observacao: string | null
          tenant_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          descricao: string
          id?: string
          installation_order_id: string
          observacao?: string | null
          tenant_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          descricao?: string
          id?: string
          installation_order_id?: string
          observacao?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_checklist_items_installation_order_id_fkey"
            columns: ["installation_order_id"]
            isOneToOne: false
            referencedRelation: "installation_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_issues: {
        Row: {
          created_at: string
          descricao: string
          foto_url: string | null
          id: string
          installation_order_id: string
          severidade: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          foto_url?: string | null
          id?: string
          installation_order_id: string
          severidade?: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          foto_url?: string | null
          id?: string
          installation_order_id?: string
          severidade?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_issues_installation_order_id_fkey"
            columns: ["installation_order_id"]
            isOneToOne: false
            referencedRelation: "installation_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_orders: {
        Row: {
          completed_date: string | null
          created_at: string
          created_by: string | null
          delivery_order_id: string | null
          endereco: string | null
          equipe_responsavel: string | null
          id: string
          observacoes: string | null
          order_id: string
          scheduled_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_order_id?: string | null
          endereco?: string | null
          equipe_responsavel?: string | null
          id?: string
          observacoes?: string | null
          order_id: string
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_order_id?: string | null
          endereco?: string | null
          equipe_responsavel?: string | null
          id?: string
          observacoes?: string | null
          order_id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_orders_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          source_module_code: string
          status: string
          target_module_code: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          source_module_code: string
          status: string
          target_module_code: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          source_module_code?: string
          status?: string
          target_module_code?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      integration_health_snapshots: {
        Row: {
          current_status: string
          delay_minutes: number | null
          errors_24h: number
          events_24h: number
          health_score: number
          id: string
          last_error_at: string | null
          last_event_at: string | null
          last_success_at: string | null
          metadata: Json | null
          source_module_code: string
          target_module_code: string
          updated_at: string
        }
        Insert: {
          current_status?: string
          delay_minutes?: number | null
          errors_24h?: number
          events_24h?: number
          health_score?: number
          id?: string
          last_error_at?: string | null
          last_event_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          source_module_code: string
          target_module_code: string
          updated_at?: string
        }
        Update: {
          current_status?: string
          delay_minutes?: number | null
          errors_24h?: number
          events_24h?: number
          health_score?: number
          id?: string
          last_error_at?: string | null
          last_event_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          source_module_code?: string
          target_module_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      inv_stock_reservations: {
        Row: {
          consumed_quantity: number | null
          created_at: string | null
          id: string
          needed_by: string | null
          notes: string | null
          ops_order_id: string | null
          product_id: string
          project_id: string | null
          purchase_order_id: string | null
          quantity: number
          reserved_by: string | null
          source_order_item_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          consumed_quantity?: number | null
          created_at?: string | null
          id?: string
          needed_by?: string | null
          notes?: string | null
          ops_order_id?: string | null
          product_id: string
          project_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          reserved_by?: string | null
          source_order_item_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          consumed_quantity?: number | null
          created_at?: string | null
          id?: string
          needed_by?: string | null
          notes?: string | null
          ops_order_id?: string | null
          product_id?: string
          project_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          reserved_by?: string | null
          source_order_item_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_reservations_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_reservations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_reservations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_number: number
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          payment_attempts: number
          status: string
          subscription_id: string | null
          tax: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: number
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_attempts?: number
          status?: string
          subscription_id?: string | null
          tax?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: number
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_attempts?: number
          status?: string
          subscription_id?: string | null
          tax?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_saturation_snapshots: {
        Row: {
          avg_duration_ms: number
          captured_at: string
          failure_rate: number
          id: string
          job_code: string
          metadata: Json | null
          p95_duration_ms: number
          run_frequency: number
        }
        Insert: {
          avg_duration_ms?: number
          captured_at?: string
          failure_rate?: number
          id?: string
          job_code: string
          metadata?: Json | null
          p95_duration_ms?: number
          run_frequency?: number
        }
        Update: {
          avg_duration_ms?: number
          captured_at?: string
          failure_rate?: number
          id?: string
          job_code?: string
          metadata?: Json | null
          p95_duration_ms?: number
          run_frequency?: number
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          difficulty: string
          helpful_count: number
          id: string
          read_time_minutes: number | null
          related_articles: string[] | null
          screen_key: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          active?: boolean
          category: string
          content: string
          created_at?: string
          difficulty?: string
          helpful_count?: number
          id?: string
          read_time_minutes?: number | null
          related_articles?: string[] | null
          screen_key?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          difficulty?: string
          helpful_count?: number
          id?: string
          read_time_minutes?: number | null
          related_articles?: string[] | null
          screen_key?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      labor_types: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_cost: number | null
          id: string
          name: string
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_cost?: number | null
          id?: string
          name: string
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_cost?: number | null
          id?: string
          name?: string
          tenant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          code: string
          id?: number
          name: string
          tenant_id?: string | null
        }
        Update: {
          code?: string
          id?: number
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_id: string | null
          architect_id: string | null
          client_id: string | null
          company: string | null
          converted_at: string | null
          converted_deal_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          source_id: number | null
          source_label: string | null
          status: string | null
          temperature: string | null
          tenant_id: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: string | null
          architect_id?: string | null
          client_id?: string | null
          company?: string | null
          converted_at?: string | null
          converted_deal_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_id?: number | null
          source_label?: string | null
          status?: string | null
          temperature?: string | null
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: string | null
          architect_id?: string | null
          client_id?: string | null
          company?: string | null
          converted_at?: string | null
          converted_deal_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_id?: number | null
          source_label?: string | null
          status?: string | null
          temperature?: string | null
          tenant_id?: string | null
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
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_whatsapp: {
        Row: {
          conversa_whatsapp: string | null
          created_at: string | null
          id: string
          nome: string | null
          origem: string | null
          session_id: string | null
          status: string | null
          telefone: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          conversa_whatsapp?: string | null
          created_at?: string | null
          id?: string
          nome?: string | null
          origem?: string | null
          session_id?: string | null
          status?: string | null
          telefone: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conversa_whatsapp?: string | null
          created_at?: string | null
          id?: string
          nome?: string | null
          origem?: string | null
          session_id?: string | null
          status?: string | null
          telefone?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      master_idea_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          idea_id: string
          transcription: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          idea_id: string
          transcription?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          idea_id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_idea_attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "master_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      master_idea_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          idea_id: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          idea_id: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          idea_id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "master_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_idea_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "master_idea_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      master_idea_ratings: {
        Row: {
          created_at: string | null
          id: string
          idea_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_idea_ratings_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "master_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      master_ideas: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          motivo_recusa: string | null
          prioridade: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          motivo_recusa?: string | null
          prioridade?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          motivo_recusa?: string | null
          prioridade?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      material_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          reason: string
          request_number: number
          requested_by: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reason: string
          request_number?: number
          requested_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string
          request_number?: number
          requested_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "material_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          icon: string
          id: string
          label: string
          module: string
          position: number
          route: string
          tenant_id: string | null
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon: string
          id?: string
          label: string
          module: string
          position: number
          route: string
          tenant_id?: string | null
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon?: string
          id?: string
          label?: string
          module?: string
          position?: number
          route?: string
          tenant_id?: string | null
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modules_config: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          label: string
          module_key: string
          sort_order: number
          updated_at: string
          visible_in_menu: boolean
          visible_in_routes: boolean
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string | null
          label: string
          module_key: string
          sort_order?: number
          updated_at?: string
          visible_in_menu?: boolean
          visible_in_routes?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          label?: string
          module_key?: string
          sort_order?: number
          updated_at?: string
          visible_in_menu?: boolean
          visible_in_routes?: boolean
        }
        Relationships: []
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      offer_catalog: {
        Row: {
          created_at: string
          cta_label: string | null
          default_channel: string | null
          description: string | null
          duration_days: number | null
          goal: string | null
          id: string
          message_template: string | null
          metadata: Json | null
          name: string
          offer_code: string
          offer_type: string
          priority_base: number
          status: string
          target_entitlement_code: string | null
          target_plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          default_channel?: string | null
          description?: string | null
          duration_days?: number | null
          goal?: string | null
          id?: string
          message_template?: string | null
          metadata?: Json | null
          name: string
          offer_code: string
          offer_type: string
          priority_base?: number
          status?: string
          target_entitlement_code?: string | null
          target_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          default_channel?: string | null
          description?: string | null
          duration_days?: number | null
          goal?: string | null
          id?: string
          message_template?: string | null
          metadata?: Json | null
          name?: string
          offer_code?: string
          offer_type?: string
          priority_base?: number
          status?: string
          target_entitlement_code?: string | null
          target_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_catalog_target_plan_id_fkey"
            columns: ["target_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_delivery_events: {
        Row: {
          ai_personalized: boolean | null
          channel: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          offer_code: string
          signal_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          ai_personalized?: boolean | null
          channel: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          offer_code: string
          signal_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          ai_personalized?: boolean | null
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          offer_code?: string
          signal_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_delivery_events_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "upgrade_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_delivery_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_eligibility_rules: {
        Row: {
          active: boolean
          block_message: string | null
          created_at: string
          id: string
          offer_code: string
          rule_expression: Json
          rule_key: string
        }
        Insert: {
          active?: boolean
          block_message?: string | null
          created_at?: string
          id?: string
          offer_code: string
          rule_expression?: Json
          rule_key: string
        }
        Update: {
          active?: boolean
          block_message?: string | null
          created_at?: string
          id?: string
          offer_code?: string
          rule_expression?: Json
          rule_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_eligibility_rules_offer_code_fkey"
            columns: ["offer_code"]
            isOneToOne: false
            referencedRelation: "offer_catalog"
            referencedColumns: ["offer_code"]
          },
        ]
      }
      offer_priority_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          notes: string | null
          offer_type: string | null
          priority_weight: number
          rule_name: string
          signal_category: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          offer_type?: string | null
          priority_weight?: number
          rule_name: string
          signal_category: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          offer_type?: string | null
          priority_weight?: number
          rule_name?: string
          signal_category?: string
        }
        Relationships: []
      }
      offer_suppression_log: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          offer_code: string
          reason: string
          suppressed_until: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          offer_code: string
          reason: string
          suppressed_until?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          offer_code?: string
          reason?: string
          suppressed_until?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_suppression_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_analytics: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          step_key: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          step_key: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          step_key?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string | null
          data: Json | null
          id: string
          skipped: boolean
          step_key: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          skipped?: boolean
          step_key: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          skipped?: boolean
          step_key?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_projects: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          client_id: string | null
          contract_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          order_id: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string | null
          responsible_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          client_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          order_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string | null
          responsible_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          client_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string | null
          responsible_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "operational_projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "operational_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          employee_id: string | null
          end_time: string | null
          hourly_cost: number | null
          hours_spent: number | null
          id: string
          notes: string | null
          ops_order_id: string
          start_time: string | null
          status: string | null
          team_id: string | null
          tenant_id: string | null
          total_cost: number | null
        }
        Insert: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          end_time?: string | null
          hourly_cost?: number | null
          hours_spent?: number | null
          id?: string
          notes?: string | null
          ops_order_id: string
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          tenant_id?: string | null
          total_cost?: number | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          end_time?: string | null
          hourly_cost?: number | null
          hours_spent?: number | null
          id?: string
          notes?: string | null
          ops_order_id?: string
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          tenant_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_activities_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_capacity: {
        Row: {
          allocated_hours: number | null
          available_hours: number
          created_at: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          resource_name: string
          resource_type: string
          team_id: string | null
          tenant_id: string | null
        }
        Insert: {
          allocated_hours?: number | null
          available_hours?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          resource_name: string
          resource_type?: string
          team_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          allocated_hours?: number | null
          available_hours?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          resource_name?: string
          resource_type?: string
          team_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_capacity_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_capacity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_material_usage: {
        Row: {
          created_at: string | null
          id: string
          material_name: string
          notes: string | null
          ops_order_id: string
          quantity: number
          tenant_id: string | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_name: string
          notes?: string | null
          ops_order_id: string
          quantity?: number
          tenant_id?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_name?: string
          notes?: string | null
          ops_order_id?: string
          quantity?: number
          tenant_id?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_material_usage_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_material_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_occurrences: {
        Row: {
          created_at: string | null
          description: string
          id: string
          occurrence_type: string
          ops_order_id: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          occurrence_type?: string
          ops_order_id: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          occurrence_type?: string
          ops_order_id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_occurrences_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_occurrences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_orders: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_hours: number | null
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          expected_end_date: string | null
          id: string
          labor_cost: number | null
          material_cost: number | null
          notes: string | null
          order_number: number
          order_type: string
          priority: string | null
          project_id: string | null
          responsible_id: string | null
          source_order_id: string | null
          start_date: string | null
          status: string
          team_id: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_hours?: number | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          expected_end_date?: string | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          order_number?: number
          order_type?: string
          priority?: string | null
          project_id?: string | null
          responsible_id?: string | null
          source_order_id?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_hours?: number | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          expected_end_date?: string | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          order_number?: number
          order_type?: string
          priority?: string | null
          project_id?: string | null
          responsible_id?: string | null
          source_order_id?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_orders_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_scheduling: {
        Row: {
          created_at: string | null
          id: string
          machine_or_resource: string | null
          notes: string | null
          ops_order_id: string
          position: number
          scheduled_end: string | null
          scheduled_start: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          machine_or_resource?: string | null
          notes?: string | null
          ops_order_id: string
          position?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          machine_or_resource?: string | null
          notes?: string | null
          ops_order_id?: string
          position?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_scheduling_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_scheduling_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          action_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          order_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          centro_custo: string | null
          cfop: string | null
          codigo_produto: string | null
          created_at: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string
          especificacoes: string | null
          id: string
          ncm: string | null
          observacoes: string | null
          order_id: string | null
          position: number | null
          production_order_id: string | null
          produto_id: string | null
          project_id: string | null
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          centro_custo?: string | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao: string
          especificacoes?: string | null
          id?: string
          ncm?: string | null
          observacoes?: string | null
          order_id?: string | null
          position?: number | null
          production_order_id?: string | null
          produto_id?: string | null
          project_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          centro_custo?: string | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string
          especificacoes?: string | null
          id?: string
          ncm?: string | null
          observacoes?: string | null
          order_id?: string | null
          position?: number | null
          production_order_id?: string | null
          produto_id?: string | null
          project_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_responsibles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          supplier_id: string | null
          type: Database["public"]["Enums"]["order_responsible_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          supplier_id?: string | null
          type: Database["public"]["Enums"]["order_responsible_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["order_responsible_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_responsibles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_strategic_commitments: {
        Row: {
          chart_account_id: string
          created_at: string
          habilitado: boolean
          id: string
          order_id: string
          percentual: number
          responsavel_id: string | null
          tenant_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          chart_account_id: string
          created_at?: string
          habilitado?: boolean
          id?: string
          order_id: string
          percentual?: number
          responsavel_id?: string | null
          tenant_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          chart_account_id?: string
          created_at?: string
          habilitado?: boolean
          id?: string
          order_id?: string
          percentual?: number
          responsavel_id?: string | null
          tenant_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_strategic_commitments_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_strategic_commitments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_strategic_commitments_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_strategic_commitments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_by: string | null
          architect_id: string | null
          carencia_boleto: number | null
          centro_custo: string | null
          chart_account_id: string | null
          client_id: string | null
          comissao_montador_percentual: number | null
          comissao_montador_responsavel_id: string | null
          comissao_montador_responsible_id: string | null
          comissao_montador_valor: number | null
          comissao_orcamentista_percentual: number | null
          comissao_orcamentista_responsavel_id: string | null
          comissao_orcamentista_responsible_id: string | null
          comissao_orcamentista_valor: number | null
          comissao_producao_percentual: number
          comissao_producao_responsavel_id: string | null
          comissao_producao_responsible_id: string | null
          comissao_producao_valor: number
          comissao_projetista_percentual: number | null
          comissao_projetista_responsavel_id: string | null
          comissao_projetista_responsible_id: string | null
          comissao_projetista_valor: number | null
          comissao_vendedor_percentual: number | null
          comissao_vendedor_responsavel_id: string | null
          comissao_vendedor_responsible_id: string | null
          comissao_vendedor_valor: number | null
          condicao_pagamento: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          data_aprovacao: string | null
          data_cancelamento: string | null
          data_emissao: string | null
          data_encerramento: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_entrega_realizada: string | null
          data_faturamento: string | null
          data_primeiro_vencimento: string | null
          deal_id: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          entrega_bairro: string | null
          entrega_cep: string | null
          entrega_cidade: string | null
          entrega_complemento: string | null
          entrega_logradouro: string | null
          entrega_mesmo_endereco: boolean | null
          entrega_numero: string | null
          entrega_observacoes: string | null
          entrega_uf: string | null
          forma_pagamento: string | null
          forma_pagamento_2: string | null
          id: string
          motivo_cancelamento: string | null
          numero_parcelas_boleto: number | null
          numero_parcelas_cartao: number | null
          numero_parcelas_link: number | null
          observacao_pagamento: string | null
          observacoes_internas: string | null
          observacoes_nf: string | null
          operational_project_id: string | null
          order_number: number
          parcelas: number | null
          percentual_forma_1: number | null
          percentual_forma_2: number | null
          project_id: string | null
          quote_id: string | null
          requer_montagem: boolean
          rt_habilitado: boolean | null
          rt_percentual: number | null
          rt_valor: number | null
          seller_responsible_id: string | null
          seller_responsible_name: string | null
          status: string | null
          subtotal: number | null
          taxa_boleto_percentual: number | null
          taxa_boleto_responsavel: string | null
          taxa_boleto_valor: number | null
          taxa_cartao_percentual: number | null
          taxa_cartao_responsavel: string | null
          taxa_cartao_valor: number | null
          taxa_link_percentual: number | null
          taxa_link_responsavel: string | null
          taxa_link_valor: number | null
          tenant_id: string | null
          tipo_entrega: string | null
          transportadora_cnpj: string | null
          transportadora_nome: string | null
          updated_at: string | null
          valor_frete: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          approved_by?: string | null
          architect_id?: string | null
          carencia_boleto?: number | null
          centro_custo?: string | null
          chart_account_id?: string | null
          client_id?: string | null
          comissao_montador_percentual?: number | null
          comissao_montador_responsavel_id?: string | null
          comissao_montador_responsible_id?: string | null
          comissao_montador_valor?: number | null
          comissao_orcamentista_percentual?: number | null
          comissao_orcamentista_responsavel_id?: string | null
          comissao_orcamentista_responsible_id?: string | null
          comissao_orcamentista_valor?: number | null
          comissao_producao_percentual?: number
          comissao_producao_responsavel_id?: string | null
          comissao_producao_responsible_id?: string | null
          comissao_producao_valor?: number
          comissao_projetista_percentual?: number | null
          comissao_projetista_responsavel_id?: string | null
          comissao_projetista_responsible_id?: string | null
          comissao_projetista_valor?: number | null
          comissao_vendedor_percentual?: number | null
          comissao_vendedor_responsavel_id?: string | null
          comissao_vendedor_responsible_id?: string | null
          comissao_vendedor_valor?: number | null
          condicao_pagamento?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aprovacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          data_encerramento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_entrega_realizada?: string | null
          data_faturamento?: string | null
          data_primeiro_vencimento?: string | null
          deal_id?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_logradouro?: string | null
          entrega_mesmo_endereco?: boolean | null
          entrega_numero?: string | null
          entrega_observacoes?: string | null
          entrega_uf?: string | null
          forma_pagamento?: string | null
          forma_pagamento_2?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero_parcelas_boleto?: number | null
          numero_parcelas_cartao?: number | null
          numero_parcelas_link?: number | null
          observacao_pagamento?: string | null
          observacoes_internas?: string | null
          observacoes_nf?: string | null
          operational_project_id?: string | null
          order_number?: number
          parcelas?: number | null
          percentual_forma_1?: number | null
          percentual_forma_2?: number | null
          project_id?: string | null
          quote_id?: string | null
          requer_montagem?: boolean
          rt_habilitado?: boolean | null
          rt_percentual?: number | null
          rt_valor?: number | null
          seller_responsible_id?: string | null
          seller_responsible_name?: string | null
          status?: string | null
          subtotal?: number | null
          taxa_boleto_percentual?: number | null
          taxa_boleto_responsavel?: string | null
          taxa_boleto_valor?: number | null
          taxa_cartao_percentual?: number | null
          taxa_cartao_responsavel?: string | null
          taxa_cartao_valor?: number | null
          taxa_link_percentual?: number | null
          taxa_link_responsavel?: string | null
          taxa_link_valor?: number | null
          tenant_id?: string | null
          tipo_entrega?: string | null
          transportadora_cnpj?: string | null
          transportadora_nome?: string | null
          updated_at?: string | null
          valor_frete?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          approved_by?: string | null
          architect_id?: string | null
          carencia_boleto?: number | null
          centro_custo?: string | null
          chart_account_id?: string | null
          client_id?: string | null
          comissao_montador_percentual?: number | null
          comissao_montador_responsavel_id?: string | null
          comissao_montador_responsible_id?: string | null
          comissao_montador_valor?: number | null
          comissao_orcamentista_percentual?: number | null
          comissao_orcamentista_responsavel_id?: string | null
          comissao_orcamentista_responsible_id?: string | null
          comissao_orcamentista_valor?: number | null
          comissao_producao_percentual?: number
          comissao_producao_responsavel_id?: string | null
          comissao_producao_responsible_id?: string | null
          comissao_producao_valor?: number
          comissao_projetista_percentual?: number | null
          comissao_projetista_responsavel_id?: string | null
          comissao_projetista_responsible_id?: string | null
          comissao_projetista_valor?: number | null
          comissao_vendedor_percentual?: number | null
          comissao_vendedor_responsavel_id?: string | null
          comissao_vendedor_responsible_id?: string | null
          comissao_vendedor_valor?: number | null
          condicao_pagamento?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aprovacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          data_encerramento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_entrega_realizada?: string | null
          data_faturamento?: string | null
          data_primeiro_vencimento?: string | null
          deal_id?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          entrega_bairro?: string | null
          entrega_cep?: string | null
          entrega_cidade?: string | null
          entrega_complemento?: string | null
          entrega_logradouro?: string | null
          entrega_mesmo_endereco?: boolean | null
          entrega_numero?: string | null
          entrega_observacoes?: string | null
          entrega_uf?: string | null
          forma_pagamento?: string | null
          forma_pagamento_2?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero_parcelas_boleto?: number | null
          numero_parcelas_cartao?: number | null
          numero_parcelas_link?: number | null
          observacao_pagamento?: string | null
          observacoes_internas?: string | null
          observacoes_nf?: string | null
          operational_project_id?: string | null
          order_number?: number
          parcelas?: number | null
          percentual_forma_1?: number | null
          percentual_forma_2?: number | null
          project_id?: string | null
          quote_id?: string | null
          requer_montagem?: boolean
          rt_habilitado?: boolean | null
          rt_percentual?: number | null
          rt_valor?: number | null
          seller_responsible_id?: string | null
          seller_responsible_name?: string | null
          status?: string | null
          subtotal?: number | null
          taxa_boleto_percentual?: number | null
          taxa_boleto_responsavel?: string | null
          taxa_boleto_valor?: number | null
          taxa_cartao_percentual?: number | null
          taxa_cartao_responsavel?: string | null
          taxa_cartao_valor?: number | null
          taxa_link_percentual?: number | null
          taxa_link_responsavel?: string | null
          taxa_link_valor?: number | null
          tenant_id?: string | null
          tipo_entrega?: string | null
          transportadora_cnpj?: string | null
          transportadora_nome?: string | null
          updated_at?: string | null
          valor_frete?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_montador_responsavel_id_fkey"
            columns: ["comissao_montador_responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_montador_responsible_id_fkey"
            columns: ["comissao_montador_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_orcamentista_responsavel_id_fkey"
            columns: ["comissao_orcamentista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_orcamentista_responsible_id_fkey"
            columns: ["comissao_orcamentista_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_producao_responsavel_id_fkey"
            columns: ["comissao_producao_responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_producao_responsible_id_fkey"
            columns: ["comissao_producao_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_projetista_responsavel_id_fkey"
            columns: ["comissao_projetista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_projetista_responsible_id_fkey"
            columns: ["comissao_projetista_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_vendedor_responsavel_id_fkey"
            columns: ["comissao_vendedor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_vendedor_responsible_id_fkey"
            columns: ["comissao_vendedor_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_operational_project_id_fkey"
            columns: ["operational_project_id"]
            isOneToOne: false
            referencedRelation: "operational_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_responsible_id_fkey"
            columns: ["seller_responsible_id"]
            isOneToOne: false
            referencedRelation: "order_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      owner_control_tower_kpis: {
        Row: {
          active_tenants: number
          arr_cents: number
          avg_activation_score: number
          avg_churn_risk: number
          avg_engagement_score: number
          avg_expansion_ready: number
          avg_health_index: number
          churn_rate_30d: number
          created_at: string
          delinquency_rate: number
          delinquent_tenants: number
          expansion_ready_count: number
          high_churn_risk_count: number
          id: string
          metadata: Json | null
          mrr_cents: number
          paying_tenants: number
          snapshot_date: string
          total_tenants: number
          trial_tenants: number
        }
        Insert: {
          active_tenants?: number
          arr_cents?: number
          avg_activation_score?: number
          avg_churn_risk?: number
          avg_engagement_score?: number
          avg_expansion_ready?: number
          avg_health_index?: number
          churn_rate_30d?: number
          created_at?: string
          delinquency_rate?: number
          delinquent_tenants?: number
          expansion_ready_count?: number
          high_churn_risk_count?: number
          id?: string
          metadata?: Json | null
          mrr_cents?: number
          paying_tenants?: number
          snapshot_date?: string
          total_tenants?: number
          trial_tenants?: number
        }
        Update: {
          active_tenants?: number
          arr_cents?: number
          avg_activation_score?: number
          avg_churn_risk?: number
          avg_engagement_score?: number
          avg_expansion_ready?: number
          avg_health_index?: number
          churn_rate_30d?: number
          created_at?: string
          delinquency_rate?: number
          delinquent_tenants?: number
          expansion_ready_count?: number
          high_churn_risk_count?: number
          id?: string
          metadata?: Json | null
          mrr_cents?: number
          paying_tenants?: number
          snapshot_date?: string
          total_tenants?: number
          trial_tenants?: number
        }
        Relationships: []
      }
      payment_conditions: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          dias_primeiro_vencimento: number | null
          id: string
          intervalo_parcelas: number | null
          nome: string
          parcelas: number | null
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          dias_primeiro_vencimento?: number | null
          id?: string
          intervalo_parcelas?: number | null
          nome: string
          parcelas?: number | null
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          dias_primeiro_vencimento?: number | null
          id?: string
          intervalo_parcelas?: number | null
          nome?: string
          parcelas?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_conditions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_link_rates: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          installments: number
          rate_percent: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments: number
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments?: number
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_link_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_budgets: {
        Row: {
          actual_value: number | null
          category: string
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          deviation: number | null
          deviation_pct: number | null
          id: string
          notes: string | null
          planned_value: number
          project_id: string | null
          reference_month: string
          subcategory: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_value?: number | null
          category?: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          deviation?: number | null
          deviation_pct?: number | null
          id?: string
          notes?: string | null
          planned_value?: number
          project_id?: string | null
          reference_month: string
          subcategory?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_value?: number | null
          category?: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          deviation?: number | null
          deviation_pct?: number | null
          id?: string
          notes?: string | null
          planned_value?: number
          project_id?: string | null
          reference_month?: string
          subcategory?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          created_at: string
          entitlement_code: string
          id: string
          included: boolean
          limit_value: number | null
          metadata: Json
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entitlement_code: string
          id?: string
          included?: boolean
          limit_value?: number | null
          metadata?: Json
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entitlement_code?: string
          id?: string
          included?: boolean
          limit_value?: number | null
          metadata?: Json
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_entitlement_code_fkey"
            columns: ["entitlement_code"]
            isOneToOne: false
            referencedRelation: "entitlement_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          feature_name: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          feature_name: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          feature_name?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_goals: {
        Row: {
          achievement_pct: number | null
          area: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          current_value: number | null
          goal_type: string
          id: string
          notes: string | null
          owner_id: string | null
          period_end: string
          period_start: string
          project_id: string | null
          scope: string | null
          target_value: number
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          achievement_pct?: number | null
          area?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          period_end: string
          period_start: string
          project_id?: string | null
          scope?: string | null
          target_value?: number
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          achievement_pct?: number | null
          area?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          period_end?: string
          period_start?: string
          project_id?: string | null
          scope?: string | null
          target_value?: number
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_goals_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          id: string
          limit_key: string
          limit_name: string
          limit_value: number
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          limit_key: string
          limit_name: string
          limit_value?: number
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          limit_key?: string
          limit_name?: string
          limit_value?: number
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_modules: {
        Row: {
          created_at: string
          id: string
          module_key: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_key: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_key?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_scenarios: {
        Row: {
          cash_need: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parameters: Json | null
          projected_cost: number | null
          projected_margin_pct: number | null
          projected_profit: number | null
          projected_revenue: number | null
          runway_months: number | null
          scenario_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cash_need?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          projected_cost?: number | null
          projected_margin_pct?: number | null
          projected_profit?: number | null
          projected_revenue?: number | null
          runway_months?: number | null
          scenario_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cash_need?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          projected_cost?: number | null
          projected_margin_pct?: number | null
          projected_profit?: number | null
          projected_revenue?: number | null
          runway_months?: number | null
          scenario_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          id: string
          plan_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_anomalies: {
        Row: {
          anomaly_type: string
          confidence_score: number
          description: string | null
          detected_at: string
          id: string
          metadata: Json | null
          severity: string
          target_code: string
          target_type: string
        }
        Insert: {
          anomaly_type: string
          confidence_score?: number
          description?: string | null
          detected_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          target_code: string
          target_type: string
        }
        Update: {
          anomaly_type?: string
          confidence_score?: number
          description?: string | null
          detected_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          target_code?: string
          target_type?: string
        }
        Relationships: []
      }
      predictive_drift_snapshots: {
        Row: {
          baseline_value: number | null
          created_at: string
          current_value: number | null
          id: string
          metadata: Json | null
          metric_name: string
          target_code: string
          trend_direction: string
          trend_strength: number
          window_hours: number
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          metadata?: Json | null
          metric_name: string
          target_code: string
          trend_direction: string
          trend_strength?: number
          window_hours?: number
        }
        Update: {
          baseline_value?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          target_code?: string
          trend_direction?: string
          trend_strength?: number
          window_hours?: number
        }
        Relationships: []
      }
      predictive_failure_scores: {
        Row: {
          contributing_factors: Json | null
          failure_probability_score: number
          id: string
          recommended_preventive_action: string | null
          severity_band: string
          target_code: string
          target_type: string
          updated_at: string
        }
        Insert: {
          contributing_factors?: Json | null
          failure_probability_score?: number
          id?: string
          recommended_preventive_action?: string | null
          severity_band?: string
          target_code: string
          target_type?: string
          updated_at?: string
        }
        Update: {
          contributing_factors?: Json | null
          failure_probability_score?: number
          id?: string
          recommended_preventive_action?: string | null
          severity_band?: string
          target_code?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictive_risk_signals: {
        Row: {
          baseline_value: number
          created_at: string
          deviation_percent: number
          id: string
          metadata: Json | null
          module_code: string
          signal_type: string
          signal_value: number
        }
        Insert: {
          baseline_value?: number
          created_at?: string
          deviation_percent?: number
          id?: string
          metadata?: Json | null
          module_code: string
          signal_type: string
          signal_value?: number
        }
        Update: {
          baseline_value?: number
          created_at?: string
          deviation_percent?: number
          id?: string
          metadata?: Json | null
          module_code?: string
          signal_type?: string
          signal_value?: number
        }
        Relationships: []
      }
      preventive_action_logs: {
        Row: {
          action_code: string
          created_at: string
          execution_mode: string
          id: string
          metadata: Json | null
          reason: string | null
          result: string
          target_code: string
          triggered_by: string | null
        }
        Insert: {
          action_code: string
          created_at?: string
          execution_mode?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          result?: string
          target_code: string
          triggered_by?: string | null
        }
        Update: {
          action_code?: string
          created_at?: string
          execution_mode?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          result?: string
          target_code?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      prj_execution_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          employee_id: string | null
          hours: number | null
          id: string
          log_type: string | null
          ops_order_id: string | null
          project_id: string
          tenant_id: string | null
          work_date: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          hours?: number | null
          id?: string
          log_type?: string | null
          ops_order_id?: string | null
          project_id: string
          tenant_id?: string | null
          work_date?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          hours?: number | null
          id?: string
          log_type?: string | null
          ops_order_id?: string | null
          project_id?: string
          tenant_id?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prj_execution_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_execution_logs_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_execution_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prj_phases: {
        Row: {
          actual_cost: number | null
          actual_end: string | null
          actual_hours: number | null
          actual_start: string | null
          completion_percent: number | null
          created_at: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          notes: string | null
          phase_type: string | null
          planned_end: string | null
          planned_start: string | null
          position: number | null
          project_id: string
          status: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          completion_percent?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          phase_type?: string | null
          planned_end?: string | null
          planned_start?: string | null
          position?: number | null
          project_id: string
          status?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          completion_percent?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          phase_type?: string | null
          planned_end?: string | null
          planned_start?: string | null
          position?: number | null
          project_id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prj_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_phases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prj_planned_resources: {
        Row: {
          created_at: string | null
          description: string
          id: string
          notes: string | null
          project_id: string
          quantity: number | null
          resource_type: string
          tenant_id: string | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          project_id: string
          quantity?: number | null
          resource_type?: string
          tenant_id?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          project_id?: string
          quantity?: number | null
          resource_type?: string
          tenant_id?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prj_planned_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_planned_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prj_projects: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_margin: number | null
          admin_cost: number | null
          client_id: string | null
          completion_percent: number | null
          cost_center_id: string | null
          cost_deviation: number | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          estimated_margin: number | null
          expected_end_date: string | null
          id: string
          labor_cost: number | null
          logistics_cost: number | null
          material_cost: number | null
          notes: string | null
          outsourcing_cost: number | null
          project_number: number
          project_type: string | null
          responsible_id: string | null
          rework_cost: number | null
          sold_value: number | null
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_margin?: number | null
          admin_cost?: number | null
          client_id?: string | null
          completion_percent?: number | null
          cost_center_id?: string | null
          cost_deviation?: number | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_margin?: number | null
          expected_end_date?: string | null
          id?: string
          labor_cost?: number | null
          logistics_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          outsourcing_cost?: number | null
          project_number?: number
          project_type?: string | null
          responsible_id?: string | null
          rework_cost?: number | null
          sold_value?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_margin?: number | null
          admin_cost?: number | null
          client_id?: string | null
          completion_percent?: number | null
          cost_center_id?: string | null
          cost_deviation?: number | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_margin?: number | null
          expected_end_date?: string | null
          id?: string
          labor_cost?: number | null
          logistics_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          outsourcing_cost?: number | null
          project_number?: number
          project_type?: string | null
          responsible_id?: string | null
          rework_cost?: number | null
          sold_value?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prj_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prj_scope_changes: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          cost_impact: number | null
          created_at: string | null
          description: string
          id: string
          project_id: string
          requested_by: string | null
          schedule_impact_days: number | null
          tenant_id: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          cost_impact?: number | null
          created_at?: string | null
          description: string
          id?: string
          project_id: string
          requested_by?: string | null
          schedule_impact_days?: number | null
          tenant_id?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string
          requested_by?: string | null
          schedule_impact_days?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prj_scope_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prj_scope_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          feature: string | null
          id: string
          metadata: Json | null
          module: string | null
          session_id: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type: string
          feature?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          feature?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bom: {
        Row: {
          component_id: string
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_bom_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bom_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          position: number | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          position?: number | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_centers: {
        Row: {
          cost_center_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          cost_center_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          cost_center_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_centers_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_center_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_centers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          cost_price: number
          created_at: string | null
          id: string
          product_id: string
          purchase_order_id: string | null
          quantity: number
          supplier_id: string | null
          total_value: number
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          id?: string
          product_id: string
          purchase_order_id?: string | null
          quantity: number
          supplier_id?: string | null
          total_value: number
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          id?: string
          product_id?: string
          purchase_order_id?: string | null
          quantity?: number
          supplier_id?: string | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          cost_price: number | null
          created_at: string | null
          id: string
          is_preferred: boolean | null
          lead_time_days: number | null
          min_order_quantity: number | null
          product_id: string
          supplier_code: string | null
          supplier_id: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          product_id: string
          supplier_code?: string | null
          supplier_id: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          product_id?: string
          supplier_code?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          production_order_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          production_order_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          production_order_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_attachments_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      production_automation_logs: {
        Row: {
          automation_id: string | null
          created_at: string | null
          detalhes: Json | null
          executed_at: string | null
          id: string
          phase_id: string | null
          production_order_id: string | null
          tipo_execucao: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          executed_at?: string | null
          id?: string
          phase_id?: string | null
          production_order_id?: string | null
          tipo_execucao: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          executed_at?: string | null
          id?: string
          phase_id?: string | null
          production_order_id?: string | null
          tipo_execucao?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "production_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_automation_logs_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_automation_logs_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_automations: {
        Row: {
          acao_config: Json | null
          acao_tipo: string | null
          ativa: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          phase_template_id: string | null
          prazo_dias_uteis: number | null
          prazo_horas: number | null
          production_type_id: string | null
          tenant_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          acao_config?: Json | null
          acao_tipo?: string | null
          ativa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          phase_template_id?: string | null
          prazo_dias_uteis?: number | null
          prazo_horas?: number | null
          production_type_id?: string | null
          tenant_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          acao_config?: Json | null
          acao_tipo?: string | null
          ativa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          phase_template_id?: string | null
          prazo_dias_uteis?: number | null
          prazo_horas?: number | null
          production_type_id?: string | null
          tenant_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_automations_phase_template_id_fkey"
            columns: ["phase_template_id"]
            isOneToOne: false
            referencedRelation: "production_phase_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_automations_production_type_id_fkey"
            columns: ["production_type_id"]
            isOneToOne: false
            referencedRelation: "production_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          action_type: string
          created_at: string | null
          created_by: string | null
          description: string
          from_phase_id: string | null
          from_status: string | null
          id: string
          metadata: Json | null
          production_order_id: string
          production_phase_id: string | null
          to_phase_id: string | null
          to_status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          from_phase_id?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          production_order_id: string
          production_phase_id?: string | null
          to_phase_id?: string | null
          to_status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          from_phase_id?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          production_order_id?: string
          production_phase_id?: string | null
          to_phase_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_logs_from_phase_id_fkey"
            columns: ["from_phase_id"]
            isOneToOne: false
            referencedRelation: "production_phase_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_production_phase_id_fkey"
            columns: ["production_phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_to_phase_id_fkey"
            columns: ["to_phase_id"]
            isOneToOne: false
            referencedRelation: "production_phase_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_groups: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          group_name: string
          id: string
          order_id: string | null
          tenant_id: string | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_name: string
          id?: string
          order_id?: string | null
          tenant_id?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_name?: string
          id?: string
          order_id?: string | null
          tenant_id?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_order_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_groups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          alerta_atraso: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          current_phase_id: string | null
          deal_id: string | null
          description: string | null
          etapa_prevista_atraso: string | null
          group_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          order_number: number
          planned_end_date: string | null
          planned_start_date: string | null
          prazo_customizado_dias: number | null
          previsao_final_calculada: string | null
          priority: string
          production_type_id: string
          responsible_id: string | null
          specifications: Json | null
          status: string
          supplier_id: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          alerta_atraso?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_phase_id?: string | null
          deal_id?: string | null
          description?: string | null
          etapa_prevista_atraso?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          order_number?: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          prazo_customizado_dias?: number | null
          previsao_final_calculada?: string | null
          priority?: string
          production_type_id: string
          responsible_id?: string | null
          specifications?: Json | null
          status?: string
          supplier_id?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          alerta_atraso?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_phase_id?: string | null
          deal_id?: string | null
          description?: string | null
          etapa_prevista_atraso?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          order_number?: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          prazo_customizado_dias?: number | null
          previsao_final_calculada?: string | null
          priority?: string
          production_type_id?: string
          responsible_id?: string | null
          specifications?: Json | null
          status?: string
          supplier_id?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_orders_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "production_order_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_production_type_id_fkey"
            columns: ["production_type_id"]
            isOneToOne: false
            referencedRelation: "production_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_phase_templates: {
        Row: {
          active: boolean
          color: string
          created_at: string | null
          description: string | null
          id: string
          is_end_phase: boolean
          is_start_phase: boolean
          name: string
          position: number
          production_type_id: string
          sla_dias_uteis: number | null
          sla_hours: number | null
          slug: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_end_phase?: boolean
          is_start_phase?: boolean
          name: string
          position?: number
          production_type_id: string
          sla_dias_uteis?: number | null
          sla_hours?: number | null
          slug: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_end_phase?: boolean
          is_start_phase?: boolean
          name?: string
          position?: number
          production_type_id?: string
          sla_dias_uteis?: number | null
          sla_hours?: number | null
          slug?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_phase_templates_production_type_id_fkey"
            columns: ["production_type_id"]
            isOneToOne: false
            referencedRelation: "production_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_phase_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_phases: {
        Row: {
          actual_hours: number | null
          completed_at: string | null
          created_at: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          phase_template_id: string
          position: number
          production_order_id: string
          responsible_id: string | null
          sla_dias_uteis_custom: number | null
          started_at: string | null
          status: string
          team_ids: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          phase_template_id: string
          position?: number
          production_order_id: string
          responsible_id?: string | null
          sla_dias_uteis_custom?: number | null
          started_at?: string | null
          status?: string
          team_ids?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          phase_template_id?: string
          position?: number
          production_order_id?: string
          responsible_id?: string | null
          sla_dias_uteis_custom?: number | null
          started_at?: string | null
          status?: string
          team_ids?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_phases_phase_template_id_fkey"
            columns: ["phase_template_id"]
            isOneToOne: false
            referencedRelation: "production_phase_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_phases_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_phases_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_phases_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_phases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_product_bom: {
        Row: {
          cor: string | null
          created_at: string | null
          custo_unitario: number
          id: string
          insumo_id: string | null
          insumo_nome: string
          notes: string | null
          production_product_id: string
          quantidade: number
          subtotal: number | null
          tipo: string | null
          unidade: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          custo_unitario?: number
          id?: string
          insumo_id?: string | null
          insumo_nome: string
          notes?: string | null
          production_product_id: string
          quantidade?: number
          subtotal?: number | null
          tipo?: string | null
          unidade?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          custo_unitario?: number
          id?: string
          insumo_id?: string | null
          insumo_nome?: string
          notes?: string | null
          production_product_id?: string
          quantidade?: number
          subtotal?: number | null
          tipo?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_product_bom_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_product_bom_production_product_id_fkey"
            columns: ["production_product_id"]
            isOneToOne: false
            referencedRelation: "production_products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_products: {
        Row: {
          cmv_total: number | null
          created_at: string | null
          description: string | null
          ia_produto_id: string | null
          id: string
          is_template: boolean | null
          name: string
          product_id: string | null
          production_order_id: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          cmv_total?: number | null
          created_at?: string | null
          description?: string | null
          ia_produto_id?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          product_id?: string | null
          production_order_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cmv_total?: number | null
          created_at?: string | null
          description?: string | null
          ia_produto_id?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          product_id?: string | null
          production_order_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_products_ia_produto_id_fkey"
            columns: ["ia_produto_id"]
            isOneToOne: false
            referencedRelation: "tendenci_ia_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_products_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: true
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "production_products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_types: {
        Row: {
          active: boolean
          color: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          position: number
          slug: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
          slug: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          ativo_no_catalogo: boolean
          average_cost: number | null
          barcode: string | null
          category_id: string
          cfop_entrada: string | null
          cfop_saida: string | null
          code: string | null
          cor: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          descricao_curta: string | null
          descricao_longa: string | null
          description: string | null
          dimensoes: Json
          fornecedor_texto: string | null
          galeria: string[] | null
          ia_produto_id: string | null
          id: string
          image_url: string | null
          imagens: string[]
          item_type: string | null
          last_cost: number | null
          lead_time_days: number | null
          location_id: string | null
          max_stock: number | null
          medida: string | null
          min_stock: number | null
          name: string
          ncm: string | null
          peso: number | null
          prazo_producao_dias: number
          reorder_point: number | null
          reorder_quantity: number | null
          reserved_stock: number | null
          sale_price: number | null
          template_ficha_id: string | null
          tenant_id: string | null
          unit: string | null
          updated_at: string | null
          videos: Json | null
        }
        Insert: {
          active?: boolean | null
          ativo_no_catalogo?: boolean
          average_cost?: number | null
          barcode?: string | null
          category_id: string
          cfop_entrada?: string | null
          cfop_saida?: string | null
          code?: string | null
          cor?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          descricao_curta?: string | null
          descricao_longa?: string | null
          description?: string | null
          dimensoes?: Json
          fornecedor_texto?: string | null
          galeria?: string[] | null
          ia_produto_id?: string | null
          id?: string
          image_url?: string | null
          imagens?: string[]
          item_type?: string | null
          last_cost?: number | null
          lead_time_days?: number | null
          location_id?: string | null
          max_stock?: number | null
          medida?: string | null
          min_stock?: number | null
          name: string
          ncm?: string | null
          peso?: number | null
          prazo_producao_dias?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number | null
          sale_price?: number | null
          template_ficha_id?: string | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
          videos?: Json | null
        }
        Update: {
          active?: boolean | null
          ativo_no_catalogo?: boolean
          average_cost?: number | null
          barcode?: string | null
          category_id?: string
          cfop_entrada?: string | null
          cfop_saida?: string | null
          code?: string | null
          cor?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          descricao_curta?: string | null
          descricao_longa?: string | null
          description?: string | null
          dimensoes?: Json
          fornecedor_texto?: string | null
          galeria?: string[] | null
          ia_produto_id?: string | null
          id?: string
          image_url?: string | null
          imagens?: string[]
          item_type?: string | null
          last_cost?: number | null
          lead_time_days?: number | null
          location_id?: string | null
          max_stock?: number | null
          medida?: string | null
          min_stock?: number | null
          name?: string
          ncm?: string | null
          peso?: number | null
          prazo_producao_dias?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number | null
          sale_price?: number | null
          template_ficha_id?: string | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_ia_produto_id_fkey"
            columns: ["ia_produto_id"]
            isOneToOne: false
            referencedRelation: "tendenci_ia_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_template_ficha_id_fkey"
            columns: ["template_ficha_id"]
            isOneToOne: false
            referencedRelation: "production_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_type_permissions: {
        Row: {
          can_admin: boolean
          can_approve: boolean
          can_conciliate: boolean
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          profile_type_id: string
          tenant_id: string | null
        }
        Insert: {
          can_admin?: boolean
          can_approve?: boolean
          can_conciliate?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          profile_type_id: string
          tenant_id?: string | null
        }
        Update: {
          can_admin?: boolean
          can_approve?: boolean
          can_conciliate?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          profile_type_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_type_permissions_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_type_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_type_templates: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_builtin: boolean
          name: string
          permissions: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_builtin?: boolean
          name: string
          permissions?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_builtin?: boolean
          name?: string
          permissions?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_type_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_tenant_id: string | null
          email: string
          especializacao: string | null
          full_name: string | null
          id: string
          is_owner: boolean | null
          profile_type_id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_tenant_id?: string | null
          email: string
          especializacao?: string | null
          full_name?: string | null
          id: string
          is_owner?: boolean | null
          profile_type_id: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_tenant_id?: string | null
          email?: string
          especializacao?: string | null
          full_name?: string | null
          id?: string
          is_owner?: boolean | null
          profile_type_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_tenant_id_fkey"
            columns: ["current_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_percent: number | null
          id: string
          markup_percent: number | null
          name: string
          notes: string | null
          project_id: string | null
          status: string | null
          tenant_id: string | null
          total_cost: number | null
          total_price: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          markup_percent?: number | null
          name: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          total_price?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          markup_percent?: number | null
          name?: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          total_price?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      project_notes: {
        Row: {
          audio_url: string | null
          author_id: string | null
          created_at: string | null
          id: string
          mentioned_users: string[] | null
          message: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          message?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          message?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
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
          notes: string | null
          presented_at: string | null
          sent_at: string | null
          sent_date: string | null
          stage: string | null
          tenant_id: string | null
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
          notes?: string | null
          presented_at?: string | null
          sent_at?: string | null
          sent_date?: string | null
          stage?: string | null
          tenant_id?: string | null
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
          notes?: string | null
          presented_at?: string | null
          sent_at?: string | null
          sent_date?: string | null
          stage?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          id: string
          position: number | null
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          position?: number | null
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          position?: number | null
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          discount_value: number | null
          expected_date: string | null
          id: string
          issue_date: string | null
          material_request_id: string | null
          notes: string | null
          ops_order_id: string | null
          order_number: number
          payment_terms: string | null
          project_id: string | null
          received_date: string | null
          request_id: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tenant_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          material_request_id?: string | null
          notes?: string | null
          ops_order_id?: string | null
          order_number?: number
          payment_terms?: string | null
          project_id?: string | null
          received_date?: string | null
          request_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          material_request_id?: string | null
          notes?: string | null
          ops_order_id?: string | null
          order_number?: number
          payment_terms?: string | null
          project_id?: string | null
          received_date?: string | null
          request_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_material_request_id_fkey"
            columns: ["material_request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_pressure_snapshots: {
        Row: {
          captured_at: string
          failure_rate: number
          id: string
          metadata: Json | null
          oldest_job_age_minutes: number
          processing_rate: number
          queue_code: string
          queue_depth: number
        }
        Insert: {
          captured_at?: string
          failure_rate?: number
          id?: string
          metadata?: Json | null
          oldest_job_age_minutes?: number
          processing_rate?: number
          queue_code: string
          queue_depth?: number
        }
        Update: {
          captured_at?: string
          failure_rate?: number
          id?: string
          metadata?: Json | null
          oldest_job_age_minutes?: number
          processing_rate?: number
          queue_code?: string
          queue_depth?: number
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          cost_center: string | null
          created_at: string
          description: string | null
          id: string
          position: number | null
          product_name: string
          quantity: number | null
          quote_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          product_name: string
          quantity?: number | null
          quote_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          product_name?: string
          quantity?: number | null
          quote_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number | null
          discount_value: number | null
          final_value: number | null
          id: string
          notes: string | null
          order_id: string | null
          payment_condition: string | null
          quote_number: number
          seller_id: string | null
          status: string
          tenant_id: string | null
          title: string
          total_value: number | null
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          final_value?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_condition?: string | null
          quote_number?: number
          seller_id?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          total_value?: number | null
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          final_value?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_condition?: string | null
          quote_number?: number
          seller_id?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          total_value?: number | null
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_critical_permissions: {
        Row: {
          allowed: boolean
          created_at: string | null
          id: string
          permission_group: string
          permission_key: string
          permission_label: string
          profile_type_id: string
          tenant_id: string | null
        }
        Insert: {
          allowed?: boolean
          created_at?: string | null
          id?: string
          permission_group?: string
          permission_key: string
          permission_label: string
          profile_type_id: string
          tenant_id?: string | null
        }
        Update: {
          allowed?: boolean
          created_at?: string | null
          id?: string
          permission_group?: string
          permission_key?: string
          permission_label?: string
          profile_type_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_critical_permissions_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_critical_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_permission_audit: {
        Row: {
          change_detail: Json | null
          changed_by: string
          created_at: string
          event_type: string
          id: string
          profile_type_id: string | null
          profile_type_name: string | null
          target_user_id: string | null
          tenant_id: string | null
        }
        Insert: {
          change_detail?: Json | null
          changed_by: string
          created_at?: string
          event_type: string
          id?: string
          profile_type_id?: string | null
          profile_type_name?: string | null
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          change_detail?: Json | null
          changed_by?: string
          created_at?: string
          event_type?: string
          id?: string
          profile_type_id?: string | null
          profile_type_name?: string | null
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_permission_audit_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_permission_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_permission_catalog: {
        Row: {
          created_at: string
          default_blocked_message: string | null
          description: string | null
          id: string
          is_critical: boolean
          label: string
          module: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          default_blocked_message?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          label: string
          module: string
          permission_key: string
        }
        Update: {
          created_at?: string
          default_blocked_message?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          label?: string
          module?: string
          permission_key?: string
        }
        Relationships: []
      }
      rbac_permission_denials: {
        Row: {
          attempted_at: string
          context: Json | null
          id: string
          module: string | null
          permission_key: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          context?: Json | null
          id?: string
          module?: string | null
          permission_key: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          context?: Json | null
          id?: string
          module?: string | null
          permission_key?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_permission_denials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_permission_recommendations: {
        Row: {
          confidence: number | null
          created_at: string
          description: string | null
          evidence: Json | null
          id: string
          module: string | null
          permission_key: string | null
          priority: number | null
          profile_type_id: string | null
          recommendation_type: string
          source: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          id?: string
          module?: string | null
          permission_key?: string | null
          priority?: number | null
          profile_type_id?: string | null
          recommendation_type: string
          source?: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          id?: string
          module?: string | null
          permission_key?: string | null
          priority?: number | null
          profile_type_id?: string | null
          recommendation_type?: string
          source?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_permission_recommendations_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_permission_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_scope_restrictions: {
        Row: {
          allowed_ids: string[] | null
          created_at: string | null
          id: string
          profile_type_id: string
          scope_mode: string
          scope_type: string
          tenant_id: string | null
        }
        Insert: {
          allowed_ids?: string[] | null
          created_at?: string | null
          id?: string
          profile_type_id: string
          scope_mode?: string
          scope_type: string
          tenant_id?: string | null
        }
        Update: {
          allowed_ids?: string[] | null
          created_at?: string | null
          id?: string
          profile_type_id?: string
          scope_mode?: string
          scope_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_scope_restrictions_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_scope_restrictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_segregation_rules: {
        Row: {
          active: boolean
          blocked_action: string
          blocked_module: string
          created_at: string | null
          id: string
          profile_type_id: string
          reason: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          blocked_action: string
          blocked_module: string
          created_at?: string | null
          id?: string
          profile_type_id: string
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          blocked_action?: string
          blocked_module?: string
          created_at?: string | null
          id?: string
          profile_type_id?: string
          reason?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_segregation_rules_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_segregation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_status_rules: {
        Row: {
          active: boolean | null
          blocked_action: string
          blocked_status: string
          created_at: string | null
          id: string
          module: string
          profile_type_id: string
          reason: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          blocked_action?: string
          blocked_status: string
          created_at?: string | null
          id?: string
          module: string
          profile_type_id: string
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          blocked_action?: string
          blocked_status?: string
          created_at?: string | null
          id?: string
          module?: string
          profile_type_id?: string
          reason?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_status_rules_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_status_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_value_limits: {
        Row: {
          created_at: string | null
          id: string
          max_value: number | null
          module: string
          profile_type_id: string
          requires_approval_above: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_value?: number | null
          module: string
          profile_type_id: string
          requires_approval_above?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_value?: number | null
          module?: string
          profile_type_id?: string
          requires_approval_above?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_value_limits_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_value_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_catalog: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          estimated_duration_seconds: number | null
          handler_kind: string
          handler_target: string | null
          id: string
          is_retriable: boolean
          is_safe_auto: boolean
          max_retry_attempts: number
          name: string
          recovery_type: string
          requires_owner_confirmation: boolean
          risk_level: string
          target_module: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          estimated_duration_seconds?: number | null
          handler_kind?: string
          handler_target?: string | null
          id?: string
          is_retriable?: boolean
          is_safe_auto?: boolean
          max_retry_attempts?: number
          name: string
          recovery_type?: string
          requires_owner_confirmation?: boolean
          risk_level?: string
          target_module: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          estimated_duration_seconds?: number | null
          handler_kind?: string
          handler_target?: string | null
          id?: string
          is_retriable?: boolean
          is_safe_auto?: boolean
          max_retry_attempts?: number
          name?: string
          recovery_type?: string
          requires_owner_confirmation?: boolean
          risk_level?: string
          target_module?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_execution_history: {
        Row: {
          duration_ms: number | null
          executed_at: string
          execution_logs: Json | null
          execution_mode: string
          execution_reason: string | null
          execution_result: string
          id: string
          policy_code: string
          target_layer: string | null
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          executed_at?: string
          execution_logs?: Json | null
          execution_mode?: string
          execution_reason?: string | null
          execution_result: string
          id?: string
          policy_code: string
          target_layer?: string | null
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          executed_at?: string
          execution_logs?: Json | null
          execution_mode?: string
          execution_reason?: string | null
          execution_result?: string
          id?: string
          policy_code?: string
          target_layer?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_execution_history_policy_code_fkey"
            columns: ["policy_code"]
            isOneToOne: false
            referencedRelation: "recovery_policy_registry"
            referencedColumns: ["policy_code"]
          },
        ]
      }
      recovery_execution_logs: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          executed_by: string | null
          execution_mode: string
          failure_code: string
          finished_at: string | null
          id: string
          idempotency_key: string | null
          incident_group_id: string | null
          message: string | null
          payload: Json | null
          recovery_code: string
          related_event_id: string | null
          response: Json | null
          result: string
          source_module: string | null
          started_at: string
          target_module: string | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          executed_by?: string | null
          execution_mode?: string
          failure_code: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          incident_group_id?: string | null
          message?: string | null
          payload?: Json | null
          recovery_code: string
          related_event_id?: string | null
          response?: Json | null
          result?: string
          source_module?: string | null
          started_at?: string
          target_module?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          executed_by?: string | null
          execution_mode?: string
          failure_code?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          incident_group_id?: string | null
          message?: string | null
          payload?: Json | null
          recovery_code?: string
          related_event_id?: string | null
          response?: Json | null
          result?: string
          source_module?: string | null
          started_at?: string
          target_module?: string | null
        }
        Relationships: []
      }
      recovery_policy_registry: {
        Row: {
          cooldown_minutes: number
          created_at: string
          id: string
          is_auto_execute: boolean
          is_enabled: boolean
          last_executed_at: string | null
          last_result: string | null
          policy_code: string
          policy_description: string | null
          policy_name: string
          policy_type: string
          recovery_scope: string
          requires_owner_approval: boolean
        }
        Insert: {
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_auto_execute?: boolean
          is_enabled?: boolean
          last_executed_at?: string | null
          last_result?: string | null
          policy_code: string
          policy_description?: string | null
          policy_name: string
          policy_type: string
          recovery_scope: string
          requires_owner_approval?: boolean
        }
        Update: {
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_auto_execute?: boolean
          is_enabled?: boolean
          last_executed_at?: string | null
          last_result?: string | null
          policy_code?: string
          policy_description?: string | null
          policy_name?: string
          policy_type?: string
          recovery_scope?: string
          requires_owner_approval?: boolean
        }
        Relationships: []
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      root_cause_analysis_events: {
        Row: {
          affected_modules: string[] | null
          confidence_score: number
          created_at: string
          derived_from: string
          id: string
          incident_group_id: string
          metadata: Json | null
          reasoning: string | null
          root_cause_module_code: string
        }
        Insert: {
          affected_modules?: string[] | null
          confidence_score?: number
          created_at?: string
          derived_from?: string
          id?: string
          incident_group_id: string
          metadata?: Json | null
          reasoning?: string | null
          root_cause_module_code: string
        }
        Update: {
          affected_modules?: string[] | null
          confidence_score?: number
          created_at?: string
          derived_from?: string
          id?: string
          incident_group_id?: string
          metadata?: Json | null
          reasoning?: string | null
          root_cause_module_code?: string
        }
        Relationships: []
      }
      runbook_catalog: {
        Row: {
          auto_start_allowed: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          incident_type: string
          is_active: boolean
          is_fallback: boolean
          metadata: Json | null
          name: string
          owner_confirmation_required: boolean
          severity_scope: string[] | null
          target_module: string
          updated_at: string
        }
        Insert: {
          auto_start_allowed?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          is_active?: boolean
          is_fallback?: boolean
          metadata?: Json | null
          name: string
          owner_confirmation_required?: boolean
          severity_scope?: string[] | null
          target_module: string
          updated_at?: string
        }
        Update: {
          auto_start_allowed?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          is_active?: boolean
          is_fallback?: boolean
          metadata?: Json | null
          name?: string
          owner_confirmation_required?: boolean
          severity_scope?: string[] | null
          target_module?: string
          updated_at?: string
        }
        Relationships: []
      }
      runbook_escalation_rules: {
        Row: {
          condition_type: string
          created_at: string
          escalation_action: string
          id: string
          metadata: Json | null
          requires_owner: boolean
          runbook_code: string
          threshold: number | null
        }
        Insert: {
          condition_type: string
          created_at?: string
          escalation_action: string
          id?: string
          metadata?: Json | null
          requires_owner?: boolean
          runbook_code: string
          threshold?: number | null
        }
        Update: {
          condition_type?: string
          created_at?: string
          escalation_action?: string
          id?: string
          metadata?: Json | null
          requires_owner?: boolean
          runbook_code?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "runbook_escalation_rules_runbook_code_fkey"
            columns: ["runbook_code"]
            isOneToOne: false
            referencedRelation: "runbook_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      runbook_executions: {
        Row: {
          created_at: string
          current_step_order: number | null
          duration_seconds: number | null
          failed_steps: number | null
          finished_at: string | null
          id: string
          incident_id: string | null
          metadata: Json | null
          result_summary: string | null
          runbook_code: string
          started_at: string
          status: string
          succeeded_steps: number | null
          total_steps: number | null
          triggered_by: string
          triggered_user_id: string | null
        }
        Insert: {
          created_at?: string
          current_step_order?: number | null
          duration_seconds?: number | null
          failed_steps?: number | null
          finished_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          result_summary?: string | null
          runbook_code: string
          started_at?: string
          status?: string
          succeeded_steps?: number | null
          total_steps?: number | null
          triggered_by: string
          triggered_user_id?: string | null
        }
        Update: {
          created_at?: string
          current_step_order?: number | null
          duration_seconds?: number | null
          failed_steps?: number | null
          finished_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          result_summary?: string | null
          runbook_code?: string
          started_at?: string
          status?: string
          succeeded_steps?: number | null
          total_steps?: number | null
          triggered_by?: string
          triggered_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runbook_executions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "system_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runbook_executions_runbook_code_fkey"
            columns: ["runbook_code"]
            isOneToOne: false
            referencedRelation: "runbook_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      runbook_step_executions: {
        Row: {
          action_code: string
          attempt_number: number
          created_at: string
          duration_ms: number | null
          execution_id: string
          finished_at: string | null
          id: string
          message: string | null
          recovery_log_id: string | null
          started_at: string | null
          status: string
          step_order: number
          validation_result: Json | null
        }
        Insert: {
          action_code: string
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          execution_id: string
          finished_at?: string | null
          id?: string
          message?: string | null
          recovery_log_id?: string | null
          started_at?: string | null
          status?: string
          step_order: number
          validation_result?: Json | null
        }
        Update: {
          action_code?: string
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          message?: string | null
          recovery_log_id?: string | null
          started_at?: string | null
          status?: string
          step_order?: number
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "runbook_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "runbook_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      runbook_steps: {
        Row: {
          action_code: string
          created_at: string
          execution_mode: string
          id: string
          is_critical: boolean
          metadata: Json | null
          retry_policy: Json | null
          rollback_action: string | null
          runbook_code: string
          step_name: string
          step_order: number
          timeout_seconds: number
        }
        Insert: {
          action_code: string
          created_at?: string
          execution_mode?: string
          id?: string
          is_critical?: boolean
          metadata?: Json | null
          retry_policy?: Json | null
          rollback_action?: string | null
          runbook_code: string
          step_name: string
          step_order: number
          timeout_seconds?: number
        }
        Update: {
          action_code?: string
          created_at?: string
          execution_mode?: string
          id?: string
          is_critical?: boolean
          metadata?: Json | null
          retry_policy?: Json | null
          rollback_action?: string | null
          runbook_code?: string
          step_name?: string
          step_order?: number
          timeout_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "runbook_steps_runbook_code_fkey"
            columns: ["runbook_code"]
            isOneToOne: false
            referencedRelation: "runbook_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      runbook_validation_rules: {
        Row: {
          created_at: string
          expected_result: Json | null
          id: string
          metadata: Json | null
          on_failure_action: string
          runbook_code: string
          step_order: number
          validation_query: string | null
          validation_type: string
        }
        Insert: {
          created_at?: string
          expected_result?: Json | null
          id?: string
          metadata?: Json | null
          on_failure_action?: string
          runbook_code: string
          step_order: number
          validation_query?: string | null
          validation_type: string
        }
        Update: {
          created_at?: string
          expected_result?: Json | null
          id?: string
          metadata?: Json | null
          on_failure_action?: string
          runbook_code?: string
          step_order?: number
          validation_query?: string | null
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "runbook_validation_rules_runbook_code_fkey"
            columns: ["runbook_code"]
            isOneToOne: false
            referencedRelation: "runbook_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      saas_admin_action_log: {
        Row: {
          action_category: string
          action_type: string
          actor_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          target_tenant_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_category?: string
          action_type: string
          actor_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          target_tenant_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          actor_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          target_tenant_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_admin_action_log_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      self_healing_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_code: string | null
          created_at: string
          id: string
          incident_id: string | null
          metadata: Json | null
          module_code: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          status: string
          trigger_reason: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_code?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          module_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          trigger_reason: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_code?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          module_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          trigger_reason?: string
        }
        Relationships: []
      }
      self_healing_guardrail_logs: {
        Row: {
          action_code: string
          context: Json | null
          decision: string
          dependency_depth: number | null
          evaluated_at: string
          id: string
          incident_id: string | null
          module_code: string | null
          policy_snapshot: Json | null
          reason: string | null
          retry_count: number | null
          root_cause_confidence: number | null
          severity: string | null
        }
        Insert: {
          action_code: string
          context?: Json | null
          decision: string
          dependency_depth?: number | null
          evaluated_at?: string
          id?: string
          incident_id?: string | null
          module_code?: string | null
          policy_snapshot?: Json | null
          reason?: string | null
          retry_count?: number | null
          root_cause_confidence?: number | null
          severity?: string | null
        }
        Update: {
          action_code?: string
          context?: Json | null
          decision?: string
          dependency_depth?: number | null
          evaluated_at?: string
          id?: string
          incident_id?: string | null
          module_code?: string | null
          policy_snapshot?: Json | null
          reason?: string | null
          retry_count?: number | null
          root_cause_confidence?: number | null
          severity?: string | null
        }
        Relationships: []
      }
      self_healing_policy_registry: {
        Row: {
          action_code: string
          active: boolean
          allowed_severity_scope: string[]
          cooldown_seconds: number
          created_at: string
          id: string
          max_auto_attempts: number
          max_dependency_depth: number
          module_code: string | null
          notes: string | null
          requires_dependency_stability: boolean
          requires_owner_confirmation: boolean
          requires_root_cause_confidence: number
          retry_window_minutes: number
          safety_level: string
          updated_at: string
        }
        Insert: {
          action_code: string
          active?: boolean
          allowed_severity_scope?: string[]
          cooldown_seconds?: number
          created_at?: string
          id?: string
          max_auto_attempts?: number
          max_dependency_depth?: number
          module_code?: string | null
          notes?: string | null
          requires_dependency_stability?: boolean
          requires_owner_confirmation?: boolean
          requires_root_cause_confidence?: number
          retry_window_minutes?: number
          safety_level?: string
          updated_at?: string
        }
        Update: {
          action_code?: string
          active?: boolean
          allowed_severity_scope?: string[]
          cooldown_seconds?: number
          created_at?: string
          id?: string
          max_auto_attempts?: number
          max_dependency_depth?: number
          module_code?: string | null
          notes?: string | null
          requires_dependency_stability?: boolean
          requires_owner_confirmation?: boolean
          requires_root_cause_confidence?: number
          retry_window_minutes?: number
          safety_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      self_healing_retry_budgets: {
        Row: {
          action_code: string
          attempts_count: number
          created_at: string
          id: string
          last_attempt_at: string | null
          last_result: string | null
          module_code: string | null
          updated_at: string
          window_started_at: string
        }
        Insert: {
          action_code: string
          attempts_count?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_result?: string | null
          module_code?: string | null
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          action_code?: string
          attempts_count?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_result?: string | null
          module_code?: string | null
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      self_healing_stability_checks: {
        Row: {
          checked_at: string
          dependency_stable: boolean | null
          details: Json | null
          duration_observed_seconds: number | null
          id: string
          incident_id: string | null
          integration_health_ok: boolean | null
          module_code: string | null
          overall_stable: boolean | null
          recovery_log_id: string | null
          snapshot_fresh: boolean | null
          timeline_clean: boolean | null
        }
        Insert: {
          checked_at?: string
          dependency_stable?: boolean | null
          details?: Json | null
          duration_observed_seconds?: number | null
          id?: string
          incident_id?: string | null
          integration_health_ok?: boolean | null
          module_code?: string | null
          overall_stable?: boolean | null
          recovery_log_id?: string | null
          snapshot_fresh?: boolean | null
          timeline_clean?: boolean | null
        }
        Update: {
          checked_at?: string
          dependency_stable?: boolean | null
          details?: Json | null
          duration_observed_seconds?: number | null
          id?: string
          incident_id?: string | null
          integration_health_ok?: boolean | null
          module_code?: string | null
          overall_stable?: boolean | null
          recovery_log_id?: string | null
          snapshot_fresh?: boolean | null
          timeline_clean?: boolean | null
        }
        Relationships: []
      }
      self_service_events: {
        Row: {
          created_at: string
          id: string
          module: string | null
          reference_id: string | null
          resolution_type: string
          resolved_without_ticket: boolean
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module?: string | null
          reference_id?: string | null
          resolution_type: string
          resolved_without_ticket?: boolean
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module?: string | null
          reference_id?: string | null
          resolution_type?: string
          resolved_without_ticket?: boolean
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "self_service_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stability_gate_evaluations: {
        Row: {
          blocking_count: number
          blocking_detected: boolean
          details: Json | null
          evaluated_at: string
          evaluation_reason: string | null
          evaluation_result: string
          gate_code: string
          id: string
          related_layer: string | null
          related_release: string | null
        }
        Insert: {
          blocking_count?: number
          blocking_detected?: boolean
          details?: Json | null
          evaluated_at?: string
          evaluation_reason?: string | null
          evaluation_result: string
          gate_code: string
          id?: string
          related_layer?: string | null
          related_release?: string | null
        }
        Update: {
          blocking_count?: number
          blocking_detected?: boolean
          details?: Json | null
          evaluated_at?: string
          evaluation_reason?: string | null
          evaluation_result?: string
          gate_code?: string
          id?: string
          related_layer?: string | null
          related_release?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stability_gate_evaluations_gate_code_fkey"
            columns: ["gate_code"]
            isOneToOne: false
            referencedRelation: "stability_gate_registry"
            referencedColumns: ["gate_code"]
          },
        ]
      }
      stability_gate_registry: {
        Row: {
          created_at: string
          gate_code: string
          gate_description: string | null
          gate_name: string
          gate_status: string
          gate_type: string
          id: string
          is_blocking: boolean
          last_blocking_count: number
          last_checked_at: string | null
          last_reason: string | null
        }
        Insert: {
          created_at?: string
          gate_code: string
          gate_description?: string | null
          gate_name: string
          gate_status?: string
          gate_type: string
          id?: string
          is_blocking?: boolean
          last_blocking_count?: number
          last_checked_at?: string | null
          last_reason?: string | null
        }
        Update: {
          created_at?: string
          gate_code?: string
          gate_description?: string | null
          gate_name?: string
          gate_status?: string
          gate_type?: string
          id?: string
          is_blocking?: boolean
          last_blocking_count?: number
          last_checked_at?: string | null
          last_reason?: string | null
        }
        Relationships: []
      }
      stock_alerts_config: {
        Row: {
          alert_high_stock: boolean | null
          alert_low_stock: boolean | null
          alert_zero_stock: boolean | null
          created_at: string | null
          high_stock_threshold: number | null
          id: string
          notify_user_ids: string[] | null
          product_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          alert_high_stock?: boolean | null
          alert_low_stock?: boolean | null
          alert_zero_stock?: boolean | null
          created_at?: string | null
          high_stock_threshold?: number | null
          id?: string
          notify_user_ids?: string[] | null
          product_id: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_high_stock?: boolean | null
          alert_low_stock?: boolean | null
          alert_zero_stock?: boolean | null
          created_at?: string | null
          high_stock_threshold?: number | null
          id?: string
          notify_user_ids?: string[] | null
          product_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string | null
          movement_type: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          supplier_id: string | null
          tenant_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          movement_type: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          movement_type?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_actions_log: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          performed_by: string | null
          reason: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          reason: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          reason?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_actions_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_actions_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          created_at: string
          event_type: string
          from_plan_id: string | null
          id: string
          metadata: Json | null
          subscription_id: string
          tenant_id: string
          to_plan_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          from_plan_id?: string | null
          id?: string
          metadata?: Json | null
          subscription_id: string
          tenant_id: string
          to_plan_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          from_plan_id?: string | null
          id?: string
          metadata?: Json | null
          subscription_id?: string
          tenant_id?: string
          to_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_method: string | null
          plan_id: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          plan_id: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          plan_id?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      success_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          severity: string
          source_module: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          source_module?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          source_module?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      success_playbooks: {
        Row: {
          actions: Json | null
          active: boolean
          created_at: string
          description: string | null
          execution_count: number
          id: string
          last_executed_at: string | null
          name: string
          priority: number
          trigger_condition: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          active?: boolean
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_executed_at?: string | null
          name: string
          priority?: number
          trigger_condition?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          active?: boolean
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_executed_at?: string | null
          name?: string
          priority?: number
          trigger_condition?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sup_quotation_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          product_id: string | null
          quantity: number | null
          quotation_id: string
          tenant_id: string | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quotation_id: string
          tenant_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quotation_id?: string
          tenant_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sup_quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "sup_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sup_quotations: {
        Row: {
          created_at: string | null
          delivery_days: number | null
          id: string
          notes: string | null
          payment_terms: string | null
          quotation_number: number
          request_id: string | null
          selected: boolean | null
          shipping_cost: number | null
          status: string | null
          supplier_id: string | null
          tenant_id: string | null
          total: number | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_number?: number
          request_id?: string | null
          selected?: boolean | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total?: number | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_number?: number
          request_id?: string | null
          selected?: boolean | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sup_quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sup_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cost_center_id: string | null
          created_at: string | null
          description: string | null
          estimated_value: number | null
          id: string
          needed_by: string | null
          notes: string | null
          ops_order_id: string | null
          origin: string | null
          priority: string | null
          project_id: string | null
          request_number: number
          requester_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          needed_by?: string | null
          notes?: string | null
          ops_order_id?: string | null
          origin?: string | null
          priority?: string | null
          project_id?: string | null
          request_number?: number
          requester_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          needed_by?: string | null
          notes?: string | null
          ops_order_id?: string | null
          origin?: string | null
          priority?: string | null
          project_id?: string | null
          request_number?: number
          requester_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sup_requests_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_requests_ops_order_id_fkey"
            columns: ["ops_order_id"]
            isOneToOne: false
            referencedRelation: "ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "prj_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sup_supplier_evaluations: {
        Row: {
          communication_score: number | null
          created_at: string | null
          delivery_score: number | null
          evaluated_by: string | null
          id: string
          notes: string | null
          overall_score: number | null
          price_score: number | null
          purchase_order_id: string | null
          quality_score: number | null
          supplier_id: string
          tenant_id: string | null
        }
        Insert: {
          communication_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          evaluated_by?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          price_score?: number | null
          purchase_order_id?: string | null
          quality_score?: number | null
          supplier_id: string
          tenant_id?: string | null
        }
        Update: {
          communication_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          evaluated_by?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          price_score?: number | null
          purchase_order_id?: string | null
          quality_score?: number | null
          supplier_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sup_supplier_evaluations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sup_supplier_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          bairro: string | null
          cep: string | null
          city: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          name: string
          notes: string | null
          numero: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          tenant_id: string | null
          trade_name: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          bairro?: string | null
          cep?: string | null
          city?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          name: string
          notes?: string | null
          numero?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          bairro?: string | null
          cep?: string | null
          city?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          name?: string
          notes?: string | null
          numero?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_history: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          tenant_id: string | null
          ticket_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          module: string | null
          priority: string
          recurrence_count: number | null
          reported_by: string | null
          resolution: string | null
          resolution_notes: string | null
          resolution_time_hours: number | null
          resolved_at: string | null
          root_cause: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
          priority?: string
          recurrence_count?: number | null
          reported_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          root_cause?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
          priority?: string
          recurrence_count?: number | null
          reported_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          root_cause?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_activities: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          module: string
          new_value: string | null
          old_value: string | null
          tenant_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          module: string
          new_value?: string | null
          old_value?: string | null
          tenant_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          module?: string
          new_value?: string | null
          old_value?: string | null
          tenant_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_changelog: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          id: string
          impact: string | null
          module: string | null
          release_id: string
          title: string
        }
        Insert: {
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          module?: string | null
          release_id: string
          title: string
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          module?: string | null
          release_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_changelog_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "system_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          created_at: string
          description: string | null
          error_code: string | null
          id: string
          last_occurrence_at: string | null
          metadata: Json | null
          module: string
          occurrence_count: number | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack_trace: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_code?: string | null
          id?: string
          last_occurrence_at?: string | null
          metadata?: Json | null
          module: string
          occurrence_count?: number | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          error_code?: string | null
          id?: string
          last_occurrence_at?: string | null
          metadata?: Json | null
          module?: string
          occurrence_count?: number | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_health_snapshots: {
        Row: {
          avg_query_latency_ms: number | null
          created_at: string
          critical_alerts: number
          delayed_jobs: number
          edge_function_failures_24h: number
          errors_24h: number
          failed_automations_24h: number
          id: string
          integration_failures_24h: number
          metadata: Json | null
          overall_health_score: number
          snapshot_at: string
          window_hours: number
        }
        Insert: {
          avg_query_latency_ms?: number | null
          created_at?: string
          critical_alerts?: number
          delayed_jobs?: number
          edge_function_failures_24h?: number
          errors_24h?: number
          failed_automations_24h?: number
          id?: string
          integration_failures_24h?: number
          metadata?: Json | null
          overall_health_score?: number
          snapshot_at?: string
          window_hours?: number
        }
        Update: {
          avg_query_latency_ms?: number | null
          created_at?: string
          critical_alerts?: number
          delayed_jobs?: number
          edge_function_failures_24h?: number
          errors_24h?: number
          failed_automations_24h?: number
          id?: string
          integration_failures_24h?: number
          metadata?: Json | null
          overall_health_score?: number
          snapshot_at?: string
          window_hours?: number
        }
        Relationships: []
      }
      system_incidents: {
        Row: {
          created_at: string
          current_status: string
          detection_lag_seconds: number | null
          duration_seconds: number | null
          id: string
          impacted_modules: string[] | null
          incident_code: string
          metadata: Json | null
          origin_module_code: string
          recovery_attempts: number | null
          recovery_success_count: number | null
          resolved_at: string | null
          root_cause_confidence: number | null
          root_cause_module: string | null
          severity: string
          started_at: string
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_status?: string
          detection_lag_seconds?: number | null
          duration_seconds?: number | null
          id?: string
          impacted_modules?: string[] | null
          incident_code: string
          metadata?: Json | null
          origin_module_code: string
          recovery_attempts?: number | null
          recovery_success_count?: number | null
          resolved_at?: string | null
          root_cause_confidence?: number | null
          root_cause_module?: string | null
          severity?: string
          started_at?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_status?: string
          detection_lag_seconds?: number | null
          duration_seconds?: number | null
          id?: string
          impacted_modules?: string[] | null
          incident_code?: string
          metadata?: Json | null
          origin_module_code?: string
          recovery_attempts?: number | null
          recovery_success_count?: number | null
          resolved_at?: string | null
          root_cause_confidence?: number | null
          root_cause_module?: string | null
          severity?: string
          started_at?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_module_dependencies: {
        Row: {
          created_at: string
          degradation_mode: string | null
          dependency_strength: string
          dependency_type: string
          dependent_module_code: string
          description: string | null
          id: string
          is_critical: boolean
          source_module_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          degradation_mode?: string | null
          dependency_strength?: string
          dependency_type?: string
          dependent_module_code: string
          description?: string | null
          id?: string
          is_critical?: boolean
          source_module_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          degradation_mode?: string | null
          dependency_strength?: string
          dependency_type?: string
          dependent_module_code?: string
          description?: string | null
          id?: string
          is_critical?: boolean
          source_module_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_module_integrations: {
        Row: {
          created_at: string
          criticality: string
          description: string | null
          expected_interval_minutes: number
          id: string
          integration_type: string
          is_required: boolean
          source_module_code: string
          target_module_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criticality?: string
          description?: string | null
          expected_interval_minutes?: number
          id?: string
          integration_type?: string
          is_required?: boolean
          source_module_code: string
          target_module_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criticality?: string
          description?: string | null
          expected_interval_minutes?: number
          id?: string
          integration_type?: string
          is_required?: boolean
          source_module_code?: string
          target_module_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_module_integrations_source_module_code_fkey"
            columns: ["source_module_code"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "system_module_integrations_target_module_code_fkey"
            columns: ["target_module_code"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["code"]
          },
        ]
      }
      system_modules: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          module_group: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_group: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_group?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_releases: {
        Row: {
          breaking_changes: Json | null
          created_at: string
          description: string | null
          fixes: Json | null
          id: string
          improvements: Json | null
          released_at: string | null
          released_by: string | null
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          breaking_changes?: Json | null
          created_at?: string
          description?: string | null
          fixes?: Json | null
          id?: string
          improvements?: Json | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          breaking_changes?: Json | null
          created_at?: string
          description?: string | null
          fixes?: Json | null
          id?: string
          improvements?: Json | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      temp_phone_fixes: {
        Row: {
          action: string | null
          architect_id: string | null
          created_at: string | null
          fixed_phone: string | null
          original_phone: string | null
        }
        Insert: {
          action?: string | null
          architect_id?: string | null
          created_at?: string | null
          fixed_phone?: string | null
          original_phone?: string | null
        }
        Update: {
          action?: string | null
          architect_id?: string | null
          created_at?: string | null
          fixed_phone?: string | null
          original_phone?: string | null
        }
        Relationships: []
      }
      tenant_catalogo_settings: {
        Row: {
          created_at: string
          footer_company_name: string | null
          footer_copyright: string | null
          hero_subtitle: string | null
          hero_title: string | null
          instagram_url: string | null
          logo_url: string | null
          primary_color: string | null
          tenant_id: string
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          created_at?: string
          footer_company_name?: string | null
          footer_copyright?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          created_at?: string
          footer_company_name?: string | null
          footer_copyright?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      tenant_customization_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          label: string | null
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot: Json
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_customization_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_customizations: {
        Row: {
          created_at: string | null
          dre_aliases: Json | null
          id: string
          kpi_priorities: Json | null
          launcher_shortcuts: Json | null
          module_aliases: Json | null
          segment: string | null
          sidebar_config: Json | null
          tenant_id: string
          updated_at: string | null
          workflow_config: Json | null
        }
        Insert: {
          created_at?: string | null
          dre_aliases?: Json | null
          id?: string
          kpi_priorities?: Json | null
          launcher_shortcuts?: Json | null
          module_aliases?: Json | null
          segment?: string | null
          sidebar_config?: Json | null
          tenant_id: string
          updated_at?: string | null
          workflow_config?: Json | null
        }
        Update: {
          created_at?: string | null
          dre_aliases?: Json | null
          id?: string
          kpi_priorities?: Json | null
          launcher_shortcuts?: Json | null
          module_aliases?: Json | null
          segment?: string | null
          sidebar_config?: Json | null
          tenant_id?: string
          updated_at?: string | null
          workflow_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_customizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_entitlement_grants: {
        Row: {
          created_at: string
          duration_days: number | null
          entitlement_code: string
          expires_at: string
          grant_type: string
          granted_by: string | null
          id: string
          metadata: Json
          reason: string | null
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          entitlement_code: string
          expires_at: string
          grant_type: string
          granted_by?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          starts_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          entitlement_code?: string
          expires_at?: string
          grant_type?: string
          granted_by?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_entitlement_grants_entitlement_code_fkey"
            columns: ["entitlement_code"]
            isOneToOne: false
            referencedRelation: "entitlement_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_entitlement_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_entitlement_overrides: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          enabled: boolean
          entitlement_code: string
          expires_at: string | null
          id: string
          limit_value: number | null
          reason: string | null
          source: string
          starts_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entitlement_code: string
          expires_at?: string | null
          id?: string
          limit_value?: number | null
          reason?: string | null
          source?: string
          starts_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entitlement_code?: string
          expires_at?: string | null
          id?: string
          limit_value?: number | null
          reason?: string | null
          source?: string
          starts_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_entitlement_overrides_entitlement_code_fkey"
            columns: ["entitlement_code"]
            isOneToOne: false
            referencedRelation: "entitlement_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_entitlement_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_lifecycle_snapshots: {
        Row: {
          activation_score: number | null
          ai_insight: string | null
          churn_risk_band: string | null
          churn_risk_score: number | null
          created_at: string
          engagement_band: string | null
          engagement_score: number | null
          expansion_ready_score: number | null
          id: string
          lifecycle_health_index: number | null
          maturity_stage: string | null
          signals: Json | null
          snapshot_date: string
          tenant_id: string
        }
        Insert: {
          activation_score?: number | null
          ai_insight?: string | null
          churn_risk_band?: string | null
          churn_risk_score?: number | null
          created_at?: string
          engagement_band?: string | null
          engagement_score?: number | null
          expansion_ready_score?: number | null
          id?: string
          lifecycle_health_index?: number | null
          maturity_stage?: string | null
          signals?: Json | null
          snapshot_date?: string
          tenant_id: string
        }
        Update: {
          activation_score?: number | null
          ai_insight?: string | null
          churn_risk_band?: string | null
          churn_risk_score?: number | null
          created_at?: string
          engagement_band?: string | null
          engagement_score?: number | null
          expansion_ready_score?: number | null
          id?: string
          lifecycle_health_index?: number | null
          maturity_stage?: string | null
          signals?: Json | null
          snapshot_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_lifecycle_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_load_distribution: {
        Row: {
          automation_count: number
          captured_at: string
          id: string
          job_count: number
          load_share_percent: number
          retry_count: number
          snapshot_count: number
          tenant_id: string | null
          tenant_label: string | null
        }
        Insert: {
          automation_count?: number
          captured_at?: string
          id?: string
          job_count?: number
          load_share_percent?: number
          retry_count?: number
          snapshot_count?: number
          tenant_id?: string | null
          tenant_label?: string | null
        }
        Update: {
          automation_count?: number
          captured_at?: string
          id?: string
          job_count?: number
          load_share_percent?: number
          retry_count?: number
          snapshot_count?: number
          tenant_id?: string | null
          tenant_label?: string | null
        }
        Relationships: []
      }
      tenant_plans: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          extra_user_price: number | null
          features: Json | null
          id: string
          max_companies: number | null
          max_orders: number | null
          max_projects: number | null
          max_storage_mb: number | null
          max_users: number
          name: string
          parent_plan_id: string | null
          price: number
          updated_at: string
          version_current: number
          yearly_price: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          extra_user_price?: number | null
          features?: Json | null
          id?: string
          max_companies?: number | null
          max_orders?: number | null
          max_projects?: number | null
          max_storage_mb?: number | null
          max_users?: number
          name: string
          parent_plan_id?: string | null
          price?: number
          updated_at?: string
          version_current?: number
          yearly_price?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          extra_user_price?: number | null
          features?: Json | null
          id?: string
          max_companies?: number | null
          max_orders?: number | null
          max_projects?: number | null
          max_storage_mb?: number | null
          max_users?: number
          name?: string
          parent_plan_id?: string | null
          price?: number
          updated_at?: string
          version_current?: number
          yearly_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plans_parent_plan_id_fkey"
            columns: ["parent_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_session_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          module: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          module?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          module?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_session_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          max_users: number
          name: string
          plan_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          max_users?: number
          name: string
          plan_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          max_users?: number
          name?: string
          plan_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "tendenci_badges_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tendenci_campaign_dispatches: {
        Row: {
          arquiteto_atual: string | null
          campanha_id: string
          concluido_em: string | null
          created_at: string | null
          enviados_erro: number
          enviados_sucesso: number
          erro_mensagem: string | null
          id: string
          iniciado_em: string | null
          is_recurrent: boolean | null
          progresso_percentual: number
          status: string
          total_arquitetos: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          arquiteto_atual?: string | null
          campanha_id: string
          concluido_em?: string | null
          created_at?: string | null
          enviados_erro?: number
          enviados_sucesso?: number
          erro_mensagem?: string | null
          id?: string
          iniciado_em?: string | null
          is_recurrent?: boolean | null
          progresso_percentual?: number
          status?: string
          total_arquitetos?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          arquiteto_atual?: string | null
          campanha_id?: string
          concluido_em?: string | null
          created_at?: string | null
          enviados_erro?: number
          enviados_sucesso?: number
          erro_mensagem?: string | null
          id?: string
          iniciado_em?: string | null
          is_recurrent?: boolean | null
          progresso_percentual?: number
          status?: string
          total_arquitetos?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_campaign_dispatches_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_campaign_dispatches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_campaign_dispatches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tendenci_campaign_queue: {
        Row: {
          agendado_para: string
          arquiteto_id: string | null
          campanha_id: string | null
          created_at: string | null
          dispatch_id: string | null
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          position: number
          status: string | null
          tentativas: number | null
        }
        Insert: {
          agendado_para: string
          arquiteto_id?: string | null
          campanha_id?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          position: number
          status?: string | null
          tentativas?: number | null
        }
        Update: {
          agendado_para?: string
          arquiteto_id?: string | null
          campanha_id?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          position?: number
          status?: string | null
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_campaign_queue_arquiteto_id_fkey"
            columns: ["arquiteto_id"]
            isOneToOne: false
            referencedRelation: "architects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_campaign_queue_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "tendenci_prospec_arq_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_campaign_queue_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "tendenci_campaign_dispatches"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_company_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "tendenci_daily_architect_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tendenci_daily_goal_records: {
        Row: {
          created_at: string | null
          data: string
          id: string
          meta_arquitetos: number
          meta_batida: boolean | null
          meta_valor: number | null
          realizado_arquitetos: number | null
          realizado_valor: number | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          meta_arquitetos?: number
          meta_batida?: boolean | null
          meta_valor?: number | null
          realizado_arquitetos?: number | null
          realizado_valor?: number | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          meta_arquitetos?: number
          meta_batida?: boolean | null
          meta_valor?: number | null
          realizado_arquitetos?: number | null
          realizado_valor?: number | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_daily_goal_records_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_daily_goal_records_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
      tendenci_ia_config: {
        Row: {
          ativa: boolean | null
          config: Json
          created_at: string | null
          id: string
          secao: string
          tenant_id: string | null
          updated_at: string | null
          updated_by: string | null
          versao: number | null
        }
        Insert: {
          ativa?: boolean | null
          config?: Json
          created_at?: string | null
          id?: string
          secao: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          versao?: number | null
        }
        Update: {
          ativa?: boolean | null
          config?: Json
          created_at?: string | null
          id?: string
          secao?: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_ia_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_ia_conhecimento: {
        Row: {
          aplicacao: string[] | null
          arquivo_url: string | null
          arquivos: Json | null
          ativo: boolean | null
          autor: string | null
          categoria: string | null
          conteudo: string
          contexto_uso: string | null
          created_at: string | null
          fonte: string | null
          grau_certeza: string | null
          id: string
          nivel_autoridade: string | null
          palavras_chave: string[] | null
          prioridade: number | null
          tenant_id: string | null
          tipo: string | null
          tipo_arquivo: string | null
          titulo: string
          updated_at: string | null
          validade: string | null
          videos: Json | null
        }
        Insert: {
          aplicacao?: string[] | null
          arquivo_url?: string | null
          arquivos?: Json | null
          ativo?: boolean | null
          autor?: string | null
          categoria?: string | null
          conteudo: string
          contexto_uso?: string | null
          created_at?: string | null
          fonte?: string | null
          grau_certeza?: string | null
          id?: string
          nivel_autoridade?: string | null
          palavras_chave?: string[] | null
          prioridade?: number | null
          tenant_id?: string | null
          tipo?: string | null
          tipo_arquivo?: string | null
          titulo: string
          updated_at?: string | null
          validade?: string | null
          videos?: Json | null
        }
        Update: {
          aplicacao?: string[] | null
          arquivo_url?: string | null
          arquivos?: Json | null
          ativo?: boolean | null
          autor?: string | null
          categoria?: string | null
          conteudo?: string
          contexto_uso?: string | null
          created_at?: string | null
          fonte?: string | null
          grau_certeza?: string | null
          id?: string
          nivel_autoridade?: string | null
          palavras_chave?: string[] | null
          prioridade?: number | null
          tenant_id?: string | null
          tipo?: string | null
          tipo_arquivo?: string | null
          titulo?: string
          updated_at?: string | null
          validade?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_ia_conhecimento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_ia_produtos: {
        Row: {
          altura: number | null
          ativo: boolean | null
          categoria: string | null
          centro_custo: string | null
          codigo_interno: string | null
          comprimento: number | null
          created_at: string | null
          descricao: string | null
          diferenciais: string[] | null
          estoque: number | null
          galeria: string[] | null
          id: string
          imagem_url: string | null
          inventory_location_id: string | null
          inventory_product_id: string | null
          largura: number | null
          local_estoque_id: string | null
          nome: string
          permite_venda_sem_estoque: boolean | null
          prazo_entrega_dias: number | null
          preco_base: number | null
          preco_original: number | null
          quando_oferecer: string | null
          sub_categoria: string | null
          template_ficha_id: string | null
          tenant_id: string | null
          unidade_medida: string | null
          updated_at: string | null
          video_url: string | null
          videos: Json | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean | null
          categoria?: string | null
          centro_custo?: string | null
          codigo_interno?: string | null
          comprimento?: number | null
          created_at?: string | null
          descricao?: string | null
          diferenciais?: string[] | null
          estoque?: number | null
          galeria?: string[] | null
          id?: string
          imagem_url?: string | null
          inventory_location_id?: string | null
          inventory_product_id?: string | null
          largura?: number | null
          local_estoque_id?: string | null
          nome: string
          permite_venda_sem_estoque?: boolean | null
          prazo_entrega_dias?: number | null
          preco_base?: number | null
          preco_original?: number | null
          quando_oferecer?: string | null
          sub_categoria?: string | null
          template_ficha_id?: string | null
          tenant_id?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
          video_url?: string | null
          videos?: Json | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean | null
          categoria?: string | null
          centro_custo?: string | null
          codigo_interno?: string | null
          comprimento?: number | null
          created_at?: string | null
          descricao?: string | null
          diferenciais?: string[] | null
          estoque?: number | null
          galeria?: string[] | null
          id?: string
          imagem_url?: string | null
          inventory_location_id?: string | null
          inventory_product_id?: string | null
          largura?: number | null
          local_estoque_id?: string | null
          nome?: string
          permite_venda_sem_estoque?: boolean | null
          prazo_entrega_dias?: number | null
          preco_base?: number | null
          preco_original?: number | null
          quando_oferecer?: string | null
          sub_categoria?: string | null
          template_ficha_id?: string | null
          tenant_id?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
          video_url?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_ia_produtos_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_ia_produtos_inventory_product_id_fkey"
            columns: ["inventory_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_ia_produtos_local_estoque_id_fkey"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_ia_produtos_template_ficha_id_fkey"
            columns: ["template_ficha_id"]
            isOneToOne: false
            referencedRelation: "production_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_ia_produtos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_ia_produtos_estoque: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          produto_id: string
          quantidade: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          produto_id: string
          quantidade?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_ia_produtos_estoque_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_ia_produtos_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "tendenci_ia_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_arq_agendamentos: {
        Row: {
          architect_id: string
          archived_at: string | null
          audio_url: string | null
          campanha_id: string | null
          canal: string | null
          client_id: string | null
          created_at: string | null
          criado_por_ia: boolean | null
          data_agendamento: string
          id: string
          metadata: Json | null
          observacoes: string | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
          tipo_tarefa: string
          updated_at: string | null
          vendedor_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          architect_id: string
          archived_at?: string | null
          audio_url?: string | null
          campanha_id?: string | null
          canal?: string | null
          client_id?: string | null
          created_at?: string | null
          criado_por_ia?: boolean | null
          data_agendamento: string
          id?: string
          metadata?: Json | null
          observacoes?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          tipo_tarefa?: string
          updated_at?: string | null
          vendedor_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          architect_id?: string
          archived_at?: string | null
          audio_url?: string | null
          campanha_id?: string | null
          canal?: string | null
          client_id?: string | null
          created_at?: string | null
          criado_por_ia?: boolean | null
          data_agendamento?: string
          id?: string
          metadata?: Json | null
          observacoes?: string | null
          processed_at?: string | null
          retry_count?: number | null
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
          {
            foreignKeyName: "tendenci_prospec_arq_agendamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          data_hora_unica: string | null
          data_inicio: string | null
          descricao: string | null
          dias_semana: number[] | null
          horario_fim: string | null
          horario_inicio: string | null
          horarios: Json | null
          id: string
          intervalo_minimo_minutos: number | null
          nome: string
          segmento_id: string | null
          sequencia_id: string | null
          status: string | null
          tenant_id: string | null
          tipo_agendamento: string | null
          tipo_envio: string | null
          ultimo_disparo_em: string | null
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
          data_hora_unica?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          horarios?: Json | null
          id?: string
          intervalo_minimo_minutos?: number | null
          nome: string
          segmento_id?: string | null
          sequencia_id?: string | null
          status?: string | null
          tenant_id?: string | null
          tipo_agendamento?: string | null
          tipo_envio?: string | null
          ultimo_disparo_em?: string | null
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
          data_hora_unica?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_semana?: number[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          horarios?: Json | null
          id?: string
          intervalo_minimo_minutos?: number | null
          nome?: string
          segmento_id?: string | null
          sequencia_id?: string | null
          status?: string | null
          tenant_id?: string | null
          tipo_agendamento?: string | null
          tipo_envio?: string | null
          ultimo_disparo_em?: string | null
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
            foreignKeyName: "tendenci_prospec_arq_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "tendenci_prospec_arq_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
            foreignKeyName: "tendenci_prospec_arq_campaigns_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "tendenci_prospec_arq_logs_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "tendenci_prospec_arq_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "tendenci_prospec_arq_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tendenci_prospec_arq_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_arq_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tendenci_prospec_settings: {
        Row: {
          id: string
          metadata: Json | null
          numero_whatsapp: string | null
          status_conexao: string | null
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          token?: string | null
          ultima_verificacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
          webhook_envio?: string | null
          webhook_retorno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_prospec_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_prospec_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          tipo_meta?: string | null
          updated_at?: string | null
          valor_meta?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_seller_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_seller_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_seller_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "tendenci_seller_ranking_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
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
      tendenci_webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          instance_name: string | null
          message_content: string | null
          phone_from: string | null
          phone_to: string | null
          processed_at: string | null
          processing_status: string | null
          raw_payload: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          instance_name?: string | null
          message_content?: string | null
          phone_from?: string | null
          phone_to?: string | null
          processed_at?: string | null
          processing_status?: string | null
          raw_payload?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          instance_name?: string | null
          message_content?: string | null
          phone_from?: string | null
          phone_to?: string | null
          processed_at?: string | null
          processing_status?: string | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      tendenci_whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          created_by: string | null
          evolution_apikey: string | null
          evolution_url: string | null
          id: string
          instance_id: string | null
          instance_name: string
          is_ia_instance: boolean | null
          last_sync: string | null
          metadata: Json | null
          n8n_webhook_url: string | null
          phone_number: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          webhook_configured: boolean | null
          webhook_url: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          created_by?: string | null
          evolution_apikey?: string | null
          evolution_url?: string | null
          id?: string
          instance_id?: string | null
          instance_name: string
          is_ia_instance?: boolean | null
          last_sync?: string | null
          metadata?: Json | null
          n8n_webhook_url?: string | null
          phone_number?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_configured?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          created_by?: string | null
          evolution_apikey?: string | null
          evolution_url?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string
          is_ia_instance?: boolean | null
          last_sync?: string | null
          metadata?: Json | null
          n8n_webhook_url?: string | null
          phone_number?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_configured?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_whatsapp_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_whatsapp_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tendenci_whatsapp_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_role"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tutorial_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          tenant_id: string | null
          tutorial_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          tenant_id?: string | null
          tutorial_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          tenant_id?: string | null
          tutorial_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "guided_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_signals: {
        Row: {
          ai_generated_at: string | null
          ai_message: string | null
          ai_pitch: string | null
          confidence_score: number
          created_at: string
          current_plan_id: string | null
          current_usage: number | null
          detected_at: string
          evidence: Json | null
          expires_at: string
          id: string
          limit_value: number | null
          message_template: string | null
          metric_key: string
          priority: number
          recommended_entitlement_code: string | null
          recommended_plan_id: string | null
          signal_type: string
          status: string
          suggested_plan_id: string | null
          tenant_id: string
          updated_at: string
          usage_percent: number | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_message?: string | null
          ai_pitch?: string | null
          confidence_score?: number
          created_at?: string
          current_plan_id?: string | null
          current_usage?: number | null
          detected_at?: string
          evidence?: Json | null
          expires_at?: string
          id?: string
          limit_value?: number | null
          message_template?: string | null
          metric_key: string
          priority?: number
          recommended_entitlement_code?: string | null
          recommended_plan_id?: string | null
          signal_type: string
          status?: string
          suggested_plan_id?: string | null
          tenant_id: string
          updated_at?: string
          usage_percent?: number | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_message?: string | null
          ai_pitch?: string | null
          confidence_score?: number
          created_at?: string
          current_plan_id?: string | null
          current_usage?: number | null
          detected_at?: string
          evidence?: Json | null
          expires_at?: string
          id?: string
          limit_value?: number | null
          message_template?: string | null
          metric_key?: string
          priority?: number
          recommended_entitlement_code?: string | null
          recommended_plan_id?: string | null
          signal_type?: string
          status?: string
          suggested_plan_id?: string | null
          tenant_id?: string
          updated_at?: string
          usage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_signals_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_signals_recommended_plan_id_fkey"
            columns: ["recommended_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_signals_suggested_plan_id_fkey"
            columns: ["suggested_plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_ui_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          signal_id: string | null
          signal_type: string
          surface: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          signal_id?: string | null
          signal_type: string
          surface?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          signal_id?: string | null
          signal_type?: string
          surface?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_ui_events_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "upgrade_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_consumption: {
        Row: {
          current_value: number
          id: string
          limit_value: number
          metric_key: string
          metric_name: string
          overage_unit_price: number | null
          period_end: string
          period_start: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          current_value?: number
          id?: string
          limit_value?: number
          metric_key: string
          metric_name: string
          overage_unit_price?: number | null
          period_end?: string
          period_start?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          current_value?: number
          id?: string
          limit_value?: number
          metric_key?: string
          metric_name?: string
          overage_unit_price?: number | null
          period_end?: string
          period_start?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_consumption_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          can_admin: boolean
          can_approve: boolean
          can_conciliate: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_view: boolean
          created_at: string
          created_by: string | null
          has_override: boolean
          id: string
          module: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_admin?: boolean
          can_approve?: boolean
          can_conciliate?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          has_override?: boolean
          id?: string
          module: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_admin?: boolean
          can_approve?: boolean
          can_conciliate?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_view?: boolean
          created_at?: string
          created_by?: string | null
          has_override?: boolean
          id?: string
          module?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenants: {
        Row: {
          created_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      v_data_lineage: {
        Row: {
          event_created_at: string | null
          event_status: string | null
          event_type: string | null
          financial_entry_id: string | null
          impact_layer: string | null
          impact_type: string | null
          link_status: string | null
          linked_at: string | null
          origin_id: string | null
          origin_type: string | null
          payable_id: string | null
          processed_at: string | null
          source_entity: string | null
          source_entity_id: string | null
          source_module: string | null
          target_entity: string | null
          target_entity_id: string | null
          target_module: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_origin_links_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_origin_links_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "fin_payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_origin_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_effective_role: {
        Row: {
          effective_role_label: string | null
          effective_role_name: string | null
          is_owner: boolean | null
          profile_type_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _tenant_rls_audit_whitelist: {
        Args: { _policy: string; _table: string }
        Returns: boolean
      }
      acquire_message_lock: {
        Args: { p_instance: string; p_phone: string }
        Returns: {
          content: string
          created_at: string
          id: string
          instance_name: string
          is_processing: boolean
          phone_number: string
          processed: boolean
        }[]
      }
      add_business_days_sql: {
        Args: { num_days: number; start_date: string }
        Returns: string
      }
      analyze_dependency_impact: { Args: never; Returns: Json }
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
      architecture_health_summary: { Args: never; Returns: Json }
      audit_module_viewers: {
        Args: { _modules: string[] }
        Returns: {
          can_view: boolean
          module: string
          profile_name: string
        }[]
      }
      audit_tenant_rls_direct_profile_reads: {
        Args: never
        Returns: {
          cmd: string
          policyname: string
          schemaname: string
          snippet: string
          tablename: string
        }[]
      }
      audit_tenant_rls_policies: {
        Args: never
        Returns: {
          cmd: string
          policyname: string
          qual: string
          reason: string
          schemaname: string
          tablename: string
          with_check: string
        }[]
      }
      calc_owner_control_tower_kpis: { Args: never; Returns: string }
      calc_system_health_snapshot: { Args: never; Returns: string }
      calc_tenant_activation_score: {
        Args: { _tenant_id: string }
        Returns: number
      }
      calc_tenant_churn_risk: {
        Args: { _tenant_id: string }
        Returns: {
          band: string
          score: number
        }[]
      }
      calc_tenant_engagement_score: {
        Args: { _tenant_id: string }
        Returns: {
          band: string
          score: number
        }[]
      }
      calc_tenant_expansion_score: {
        Args: { _tenant_id: string }
        Returns: number
      }
      calc_tenant_maturity_stage: {
        Args: { _tenant_id: string }
        Returns: string
      }
      calcular_previsao_atraso_producao: {
        Args: { p_order_id: string }
        Returns: Json
      }
      calculate_business_days: { Args: { start_date: string }; Returns: number }
      calculate_production_deadline: {
        Args: { p_production_type_id: string; p_start_date?: string }
        Returns: string
      }
      calculate_seller_rankings: { Args: never; Returns: undefined }
      can_delete_architects: { Args: never; Returns: boolean }
      can_delete_master_idea:
        | { Args: never; Returns: boolean }
        | { Args: { p_master_idea_id: string }; Returns: boolean }
      capacity_layer_summary: { Args: never; Returns: Json }
      capacity_top_risks: {
        Args: { p_limit?: number }
        Returns: {
          capacity_risk_score: number
          contributing_factors: Json
          recommended_action: string
          severity_band: string
          target_code: string
          target_type: string
          updated_at: string
        }[]
      }
      check_and_expire_goals: { Args: never; Returns: undefined }
      check_and_move_inactive_architects: { Args: never; Returns: undefined }
      check_and_update_inactive_architects: { Args: never; Returns: undefined }
      check_campaign_dispatch_allowed: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      check_offer_eligibility: {
        Args: { _offer_code: string; _tenant_id: string }
        Returns: {
          eligible: boolean
          reason: string
        }[]
      }
      check_production_automations: {
        Args: { p_type_id?: string }
        Returns: {
          acao_tipo: string
          automation_id: string
          automation_nome: string
          dias_excedidos: number
          dias_uteis_na_fase: number
          fase_nome: string
          order_id: string
          order_number: number
          prazo_dias_uteis: number
          priority: string
          production_type_name: string
          title: string
        }[]
      }
      check_rbac_status_rule: {
        Args: {
          p_action?: string
          p_module: string
          p_status: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_rbac_value_limit: {
        Args: { p_module: string; p_user_id: string; p_value: number }
        Returns: Json
      }
      cleanup_old_pending_messages: { Args: never; Returns: undefined }
      complete_runbook_step: {
        Args: {
          p_execution_id: string
          p_message?: string
          p_recovery_log_id?: string
          p_status: string
          p_step_order: number
          p_validation_result?: Json
        }
        Returns: Json
      }
      compute_all_tenants_lifecycle: { Args: never; Returns: number }
      compute_capacity_risk_scores: { Args: never; Returns: number }
      compute_failure_probability: { Args: never; Returns: number }
      compute_predictive_drift: { Args: never; Returns: number }
      compute_tenant_lifecycle: { Args: { _tenant_id: string }; Returns: Json }
      consume_retry_budget: {
        Args: {
          p_action_code: string
          p_module_code?: string
          p_result?: string
        }
        Returns: undefined
      }
      convert_material_request_to_po: {
        Args: { _request_id: string }
        Returns: string
      }
      create_daily_architect_goals: { Args: never; Returns: undefined }
      create_goal_reminder_notifications: { Args: never; Returns: undefined }
      crm_agg: {
        Args: {
          p_category?: string
          p_date_from?: string
          p_date_to?: string
          p_owner_id?: string
          p_pipeline_id: string
        }
        Returns: Json
      }
      crm_sla_alerts: {
        Args: {
          p_category?: string
          p_max_delay_days?: number
          p_owner_id?: string
          p_pipeline_id: string
        }
        Returns: {
          deal_id: string
          delay_h: number
          lead_name: string
          owner_name: string
          sla_hours: number
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
      dashboard_crm_metrics: {
        Args: { p_end?: string; p_start?: string }
        Returns: Json
      }
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
      delete_architect_safely: {
        Args: { p_architect_id: string }
        Returns: Json
      }
      delete_order_cascade: { Args: { _order_id: string }; Returns: undefined }
      detect_billing_dunning: { Args: never; Returns: number }
      detect_capacity_signals: { Args: never; Returns: number }
      detect_predictive_anomalies: { Args: never; Returns: number }
      detect_predictive_signals: { Args: never; Returns: number }
      detect_upgrade_signals: { Args: never; Returns: number }
      diff_profile_critical_permissions: {
        Args: { _profile_a: string; _profile_b: string }
        Returns: {
          allowed_a: boolean
          allowed_b: boolean
          label: string
          module: string
          permission_key: string
        }[]
      }
      emit_decision_event: {
        Args: { p_event_type: string; p_payload?: Json; p_tenant_id: string }
        Returns: string
      }
      evaluate_self_healing_guardrails: {
        Args: {
          p_action_code: string
          p_context?: Json
          p_dependency_depth?: number
          p_incident_id?: string
          p_module_code?: string
          p_root_cause_confidence?: number
          p_severity?: string
        }
        Returns: Json
      }
      evaluate_stability_gates: { Args: never; Returns: Json }
      execute_capacity_action: {
        Args: {
          p_action_code: string
          p_mode?: string
          p_target_code: string
          p_target_type: string
        }
        Returns: Json
      }
      execute_preventive_action: {
        Args: { p_action_code: string; p_mode?: string; p_target_code: string }
        Returns: Json
      }
      execute_recovery_policy: {
        Args: { p_mode?: string; p_policy_code: string }
        Returns: Json
      }
      execution_priority_summary: { Args: never; Returns: Json }
      expire_entitlement_grants: { Args: never; Returns: number }
      find_pending_auto_recoveries: {
        Args: never
        Returns: {
          attempts_so_far: number
          cooldown_minutes: number
          failure_code: string
          max_attempts: number
          recovery_code: string
          target_module: string
        }[]
      }
      find_pending_runbook_incidents: {
        Args: never
        Returns: {
          incident_id: string
          runbook_code: string
        }[]
      }
      flag_data_quality_warning: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_message: string
          p_metadata?: Json
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_severity?: string
          p_warning_type: string
        }
        Returns: string
      }
      fulfillment_evaluate_order_status: {
        Args: { _order_id: string }
        Returns: undefined
      }
      generate_permission_recommendations: {
        Args: { _since_days?: number }
        Returns: number
      }
      generate_upgrade_signals_batch: { Args: never; Returns: Json }
      generate_username_from_email: {
        Args: { email_input: string }
        Returns: string
      }
      get_active_upgrade_signals_for_tenant: {
        Args: { _tenant_id: string }
        Returns: {
          ai_message: string
          confidence_score: number
          context: Json
          detected_at: string
          id: string
          message_template: string
          recommended_entitlement_code: string
          recommended_plan_id: string
          recommended_plan_name: string
          severity: string
          should_show: boolean
          signal_type: string
        }[]
      }
      get_architect_indication_stats: {
        Args: { p_architect_id: string }
        Returns: Json
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
      get_billing_analytics_kpis: { Args: never; Returns: Json }
      get_billing_ops_overview: {
        Args: never
        Returns: {
          active_discounts: number
          churn_risk: string
          last_invoice_date: string
          monthly_value: number
          next_invoice_date: string
          open_dunning_steps: number
          open_upgrade_signals: number
          payment_status: string
          plan_name: string
          subscription_status: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_campaign_evolution:
        | {
            Args: { p_end_date: string; p_start_date: string }
            Returns: {
              conversion_rate: number
              period_date: string
              total_deals: number
              total_leads: number
              total_value: number
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_vendedor_id?: string
            }
            Returns: {
              convertidos: number
              data: string
              envios: number
              respostas: number
            }[]
          }
      get_campaign_metrics:
        | {
            Args: { p_end_date: string; p_start_date: string }
            Returns: {
              avg_deal_value: number
              conversion_rate: number
              total_deals: number
              total_leads: number
              total_value: number
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_vendedor_id?: string
            }
            Returns: {
              taxa_conversao: number
              taxa_resposta: number
              total_campanhas: number
              total_convertidos: number
              total_envios: number
              total_respostas: number
            }[]
          }
      get_campaign_vendor_comparison:
        | {
            Args: { p_end_date: string; p_start_date: string }
            Returns: {
              conversion_rate: number
              total_deals: number
              total_leads: number
              total_value: number
              vendor_id: string
              vendor_name: string
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_vendedor_id?: string
            }
            Returns: {
              taxa_conversao: number
              taxa_resposta: number
              total_convertidos: number
              total_envios: number
              total_respostas: number
              vendedor_id: string
              vendedor_nome: string
            }[]
          }
      get_current_goals_status: {
        Args: { p_user_id?: string }
        Returns: {
          company_goal_current: number
          company_goal_id: string
          company_goal_percentage: number
          company_goal_target: number
          current_month: string
          has_active_company_goal: boolean
          has_active_seller_goal: boolean
          seller_goal_current: number
          seller_goal_id: string
          seller_goal_percentage: number
          seller_goal_target: number
        }[]
      }
      get_daily_architect_goal_progress: {
        Args: { p_date?: string; p_vendedor_id: string }
        Returns: Json
      }
      get_daily_goal_stats: { Args: { p_vendedor_id?: string }; Returns: Json }
      get_deals_without_valid_tasks: {
        Args: {
          p_is_master?: boolean
          p_pipeline_id: string
          p_user_id?: string
        }
        Returns: {
          client_name: string
          client_phone: string
          hours_without_task: number
          id: string
          lead_id: string
          owner_id: string
          owner_name: string
          stage_entered_at: string
          stage_id: string
          stage_name: string
          title: string
        }[]
      }
      get_dependency_impact_overview: { Args: never; Returns: Json }
      get_effective_sla_dias_uteis: {
        Args: { p_phase_id: string }
        Returns: number
      }
      get_ia_config:
        | { Args: never; Returns: Json }
        | { Args: { config_key_param: string }; Returns: string }
      get_incident_overview: { Args: never; Returns: Json }
      get_incident_timeline: { Args: { p_incident_id: string }; Returns: Json }
      get_integration_map_overview: { Args: never; Returns: Json }
      get_module_dependency_tree: {
        Args: { p_module_code: string }
        Returns: Json
      }
      get_module_integration_detail: {
        Args: { p_module_code: string }
        Returns: Json
      }
      get_monthly_goal_records: {
        Args: { p_month?: string; p_vendedor_id?: string }
        Returns: {
          batida: boolean
          date: string
          meta: number
          realizado: number
        }[]
      }
      get_offer_analytics: { Args: never; Returns: Json }
      get_owner_activation_monitor: { Args: never; Returns: Json }
      get_owner_billing_radar: { Args: never; Returns: Json }
      get_owner_churn_radar: { Args: never; Returns: Json }
      get_owner_entitlement_analytics: { Args: never; Returns: Json }
      get_owner_expansion_signals: { Args: never; Returns: Json }
      get_owner_lifecycle_heatmap: { Args: never; Returns: Json }
      get_owner_system_health_realtime: { Args: never; Returns: Json }
      get_owner_upgrade_dashboard: { Args: never; Returns: Json }
      get_pending_automated_tasks: {
        Args: never
        Returns: {
          arquiteto_id: string
          conteudo_texto: string
          created_by: string
          deal_id: string
          due_at: string
          instance_id: string
          instance_name: string
          lead_id: string
          nome: string
          origem_modulo: string
          tarefa_id: string
          telefone: string
          tipo_envio: string
          whatsapp_connection_id: string
        }[]
      }
      get_pending_followups: {
        Args: never
        Returns: {
          categoria: string
          client_name: string
          client_phone: string
          conversation_history: string
          deal_id: string
          evolution_apikey: string
          evolution_url: string
          followup_count: number
          instance_id: string
          instance_name: string
          lead_id: string
          owner_id: string
          owner_name: string
          product_type: string
          system_prompt: string
          tone: string
          whatsapp_connection_id: string
        }[]
      }
      get_phase_business_days: { Args: { p_phase_id: string }; Returns: number }
      get_project_stats_by_type: {
        Args: never
        Returns: {
          quantidade: number
          ticket_medio: number
          tipo: string
          valor_total: number
        }[]
      }
      get_prospeccao_architects_optimized:
        | {
            Args: {
              p_cidade?: string
              p_nao_contactados?: boolean
              p_phone?: string
              p_search?: string
              p_status?: string
              p_tier?: string
              p_vendedor?: string
            }
            Returns: {
              active: boolean
              city: string
              company: string
              created_at: string
              data_primeiro_contato: string
              data_ultimo_contato: string
              email: string
              id: string
              instagram: string
              name: string
              phone: string
              status_funil: string
              tier: string
              vendedor_nome: string
              vendedor_responsavel: string
            }[]
          }
        | {
            Args: {
              p_cidade?: string
              p_phone_search?: string
              p_search?: string
              p_show_nao_contactados?: boolean
              p_status_funil?: string
              p_tier?: string
              p_vendedor_id?: string
            }
            Returns: {
              city: string
              company: string
              data_primeiro_contato: string
              data_ultimo_contato: string
              email: string
              id: string
              name: string
              phone: string
              produtos_indicados: string[]
              status_funil: string
              tag_prospeccao: string
              tier: string
              total_indicacoes: number
              total_projects: number
              ultimo_projeto_data: string
              ultimo_vendedor_full_name: string
              ultimo_vendedor_username: string
              vendedor_email: string
              vendedor_full_name: string
              vendedor_responsavel: string
              vendedor_username: string
              whatsapp_valido: boolean
            }[]
          }
      get_record_lineage: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      get_recovery_overview: { Args: never; Returns: Json }
      get_runbook_overview: { Args: never; Returns: Json }
      get_saas_admin_analytics: { Args: never; Returns: Json }
      get_saas_company_overview: {
        Args: { _tenant_id?: string }
        Returns: {
          active: boolean
          active_modules: number
          active_users: number
          created_at: string
          current_period_end: string
          health_classification: string
          health_score: number
          last_user_login: string
          max_users: number
          overdue_invoices: number
          plan_id: string
          plan_name: string
          plan_price: number
          subscription_status: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          trial_ends_at: string
        }[]
      }
      get_saas_tenant_limits: {
        Args: { _tenant_id: string }
        Returns: {
          current_usage: number
          limit_key: string
          limit_name: string
          limit_value: number
          pct_used: number
        }[]
      }
      get_self_healing_overview: { Args: never; Returns: Json }
      get_seller_goal_stats: { Args: { p_vendedor_id: string }; Returns: Json }
      get_seller_performance_by_goal: {
        Args: { p_seller_goal_id: string }
        Returns: Json
      }
      get_sellers_without_goals: { Args: never; Returns: number }
      get_strategic_resource_chart_account: {
        Args: {
          _resource_type: Database["public"]["Enums"]["fin_strategic_resource_type"]
        }
        Returns: string
      }
      get_tenant_entitlement_limit: {
        Args: { _code: string; _tenant_id: string }
        Returns: number
      }
      get_tenant_entitlements_resolved: {
        Args: { _tenant_id: string }
        Returns: {
          code: string
          enabled: boolean
          entitlement_group: string
          expires_at: string
          is_premium: boolean
          limit_value: number
          name: string
          source: string
          type: string
        }[]
      }
      get_tenant_lifecycle_overview: {
        Args: never
        Returns: {
          activation_score: number
          churn_risk_band: string
          churn_risk_score: number
          engagement_band: string
          engagement_score: number
          expansion_ready_score: number
          lifecycle_health_index: number
          maturity_stage: string
          tenant_id: string
          tenant_name: string
          updated_at: string
        }[]
      }
      get_user_especializacao: { Args: { user_uuid: string }; Returns: string }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_weekly_architect_goal_progress: {
        Args: { p_vendedor_id: string }
        Returns: Json
      }
      group_and_normalize_incidents: {
        Args: { p_lookback_hours?: number; p_window_minutes?: number }
        Returns: Json
      }
      has_entitlement: {
        Args: { _code: string; _tenant_id: string }
        Returns: boolean
      }
      has_module_permission: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      http_post: {
        Args: {
          body?: Json
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: Json
      }
      inventory_metrics: { Args: never; Returns: Json }
      inventory_metrics_advanced: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_safe: { Args: never; Returns: boolean }
      is_any_tenant_admin: { Args: never; Returns: boolean }
      is_master_owner: { Args: { _uid: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant: string }; Returns: boolean }
      is_tenant_admin_or_above: { Args: never; Returns: boolean }
      is_tenant_owner: { Args: never; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_master: { Args: { _user_id: string }; Returns: boolean }
      leads_aggregates: { Args: never; Returns: Json }
      log_deletion: {
        Args: {
          p_data: Json
          p_id: string
          p_identifier: string
          p_reason?: string
          p_table: string
          p_type: string
        }
        Returns: string
      }
      log_permission_denial: {
        Args: { _context?: Json; _module?: string; _permission_key: string }
        Returns: string
      }
      low_stock_products: {
        Args: never
        Returns: {
          category_name: string
          code: string
          current_stock: number
          id: string
          location_name: string
          min_stock: number
          name: string
        }[]
      }
      map_signal_to_category: {
        Args: { _signal_type: string }
        Returns: string
      }
      mark_inactive_architects: { Args: never; Returns: undefined }
      mark_overdue_entries: { Args: never; Returns: Json }
      match_runbook_for_incident: {
        Args: { p_incident_id: string }
        Returns: string
      }
      orders_metrics:
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_status?: string
              p_vendedor_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_date_field?: string
              p_date_from?: string
              p_date_to?: string
              p_status?: string
              p_vendedor_id?: string
            }
            Returns: {
              aguardando_aprovacao: number
              aprovado: number
              ativo: number
              cancelado: number
              em_producao: number
              entregue: number
              faturado: number
              rascunho: number
              ticket_medio: number
              total_pedidos: number
              valor_aprovado: number
              valor_ativo: number
              valor_em_producao: number
              valor_total: number
            }[]
          }
      predictive_layer_summary: { Args: never; Returns: Json }
      predictive_top_risks: {
        Args: { p_limit?: number }
        Returns: {
          contributing_factors: Json
          failure_probability_score: number
          recommended_preventive_action: string
          severity_band: string
          target_code: string
          target_type: string
          updated_at: string
        }[]
      }
      production_metrics:
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_type_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_priority?: string
              p_responsible_id?: string
              p_status?: string
              p_type_id?: string
            }
            Returns: Json
          }
      production_sla_alerts:
        | {
            Args: never
            Returns: {
              hours_in_phase: number
              is_overdue: boolean
              order_id: string
              order_number: string
              phase_name: string
              sla_hours: number
            }[]
          }
        | {
            Args: { p_type_id?: string }
            Returns: {
              alert_type: string
              hours_overdue: number
              order_id: string
              order_number: number
              phase_name: string
              planned_end_date: string
              priority: string
              title: string
            }[]
          }
      production_sla_metrics: {
        Args: { p_type_id?: string }
        Returns: {
          avg_hours: number
          in_progress: number
          phase_color: string
          phase_name: string
          sla_hours: number
          sla_violations: number
          total_orders: number
        }[]
      }
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
          apresentado_count: number
          aprovado_count: number
          aprovado_value: number
          em_negociacao_count: number
          em_orcamento_count: number
          near_due_count: number
          orcado_count: number
          overdue_count: number
          perdido_count: number
          recebido_count: number
        }[]
      }
      projects_metrics_by_history: {
        Args: {
          p_architect_id?: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: Json
      }
      projects_metrics_filtered: {
        Args: {
          p_architect_id?: string
          p_date_from?: string
          p_date_to?: string
          p_filter_by_deadline?: boolean
          p_stages?: string[]
        }
        Returns: {
          apresentado_count: number
          aprovado_count: number
          aprovado_value: number
          em_negociacao_count: number
          em_orcamento_count: number
          near_due_count: number
          orcado_count: number
          overdue_count: number
          perdido_count: number
          recebido_count: number
          total_value: number
        }[]
      }
      purchases_metrics: { Args: never; Returns: Json }
      purge_order_generated_records: {
        Args: { _order_id: string }
        Returns: undefined
      }
      reactivate_lost_deals_to_followup: { Args: never; Returns: Json }
      recalculate_all_goal_progress: { Args: never; Returns: undefined }
      recompute_execution_priorities: { Args: never; Returns: number }
      reconcile_integration_health: { Args: never; Returns: Json }
      record_integration_event: {
        Args: {
          p_event_type: string
          p_message?: string
          p_metadata?: Json
          p_source: string
          p_status: string
          p_target: string
          p_tenant_id?: string
        }
        Returns: string
      }
      record_offer_event: {
        Args: {
          _channel: string
          _event_type: string
          _metadata?: Json
          _offer_code: string
          _signal_id?: string
          _tenant_id: string
          _user_id?: string
        }
        Returns: string
      }
      record_premium_feature_attempt: {
        Args: { _code: string; _tenant_id: string }
        Returns: undefined
      }
      recovery_layer_summary: { Args: never; Returns: Json }
      refresh_dependency_impact_snapshots: { Args: never; Returns: undefined }
      register_cross_module_event: {
        Args: {
          p_event_type: string
          p_payload?: Json
          p_source_entity: string
          p_source_entity_id: string
          p_source_module: string
          p_target_entity?: string
          p_target_entity_id?: string
          p_target_module: string
        }
        Returns: string
      }
      register_recovery_execution: {
        Args: {
          p_execution_mode?: string
          p_failure_code: string
          p_idempotency_key?: string
          p_incident_group_id?: string
          p_recovery_code: string
          p_target_module?: string
        }
        Returns: string
      }
      require_strategic_resource_chart_account: {
        Args: {
          _resource_type: Database["public"]["Enums"]["fin_strategic_resource_type"]
        }
        Returns: string
      }
      reset_retry_budget: {
        Args: { p_action_code: string; p_module_code?: string }
        Returns: undefined
      }
      resolve_best_offer_for_tenant: {
        Args: { _channel?: string; _tenant_id: string }
        Returns: {
          channel: string
          cta_label: string
          message: string
          name: string
          offer_code: string
          offer_type: string
          priority_score: number
          reasoning: string
          signal_id: string
        }[]
      }
      resolve_self_healing_escalation: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      run_autonomous_recovery_sweep: { Args: never; Returns: Json }
      run_capacity_sweep: { Args: never; Returns: Json }
      run_inactive_architects_check: { Args: never; Returns: Json }
      run_predictive_sweep: { Args: never; Returns: Json }
      seed_chart_of_accounts_from_owner: {
        Args: { _tenant_id: string }
        Returns: number
      }
      seed_default_cost_centers: {
        Args: { _tenant_id: string }
        Returns: number
      }
      seed_tenant_profile_templates: { Args: never; Returns: number }
      seed_tenant_profile_types: { Args: never; Returns: number }
      set_active_tenant: { Args: { target_tenant_id: string }; Returns: string }
      should_show_upgrade_nudge: {
        Args: { _signal_id: string; _tenant_id: string }
        Returns: boolean
      }
      snapshot_job_saturation: { Args: never; Returns: number }
      snapshot_queue_pressure: { Args: never; Returns: number }
      snapshot_tenant_load: { Args: never; Returns: number }
      stability_can_release: { Args: { p_release_id?: string }; Returns: Json }
      stability_gates_summary: { Args: never; Returns: Json }
      start_runbook_execution: {
        Args: {
          p_incident_id?: string
          p_runbook_code: string
          p_triggered_by?: string
        }
        Returns: string
      }
      stock_abc_analysis: {
        Args: never
        Returns: {
          abc_class: string
          cumulative_percentage: number
          product_code: string
          product_id: string
          product_name: string
          stock_value: number
        }[]
      }
      storage_tenant_for: {
        Args: { _bucket: string; _name: string }
        Returns: string
      }
      suggest_purchase_orders: {
        Args: never
        Returns: {
          available_stock: number
          current_stock: number
          estimated_total: number
          last_cost: number
          preferred_supplier_id: string
          preferred_supplier_name: string
          product_code: string
          product_id: string
          product_name: string
          reorder_point: number
          reorder_quantity: number
          reserved_stock: number
          suggested_quantity: number
          urgency: string
        }[]
      }
      suppliers_metrics: { Args: never; Returns: Json }
      sync_ia_product_to_inventory: {
        Args: { p_ia_produto_id: string }
        Returns: string
      }
      tenant_rls_check: { Args: { row_tenant_id: string }; Returns: boolean }
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
      validate_profile_template_completeness: {
        Args: { perms: Json }
        Returns: Json
      }
      verify_post_recovery_stability: {
        Args: {
          p_incident_id?: string
          p_module_code?: string
          p_observation_seconds?: number
          p_recovery_log_id: string
        }
        Returns: Json
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
        | "producao"
        | "fornecedores"
        | "estoque"
        | "compras"
        | "pedidos"
        | "ia_configuracao"
        | "financeiro"
        | "cadastros_financeiros"
        | "system_errors"
      fin_strategic_resource_type:
        | "rt"
        | "vendedor"
        | "orcamentista"
        | "projetista"
        | "montador"
        | "producao"
      order_responsible_type:
        | "vendedor"
        | "orcamentista"
        | "projetista"
        | "montador"
        | "producao"
      user_role:
        | "admin"
        | "vendedor"
        | "arquiteto"
        | "projetista"
        | "owner"
        | "tenant_owner"
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
        "producao",
        "fornecedores",
        "estoque",
        "compras",
        "pedidos",
        "ia_configuracao",
        "financeiro",
        "cadastros_financeiros",
        "system_errors",
      ],
      fin_strategic_resource_type: [
        "rt",
        "vendedor",
        "orcamentista",
        "projetista",
        "montador",
        "producao",
      ],
      order_responsible_type: [
        "vendedor",
        "orcamentista",
        "projetista",
        "montador",
        "producao",
      ],
      user_role: [
        "admin",
        "vendedor",
        "arquiteto",
        "projetista",
        "owner",
        "tenant_owner",
      ],
    },
  },
} as const
