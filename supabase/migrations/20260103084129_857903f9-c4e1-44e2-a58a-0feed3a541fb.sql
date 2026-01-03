-- Create trigger function to assign director role when is_director is true
CREATE OR REPLACE FUNCTION public.handle_director_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if is_director flag is set in raw_user_meta_data
  IF (NEW.raw_user_meta_data ->> 'is_director')::boolean = true THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'director')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to execute after user creation
CREATE TRIGGER on_auth_user_created_director
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_director_role();