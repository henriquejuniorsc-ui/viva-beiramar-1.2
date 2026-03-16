// --- CONFIGURAÇÃO SUPABASE ---
export const supabaseUrl = 'https://hcmpjrqpjohksoznoycq.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

let _supabase = null;

export function getSupabase() {
  return _supabase;
}

export function setSupabaseClient(client) {
  _supabase = client;
}
