import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { usePlayerRatings, RATING_CATEGORIES, RatingCategoryKey } from '@/hooks/usePlayerRatings';
import { useSeasons } from '@/hooks/useSeasons';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { RatingInput } from '@/components/RatingInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Save, Trash2, MessageCircle, Camera, Loader2, Star, TrendingUp, TrendingDown, Minus, ChevronRight, Edit2, Calendar, Plus, History, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const RATING_EMOJIS: Record<string, string> = {
  effort_attitude: '💪',
  communication_cooperation: '🤝',
  technical_execution: '🏐',
  decision_making: '🧠',
  leadership_initiative: '⭐',
};

export default function PlayerDetail() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { players, updatePlayer, deletePlayer, loading } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { ratings, addRating, updateRating, deleteRating, refetch: refetchRatings } = usePlayerRatings();
  const { seasons } = useSeasons();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const player = players.find(p => p.id === playerId);
  
  // Use signed URL for player photo
  const { signedUrl: displayPhotoUrl } = useSignedUrl(player?.photo_url);

  const [name, setName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneType, setPhoneType] = useState<'player' | 'parent' | 'tutor'>('player');
  const [phone2, setPhone2] = useState('');
  const [phone2Type, setPhone2Type] = useState<'player' | 'parent' | 'tutor'>('player');
  const [number, setNumber] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [heightMeasuredAt, setHeightMeasuredAt] = useState('');
  const [additionalMeasurements, setAdditionalMeasurements] = useState<Array<{type: string, value: string, measured_at: string}>>([]);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [customMeasurementName, setCustomMeasurementName] = useState('');
  const [expandedMeasurementTypes, setExpandedMeasurementTypes] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [ratingTeamId, setRatingTeamId] = useState<string>('');
  const [ratingValues, setRatingValues] = useState<Record<RatingCategoryKey, number>>({
    effort_attitude: 5,
    communication_cooperation: 5,
    technical_execution: 5,
    decision_making: 5,
    leadership_initiative: 5,
  });
  const [ratingNotes, setRatingNotes] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [deletingRatingId, setDeletingRatingId] = useState<string | null>(null);

  // Measurement suggestions
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
    // Sort each group by date (newest first)
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

  const handleAddEntryToType = (type: string) => {
    setAdditionalMeasurements(prev => [...prev, { type, value: '', measured_at: format(new Date(), 'yyyy-MM') }]);
  };

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setSurname1(player.surname1 || '');
      setSurname2(player.surname2 || '');
      setPhone(player.phone || '');
      setPhoneType(((player as any).phone_type as 'player' | 'parent' | 'tutor') || 'player');
      setPhone2((player as any).phone2 || '');
      setPhone2Type(((player as any).phone2_type as 'player' | 'parent' | 'tutor') || 'player');
      setNumber(player.number?.toString() || '');
      setBirthYear(player.birth_year?.toString() || '');
      setHeight(player.height?.toString() || '');
      setHeightMeasuredAt((player as any).height_measured_at || '');
      const measurements = (player as any).additional_measurements;
      setAdditionalMeasurements(Array.isArray(measurements) ? measurements : []);
      setSelectedTeams(player.teams || []);
      setPhotoUrl(player.photo_url || null);
    }
  }, [player]);

  // Calculate player rating stats
  const ratingStats = useMemo(() => {
    if (!playerId) return null;
    
    const playerRatings = ratings.filter(r => r.player_id === playerId);
    if (playerRatings.length === 0) return null;

    // Group by month
    const byMonth: Record<string, typeof playerRatings> = {};
    playerRatings.forEach(r => {
      const monthKey = r.rating_date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(r);
    });

    const months = Object.keys(byMonth).sort();
    if (months.length === 0) return null;

    const latestMonth = months[months.length - 1];
    const prevMonth = months.length > 1 ? months[months.length - 2] : null;

    const calcAvg = (monthRatings: typeof playerRatings) => {
      const avgByCategory: Record<RatingCategoryKey, number> = {} as any;
      RATING_CATEGORIES.forEach(cat => {
        avgByCategory[cat.key] = monthRatings.reduce((acc, r) => acc + r[cat.key], 0) / monthRatings.length;
      });
      const totalAvg = Object.values(avgByCategory).reduce((a, b) => a + b, 0) / 5;
      return { avgByCategory, totalAvg };
    };

    const current = calcAvg(byMonth[latestMonth]);
    const previous = prevMonth ? calcAvg(byMonth[prevMonth]) : null;
    const trend = previous ? current.totalAvg - previous.totalAvg : 0;

    return {
      avgByCategory: current.avgByCategory,
      totalAvg: current.totalAvg,
      trend,
      ratingsCount: playerRatings.length,
      latestMonth,
    };
  }, [playerId, ratings]);

  const getTrendIcon = () => {
    if (!ratingStats || ratingStats.trend === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (ratingStats.trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-600';
    if (score <= 5) return 'text-amber-600';
    if (score <= 7) return 'text-blue-600';
    return 'text-green-600';
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  // Get player's teams for rating
  const playerTeamOptions = useMemo(() => {
    if (!player?.teams) return [];
    return teams.filter(t => player.teams?.includes(t.id));
  }, [player, teams]);

  // Open rating dialog
  const handleOpenRatingDialog = () => {
    if (playerTeamOptions.length > 0) {
      setRatingTeamId(playerTeamOptions[0].id);
    }
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
    setRatingValues({
      effort_attitude: 5,
      communication_cooperation: 5,
      technical_execution: 5,
      decision_making: 5,
      leadership_initiative: 5,
    });
    setRatingNotes('');
    setEditingRatingId(null);
    setRatingDialogOpen(true);
  };

  // Get ratings for selected month
  const ratingsForSelectedMonth = useMemo(() => {
    if (!playerId) return [];
    return ratings.filter(r => 
      r.player_id === playerId && 
      r.rating_date.startsWith(selectedMonth) &&
      (!ratingTeamId || r.team_id === ratingTeamId)
    );
  }, [playerId, ratings, selectedMonth, ratingTeamId]);

  // Edit existing rating
  const handleEditRating = (rating: any) => {
    setEditingRatingId(rating.id);
    setRatingValues({
      effort_attitude: rating.effort_attitude,
      communication_cooperation: rating.communication_cooperation,
      technical_execution: rating.technical_execution,
      decision_making: rating.decision_making,
      leadership_initiative: rating.leadership_initiative,
    });
    setRatingNotes(rating.notes || '');
    setRatingTeamId(rating.team_id);
  };

  // Delete rating
  const handleDeleteRating = async (ratingId: string) => {
    setDeletingRatingId(ratingId);
    const success = await deleteRating(ratingId);
    setDeletingRatingId(null);
    if (success) {
      refetchRatings();
    }
  };

  // Submit rating (new or update)
  const handleSubmitRating = async () => {
    if (!playerId || !ratingTeamId) {
      toast.error(t('ratings.selectTeam'));
      return;
    }

    setSubmittingRating(true);
    const activeSeason = seasons.find(s => s.is_active);
    
    let result;
    if (editingRatingId) {
      result = await updateRating(editingRatingId, {
        ...ratingValues,
        notes: ratingNotes || undefined,
        rating_date: `${selectedMonth}-15`,
      });
    } else {
      result = await addRating({
        player_id: playerId,
        team_id: ratingTeamId,
        ...ratingValues,
        notes: ratingNotes || undefined,
        rating_date: `${selectedMonth}-15`,
      }, activeSeason?.id);
    }

    setSubmittingRating(false);

    if (result) {
      setEditingRatingId(null);
      refetchRatings();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playerId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}-${Date.now()}.${fileExt}`;

      // Delete old photo if exists
      if (photoUrl) {
        const oldPath = photoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('player-photos').remove([oldPath]);
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store only the file path (not full URL) for signed URL generation
      setPhotoUrl(fileName);
      toast.success('Foto subida correctamente');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl) return;

    try {
      // Handle both full URLs (legacy) and file paths (new)
      let fileName = photoUrl;
      if (photoUrl.includes('/')) {
        fileName = photoUrl.split('/').pop() || photoUrl;
      }
      if (fileName) {
        await supabase.storage.from('player-photos').remove([fileName]);
      }
      setPhotoUrl(null);
      toast.success('Foto eliminada');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error al eliminar la foto');
    }
  };

  const handleSave = async () => {
    if (!playerId) return;

    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }
    if (selectedTeams.length === 0) {
      toast.error('Selecciona al menos un equipo');
      return;
    }

    setSaving(true);
    const success = await updatePlayer(playerId, {
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
      height_measured_at: heightMeasuredAt || null,
      additional_measurements: additionalMeasurements,
      photo_url: photoUrl,
    } as any);

    if (success) {
      navigate(-1);
    }
    setSaving(false);
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

  const handleDelete = async () => {
    if (!playerId) return;

    // Delete photo if exists
    if (photoUrl) {
      const fileName = photoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('player-photos').remove([fileName]);
      }
    }

    const success = await deletePlayer(playerId);
    if (success) {
      navigate('/players');
    }
  };

  const handleWhatsApp = () => {
    if (player?.phone) {
      const phoneNumber = player.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Cargando..." showBack />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Jugadora no encontrada" showBack />
        <BottomNav />
      </div>
    );
  }

  const fullName = [player.name, player.surname1, player.surname2]
    .filter(Boolean)
    .join(' ');

  const initials = player.name.charAt(0).toUpperCase() + (player.surname1?.charAt(0).toUpperCase() || '');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Editar Jugadora" showBack />

      <div className="p-4 space-y-4">
        {/* Player Header with Photo */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayPhotoUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                  {player.number ? `#${player.number}` : initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{fullName}</h2>
              {player.birth_year && (
                <p className="text-sm text-muted-foreground">Nacida en {player.birth_year}</p>
              )}
              {photoUrl && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive p-0 h-auto text-xs"
                  onClick={handleRemovePhoto}
                >
                  Eliminar foto
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={handleWhatsApp}>
              <MessageCircle className="h-5 w-5 text-green-600" />
            </Button>
          </CardContent>
        </Card>

        {/* Ratings Summary Card */}
        <Card 
          className="shadow-lg hover:shadow-xl transition-all cursor-pointer border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-amber-500/10"
          onClick={handleOpenRatingDialog}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">{t('nav.ratings')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {ratingStats && (
                  <>
                    {getTrendIcon()}
                    <span className={`text-xl font-bold ${getScoreColor(ratingStats.totalAvg)}`}>
                      {ratingStats.totalAvg.toFixed(1)}
                    </span>
                  </>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            {ratingStats ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {RATING_CATEGORIES.map(cat => (
                    <Badge
                      key={cat.key}
                      variant="outline"
                      className={`text-xs ${getScoreColor(ratingStats.avgByCategory[cat.key])}`}
                    >
                      {RATING_EMOJIS[cat.key]} {ratingStats.avgByCategory[cat.key].toFixed(1)}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ratingStats.ratingsCount} {t('ratings.registered')}
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-2">{t('ratings.noRatings')}</p>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  {t('ratings.clickToRate')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                {t('ratings.ratePlayer')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Month Selector */}
              <div className="space-y-2">
                <Label>{t('ratings.selectMonth')}</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Selector (if player has multiple teams) */}
              {playerTeamOptions.length > 1 && (
                <div className="space-y-2">
                  <Label>{t('teams.title')}</Label>
                  <Select value={ratingTeamId} onValueChange={setRatingTeamId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {playerTeamOptions.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Previous Ratings for Selected Month */}
              {ratingsForSelectedMonth.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('ratings.previousRatings')}
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {ratingsForSelectedMonth.map(rating => {
                      const avgScore = (rating.effort_attitude + rating.communication_cooperation + 
                        rating.technical_execution + rating.decision_making + rating.leadership_initiative) / 5;
                      const isEditing = editingRatingId === rating.id;
                      return (
                        <div 
                          key={rating.id} 
                          className={`flex items-center justify-between p-2 rounded-lg border ${isEditing ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getScoreColor(avgScore)}>
                                {avgScore.toFixed(1)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(rating.rating_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            {rating.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                                {rating.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditRating(rating)}
                              disabled={isEditing}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteRating(rating.id)}
                              disabled={deletingRatingId === rating.id}
                            >
                              {deletingRatingId === rating.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rating Inputs */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {editingRatingId ? t('ratings.editRating') : t('ratings.newRating')}
                  </span>
                  {editingRatingId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRatingId(null);
                        setRatingValues({
                          effort_attitude: 5,
                          communication_cooperation: 5,
                          technical_execution: 5,
                          decision_making: 5,
                          leadership_initiative: 5,
                        });
                        setRatingNotes('');
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                </div>
                {RATING_CATEGORIES.map(cat => (
                  <RatingInput
                    key={cat.key}
                    label={cat.shortLabel}
                    emoji={RATING_EMOJIS[cat.key]}
                    value={ratingValues[cat.key]}
                    onChange={(val) => setRatingValues(prev => ({ ...prev, [cat.key]: val }))}
                  />
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t('ratings.notes')} ({t('common.optional')})</Label>
                <Textarea
                  value={ratingNotes}
                  onChange={(e) => setRatingNotes(e.target.value)}
                  placeholder={t('ratings.notesPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitRating} 
                className="w-full gap-2"
                disabled={submittingRating || !ratingTeamId}
              >
                {submittingRating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
                {submittingRating ? t('common.loading') : (editingRatingId ? t('ratings.updateRating') : t('ratings.saveRating'))}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surname1">Primer Apellido</Label>
                <Input
                  id="surname1"
                  value={surname1}
                  onChange={e => setSurname1(e.target.value)}
                  placeholder="Opcional"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname2">Segundo Apellido</Label>
                <Input
                  id="surname2"
                  value={surname2}
                  onChange={e => setSurname2(e.target.value)}
                  placeholder="Opcional"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Phone 1 with type */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('players.phone')} (WhatsApp) *</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  disabled={saving}
                  className="flex-1"
                />
                <Select value={phoneType} onValueChange={(v) => setPhoneType(v as 'player' | 'parent' | 'tutor')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">{t('players.phonePlayer')}</SelectItem>
                    <SelectItem value="parent">{t('players.phoneParent')}</SelectItem>
                    <SelectItem value="tutor">{t('players.phoneTutor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Phone 2 (optional) with type */}
            <div className="space-y-2">
              <Label htmlFor="phone2">{t('players.phone2')} ({t('common.optional')})</Label>
              <div className="flex gap-2">
                <Input
                  id="phone2"
                  type="tel"
                  value={phone2}
                  onChange={e => setPhone2(e.target.value)}
                  placeholder="+34 600 000 000"
                  disabled={saving}
                  className="flex-1"
                />
                <Select value={phone2Type} onValueChange={(v) => setPhone2Type(v as 'player' | 'parent' | 'tutor')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">{t('players.phonePlayer')}</SelectItem>
                    <SelectItem value="parent">{t('players.phoneParent')}</SelectItem>
                    <SelectItem value="tutor">{t('players.phoneTutor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Nº Camiseta</Label>
                <Input
                  id="number"
                  type="number"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="Ej: 7"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthYear">Año Nac.</Label>
                <Input
                  id="birthYear"
                  type="number"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder="2010"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="165"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Height measurement date */}
            <div className="space-y-2">
              <Label htmlFor="heightMeasuredAt">{t('players.heightMeasuredAt')}</Label>
              <Input
                id="heightMeasuredAt"
                type="month"
                value={heightMeasuredAt}
                onChange={e => setHeightMeasuredAt(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* Additional Measurements with History */}
            <div className="space-y-3">
              {Object.keys(groupedMeasurements).length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t('players.otherMeasurements')}
                  </Label>
                  {Object.entries(groupedMeasurements).map(([type, entries]) => {
                    const isExpanded = expandedMeasurementTypes.has(type);
                    const latestEntry = entries[0];
                    const hasHistory = entries.length > 1;
                    
                    // Calculate trend if there's history
                    let trendValue: number | null = null;
                    if (hasHistory && entries[0].value && entries[1].value) {
                      const latest = parseFloat(entries[0].value.replace(/[^\d.,]/g, '').replace(',', '.'));
                      const previous = parseFloat(entries[1].value.replace(/[^\d.,]/g, '').replace(',', '.'));
                      if (!isNaN(latest) && !isNaN(previous)) {
                        trendValue = latest - previous;
                      }
                    }
                    
                    return (
                      <div key={type} className="border rounded-lg overflow-hidden">
                        {/* Header with latest value */}
                        <div 
                          className={`p-3 bg-muted/30 flex items-center justify-between ${hasHistory ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                          onClick={() => hasHistory && toggleMeasurementType(type)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{type}</span>
                              {hasHistory && (
                                <Badge variant="secondary" className="text-xs">
                                  {entries.length} {t('players.measurementEntries')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-semibold text-primary">
                                {latestEntry.value || '-'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({latestEntry.measured_at})
                              </span>
                              {trendValue !== null && trendValue !== 0 && (
                                <span className={`text-xs flex items-center gap-0.5 ${trendValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {trendValue > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddEntryToType(type);
                              }}
                              disabled={saving}
                              title={t('players.addNewEntry')}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            {hasHistory && (
                              isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded history */}
                        {isExpanded && (
                          <div className="p-2 space-y-2 border-t bg-background">
                            <Label className="text-xs text-muted-foreground px-1">{t('players.measurementHistory')}</Label>
                            {entries.map((entry, idx) => (
                              <div key={entry.index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                                <div className="flex-1 flex gap-2">
                                  <Input
                                    value={entry.value}
                                    onChange={(e) => handleUpdateMeasurement(entry.index, 'value', e.target.value)}
                                    placeholder="Ej: 285 cm"
                                    disabled={saving}
                                    className="flex-1"
                                  />
                                  <Input
                                    type="month"
                                    value={entry.measured_at}
                                    onChange={(e) => handleUpdateMeasurement(entry.index, 'measured_at', e.target.value)}
                                    disabled={saving}
                                    className="w-[140px]"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveMeasurement(entry.index)}
                                  disabled={saving}
                                  className="text-destructive h-8 w-8"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Single entry edit (when not expanded) */}
                        {!hasHistory && (
                          <div className="p-2 border-t bg-background">
                            <div className="flex items-center gap-2">
                              <Input
                                value={latestEntry.value}
                                onChange={(e) => handleUpdateMeasurement(latestEntry.index, 'value', e.target.value)}
                                placeholder="Ej: 285 cm"
                                disabled={saving}
                                className="flex-1"
                              />
                              <Input
                                type="month"
                                value={latestEntry.measured_at}
                                onChange={(e) => handleUpdateMeasurement(latestEntry.index, 'measured_at', e.target.value)}
                                disabled={saving}
                                className="w-[140px]"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMeasurement(latestEntry.index)}
                                disabled={saving}
                                className="text-destructive h-8 w-8"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!showAddMeasurement ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMeasurement(true)}
                  disabled={saving}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {t('players.addOtherMeasurements')}
                </Button>
              ) : (
                <div className="p-3 border rounded-lg space-y-3">
                  <Label className="text-sm font-medium">{t('players.addMeasurement')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {measurementSuggestions.map(suggestion => (
                      <Button
                        key={suggestion.key}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddMeasurement(suggestion.label)}
                        disabled={saving}
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Custom measurement option */}
                  <div className="pt-2 border-t space-y-2">
                    <Label className="text-sm text-muted-foreground">{t('players.customMeasurement')}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customMeasurementName}
                        onChange={(e) => setCustomMeasurementName(e.target.value)}
                        placeholder={t('players.customMeasurementPlaceholder')}
                        disabled={saving}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customMeasurementName.trim()) {
                            handleAddMeasurement(customMeasurementName);
                          }
                        }}
                      />
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAddMeasurement(customMeasurementName)}
                        disabled={saving || !customMeasurementName.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button
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
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipos *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.map(team => (
              <label
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                  disabled={saving}
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
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
                Eliminar Jugadora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar jugadora?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará a {fullName} de forma permanente. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
