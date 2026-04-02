export type ProfileRole = "member" | "admin" | "owner" | "officer" | "advisor";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  grade: number | null;
  role: ProfileRole;
  chapter_id: string | null;
  interests: string[] | null;
  experience_level: string | null;
  engagement_score: number;
  tier: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  name: string;
  school_name: string | null;
  advisor_name: string | null;
  invite_code: string;
  invite_link: string | null;
  owner_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ManualPoint {
  id: string;
  user_id: string;
  points: number;
  reason: string | null;
  awarded_by: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  chapter_id: string | null;
  title: string;
  description: string | null;
  date?: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  virtual_link: string | null;
  event_type: string | null;
  is_mandatory: boolean | null;
  max_capacity: number | null;
  recurrence_type: string | null;
  recurring_group_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = "rsvpd" | "attended" | "cancelled";

export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  attended: boolean;
  status?: AttendanceStatus | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementPoint {
  id: string;
  user_id: string;
  points: number;
  source: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export type AnnouncementPriority = "urgent" | "normal" | "fyi";

export interface Announcement {
  id: string;
  chapter_id: string | null;
  title: string;
  content: string;
  user_id: string | null;
  is_pinned: boolean;
  priority?: AnnouncementPriority | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "announcement" | "event_reminder" | "engagement_milestone" | "mandatory_event";
  title: string;
  body: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AIStrategy {
  id: string;
  user_id: string;
  strategy_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  event_code?: string | null;
  event_category: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
}
