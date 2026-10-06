import { useCallback, useEffect, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from './useClub';

// The fee tables are newer than the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Frequency = 'once' | 'monthly' | 'quarterly' | 'yearly';

export interface FeeSettings {
  club_id: string;
  currency: string;
  auto_reminders: boolean;
  remind_days_before: number;
  remind_every_days: number;
  contact_email: string | null;
}

export interface FeePlan {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  amount: number;
  frequency: Frequency;
  installments: number;
  first_due_date: string | null;
  payment_link: string | null;
  active: boolean;
  sort_order: number;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface EnrollmentForm {
  id: string;
  club_id: string;
  slug: string;
  title: string;
  intro: string | null;
  fields: FormField[];
  plan_ids: string[];
  is_open: boolean;
}

export interface Enrollment {
  id: string;
  club_id: string;
  form_id: string | null;
  plan_id: string | null;
  player_id: string | null;
  player_name: string;
  player_birth_date: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  language: string;
  answers: Record<string, string | boolean>;
  status: 'pending' | 'active' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export interface FeeCharge {
  id: string;
  club_id: string;
  enrollment_id: string;
  plan_id: string | null;
  concept: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'waived';
  paid_at: string | null;
  payment_method: string | null;
  note: string | null;
  reminders_sent: number;
  last_reminder_at: string | null;
}

export const DEFAULT_SETTINGS: Omit<FeeSettings, 'club_id'> = {
  currency: 'EUR',
  auto_reminders: false,
  remind_days_before: 3,
  remind_every_days: 7,
  contact_email: null,
};

const MONTHS_BETWEEN: Record<Frequency, number> = { once: 0, monthly: 1, quarterly: 3, yearly: 12 };

/** Payments of a plan for one enrolment: one per instalment, spaced by the plan frequency. */
export function chargesForPlan(plan: FeePlan, enrollment: Enrollment, from = new Date()) {
  const count = plan.frequency === 'once' ? 1 : plan.installments;
  const first = plan.first_due_date ? new Date(plan.first_due_date) : from;
  return Array.from({ length: count }, (_, i) => ({
    club_id: enrollment.club_id,
    enrollment_id: enrollment.id,
    plan_id: plan.id,
    concept: count > 1 ? `${plan.name} (${i + 1}/${count})` : plan.name,
    amount: plan.amount,
    due_date: format(addMonths(first, i * MONTHS_BETWEEN[plan.frequency]), 'yyyy-MM-dd'),
  }));
}

export const isOverdue = (c: FeeCharge) => c.status === 'pending' && c.due_date < format(new Date(), 'yyyy-MM-dd');

export function useClubFees() {
  const { club } = useClub();
  const clubId = club?.id ?? null;
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [forms, setForms] = useState<EnrollmentForm[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [charges, setCharges] = useState<FeeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const [s, p, f, e, c] = await Promise.all([
      db.from('club_fee_settings').select('*').eq('club_id', clubId).maybeSingle(),
      db.from('fee_plans').select('*').eq('club_id', clubId).order('sort_order').order('name'),
      db.from('enrollment_forms').select('*').eq('club_id', clubId).order('created_at'),
      db.from('enrollments').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      db.from('fee_charges').select('*').eq('club_id', clubId).order('due_date'),
    ]);
    const failed = [s, p, f, e, c].find(r => r.error);
    setError(failed ? failed.error.message : null);
    setSettings(s.data ?? { club_id: clubId, ...DEFAULT_SETTINGS });
    setPlans(p.data ?? []);
    setForms(f.data ?? []);
    setEnrollments(e.data ?? []);
    setCharges((c.data ?? []).map((x: FeeCharge) => ({ ...x, amount: Number(x.amount) })));
    setLoading(false);
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (values: Partial<FeeSettings>) => {
    const { error } = await db.from('club_fee_settings')
      .upsert({ ...DEFAULT_SETTINGS, ...settings, ...values, club_id: clubId, updated_at: new Date().toISOString() });
    if (error) throw error;
    await load();
  };

  const savePlan = async (plan: Partial<FeePlan>) => {
    const { error } = plan.id
      ? await db.from('fee_plans').update(plan).eq('id', plan.id)
      : await db.from('fee_plans').insert({ ...plan, club_id: clubId });
    if (error) throw error;
    await load();
  };

  const deletePlan = async (id: string) => {
    const { error } = await db.from('fee_plans').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  const saveForm = async (form: Partial<EnrollmentForm>) => {
    const values = { ...form, updated_at: new Date().toISOString() };
    const { error } = form.id
      ? await db.from('enrollment_forms').update(values).eq('id', form.id)
      : await db.from('enrollment_forms').insert({ ...values, club_id: clubId });
    if (error) throw error;
    await load();
  };

  const deleteForm = async (id: string) => {
    const { error } = await db.from('enrollment_forms').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  const saveEnrollment = async (enrollment: Partial<Enrollment>) => {
    const { error } = enrollment.id
      ? await db.from('enrollments').update(enrollment).eq('id', enrollment.id)
      : await db.from('enrollments').insert({ ...enrollment, club_id: clubId });
    if (error) throw error;
    await load();
  };

  /** Accepts an enrolment and creates its payments from the chosen plan (unless it has some already). */
  const activateEnrollment = async (enrollment: Enrollment, planId: string | null) => {
    const { error } = await db.from('enrollments').update({ status: 'active', plan_id: planId }).eq('id', enrollment.id);
    if (error) throw error;
    const plan = plans.find(p => p.id === planId);
    const hasCharges = charges.some(c => c.enrollment_id === enrollment.id);
    if (plan && !hasCharges) {
      const { error: chargeError } = await db.from('fee_charges').insert(chargesForPlan(plan, { ...enrollment, plan_id: planId }));
      if (chargeError) throw chargeError;
    }
    await load();
  };

  const deleteEnrollment = async (id: string) => {
    const { error } = await db.from('enrollments').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  const saveCharge = async (charge: Partial<FeeCharge>) => {
    const { error } = charge.id
      ? await db.from('fee_charges').update(charge).eq('id', charge.id)
      : await db.from('fee_charges').insert({ ...charge, club_id: clubId });
    if (error) throw error;
    await load();
  };

  const deleteCharge = async (id: string) => {
    const { error } = await db.from('fee_charges').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  const markPaid = async (ids: string[], method: string) => {
    const { error } = await db.from('fee_charges')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: method }).in('id', ids);
    if (error) throw error;
    await load();
  };

  /** Queues reminder emails; returns how many were sent. */
  const sendReminders = async (ids: string[]): Promise<number> => {
    const { data, error } = await db.rpc('send_fee_reminders', { _charge_ids: ids });
    if (error) throw error;
    await load();
    return data ?? 0;
  };

  return {
    clubId, clubName: club?.name ?? '', settings, plans, forms, enrollments, charges, loading, error, reload: load,
    saveSettings, savePlan, deletePlan, saveForm, deleteForm, saveEnrollment, activateEnrollment, deleteEnrollment,
    saveCharge, deleteCharge, markPaid, sendReminders,
  };
}
