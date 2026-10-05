import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { usePlayers } from '@/hooks/usePlayers';
import { daysUntilBirthday, birthdayLabel } from '@/lib/dateLocale';

const titles: Record<string, string> = { es: 'Próximos cumpleaños', en: 'Upcoming birthdays', it: 'Prossimi compleanni' };
const coachWord: Record<string, string> = { es: 'Entrenador/a', en: 'Coach', it: 'Allenatore' };

export function UpcomingBirthdays({ teamIds, days = 14 }: { teamIds?: string[]; days?: number }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { players } = usePlayers();
  const { data: coaches = [] } = useQuery({
    queryKey: ['coach-birthdays'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id,name,birth_day,birth_month,assigned_teams');
      return (data || []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const inTeams = (ts: string[] | null) => !teamIds || (ts || []).some(t => teamIds.includes(t));
  const items = [
    ...players.filter(p => inTeams(p.teams)).map(p => ({ id: p.id, name: [p.name, p.surname1].filter(Boolean).join(' '), d: daysUntilBirthday(p.birth_day, p.birth_month), link: `/players/${p.id}`, coach: false })),
    ...coaches.filter(c => inTeams(c.assigned_teams)).map(c => ({ id: c.id, name: c.name, d: daysUntilBirthday(c.birth_day, c.birth_month), link: '', coach: true })),
  ].filter(i => i.d !== null && i.d <= days).sort((a, b) => a.d! - b.d!);

  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />{titles[lang] || titles.en}</h2>
      <Card><CardContent className="p-2 space-y-1">
        {items.map(i => {
          const row = (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <span className="text-sm font-medium truncate">🎂 {i.name}{i.coach && <span className="text-muted-foreground font-normal"> · {coachWord[lang] || coachWord.en}</span>}</span>
              <span className={i.d === 0 ? 'text-xs font-semibold text-pink-600' : 'text-xs text-muted-foreground'}>{birthdayLabel(i.d!, lang)}</span>
            </div>
          );
          return i.link ? <Link key={i.id} to={i.link}>{row}</Link> : <div key={i.id}>{row}</div>;
        })}
      </CardContent></Card>
    </section>
  );
}
