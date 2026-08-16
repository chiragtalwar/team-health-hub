CREATE TABLE public.whoop_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.whoop_oauth_states TO service_role;
ALTER TABLE public.whoop_oauth_states ENABLE ROW LEVEL SECURITY;