-- Add phone field to profiles table for coaches
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;