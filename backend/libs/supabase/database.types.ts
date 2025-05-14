export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_resources: {
        Row: {
          chat_id: string | null
          created_at: string
          id: string
          number: number | null
          resource_id: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: string
          number?: number | null
          resource_id?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: string
          number?: number | null
          resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_resources_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          task_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      embeddings: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          resource_id: string | null
          section: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          resource_id?: string | null
          section?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          resource_id?: string | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attatchments: Json | null
          chat_id: string | null
          created_at: string
          id: string
          model: string | null
          parts: Json | null
          role: string | null
        }
        Insert: {
          attatchments?: Json | null
          chat_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json | null
          role?: string | null
        }
        Update: {
          attatchments?: Json | null
          chat_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      queue: {
        Row: {
          attempts: number | null
          context: Json
          created_at: string | null
          env: string | null
          id: number
          max_attempts: number | null
          state: Database["public"]["Enums"]["task_state"]
          task_id: string
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          attempts?: number | null
          context: Json
          created_at?: string | null
          env?: string | null
          id?: number
          max_attempts?: number | null
          state: Database["public"]["Enums"]["task_state"]
          task_id: string
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          attempts?: number | null
          context?: Json
          created_at?: string | null
          env?: string | null
          id?: number
          max_attempts?: number | null
          state?: Database["public"]["Enums"]["task_state"]
          task_id?: string
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      resources: {
        Row: {
          authors: string[] | null
          content: string
          created_at: string | null
          full_text_url: string | null
          id: string
          journal: string | null
          offset: number | null
          pmcid: number | null
          pmid: number | null
          pub_date: string | null
          source_url: string | null
          task_id: string | null
          title: string | null
        }
        Insert: {
          authors?: string[] | null
          content: string
          created_at?: string | null
          full_text_url?: string | null
          id?: string
          journal?: string | null
          offset?: number | null
          pmcid?: number | null
          pmid?: number | null
          pub_date?: string | null
          source_url?: string | null
          task_id?: string | null
          title?: string | null
        }
        Update: {
          authors?: string[] | null
          content?: string
          created_at?: string | null
          full_text_url?: string | null
          id?: string
          journal?: string | null
          offset?: number | null
          pmcid?: number | null
          pmid?: number | null
          pub_date?: string | null
          source_url?: string | null
          task_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          message: string
          parsed_query: Json | null
          processed_articles: number | null
          state: string
          task_id: string
          total_articles: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          message: string
          parsed_query?: Json | null
          processed_articles?: number | null
          state: string
          task_id?: string
          total_articles?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          message?: string
          parsed_query?: Json | null
          processed_articles?: number | null
          state?: string
          task_id?: string
          total_articles?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      complete_task: {
        Args: { task_id: string }
        Returns: undefined
      }
      decrement_total_articles: {
        Args: { task_id_param: string }
        Returns: number
      }
      get_next_chat_resource_number: {
        Args: { chat_id_param: string }
        Returns: number
      }
      get_next_task: {
        Args: { p_worker_id: string }
        Returns: {
          id: number
          task_id: string
          state: string
          context: Json
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_processed_articles: {
        Args: { task_id_param: string }
        Returns: {
          new_processed_articles: number
          is_complete: boolean
        }[]
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_embeddings: {
        Args:
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
            }
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
              resource_ids: string[]
            }
        Returns: {
          id: string
          content: string
          similarity: number
          resource_id: string
          resource_title: string
          pmid: number
          pmcid: number
          journal: string
          full_text_url: string
          pub_date: string
          authors: string[]
        }[]
      }
      release_task_lock: {
        Args: { task_id: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_task_complete: {
        Args: { task_id_param: string; processed_count: number }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      task_state: "parseQuery" | "fetchMetadata" | "processPaper" | "Complete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_state: ["parseQuery", "fetchMetadata", "processPaper", "Complete"],
    },
  },
} as const
