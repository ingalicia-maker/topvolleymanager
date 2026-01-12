import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export function CoachTeamSelector() {
  const { t } = useTranslation();
  const { teams } = useTeams();
  const { assignedTeams, updateAssignedTeams, isDirector } = useUserRole();
  const [open, setOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Directors don't need this component - they see all teams
  if (isDirector) return null;

  const handleOpen = () => {
    setSelectedTeams([...assignedTeams]);
    setOpen(true);
  };

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (selectedTeams.length === 0) {
      toast.error(t('teams.selectAtLeastOne'));
      return;
    }
    
    setSaving(true);
    const success = await updateAssignedTeams(selectedTeams);
    setSaving(false);
    
    if (success) {
      toast.success(t('teams.teamsUpdated'));
      setOpen(false);
    } else {
      toast.error(t('common.error'));
    }
  };

  const assignedTeamNames = teams
    .filter(t => assignedTeams.includes(t.id))
    .map(t => t.name);

  return (
    <>
      <Card className="shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">{t('teams.myTeams')}</h3>
              </div>
              {assignedTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('teams.noTeamsAssigned')}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignedTeamNames.map((name, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleOpen}
              className="shrink-0"
            >
              {t('common.configure')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('teams.selectYourTeams')}</DialogTitle>
            <DialogDescription>
              {t('teams.selectTeamsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('teams.noTeamsAvailable')}
              </p>
            ) : (
              teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => handleToggleTeam(team.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTeams.includes(team.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Checkbox 
                    checked={selectedTeams.includes(team.id)}
                    onCheckedChange={() => handleToggleTeam(team.id)}
                  />
                  <div 
                    className="h-3 w-3 rounded-full shrink-0" 
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{team.coach}</p>
                  </div>
                  {selectedTeams.includes(team.id) && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
