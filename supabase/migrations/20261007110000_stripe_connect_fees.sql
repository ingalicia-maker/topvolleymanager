-- Optional Stripe Connect for club fees: a club links its own Stripe account; families pay each
-- instalment through Stripe Checkout and the payment is marked as paid automatically.
-- The money goes straight to the club's Stripe account.

ALTER TABLE public.club_fee_settings ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE public.club_fee_settings ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false;

-- Each payment gets an unguessable token for its public "Pay" link
ALTER TABLE public.fee_charges ADD COLUMN IF NOT EXISTS pay_token UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.fee_charges ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS fee_charges_pay_token_idx ON public.fee_charges (pay_token);

-- The Stripe columns are written only by the server functions (service role), never by the app
CREATE OR REPLACE FUNCTION public.protect_stripe_fee_settings()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stripe_account_id := NULL;
      NEW.stripe_charges_enabled := false;
    ELSE
      NEW.stripe_account_id := OLD.stripe_account_id;
      NEW.stripe_charges_enabled := OLD.stripe_charges_enabled;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_stripe_fee_settings ON public.club_fee_settings;
CREATE TRIGGER protect_stripe_fee_settings
BEFORE INSERT OR UPDATE ON public.club_fee_settings
FOR EACH ROW EXECUTE FUNCTION public.protect_stripe_fee_settings();

-- Reminder emails: with Stripe connected, the "Pay" button opens the payment of that instalment
CREATE OR REPLACE FUNCTION public.fee_queue_reminder(_charge_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c RECORD;
  l TEXT;
  html TEXT;
  pay_url TEXT;
BEGIN
  SELECT ch.*, e.player_name, e.guardian_name, e.guardian_email, e.language,
         cl.name AS club_name, coalesce(s.contact_email, cl.responsible_person_email) AS contact,
         coalesce(s.currency, 'EUR') AS currency, p.payment_link,
         coalesce(s.stripe_charges_enabled, false) AS stripe_ready
  INTO c
  FROM public.fee_charges ch
  JOIN public.enrollments e ON e.id = ch.enrollment_id
  JOIN public.clubs cl ON cl.id = ch.club_id
  LEFT JOIN public.club_fee_settings s ON s.club_id = ch.club_id
  LEFT JOIN public.fee_plans p ON p.id = ch.plan_id
  WHERE ch.id = _charge_id AND ch.status = 'pending';
  IF NOT FOUND OR c.guardian_email IS NULL THEN RETURN false; END IF;
  l := c.language;
  pay_url := CASE
    WHEN c.stripe_ready THEN 'https://www.topvolleymanager.com/pagar/' || c.pay_token
    WHEN c.payment_link ~ '^https://' THEN c.payment_link
  END;

  html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">'
    || '<h2 style="margin:0 0 12px">' || public.fee_text(l, 'reminder_subject') || ' · ' || c.club_name || '</h2>'
    || '<p>' || coalesce(c.guardian_name || ', ', '') || public.fee_text(l, 'reminder_intro') || ' <b>' || c.player_name || '</b>:</p>'
    || '<table style="border-collapse:collapse;margin:12px 0">'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'concept') || '</td><td><b>' || c.concept || '</b></td></tr>'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'amount') || '</td><td><b>'
       || replace(to_char(c.amount, 'FM999999990.00'), '.', ',') || ' ' || c.currency || '</b></td></tr>'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'due') || '</td><td><b>' || to_char(c.due_date, 'DD/MM/YYYY') || '</b></td></tr>'
    || '</table>'
    || CASE WHEN pay_url IS NOT NULL THEN
         '<p><a href="' || pay_url || '" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">'
         || public.fee_text(l, 'pay') || '</a></p>' ELSE '' END
    || '<p style="color:#555">' || public.fee_text(l, 'already_paid') || '</p>'
    || CASE WHEN c.contact IS NOT NULL THEN '<p style="color:#555">' || public.fee_text(l, 'contact') || ' ' || c.contact || '</p>' ELSE '' END
    || '</div>';

  PERFORM public.fee_send_email(c.guardian_email,
    public.fee_text(l, 'reminder_subject') || ' · ' || c.club_name, html,
    'fee_reminder', 'fee-reminder-' || c.id || '-' || (c.reminders_sent + 1));
  UPDATE public.fee_charges SET reminders_sent = reminders_sent + 1, last_reminder_at = now() WHERE id = c.id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fee_queue_reminder(UUID) FROM PUBLIC, anon, authenticated;

-- Public pay page: what a family sees before paying (no personal data beyond the player's first name)
CREATE OR REPLACE FUNCTION public.get_fee_payment(_token UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'club', cl.name,
    'logo_url', cl.logo_url,
    'player', split_part(e.player_name, ' ', 1),
    'concept', ch.concept,
    'amount', ch.amount,
    'currency', coalesce(s.currency, 'EUR'),
    'due_date', ch.due_date,
    'status', ch.status,
    'can_pay', ch.status = 'pending' AND coalesce(s.stripe_charges_enabled, false)
  )
  FROM public.fee_charges ch
  JOIN public.enrollments e ON e.id = ch.enrollment_id
  JOIN public.clubs cl ON cl.id = ch.club_id
  LEFT JOIN public.club_fee_settings s ON s.club_id = ch.club_id
  WHERE ch.pay_token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_fee_payment(UUID) TO anon, authenticated;
