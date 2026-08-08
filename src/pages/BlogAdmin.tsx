import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  ArrowLeft 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";
import {
  useBlogArticles,
  useBlogCategories,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  generateSlug,
  BlogArticle,
} from "@/hooks/useBlog";
import { useSubscription } from "@/hooks/useSubscription";

export default function BlogAdmin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subscription, loading: isLoadingAdmin } = useSubscription();
  const isAppAdmin = subscription.isAdmin;
  const { data: articles, isLoading } = useBlogArticles();
  const { data: categories } = useBlogCategories();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // Redirect if not admin
  if (!isLoadingAdmin && !isAppAdmin) {
    navigate("/");
    return null;
  }

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setCategoryId("");
    setMetaDescription("");
    setIsPublished(false);
    setEditingArticle(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (article: BlogArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt || "");
    setContent(article.content);
    setCategoryId(article.category_id || "");
    setMetaDescription(article.meta_description || "");
    setIsPublished(article.is_published);
    setIsDialogOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!editingArticle) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      toast.error("Título, slug y contenido son requeridos");
      return;
    }

    try {
      if (editingArticle) {
        await updateArticle.mutateAsync({
          id: editingArticle.id,
          title,
          slug,
          excerpt: excerpt || undefined,
          content,
          category_id: categoryId || undefined,
          meta_description: metaDescription || undefined,
          is_published: isPublished,
        });
        toast.success("Artículo actualizado");
      } else {
        await createArticle.mutateAsync({
          title,
          slug,
          excerpt: excerpt || undefined,
          content,
          category_id: categoryId || undefined,
          meta_description: metaDescription || undefined,
          is_published: isPublished,
        });
        toast.success("Artículo creado");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Error al guardar el artículo");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteArticle.mutateAsync(deleteId);
      toast.success("Artículo eliminado");
      setDeleteId(null);
    } catch {
      toast.error("Error al eliminar el artículo");
    }
  };

  if (isLoading || isLoadingAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Blog Admin" showBack />
        <div className="p-4 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Blog Admin" showBack />

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/blog")}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Blog
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Artículo
          </Button>
        </div>

        {articles?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay artículos todavía</p>
              <Button className="mt-4" onClick={openNewDialog}>
                Crear primer artículo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {articles?.map((article) => (
              <Card key={article.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        /{article.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={article.is_published ? "default" : "secondary"}>
                        {article.is_published ? "Publicado" : "Borrador"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {article.category?.name && (
                        <Badge variant="outline" className="mr-2">
                          {article.category.name}
                        </Badge>
                      )}
                      {article.updated_at && (
                        <span>
                          Actualizado: {format(new Date(article.updated_at), "d MMM yyyy", { locale: getDateFnsLocale(i18n.language) })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/blog/${article.slug}`, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(article)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(article.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Editar Artículo" : "Nuevo Artículo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título del artículo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/blog/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-del-articulo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Extracto</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Breve descripción del artículo (para listados)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenido *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el contenido del artículo (soporta Markdown)"
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Descripción (SEO)</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Descripción para buscadores (max 160 caracteres)"
                rows={2}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                {metaDescription.length}/160 caracteres
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="published">Publicado</Label>
                <p className="text-sm text-muted-foreground">
                  El artículo será visible públicamente
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
              <Button 
                onClick={handleSubmit}
                disabled={createArticle.isPending || updateArticle.isPending}
              >
                {createArticle.isPending || updateArticle.isPending
                  ? "Guardando..."
                  : editingArticle
                  ? "Actualizar"
                  : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El artículo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
