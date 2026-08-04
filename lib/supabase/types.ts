export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ShiftSlot = "morning" | "second" | "third" | "additional";
export type TopicStatus = "not_started" | "in_progress" | "completed";
export type PlanStatus = "draft" | "pledged" | "in_progress" | "completed" | "rest";
export type SessionStatus =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "skipped";
export type NoteType =
  | "quick"
  | "doubt"
  | "fact"
  | "mistake"
  | "learned"
  | "remaining";
export type RevisionType =
  | "same_day"
  | "next_day"
  | "weekly"
  | "fifteen_day"
  | "monthly";
export type CalendarEventType =
  | "same_day_revision"
  | "next_day_revision"
  | "weekly_revision"
  | "fifteen_day_revision"
  | "monthly_revision"
  | "custom";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          timezone?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          shift_slot: ShiftSlot;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          shift_slot: ShiftSlot;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          completion_percent: number;
          status: TopicStatus;
          last_studied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          completion_percent?: number;
          status?: TopicStatus;
          last_studied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
        Relationships: [];
      };
      daily_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_date: string;
          status: PlanStatus;
          pledged_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_date: string;
          status?: PlanStatus;
          pledged_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_plans"]["Insert"]>;
        Relationships: [];
      };
      planned_sessions: {
        Row: {
          id: string;
          daily_plan_id: string;
          shift_slot: ShiftSlot;
          subject_id: string | null;
          topic_id: string | null;
          sort_order: number;
          status: SessionStatus;
          is_none: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_plan_id: string;
          shift_slot: ShiftSlot;
          subject_id?: string | null;
          topic_id?: string | null;
          sort_order?: number;
          status?: SessionStatus;
          is_none?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["planned_sessions"]["Insert"]
        >;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          planned_session_id: string;
          started_at: string;
          ended_at: string | null;
          actual_study_ms: number;
          pause_ms: number;
          pause_count: number;
          completion_percent: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          planned_session_id: string;
          started_at?: string;
          ended_at?: string | null;
          actual_study_ms?: number;
          pause_ms?: number;
          pause_count?: number;
          completion_percent?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      pause_logs: {
        Row: {
          id: string;
          session_id: string;
          started_at: string;
          ended_at: string | null;
          duration_ms: number | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_ms?: number | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pause_logs"]["Insert"]>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          session_id: string | null;
          topic_id: string | null;
          note_type: NoteType;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          topic_id?: string | null;
          note_type?: NoteType;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>;
        Relationships: [];
      };
      revisions: {
        Row: {
          id: string;
          user_id: string;
          revision_type: RevisionType;
          scheduled_for: string;
          completed_at: string | null;
          topic_ids: string[];
          range_start: string | null;
          range_end: string | null;
          study_ms: number;
          reflection: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          revision_type: RevisionType;
          scheduled_for: string;
          completed_at?: string | null;
          topic_ids?: string[];
          range_start?: string | null;
          range_end?: string | null;
          study_ms?: number;
          reflection?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["revisions"]["Insert"]>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          event_date: string;
          event_type: CalendarEventType;
          revision_id: string | null;
          label: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_date: string;
          event_type: CalendarEventType;
          revision_id?: string | null;
          label: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calendar_events"]["Insert"]
        >;
        Relationships: [];
      };
      analytics_cache: {
        Row: {
          id: string;
          cache_key: string;
          payload: Json;
          computed_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          payload?: Json;
          computed_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["analytics_cache"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      shift_slot: ShiftSlot;
      topic_status: TopicStatus;
      plan_status: PlanStatus;
      session_status: SessionStatus;
      note_type: NoteType;
      revision_type: RevisionType;
      calendar_event_type: CalendarEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
