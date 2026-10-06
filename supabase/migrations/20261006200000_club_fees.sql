-- Club fees: online enrolment forms, fee plans, payments and reminders.
-- Clubs collect through their own Stripe payment links; the app only keeps track.
-- Only club directors can see or change any of this.

-- 1) Settings per club
CREATE TABLE IF NOT EXISTS public.club_fee_settings (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  auto_reminders BOOLEAN NOT NULL DEFAULT false,
  remind_days_before INT NOT NULL DEFAULT 3 CHECK (remind_days_before BETWEEN 0 AND 60),
  remind_every_days INT NOT NULL DEFAULT 7 CHECK (remind_every_days BETWEEN 1 AND 60),
  contact_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Fee plans ("Cuota mensual sub-14", "Matrícula"...)
CREATE TABLE IF NOT EXISTS public.fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'monthly', 'quarterly', 'yearly')),
  installments INT NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 24),
  first_due_date DATE,
  payment_link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Enrolment forms shared with families through /inscripcion/<slug>
CREATE TABLE IF NOT EXISTS public.enrollment_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  title TEXT NOT NULL,
  intro TEXT,
  -- [{ "id": "f1", "label": "Talla de camiseta", "type": "text|textarea|number|date|select|checkbox", "required": true, "options": ["S","M"] }]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_ids UUID[] NOT NULL DEFAULT '{}',
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Enrolments (one per child)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.enrollment_forms(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.fee_plans(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  player_birth_date DATE,
  guardian_name TEXT,
  guardian_email TEXT,
  guardian_phone TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enrollments_club_idx ON public.enrollments (club_id, status);

-- 5) Payments due
CREATE TABLE IF NOT EXISTS public.fee_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.fee_plans(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  note TEXT,
  reminders_sent INT NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fee_charges_club_idx ON public.fee_charges (club_id, status, due_date);

-- Row level security: directors of the club only
ALTER TABLE public.club_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_charges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['club_fee_settings', 'fee_plans', 'enrollment_forms', 'enrollments', 'fee_charges'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Directors manage %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Directors manage %1$s" ON public.%1$I FOR ALL TO authenticated
         USING (public.is_club_director(auth.uid(), club_id))
         WITH CHECK (public.is_club_director(auth.uid(), club_id))', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Text of the emails sent to families, in their language
CREATE OR REPLACE FUNCTION public.fee_text(_lang TEXT, _key TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE coalesce(_lang, 'es')
    WHEN 'en' THEN CASE _key
      WHEN 'reminder_subject' THEN 'Payment reminder'
      WHEN 'reminder_intro' THEN 'This is a reminder of the following payment for'
      WHEN 'concept' THEN 'Concept'
      WHEN 'amount' THEN 'Amount'
      WHEN 'due' THEN 'Due date'
      WHEN 'pay' THEN 'Pay now'
      WHEN 'already_paid' THEN 'If you have already paid, please ignore this message.'
      WHEN 'contact' THEN 'Questions? Write to the club:'
      WHEN 'received_subject' THEN 'Enrolment received'
      WHEN 'received_body' THEN 'We have received the enrolment of'
      WHEN 'received_next' THEN 'The club will review it and contact you with the next steps.'
      WHEN 'new_subject' THEN 'New enrolment'
      WHEN 'new_body' THEN 'A new enrolment has arrived for'
    END
    WHEN 'it' THEN CASE _key
      WHEN 'reminder_subject' THEN 'Promemoria di pagamento'
      WHEN 'reminder_intro' THEN 'Ti ricordiamo il seguente pagamento per'
      WHEN 'concept' THEN 'Causale'
      WHEN 'amount' THEN 'Importo'
      WHEN 'due' THEN 'Scadenza'
      WHEN 'pay' THEN 'Paga ora'
      WHEN 'already_paid' THEN 'Se hai già pagato, ignora questo messaggio.'
      WHEN 'contact' THEN 'Domande? Scrivi al club:'
      WHEN 'received_subject' THEN 'Iscrizione ricevuta'
      WHEN 'received_body' THEN 'Abbiamo ricevuto l''iscrizione di'
      WHEN 'received_next' THEN 'Il club la esaminerà e ti contatterà con i prossimi passi.'
      WHEN 'new_subject' THEN 'Nuova iscrizione'
      WHEN 'new_body' THEN 'È arrivata una nuova iscrizione per'
    END
    ELSE CASE _key
      WHEN 'reminder_subject' THEN 'Recordatorio de pago'
      WHEN 'reminder_intro' THEN 'Te recordamos el siguiente pago de'
      WHEN 'concept' THEN 'Concepto'
      WHEN 'amount' THEN 'Importe'
      WHEN 'due' THEN 'Vencimiento'
      WHEN 'pay' THEN 'Pagar ahora'
      WHEN 'already_paid' THEN 'Si ya has pagado, ignora este mensaje.'
      WHEN 'contact' THEN '¿Dudas? Escribe al club:'
      WHEN 'received_subject' THEN 'Inscripción recibida'
      WHEN 'received_body' THEN 'Hemos recibido la inscripción de'
      WHEN 'received_next' THEN 'El club la revisará y te contactará con los siguientes pasos.'
      WHEN 'new_subject' THEN 'Nueva inscripción'
      WHEN 'new_body' THEN 'Ha llegado una nueva inscripción de'
    END
  END
$$;

-- Queue one email through the existing transactional email pipeline
CREATE OR REPLACE FUNCTION public.fee_send_email(_to TEXT, _subject TEXT, _html TEXT, _label TEXT, _key TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE mid TEXT := _label || '-' || gen_random_uuid();
BEGIN
  IF _to IS NULL OR _to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN; END IF;
  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status)
  VALUES (mid, _label, _to, 'pending');
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', mid,
    'idempotency_key', _key,
    'to', _to,
    'from', 'Top Volley Manager <noreply@topvolleymanager.com>',
    'sender_domain', 'notify.topvolleymanager.com',
    'subject', _subject,
    'html', _html,
    'purpose', 'transactional',
    'label', _label,
    'queued_at', now()
  ));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fee_send_email(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Reminder email for one payment
CREATE OR REPLACE FUNCTION public.fee_queue_reminder(_charge_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c RECORD;
  l TEXT;
  html TEXT;
BEGIN
  SELECT ch.*, e.player_name, e.guardian_name, e.guardian_email, e.language,
         cl.name AS club_name, coalesce(s.contact_email, cl.responsible_person_email) AS contact,
         coalesce(s.currency, 'EUR') AS currency, p.payment_link
  INTO c
  FROM public.fee_charges ch
  JOIN public.enrollments e ON e.id = ch.enrollment_id
  JOIN public.clubs cl ON cl.id = ch.club_id
  LEFT JOIN public.club_fee_settings s ON s.club_id = ch.club_id
  LEFT JOIN public.fee_plans p ON p.id = ch.plan_id
  WHERE ch.id = _charge_id AND ch.status = 'pending';
  IF NOT FOUND OR c.guardian_email IS NULL THEN RETURN false; END IF;
  l := c.language;

  html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">'
    || '<h2 style="margin:0 0 12px">' || public.fee_text(l, 'reminder_subject') || ' · ' || c.club_name || '</h2>'
    || '<p>' || coalesce(c.guardian_name || ', ', '') || public.fee_text(l, 'reminder_intro') || ' <b>' || c.player_name || '</b>:</p>'
    || '<table style="border-collapse:collapse;margin:12px 0">'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'concept') || '</td><td><b>' || c.concept || '</b></td></tr>'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'amount') || '</td><td><b>'
       || replace(to_char(c.amount, 'FM999999990.00'), '.', ',') || ' ' || c.currency || '</b></td></tr>'
    || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || public.fee_text(l, 'due') || '</td><td><b>' || to_char(c.due_date, 'DD/MM/YYYY') || '</b></td></tr>'
    || '</table>'
    || CASE WHEN c.payment_link ~ '^https://' THEN
         '<p><a href="' || c.payment_link || '" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">'
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

-- Reminders sent by a director from the app
CREATE OR REPLACE FUNCTION public.send_fee_reminders(_charge_ids UUID[])
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cid UUID;
  sent INT := 0;
BEGIN
  FOREACH cid IN ARRAY _charge_ids LOOP
    IF EXISTS (SELECT 1 FROM public.fee_charges WHERE id = cid AND public.is_club_director(auth.uid(), club_id))
       AND public.fee_queue_reminder(cid) THEN
      sent := sent + 1;
    END IF;
  END LOOP;
  RETURN sent;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_fee_reminders(UUID[]) TO authenticated;

-- Automatic reminders (daily cron): N days before the due date, then every M days while pending
CREATE OR REPLACE FUNCTION public.run_fee_reminders()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  sent INT := 0;
BEGIN
  FOR r IN
    SELECT ch.id
    FROM public.fee_charges ch
    JOIN public.club_fee_settings s ON s.club_id = ch.club_id AND s.auto_reminders
    JOIN public.enrollments e ON e.id = ch.enrollment_id AND e.status = 'active'
    WHERE ch.status = 'pending'
      AND ch.due_date - s.remind_days_before <= current_date
      AND (ch.last_reminder_at IS NULL OR ch.last_reminder_at < now() - make_interval(days => s.remind_every_days))
    LIMIT 500
  LOOP
    IF public.fee_queue_reminder(r.id) THEN sent := sent + 1; END IF;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_fee_reminders() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('club-fee-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('club-fee-reminders', '0 8 * * *', 'SELECT public.run_fee_reminders()');

-- Public form: what a family sees at /inscripcion/<slug>
CREATE OR REPLACE FUNCTION public.get_enrollment_form(_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'title', f.title,
    'intro', f.intro,
    'fields', f.fields,
    'is_open', f.is_open,
    'club', jsonb_build_object('name', c.name, 'logo_url', c.logo_url, 'primary_color', c.primary_color),
    'currency', coalesce(s.currency, 'EUR'),
    'plans', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description,
               'amount', p.amount, 'frequency', p.frequency, 'installments', p.installments) ORDER BY p.sort_order, p.name)
      FROM public.fee_plans p WHERE p.id = ANY (f.plan_ids) AND p.active), '[]'::jsonb)
  )
  FROM public.enrollment_forms f
  JOIN public.clubs c ON c.id = f.club_id
  LEFT JOIN public.club_fee_settings s ON s.club_id = f.club_id
  WHERE f.slug = _slug
