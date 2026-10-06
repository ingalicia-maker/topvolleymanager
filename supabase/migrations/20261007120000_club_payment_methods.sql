-- Each club chooses how families pay: its own Stripe payment link, bank transfer, Bizum,
-- cash or other instructions. The chosen ways appear in reminders and enrolment confirmations.
-- payment_methods: {"stripe": {"enabled": true, "link": "https://buy.stripe.com/..."},
--   "transfer": {"enabled": true, "holder": "...", "iban": "...", "note": "..."},
--   "bizum": {"enabled": true, "phone": "..."}, "cash": {"enabled": true, "note": "..."},
--   "other": {"enabled": true, "note": "..."} }

ALTER TABLE public.club_fee_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.fee_pay_text(_lang TEXT, _key TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE coalesce(_lang, 'es')
    WHEN 'en' THEN CASE _key
      WHEN 'how_to_pay' THEN 'How to pay'
      WHEN 'card' THEN 'By card'
      WHEN 'card_link' THEN 'Pay by card'
      WHEN 'transfer' THEN 'By bank transfer'
      WHEN 'holder' THEN 'Account holder'
      WHEN 'reference' THEN 'Reference'
      WHEN 'bizum' THEN 'By Bizum'
      WHEN 'cash' THEN 'In cash'
      WHEN 'other' THEN 'Other'
    END
    WHEN 'it' THEN CASE _key
      WHEN 'how_to_pay' THEN 'Come pagare'
      WHEN 'card' THEN 'Con carta'
      WHEN 'card_link' THEN 'Paga con carta'
      WHEN 'transfer' THEN 'Con bonifico'
      WHEN 'holder' THEN 'Intestatario'
      WHEN 'reference' THEN 'Causale'
      WHEN 'bizum' THEN 'Con Bizum'
      WHEN 'cash' THEN 'In contanti'
      WHEN 'other' THEN 'Altro'
    END
    ELSE CASE _key
      WHEN 'how_to_pay' THEN 'Cómo pagar'
      WHEN 'card' THEN 'Con tarjeta'
      WHEN 'card_link' THEN 'Pagar con tarjeta'
      WHEN 'transfer' THEN 'Por transferencia'
      WHEN 'holder' THEN 'Titular'
      WHEN 'reference' THEN 'Concepto'
      WHEN 'bizum' THEN 'Por Bizum'
      WHEN 'cash' THEN 'En efectivo'
      WHEN 'other' THEN 'Otra forma'
    END
  END
$$;

-- "How to pay" block of the emails. Values typed by the club are HTML-escaped.
CREATE OR REPLACE FUNCTION public.fee_html_escape(_t TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT replace(replace(replace(replace(coalesce(_t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

CREATE OR REPLACE FUNCTION public.fee_how_to_pay_html(_methods JSONB, _lang TEXT, _reference TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  body TEXT := '';
  m JSONB := coalesce(_methods, '{}'::jsonb);
  p TEXT := '<p style="margin:6px 0">';
BEGIN
  IF coalesce((m->'stripe'->>'enabled')::boolean, false) AND m->'stripe'->>'link' ~ '^https://[^\s"<>]+$' THEN
    body := body || p || '<b>' || public.fee_pay_text(_lang, 'card') || ':</b> <a href="' || (m->'stripe'->>'link') || '">'
      || public.fee_pay_text(_lang, 'card_link') || '</a></p>';
  END IF;
  IF coalesce((m->'transfer'->>'enabled')::boolean, false) AND coalesce(m->'transfer'->>'iban', '') <> '' THEN
    body := body || p || '<b>' || public.fee_pay_text(_lang, 'transfer') || ':</b><br>'
      || CASE WHEN coalesce(m->'transfer'->>'holder', '') <> ''
           THEN public.fee_pay_text(_lang, 'holder') || ': ' || public.fee_html_escape(m->'transfer'->>'holder') || '<br>' ELSE '' END
      || 'IBAN: ' || public.fee_html_escape(m->'transfer'->>'iban') || '<br>'
      || public.fee_pay_text(_lang, 'reference') || ': '
      || public.fee_html_escape(coalesce(NULLIF(m->'transfer'->>'note', ''), _reference)) || '</p>';
  END IF;
  IF coalesce((m->'bizum'->>'enabled')::boolean, false) AND coalesce(m->'bizum'->>'phone', '') <> '' THEN
    body := body || p || '<b>' || public.fee_pay_text(_lang, 'bizum') || ':</b> ' || public.fee_html_escape(m->'bizum'->>'phone') || '</p>';
  END IF;
  IF coalesce((m->'cash'->>'enabled')::boolean, false) THEN
    body := body || p || '<b>' || public.fee_pay_text(_lang, 'cash') || '</b>'
      || CASE WHEN coalesce(m->'cash'->>'note', '') <> '' THEN ': ' || public.fee_html_escape(m->'cash'->>'note') ELSE '' END || '</p>';
  END IF;
  IF coalesce((m->'other'->>'enabled')::boolean, false) AND coalesce(m->'other'->>'note', '') <> '' THEN
    body := body || p || '<b>' || public.fee_pay_text(_lang, 'other') || ':</b> ' || public.fee_html_escape(m->'other'->>'note') || '</p>';
  END IF;
  IF body = '' THEN RETURN ''; END IF;
  RETURN '<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin:14px 0">'
    || '<p style="margin:0 0 6px;font-weight:bold">' || public.fee_pay_text(_lang, 'how_to_pay') || '</p>' || body || '</div>';
END;
$$;

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
         coalesce(s.currency, 'EUR') AS currency,
         coalesce(NULLIF(p.payment_link, ''), CASE WHEN (s.payment_methods->'stripe'->>'enabled')::boolean THEN s.payment_methods->'stripe'->>'link' END) AS payment_link,
         coalesce(s.payment_methods, '{}'::jsonb) AS methods
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
    -- the card link already has its own button above
    || public.fee_how_to_pay_html(CASE WHEN c.payment_link ~ '^https://' THEN c.methods - 'stripe' ELSE c.methods END, l, c.concept || ' · ' || c.player_name)
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

CREATE OR REPLACE FUNCTION public.submit_enrollment(_slug TEXT, _data JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  f RECORD;
  methods JSONB;
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

  SELECT coalesce(payment_methods, '{}'::jsonb) INTO methods FROM public.club_fee_settings WHERE club_id = f.club_id;
  -- confirmation to the family
  PERFORM public.fee_send_email(email,
    public.fee_text(lang, 'received_subject') || ' · ' || f.club_name,
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><h2>' || f.club_name || '</h2><p>'
      || public.fee_text(lang, 'received_body') || ' <b>' || player || '</b>.</p><p>' || public.fee_text(lang, 'received_next') || '</p>'
      || public.fee_how_to_pay_html(methods, lang, player) || '</div>',
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
