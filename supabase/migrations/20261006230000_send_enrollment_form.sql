-- Send an enrolment form by email from the app.
-- Each family receives it in their language (from their enrolment, if the club has one).

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
      WHEN 'form_subject' THEN 'Enrolment form'
      WHEN 'form_body' THEN 'The club invites you to fill in the enrolment form:'
      WHEN 'form_button' THEN 'Fill in the form'
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
      WHEN 'form_subject' THEN 'Modulo di iscrizione'
      WHEN 'form_body' THEN 'Il club ti invita a compilare il modulo di iscrizione:'
      WHEN 'form_button' THEN 'Compila il modulo'
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
      WHEN 'form_subject' THEN 'Formulario de inscripción'
      WHEN 'form_body' THEN 'El club te invita a rellenar el formulario de inscripción:'
      WHEN 'form_button' THEN 'Rellenar el formulario'
    END
  END
$$;

CREATE OR REPLACE FUNCTION public.send_enrollment_form(_form_id UUID, _emails TEXT[], _language TEXT DEFAULT 'es')
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  f RECORD;
  e TEXT;
  l TEXT;
  sent INT := 0;
  url TEXT;
BEGIN
  SELECT ef.*, c.name AS club_name INTO f
  FROM public.enrollment_forms ef JOIN public.clubs c ON c.id = ef.club_id
  WHERE ef.id = _form_id;
  IF NOT FOUND OR NOT public.is_club_director(auth.uid(), f.club_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF cardinality(_emails) > 500 THEN RAISE EXCEPTION 'too_many'; END IF;
  url := 'https://www.topvolleymanager.com/inscripcion/' || f.slug;

  FOREACH e IN ARRAY (SELECT array_agg(DISTINCT lower(trim(x))) FROM unnest(_emails) x) LOOP
    IF e IS NULL OR e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN CONTINUE; END IF;
    SELECT language INTO l FROM public.enrollments
    WHERE club_id = f.club_id AND guardian_email = e ORDER BY created_at DESC LIMIT 1;
    l := coalesce(l, CASE WHEN _language IN ('es', 'en', 'it') THEN _language ELSE 'es' END);
    PERFORM public.fee_send_email(e,
      public.fee_text(l, 'form_subject') || ' · ' || f.club_name,
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">'
        || '<h2 style="margin:0 0 12px">' || f.club_name || '</h2>'
        || '<p>' || public.fee_text(l, 'form_body') || ' <b>' || f.title || '</b></p>'
        || '<p><a href="' || url || '" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">'
        || public.fee_text(l, 'form_button') || '</a></p>'
        || '<p style="color:#555;font-size:12px">' || url || '</p></div>',
      'enrollment_form', 'enrollment-form-' || f.id || '-' || e || '-' || to_char(now(), 'YYYYMMDDHH24MI'));
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_enrollment_form(UUID, TEXT[], TEXT) TO authenticated;