$$;
GRANT EXECUTE ON FUNCTION public.get_enrollment_form(TEXT) TO anon, authenticated;

-- Public form: a family sends an enrolment
CREATE OR REPLACE FUNCTION public.submit_enrollment(_slug TEXT, _data JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  f RECORD;
  fld JSONB;
  new_id UUID;
  lang TEXT := CASE WHEN _data->>'language' IN ('es', 'en', 'it') THEN _data->>'language' ELSE 'es' END;
  plan UUID := NULLIF(_data->>'plan_id', '')::uuid;
  email TEXT := lower(trim(_data->>'guardian_email'));
  player TEXT := trim(coalesce(_data->>'player_name', ''));
  d RECORD;
BEGIN
  SELECT ef.*, c.name AS club_name INTO f
  FROM public.enrollment_forms ef JOIN public.clubs c ON c.id = ef.club_id
  WHERE ef.slug = _slug;
  IF NOT FOUND OR NOT f.is_open THEN RAISE EXCEPTION 'form_closed'; END IF;
  IF length(_data::text) > 20000 THEN RAISE EXCEPTION 'too_large'; END IF;
  IF player = '' OR coalesce(trim(_data->>'guardian_name'), '') = '' THEN RAISE EXCEPTION 'missing_required'; END IF;
  IF email IS NULL OR email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF plan IS NOT NULL AND NOT plan = ANY (f.plan_ids) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  IF plan IS NULL AND cardinality(f.plan_ids) > 0 THEN RAISE EXCEPTION 'missing_required'; END IF;
  -- required custom fields
  FOR fld IN SELECT * FROM jsonb_array_elements(f.fields) LOOP
    IF coalesce((fld->>'required')::boolean, false)
       AND coalesce(trim(_data->'answers'->>(fld->>'id')), '') IN ('', 'false') THEN
      RAISE EXCEPTION 'missing_required';
    END IF;
  END LOOP;
  -- the same child sent twice in a few minutes is one enrolment
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE form_id = f.id AND lower(player_name) = lower(player)
             AND guardian_email = email AND created_at > now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'duplicate';
  END IF;

  INSERT INTO public.enrollments (club_id, form_id, plan_id, player_name, player_birth_date,
    guardian_name, guardian_email, guardian_phone, language, answers)
  VALUES (f.club_id, f.id, plan, left(player, 200), NULLIF(_data->>'player_birth_date', '')::date,
    left(trim(_data->>'guardian_name'), 200), email, left(trim(coalesce(_data->>'guardian_phone', '')), 40), lang,
    coalesce(_data->'answers', '{}'::jsonb))
  RETURNING id INTO new_id;

  -- confirmation to the family
  PERFORM public.fee_send_email(email,
    public.fee_text(lang, 'received_subject') || ' · ' || f.club_name,
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><h2>' || f.club_name || '</h2><p>'
      || public.fee_text(lang, 'received_body') || ' <b>' || player || '</b>.</p><p>' || public.fee_text(lang, 'received_next') || '</p></div>',
    'enrollment_received', 'enrollment-received-' || new_id);
  -- notice to the club's directors
  FOR d IN
    SELECT u.email,
           CASE WHEN u.raw_user_meta_data->>'language' IN ('es', 'en', 'it') THEN u.raw_user_meta_data->>'language' ELSE 'es' END AS lang
    FROM public.club_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.club_id = f.club_id AND m.role = 'director'
  LOOP
    PERFORM public.fee_send_email(d.email,
      public.fee_text(d.lang, 'new_subject') || ': ' || player,
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><p>'
        || public.fee_text(d.lang, 'new_body') || ' <b>' || player || '</b> (' || f.title || ').</p>'
        || '<p><a href="https://www.topvolleymanager.com/fees">topvolleymanager.com/fees</a></p></div>',
      'enrollment_new', 'enrollment-new-' || new_id || '-' || d.email);
  END LOOP;
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_enrollment(TEXT, JSONB) TO anon, authenticated;
