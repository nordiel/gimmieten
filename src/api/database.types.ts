
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "peer_ratings": {
                  Row: {
                    "clarity": number,"confidence": number,"created_at": string,"learned": number,"rater_id": string,"room_id": string,"round": number,"target_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clarity": number,"confidence": number,"created_at"?: string,"learned": number,"rater_id": string,"room_id": string,"round": number,"target_id": string
                  }
                  Update: {
                    "clarity"?: number,"confidence"?: number,"created_at"?: string,"learned"?: number,"rater_id"?: string,"room_id"?: string,"round"?: number,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "peer_ratings_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"room_players": {
                  Row: {
                    "completed_topic_ids": (string)[],"done": boolean,"joined_at": string,"nickname": string,"ready": boolean,"role": string,"room_id": string,"skipped": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_topic_ids"?: (string)[],"done"?: boolean,"joined_at"?: string,"nickname": string,"ready"?: boolean,"role"?: string,"room_id": string,"skipped"?: boolean,"user_id": string
                  }
                  Update: {
                    "completed_topic_ids"?: (string)[],"done"?: boolean,"joined_at"?: string,"nickname"?: string,"ready"?: boolean,"role"?: string,"room_id"?: string,"skipped"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_players_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"room_topics": {
                  Row: {
                    "room_id": string,"round": number,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "room_id": string,"round": number,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "room_id"?: string,"round"?: number,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_topics_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "category": string,"code": string,"created_at": string,"current_turn": number,"explain_minutes": number,"format": string,"host_id": string,"id": string,"last_activity_at": string,"locked": boolean,"max_players": number,"phase": string,"phase_ends_at": string | null,"phase_started_at": string,"ratings_count": number,"round": number,"speaking_order": (string)[],"topic_mode": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"code": string,"created_at"?: string,"current_turn"?: number,"explain_minutes"?: number,"format"?: string,"host_id": string,"id"?: string,"last_activity_at"?: string,"locked"?: boolean,"max_players"?: number,"phase"?: string,"phase_ends_at"?: string | null,"phase_started_at"?: string,"ratings_count"?: number,"round"?: number,"speaking_order"?: (string)[],"topic_mode"?: string,"version"?: number
                  }
                  Update: {
                    "category"?: string,"code"?: string,"created_at"?: string,"current_turn"?: number,"explain_minutes"?: number,"format"?: string,"host_id"?: string,"id"?: string,"last_activity_at"?: string,"locked"?: boolean,"max_players"?: number,"phase"?: string,"phase_ends_at"?: string | null,"phase_started_at"?: string,"ratings_count"?: number,"round"?: number,"speaking_order"?: (string)[],"topic_mode"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"topics": {
                  Row: {
                    "category": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"id": string
                  }
                  Update: {
                    "category"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "advance_room":
{ Args: { "p_room": string,"p_version": number }; Returns: boolean
                           },
"create_room":
{ Args: { "p_category"?: string,"p_completed"?: (string)[],"p_explain_minutes"?: number,"p_format"?: string,"p_max_players"?: number,"p_nickname": string,"p_topic_mode"?: string }; Returns: string
                           },
"finish_turn":
{ Args: { "p_room": string }; Returns: undefined
                           },
"join_room":
{ Args: { "p_code": string,"p_completed"?: (string)[],"p_nickname": string }; Returns: string
                           },
"kick_player":
{ Args: { "p_room": string,"p_user": string }; Returns: undefined
                           },
"leave_room":
{ Args: { "p_room": string }; Returns: undefined
                           },
"mark_done":
{ Args: { "p_room": string }; Returns: undefined
                           },
"peek_room":
{ Args: { "p_code": string }; Returns: Json
                           },
"round_scores":
{ Args: { "p_room": string,"p_round": number }; Returns: {
              "clarity": (number)[],"confidence": (number)[],"learned": (number)[],"self_clarity": number,"self_confidence": number,"self_learned": number,"target_id": string
            }[]
                           },
"server_time":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_locked":
{ Args: { "p_locked": boolean,"p_room": string }; Returns: undefined
                           },
"set_ready":
{ Args: { "p_ready": boolean,"p_room": string }; Returns: undefined
                           },
"set_role":
{ Args: { "p_role": string,"p_room": string }; Returns: undefined
                           },
"skip_topic":
{ Args: { "p_room": string,"p_topic_id": string }; Returns: undefined
                           },
"start_game":
{ Args: { "p_force"?: boolean,"p_room": string,"p_topics": Json }; Returns: undefined
                           },
"start_turn":
{ Args: { "p_room": string }; Returns: undefined
                           },
"submit_rating":
{ Args: { "p_clarity": number,"p_confidence": number,"p_learned": number,"p_room": string }; Returns: undefined
                           },
"update_settings":
{ Args: { "p_category": string,"p_explain_minutes": number,"p_format"?: string,"p_max_players": number,"p_room": string,"p_topic_mode": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
