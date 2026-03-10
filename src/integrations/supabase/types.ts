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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          method: string | null
          notes: string | null
          qr_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          qr_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          qr_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_months: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_months?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_months?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          end_date: string
          id: string
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          membership_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      diet_plans: {
        Row: {
          carbs_target_g: number | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_weeks: number | null
          fat_target_g: number | null
          goal: string | null
          id: string
          is_active: boolean | null
          name: string
          protein_target_g: number | null
          total_calories: number | null
          updated_at: string | null
        }
        Insert: {
          carbs_target_g?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          fat_target_g?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          protein_target_g?: number | null
          total_calories?: number | null
          updated_at?: string | null
        }
        Update: {
          carbs_target_g?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          fat_target_g?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          protein_target_g?: number | null
          total_calories?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          created_at: string
          created_by: string | null
          days_per_week: number | null
          description: string | null
          difficulty: string
          duration_weeks: number | null
          estimated_duration_minutes: number | null
          goal: string | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string
          duration_weeks?: number | null
          estimated_duration_minutes?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string
          duration_weeks?: number | null
          estimated_duration_minutes?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainer_profiles: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          is_active: boolean | null
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id: string
          is_active?: boolean | null
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      exercise_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          demo_url: string | null
          description: string | null
          difficulty: string
          equipment: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          muscle_groups: string[] | null
          name: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          muscle_groups?: string[] | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          muscle_groups?: string[] | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_plan_exercises: {
        Row: {
          created_at: string
          day_number: number
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      member_workouts: {
        Row: {
          assigned_by: string | null
          created_at: string
          end_date: string | null
          id: string
          member_id: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
          workout_plan_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workout_plan_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          member_id: string
          notes: string | null
          rating: number | null
          started_at: string
          workout_plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          member_id: string
          notes?: string | null
          rating?: number | null
          started_at?: string
          workout_plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          rating?: number | null
          started_at?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_log_sets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          reps: number | null
          set_number: number
          weight_kg: number | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number | null
          set_number?: number
          weight_kg?: number | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number | null
          set_number?: number
          weight_kg?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          }
        ]
      }
      meals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          photo_url: string | null
          preparation_time_minutes: number | null
          protein_g: number | null
          serving_size: string | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          photo_url?: string | null
          preparation_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: string | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
          preparation_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diet_plan_meals: {
        Row: {
          created_at: string
          day_number: number
          diet_plan_id: string
          id: string
          meal_id: string
          meal_time: string
          notes: string | null
          order_index: number | null
        }
        Insert: {
          created_at?: string
          day_number?: number
          diet_plan_id: string
          id?: string
          meal_id: string
          meal_time?: string
          notes?: string | null
          order_index?: number | null
        }
        Update: {
          created_at?: string
          day_number?: number
          diet_plan_id?: string
          id?: string
          meal_id?: string
          meal_time?: string
          notes?: string | null
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_meals_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_plan_meals_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          }
        ]
      }
      member_diet_plans: {
        Row: {
          assigned_by: string | null
          created_at: string
          diet_plan_id: string
          end_date: string | null
          id: string
          member_id: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          diet_plan_id: string
          end_date?: string | null
          id?: string
          member_id: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          diet_plan_id?: string
          end_date?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_diet_plans_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_name: string | null
          id: string
          logged_at: string
          meal_id: string | null
          meal_time: string | null
          member_id: string
          notes: string | null
          photo_url: string | null
          protein_g: number | null
          quantity: number | null
          unit: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string | null
          id?: string
          logged_at?: string
          meal_id?: string | null
          meal_time?: string | null
          member_id: string
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string | null
          id?: string
          logged_at?: string
          meal_id?: string | null
          meal_time?: string | null
          member_id?: string
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          }
        ]
      }
      body_measurements: {
        Row: {
          bmi: number | null
          body_fat_percentage: number | null
          chest_cm: number | null
          created_at: string
          height_cm: number | null
          hips_cm: number | null
          id: string
          left_arm_cm: number | null
          left_thigh_cm: number | null
          measured_at: string
          member_id: string
          muscle_mass_kg: number | null
          notes: string | null
          right_arm_cm: number | null
          right_thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          measured_at?: string
          member_id: string
          muscle_mass_kg?: number | null
          notes?: string | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          measured_at?: string
          member_id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          member_id: string
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          member_id: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          member_id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          category: string | null
          created_at: string
          criteria_type: string | null
          criteria_value: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          category?: string | null
          created_at?: string
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          category?: string | null
          created_at?: string
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      member_achievements: {
        Row: {
          achievement_id: string
          awarded_by: string | null
          earned_at: string
          id: string
          member_id: string
          notes: string | null
        }
        Insert: {
          achievement_id: string
          awarded_by?: string | null
          earned_at?: string
          id?: string
          member_id: string
          notes?: string | null
        }
        Update: {
          achievement_id?: string
          awarded_by?: string | null
          earned_at?: string
          id?: string
          member_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          }
        ]
      }
      qr_codes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          member_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          member_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          member_id?: string
          token?: string
        }
        Relationships: []
      }
      attendance_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_visit_date: string | null
          longest_streak: number | null
          member_id: string
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_visit_date?: string | null
          longest_streak?: number | null
          member_id: string
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_visit_date?: string | null
          longest_streak?: number | null
          member_id?: string
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          starts_at: string | null
          target_audience: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          starts_at?: string | null
          target_audience?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          starts_at?: string | null
          target_audience?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_attendance_summary: {
        Row: {
          avg_duration_minutes: number | null
          date: string | null
          total_checkins: number | null
          unique_members: number | null
          with_checkout: number | null
        }
        Relationships: []
      }
      member_engagement: {
        Row: {
          achievements_earned: number | null
          active_diet_plans: number | null
          current_streak: number | null
          engagement_level: string | null
          full_name: string | null
          joined_at: string | null
          last_visit_date: string | null
          longest_streak: number | null
          member_id: string | null
          membership_end_date: string | null
          membership_status: string | null
          total_visits: number | null
          workout_sessions: number | null
        }
        Relationships: []
      }
      monthly_revenue: {
        Row: {
          avg_payment: number | null
          month: string | null
          paying_members: number | null
          payment_count: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      trainer_performance: {
        Row: {
          assigned_members: number | null
          diet_plans_assigned: number | null
          experience_years: number | null
          is_active: boolean | null
          specializations: string[] | null
          trainer_id: string | null
          trainer_name: string | null
          workout_plans_assigned: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      broadcast_announcement: {
        Args: { p_announcement_id: string }
        Returns: number
      }
      check_in_via_qr: {
        Args: { p_token: string }
        Returns: Json
      }
      generate_member_qr: {
        Args: { p_member_id: string }
        Returns: string
      }
      get_gym_analytics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_member_progress_summary: {
        Args: { p_member_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "member" | "trainer"
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
      app_role: ["admin", "member", "trainer"],
    },
  },
} as const
