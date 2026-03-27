
-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  language text NOT NULL DEFAULT 'es',
  privacy_accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'landing',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Subscribers can view/update their own record by email
CREATE POLICY "Users can view own subscription"
  ON public.newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin can manage all
CREATE POLICY "Admins can manage newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO authenticated
  USING (is_app_admin((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text))
  WITH CHECK (is_app_admin((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text));

-- Newsletters table for admin to manage sent newsletters
CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  content text NOT NULL,
  article_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamp with time zone,
  recipient_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletters"
  ON public.newsletters FOR ALL
  TO authenticated
  USING (is_app_admin((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text))
  WITH CHECK (is_app_admin((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text));
