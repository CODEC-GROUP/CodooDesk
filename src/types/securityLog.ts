export interface SecurityLog {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  status: 'success' | 'failure';
  // Add other fields from your model
} 