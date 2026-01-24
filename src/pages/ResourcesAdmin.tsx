import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Edit, 
  Eye, 
  Plus,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useResources, 
  useCreateResource, 
  useUpdateResource, 
  useDeleteResource,
  uploadResourceFile,
  getResourcePublicUrl,
  Resource
} from '@/hooks/useResources';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'guide', label: 'Guía' },
  { value: 'template', label: 'Plantilla' },
  { value: 'ebook', label: 'eBook' },
  { value: 'checklist', label: 'Checklist' },
];

const ICONS = [
  { value: 'FileText', label: 'Documento' },
  { value: 'BookOpen', label: 'Libro' },
  { value: 'ClipboardList', label: 'Checklist' },
  { value: 'Calendar', label: 'Calendario' },
  { value: 'Users', label: 'Usuarios' },
  { value: 'Trophy', label: 'Trofeo' },
];

export default function ResourcesAdmin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: resources, isLoading } = useResources();
  const { subscription, loading: isLoadingAdmin } = useSubscription();
  const isAppAdmin = subscription.isAdmin;
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('guide');
  const [icon, setIcon] = useState('FileText');
  const [isPublished, setIsPublished] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFilePath, setExistingFilePath] = useState('');
  const [existingFileName, setExistingFileName] = useState('');
  
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'it': return it;
      default: return enUS;
    }
  };
  
  // Redirect non-admins
  if (!isLoadingAdmin && !isAppAdmin) {
    navigate('/');
    return null;
  }
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('guide');
    setIcon('FileText');
    setIsPublished(false);
    setSelectedFile(null);
    setExistingFilePath('');
    setExistingFileName('');
    setEditingResource(null);
  };
  
  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setTitle(resource.title);
    setDescription(resource.description || '');
    setCategory(resource.category);
    setIcon(resource.icon || 'FileText');
    setIsPublished(resource.is_published);
    setExistingFilePath(resource.file_path);
    setExistingFileName(resource.file_name);
    setSelectedFile(null);
    setIsDialogOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    
    if (!editingResource && !selectedFile) {
      toast.error('Debes seleccionar un archivo');
      return;
    }
    
    setIsUploading(true);
    
    try {
      let filePath = existingFilePath;
      let fileName = existingFileName;
      let fileSize = editingResource?.file_size || null;
      
      if (selectedFile) {
        const uploaded = await uploadResourceFile(selectedFile);
        filePath = uploaded.path;
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
      }
      
      const resourceData = {
        title,
        description: description || null,
        category,
        icon,
        is_published: isPublished,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
      };
      
      if (editingResource) {
        await updateResource.mutateAsync({ id: editingResource.id, ...resourceData });
      } else {
        await createResource.mutateAsync(resourceData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Error al guardar el recurso');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteResource.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };
  
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  if (isLoading || isLoadingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Gestión de Recursos" showBack />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {resources?.length || 0} recursos
          </p>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Recurso
          </Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead className="text-center">Descargas</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources?.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORIES.find(c => c.value === resource.category)?.label || resource.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]">
                        {resource.file_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(resource.file_size)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      {resource.download_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {resource.is_published ? (
                      <Badge className="bg-primary text-primary-foreground">Publicado</Badge>
                    ) : (
                      <Badge variant="outline">Borrador</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(resource.updated_at), 'dd MMM yyyy', { locale: getLocale() })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(getResourcePublicUrl(resource.file_path), '_blank')}
                        title="Ver archivo"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(resource)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(resource.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!resources || resources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay recursos. Crea el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Editar Recurso' : 'Nuevo Recurso'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Guía de Planificación de Temporada"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del recurso..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Icono</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((ic) => (
                      <SelectItem key={ic.value} value={ic.value}>
                        {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Archivo {!editingResource && '*'}</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFile ? selectedFile.name : existingFileName || 'Seleccionar archivo'}
                </Button>
                {existingFileName && !selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Archivo actual: {existingFileName}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="published">Publicado</Label>
                <p className="text-sm text-muted-foreground">
                  Solo los recursos publicados son visibles
                </p>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isUploading}>
                {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingResource ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo también será eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <BottomNav />
    </div>
  );
}
