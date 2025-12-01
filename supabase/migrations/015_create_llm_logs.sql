-- Create table for storing LLM logs
create table public.llm_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  model text not null,
  prompt text,
  response text,
  tokens_prompt integer,
  tokens_completion integer,
  tokens_total integer,
  duration_ms integer,
  status text -- 'success' or 'error'
);

-- Enable RLS (optional, but good practice)
alter table public.llm_logs enable row level security;

-- Allow read access to authenticated users (optional, depending on who needs to see logs)
-- create policy "Allow read access to authenticated users" on public.llm_logs for select using (auth.role() = 'authenticated');
