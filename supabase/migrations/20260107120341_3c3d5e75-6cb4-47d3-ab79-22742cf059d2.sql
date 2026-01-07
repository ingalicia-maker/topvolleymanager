-- Add column to track when directors accepted the declaration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS director_declaration_accepted_at timestamptz;

-- Update the handle_new_user function to store declaration timestamp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, assigned_teams, director_declaration_accepted_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data -> 'assigned_teams')),
      '{}'
    ),
    CASE 
      WHEN (NEW.raw_user_meta_data ->> 'is_director')::boolean = true 
      THEN (NEW.raw_user_meta_data ->> 'director_declaration_accepted_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;