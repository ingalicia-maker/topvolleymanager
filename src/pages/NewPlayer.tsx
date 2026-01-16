import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronUp, History } from 'lucide-react';

type PhoneType = 'player' | 'parent' | 'tutor';

// Phone validation: requires + prefix for international format
const validatePhone = (phone: string, t: (key: string) => string): { isValid: boolean; error?: string } => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return { isValid: false, error: t('players.phoneRequired') };
  
  if (!cleaned.startsWith('+')) {
    return { isValid: false, error: t('players.addCountryPrefix') };
  }
  
  // At least 8 digits after the +
  if (cleaned.length < 9) {
    return { isValid: false, error: t('players.numberTooShort') };
  }
  
  return { isValid: true };
};

export default function NewPlayer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const preselectedTeam = searchParams.get('team');
  
  const { addPlayer } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { assignedTeams, isDirector, loading: roleLoading } = useUserRole();

  // Filter teams for coaches - they can only add players to their assigned teams
  const visibleTeams = useMemo(() => {
    if (isDirector) return teams;
    if (assignedTeams.length === 0) return [];
    return teams.filter(t => assignedTeams.includes(t.id));
  }, [isDirector, assignedTeams, teams]);
  
  const [name, setName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneType, setPhoneType] = useState<PhoneType>('player');
  const [phone2, setPhone2] = useState('');
  const [phone2Type, setPhone2Type] = useState<PhoneType>('parent');
  const [showPhone2, setShowPhone2] = useState(false);
  const [number, setNumber] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [heightMeasuredAt, setHeightMeasuredAt] = useState(format(new Date(), 'yyyy-MM'));
  const [additionalMeasurements, setAdditionalMeasurements] = useState<Array<{type: string, value: string, measured_at: string}>>([]);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [customMeasurementName, setCustomMeasurementName] = useState('');
  const [expandedMeasurementTypes, setExpandedMeasurementTypes] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    preselectedTeam ? [preselectedTeam] : []
  );
  const [loading, setLoading] = useState(false);

  const phoneTypeLabels: Record<PhoneType, string> = {
    player: t('players.phoneTypePlayer'),
    parent: t('players.phoneTypeParent'),
    tutor: t('players.phoneTypeTutor'),
  };

  const measurementSuggestions = [
    { key: 'reach1Hand', label: t('players.reach1Hand') },
    { key: 'verticalJump', label: t('players.verticalJump') },
    { key: 'blockJump', label: t('players.blockJump') },
  ];

  // Group measurements by type for history view
  const groupedMeasurements = useMemo(() => {
    const grouped: Record<string, Array<{value: string, measured_at: string, index: number}>> = {};
    additionalMeasurements.forEach((m, index) => {
      if (!grouped[m.type]) {
        grouped[m.type] = [];
      }
      grouped[m.type].push({ value: m.value, measured_at: m.measured_at, index });
    });
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
    });
    return grouped;
  }, [additionalMeasurements]);

  const toggleMeasurementType = (type: string) => {
    setExpandedMeasurementTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const handleAddMeasurement = (type: string) => {
    if (!type.trim()) return;
    setAdditionalMeasurements(prev => [...prev, { type: type.trim(), value: '', measured_at: format(new Date(), 'yyyy-MM') }]);
    setShowAddMeasurement(false);
    setCustomMeasurementName('');
  };

  const handleUpdateMeasurement = (index: number, field: 'value' | 'measured_at', value: string) => {
    setAdditionalMeasurements(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleRemoveMeasurement = (index: number) => {
    setAdditionalMeasurements(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEntryToType = (type: string) => {
    setAdditionalMeasurements(prev => [...prev, { type, value: '', measured_at: format(new Date(), 'yyyy-MM') }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(t('auth.nameRequired'));
      return;
    }
    
    const phoneValidation = validatePhone(phone, t);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error);
      return;
    }
    
    if (phone2.trim()) {
      const phone2Validation = validatePhone(phone2, t);
      if (!phone2Validation.isValid) {
        toast.error(t('players.secondPhoneError', { error: phone2Validation.error }));
        return;
      }
    }
    
    if (selectedTeams.length === 0) {
      toast.error(t('players.selectAtLeastOneTeam'));
      return;
    }

    setLoading(true);
    const result = await addPlayer({
      name: name.trim(),
      surname1: surname1.trim() || null,
      surname2: surname2.trim() || null,
      phone: phone.trim(),
      phone_type: phoneType,
      phone2: phone2.trim() || null,
      phone2_type: phone2.trim() ? phone2Type : null,
      teams: selectedTeams,
      number: number ? parseInt(number) : null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      height: height ? parseInt(height) : null,
      height_measured_at: height ? heightMeasuredAt : null,
      additional_measurements: additionalMeasurements.filter(m => m.value),
      photo_url: null,
    } as any);

    if (result) {
      setName('');
      setSurname1('');
      setSurname2('');
      setPhone('');
      setPhoneType('player');
      setPhone2('');
      setPhone2Type('parent');
      setShowPhone2(false);
      setNumber('');
      setBirthYear('');
      setHeight('');
      setHeightMeasuredAt(format(new Date(), 'yyyy-MM'));
      setAdditionalMeasurements([]);
      setSelectedTeams(preselectedTeam ? [preselectedTeam] : []);
      toast.success(t('players.playerSaved'), {
        action: {
          label: t('players.goHome'),
          onClick: () => navigate('/'),
        },
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('players.newPlayer')} showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-2">
          <Label htmlFor="name">{t('players.name')} *</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('players.name')}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="surname1">{t('players.surname1')}</Label>
            <Input
              id="surname1"
              value={surname1}
              onChange={e => setSurname1(e.target.value)}
              placeholder={t('players.optional')}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname2">{t('players.surname2')}</Label>
            <Input
              id="surname2"
              value={surname2}
              onChange={e => setSurname2(e.target.value)}
              placeholder={t('players.optional')}
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone with Type */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">{t('players.phoneWhatsApp')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                disabled={loading}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              {(['player', 'parent', 'tutor'] as PhoneType[]).map(type => (
                <Button
                  key={type}
                  type="button"
                  variant={phoneType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhoneType(type)}
                  disabled={loading}
                  className="flex-1 text-xs"
                >
                  {phoneTypeLabels[type]}
                </Button>
              ))}
            </div>

            {/* Second Phone */}
            {!showPhone2 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPhone2(true)}
                disabled={loading}
                className="w-full text-muted-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('players.addSecondPhone')}
              </Button>
            ) : (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex gap-2 items-center">
                  <Input
                    type="tel"
                    value={phone2}
                    onChange={e => setPhone2(e.target.value)}
                    placeholder={t('players.secondPhone')}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowPhone2(false);
                      setPhone2('');
                    }}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  {(['player', 'parent', 'tutor'] as PhoneType[]).map(type => (
                    <Button
                      key={type}
                      type="button"
                      variant={phone2Type === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPhone2Type(type)}
                      disabled={loading}
                      className="flex-1 text-xs"
                    >
                      {phoneTypeLabels[type]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">{t('players.jerseyNumber')}</Label>
            <Input
              id="number"
              type="number"
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="7"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthYear">{t('players.birthYearShort')}</Label>
            <Input
              id="birthYear"
              type="number"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="2010"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">{t('players.heightCm')}</Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="165"
              disabled={loading}
            />
          </div>
        </div>

        {/* Height Measurement Date */}
        {height && (
          <div className="space-y-2">
            <Label htmlFor="heightMeasuredAt">{t('players.heightMeasurementDate')}</Label>
            <Input
              id="heightMeasuredAt"
              type="month"
              value={heightMeasuredAt}
              onChange={e => setHeightMeasuredAt(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* Additional Measurements */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('players.additionalMeasurements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {/* Grouped measurements by type */}
            {Object.entries(groupedMeasurements).map(([type, entries]) => (
              <div key={type} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => toggleMeasurementType(type)}
                >
                  <span className="font-medium text-sm">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {entries[0]?.value} cm ({entries.length} {entries.length === 1 ? t('players.entry') : t('players.entries')})
                    </span>
                    {expandedMeasurementTypes.has(type) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>
                
                {expandedMeasurementTypes.has(type) && (
                  <div className="p-3 space-y-2 border-t">
                    {entries.map((entry) => (
                      <div key={entry.index} className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={entry.value}
                          onChange={e => handleUpdateMeasurement(entry.index, 'value', e.target.value)}
                          placeholder="Valor (cm)"
                          className="w-24"
                          disabled={loading}
                        />
                        <Input
                          type="month"
                          value={entry.measured_at}
                          onChange={e => handleUpdateMeasurement(entry.index, 'measured_at', e.target.value)}
                          className="flex-1"
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMeasurement(entry.index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddEntryToType(type)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('players.addEntry')}
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Add new measurement type */}
            {!showAddMeasurement ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddMeasurement(true)}
                disabled={loading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('players.addMeasurementType')}
              </Button>
            ) : (
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">{t('players.selectOrWriteType')}</Label>
                <div className="flex flex-wrap gap-2">
                  {measurementSuggestions.map(suggestion => (
                    <Button
                      key={suggestion.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMeasurement(suggestion.label)}
                      disabled={loading || Object.keys(groupedMeasurements).includes(suggestion.label)}
                    >
                      {suggestion.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customMeasurementName}
                    onChange={e => setCustomMeasurementName(e.target.value)}
                    placeholder={t('players.customName')}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddMeasurement(customMeasurementName)}
                    disabled={loading || !customMeasurementName.trim()}
                  >
                    {t('common.add')}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddMeasurement(false);
                    setCustomMeasurementName('');
                  }}
                  className="w-full"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teams */}
        <div className="space-y-3">
          <Label>{t('teams.title')} *</Label>
          {teamsLoading || roleLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : visibleTeams.length === 0 ? (
            isDirector ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('teams.noTeamsYet')}
                  </p>
                  <Button onClick={() => navigate('/teams')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('teams.createFirst')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('teams.noTeamsAssigned')}
                  </p>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="space-y-2">
              {visibleTeams.map(team => (
                <label
                  key={team.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTeams.includes(team.id)}
                    onCheckedChange={() => toggleTeam(team.id)}
                    disabled={loading}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{team.name}</p>
                    <p className="text-sm text-muted-foreground">Coach: {team.coach}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('players.saving') : t('players.savePlayer')}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
