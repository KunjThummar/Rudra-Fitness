// User roles
export type UserRole = "admin" | "member" | "trainer";

// Navigation item
export interface NavItem {
  title: string;
  path: string;
  icon: string;
}

// Stat card data
export interface StatCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: string;
}

// Member
export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  membershipPlan?: string;
  joinDate: string;
  status: "active" | "inactive" | "expired";
}

// Payment
export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "overdue";
  plan: string;
}

// Workout
export interface Workout {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  assignedTo?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  restTime?: number;
}

// Diet Plan
export interface DietPlan {
  id: string;
  name: string;
  meals: Meal[];
  assignedTo?: string[];
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  items: string[];
  calories?: number;
}
