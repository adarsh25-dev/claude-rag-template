export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          filename: string;
          file_size: number;
          file_type: string;
          status: "processing" | "ready" | "failed";
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          filename: string;
          file_size: number;
          file_type: string;
          status?: "processing" | "ready" | "failed";
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          filename?: string;
          file_size?: number;
          file_type?: string;
          status?: "processing" | "ready" | "failed";
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      chunks: {
        Row: {
          id: string;
          document_id: string;
          content: string;
          chunk_index: number;
          token_count: number;
          embedding: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          chunk_index: number;
          token_count: number;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          content?: string;
          chunk_index?: number;
          token_count?: number;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          filter_user_id?: string;
          filter_document_ids?: string[];
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          similarity: number;
          chunk_index: number;
          metadata: Json;
        }[];
      };
    };
  };
}

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Chunk = Database["public"]["Tables"]["chunks"]["Row"];
