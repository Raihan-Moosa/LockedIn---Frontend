export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  degree?: string;
  modules?: string[];
  interest?: string;
};

export type Session = {
  id: string;
  group_id: string;
  creator_id: string;
  start_at: string;
  venue?: string;
  topic?: string;
  time_goal_minutes?: number;
  content_goal?: string;
};

export type Group = {
  id: string;
  name: string;
  module: string;
  owner_id: string;
};

export type ProgressEntry = {
  date: string;
  hours: number;
  productivity: number;
  notes?: string;
};
