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
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "architects_vendedor_responsavel_fkey"
            columns: ["vendedor_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          carencia_dias: number
          created_at?: string | null
          id?: string
          installments: number
          rate_percent: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          carencia_dias?: number
          created_at?: string | null
          id?: string
          installments?: number
          rate_percent?: number
          updated_at?: string | null
        }
        Relationships: []
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
          unit?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
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
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
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
          tipo_pessoa?: string | null
        }
        Relationships: []
      }
      credit_card_rates: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          installments: number
          rate_percent: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments: number
          rate_percent: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          installments?: number
          rate_percent?: number
          updated_at?: string | null
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
          total_leads?: number
          type?: string
        }
        Relationships: []
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
          tone: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          followup_number: number
          id?: string
          system_prompt: string
          tone: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          followup_number?: number
          id?: string
          system_prompt?: string
          tone?: string
        }
        Relationships: []
      }
      ia_client_memory: {
        Row: {
          client_name: string | null
          created_at: string
          id: string
          instance_name: string
          interaction_count: number | null
          last_interaction: string | null
          notes: string | null
          phone_number: string
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          id?: string
          instance_name: string
          interaction_count?: number | null
          last_interaction?: string | null
          notes?: string | null
          phone_number: string
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          id?: string
          instance_name?: string
          interaction_count?: number | null
          last_interaction?: string | null
          notes?: string | null
          phone_number?: string
          preferences?: Json | null
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
      labor_types: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_cost: number | null
          id: string
          name: string
          unit: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_cost?: number | null
          id?: string
          name: string
          unit?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_cost?: number | null
          id?: string
          name?: string
          unit?: string | null
        }
        Relationships: []
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
            foreignKeyName: "master_ideas_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          updated_at?: string | null
          visible?: boolean
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
        ]
      }
      orders: {
        Row: {
          approved_by: string | null
          architect_id: string | null
          carencia_boleto: number | null
          centro_custo: string | null
          client_id: string | null
          comissao_orcamentista_percentual: number | null
          comissao_orcamentista_responsavel_id: string | null
          comissao_orcamentista_valor: number | null
          comissao_projetista_percentual: number | null
          comissao_projetista_responsavel_id: string | null
          comissao_projetista_valor: number | null
          comissao_vendedor_percentual: number | null
          comissao_vendedor_responsavel_id: string | null
          comissao_vendedor_valor: number | null
          condicao_pagamento: string | null
          created_at: string | null
          created_by: string | null
          data_aprovacao: string | null
          data_emissao: string | null
          data_entrega_prevista: string | null
          data_entrega_realizada: string | null
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
          observacao_pagamento: string | null
          observacoes_internas: string | null
          observacoes_nf: string | null
          order_number: number
          parcelas: number | null
          percentual_forma_1: number | null
          percentual_forma_2: number | null
          rt_habilitado: boolean | null
          rt_percentual: number | null
          rt_valor: number | null
          status: string | null
          subtotal: number | null
          taxa_boleto_percentual: number | null
          taxa_boleto_responsavel: string | null
          taxa_boleto_valor: number | null
          taxa_cartao_percentual: number | null
          taxa_cartao_responsavel: string | null
          taxa_cartao_valor: number | null
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
          client_id?: string | null
          comissao_orcamentista_percentual?: number | null
          comissao_orcamentista_responsavel_id?: string | null
          comissao_orcamentista_valor?: number | null
          comissao_projetista_percentual?: number | null
          comissao_projetista_responsavel_id?: string | null
          comissao_projetista_valor?: number | null
          comissao_vendedor_percentual?: number | null
          comissao_vendedor_responsavel_id?: string | null
          comissao_vendedor_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aprovacao?: string | null
          data_emissao?: string | null
          data_entrega_prevista?: string | null
          data_entrega_realizada?: string | null
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
          observacao_pagamento?: string | null
          observacoes_internas?: string | null
          observacoes_nf?: string | null
          order_number?: number
          parcelas?: number | null
          percentual_forma_1?: number | null
          percentual_forma_2?: number | null
          rt_habilitado?: boolean | null
          rt_percentual?: number | null
          rt_valor?: number | null
          status?: string | null
          subtotal?: number | null
          taxa_boleto_percentual?: number | null
          taxa_boleto_responsavel?: string | null
          taxa_boleto_valor?: number | null
          taxa_cartao_percentual?: number | null
          taxa_cartao_responsavel?: string | null
          taxa_cartao_valor?: number | null
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
          client_id?: string | null
          comissao_orcamentista_percentual?: number | null
          comissao_orcamentista_responsavel_id?: string | null
          comissao_orcamentista_valor?: number | null
          comissao_projetista_percentual?: number | null
          comissao_projetista_responsavel_id?: string | null
          comissao_projetista_valor?: number | null
          comissao_vendedor_percentual?: number | null
          comissao_vendedor_responsavel_id?: string | null
          comissao_vendedor_valor?: number | null
          condicao_pagamento?: string | null
          created_at?: string | null
          created_by?: string | null
          data_aprovacao?: string | null
          data_emissao?: string | null
          data_entrega_prevista?: string | null
          data_entrega_realizada?: string | null
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
          observacao_pagamento?: string | null
          observacoes_internas?: string | null
          observacoes_nf?: string | null
          order_number?: number
          parcelas?: number | null
          percentual_forma_1?: number | null
          percentual_forma_2?: number | null
          rt_habilitado?: boolean | null
          rt_percentual?: number | null
          rt_valor?: number | null
          status?: string | null
          subtotal?: number | null
          taxa_boleto_percentual?: number | null
          taxa_boleto_responsavel?: string | null
          taxa_boleto_valor?: number | null
          taxa_cartao_percentual?: number | null
          taxa_cartao_responsavel?: string | null
          taxa_cartao_valor?: number | null
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
            foreignKeyName: "orders_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "architects"
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
            foreignKeyName: "orders_comissao_orcamentista_responsavel_id_fkey"
            columns: ["comissao_orcamentista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_projetista_responsavel_id_fkey"
            columns: ["comissao_projetista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_comissao_vendedor_responsavel_id_fkey"
            columns: ["comissao_vendedor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Relationships: []
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
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          position?: number | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number | null
        }
        Relationships: []
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
            foreignKeyName: "production_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          name: string
          product_id: string | null
          production_order_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cmv_total?: number | null
          created_at?: string | null
          description?: string | null
          ia_produto_id?: string | null
          id?: string
          name: string
          product_id?: string | null
          production_order_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cmv_total?: number | null
          created_at?: string | null
          description?: string | null
          ia_produto_id?: string | null
          id?: string
          name?: string
          product_id?: string | null
          production_order_id?: string | null
          status?: string | null
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
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          average_cost: number | null
          barcode: string | null
          category_id: string | null
          cfop_entrada: string | null
          cfop_saida: string | null
          code: string | null
          cor: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          fornecedor_texto: string | null
          id: string
          image_url: string | null
          location_id: string | null
          max_stock: number | null
          medida: string | null
          min_stock: number | null
          name: string
          ncm: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          reserved_stock: number | null
          sale_price: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          average_cost?: number | null
          barcode?: string | null
          category_id?: string | null
          cfop_entrada?: string | null
          cfop_saida?: string | null
          code?: string | null
          cor?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          fornecedor_texto?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          max_stock?: number | null
          medida?: string | null
          min_stock?: number | null
          name: string
          ncm?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number | null
          sale_price?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          average_cost?: number | null
          barcode?: string | null
          category_id?: string | null
          cfop_entrada?: string | null
          cfop_saida?: string | null
          code?: string | null
          cor?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          fornecedor_texto?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          max_stock?: number | null
          medida?: string | null
          min_stock?: number | null
          name?: string
          ncm?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number | null
          sale_price?: number | null
          unit?: string | null
          updated_at?: string | null
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
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_type_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          profile_type_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          profile_type_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          profile_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_type_permissions_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
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
          updated_at?: string | null
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
          profile_type_id: string | null
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
          profile_type_id?: string | null
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
          profile_type_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: [
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
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          created_at: string | null
          created_by: string | null
          discount_value: number | null
          expected_date: string | null
          id: string
          issue_date: string | null
          notes: string | null
          order_number: number
          payment_terms: string | null
          received_date: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          order_number?: number
          payment_terms?: string | null
          received_date?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          expected_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          order_number?: number
          payment_terms?: string | null
          received_date?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
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
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
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
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
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
            foreignKeyName: "system_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at?: string | null
          updated_by?: string | null
          versao?: number | null
        }
        Relationships: []
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
          tipo?: string | null
          tipo_arquivo?: string | null
          titulo?: string
          updated_at?: string | null
          validade?: string | null
          videos?: Json | null
        }
        Relationships: []
      }
      tendenci_ia_produtos: {
        Row: {
          altura: number | null
          ativo: boolean | null
          categoria: string | null
          centro_custo: string | null
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
          updated_at?: string
          user_id?: string | null
          webhook_configured?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tendenci_whatsapp_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      can_delete_master_idea: { Args: never; Returns: boolean }
      check_and_expire_goals: { Args: never; Returns: undefined }
      check_and_move_inactive_architects: { Args: never; Returns: undefined }
      check_and_update_inactive_architects: { Args: never; Returns: undefined }
      check_campaign_dispatch_allowed: {
        Args: { p_user_id?: string }
        Returns: Json
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
      cleanup_old_pending_messages: { Args: never; Returns: undefined }
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
      generate_username_from_email: {
        Args: { email_input: string }
        Returns: string
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
      get_campaign_evolution: {
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
      get_campaign_metrics: {
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
      get_campaign_vendor_comparison: {
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
      get_effective_sla_dias_uteis: {
        Args: { p_phase_id: string }
        Returns: number
      }
      get_ia_config: { Args: never; Returns: Json }
      get_monthly_goal_records: {
        Args: { p_month?: string; p_vendedor_id?: string }
        Returns: {
          batida: boolean
          date: string
          meta: number
          realizado: number
        }[]
      }
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
      get_prospeccao_architects_optimized: {
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
      get_seller_goal_stats: { Args: { p_vendedor_id: string }; Returns: Json }
      get_seller_performance_by_goal: {
        Args: { p_seller_goal_id: string }
        Returns: Json
      }
      get_sellers_without_goals: { Args: never; Returns: number }
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
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_master: { Args: { _user_id: string }; Returns: boolean }
      leads_aggregates: { Args: never; Returns: Json }
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
      mark_inactive_architects: { Args: never; Returns: undefined }
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
      production_sla_alerts: {
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
      reactivate_lost_deals_to_followup: { Args: never; Returns: Json }
      recalculate_all_goal_progress: { Args: never; Returns: undefined }
      run_inactive_architects_check: { Args: never; Returns: Json }
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
        | "producao"
        | "fornecedores"
        | "estoque"
        | "compras"
        | "pedidos"
        | "ia_configuracao"
      user_role: "admin" | "vendedor" | "arquiteto" | "projetista"
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
      ],
      user_role: ["admin", "vendedor", "arquiteto", "projetista"],
    },
  },
} as const
