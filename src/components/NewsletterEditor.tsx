import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Image,
  Type,
  Newspaper,
  Eye,
  GripVertical,
  Link2,
} from 'lucide-react';
import type { BlogArticle } from '@/hooks/useBlog';

export interface NewsletterSection {
  id: string;
  type: 'text' | 'heading' | 'image' | 'article' | 'divider' | 'button';
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  articleId?: string;
  buttonUrl?: string;
  buttonText?: string;
  headingLevel?: 'h2' | 'h3';
}

interface NewsletterEditorProps {
  sections: NewsletterSection[];
  onSectionsChange: (sections: NewsletterSection[]) => void;
  articles?: BlogArticle[];
  subject: string;
  onSubjectChange: (subject: string) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function sectionsToHtml(sections: NewsletterSection[], articles?: BlogArticle[]): string {
  const sectionHtmls = sections.map((s) => {
    switch (s.type) {
      case 'heading':
        const tag = s.headingLevel || 'h2';
        const fontSize = tag === 'h2' ? '22px' : '18px';
        return `<${tag} style="color:#1e293b;font-size:${fontSize};margin:0 0 12px;font-weight:bold;">${s.content}</${tag}>`;
      case 'text':
        return `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">${s.content.replace(/\n/g, '<br/>')}</p>`;
      case 'image':
        return `<div style="text-align:center;margin:16px 0;"><img src="${s.imageUrl || ''}" alt="${s.imageAlt || ''}" style="max-width:100%;height:auto;border-radius:8px;"/>${s.imageAlt ? `<p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">${s.imageAlt}</p>` : ''}</div>`;
      case 'article': {
        const article = articles?.find((a) => a.id === s.articleId);
        if (!article) return '';
        return `<div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
          ${article.featured_image ? `<img src="${article.featured_image}" alt="${article.title}" style="width:100%;height:auto;border-radius:6px;margin-bottom:12px;"/>` : ''}
          <h3 style="margin:0 0 8px;"><a href="https://www.topvolleymanager.com/blog/${article.slug}" style="color:#2563eb;text-decoration:none;font-size:17px;">${article.title}</a></h3>
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">${article.excerpt || ''}</p>
          <a href="https://www.topvolleymanager.com/blog/${article.slug}" style="display:inline-block;margin-top:12px;color:#2563eb;font-size:14px;font-weight:600;text-decoration:none;">Read more →</a>
        </div>`;
      }
      case 'divider':
        return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>';
      case 'button':
        return `<div style="text-align:center;margin:20px 0;"><a href="${s.buttonUrl || '#'}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${s.buttonText || s.content}</a></div>`;
      default:
        return '';
    }
  });

  return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
    <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:8px 8px 0 0;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;">🏐 Top Volley Manager</h1>
    </div>
    <div style="padding:24px;background:#ffffff;">
      ${sectionHtmls.join('\n')}
    </div>
    <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;background:#ffffff;border-radius:0 0 8px 8px;">
      <p style="margin:0;">© ${new Date().getFullYear()} Top Volley Manager SL, Plaza Pontevedra 10, 2B, 15003 A Coruña</p>
    </div>
  </div>`;
}

export function NewsletterEditor({ sections, onSectionsChange, articles, subject, onSubjectChange }: NewsletterEditorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [articlePickerOpen, setArticlePickerOpen] = useState(false);
  const pendingInsertIndex = useRef<number | null>(null);

  const addSection = (type: NewsletterSection['type'], index?: number) => {
    const newSection: NewsletterSection = {
      id: generateId(),
      type,
      content: '',
      headingLevel: type === 'heading' ? 'h2' : undefined,
    };
    const updated = [...sections];
    const insertAt = index !== undefined ? index + 1 : updated.length;
    updated.splice(insertAt, 0, newSection);
    onSectionsChange(updated);
  };

  const addArticleSection = (articleId: string, index?: number) => {
    const article = articles?.find((a) => a.id === articleId);
    const newSection: NewsletterSection = {
      id: generateId(),
      type: 'article',
      content: article?.title || '',
      articleId,
    };
    const updated = [...sections];
    const insertAt = index !== undefined ? index + 1 : updated.length;
    updated.splice(insertAt, 0, newSection);
    onSectionsChange(updated);
    setArticlePickerOpen(false);
  };

  const updateSection = (id: string, updates: Partial<NewsletterSection>) => {
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSection = (id: string) => {
    onSectionsChange(sections.filter((s) => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onSectionsChange(updated);
  };

  const openArticlePicker = (index?: number) => {
    pendingInsertIndex.current = index ?? null;
    setArticlePickerOpen(true);
  };

  const previewHtml = sectionsToHtml(sections, articles);

  return (
    <div className="space-y-4">
      {/* Subject */}
      <div>
        <label className="text-sm font-medium">Subject</label>
        <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="Newsletter subject..." />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('heading')}>
          <Type className="h-4 w-4 mr-1" /> Heading
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('text')}>
          <Type className="h-4 w-4 mr-1" /> Text
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('image')}>
          <Image className="h-4 w-4 mr-1" /> Image
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => openArticlePicker()}>
          <Newspaper className="h-4 w-4 mr-1" /> Article
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('button')}>
          <Link2 className="h-4 w-4 mr-1" /> Button
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('divider')}>
          <Separator className="h-4 w-4 mr-1" /> Divider
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)} className="ml-auto">
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
      </div>

      {/* Sections */}
      {sections.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Click the buttons above to add sections to your newsletter
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card key={section.id} className="relative group">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 shrink-0 pt-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                    <MoveUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}>
                    <MoveDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">{section.type}</Badge>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeSection(section.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>

                  {section.type === 'heading' && (
                    <div className="space-y-2">
                      <Select value={section.headingLevel || 'h2'} onValueChange={(v) => updateSection(section.id, { headingLevel: v as 'h2' | 'h3' })}>
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="h2">H2</SelectItem>
                          <SelectItem value="h3">H3</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })} placeholder="Heading text..." />
                    </div>
                  )}

                  {section.type === 'text' && (
                    <Textarea value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })} placeholder="Write your text here..." rows={4} />
                  )}

                  {section.type === 'image' && (
                    <div className="space-y-2">
                      <Input value={section.imageUrl || ''} onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })} placeholder="Image URL (https://...)" />
                      <Input value={section.imageAlt || ''} onChange={(e) => updateSection(section.id, { imageAlt: e.target.value })} placeholder="Image caption (optional)" />
                      {section.imageUrl && (
                        <img src={section.imageUrl} alt={section.imageAlt || ''} className="max-h-40 rounded-md object-cover" />
                      )}
                    </div>
                  )}

                  {section.type === 'article' && (
                    <div>
                      {section.articleId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate flex-1">{articles?.find((a) => a.id === section.articleId)?.title || 'Article'}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openArticlePicker(index)}>Change</Button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => openArticlePicker(index)}>
                          Select article
                        </Button>
                      )}
                    </div>
                  )}

                  {section.type === 'button' && (
                    <div className="space-y-2">
                      <Input value={section.buttonText || section.content} onChange={(e) => updateSection(section.id, { buttonText: e.target.value, content: e.target.value })} placeholder="Button text..." />
                      <Input value={section.buttonUrl || ''} onChange={(e) => updateSection(section.id, { buttonUrl: e.target.value })} placeholder="Button URL (https://...)" />
                    </div>
                  )}

                  {section.type === 'divider' && (
                    <Separator />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Article Picker Dialog */}
      <Dialog open={articlePickerOpen} onOpenChange={setArticlePickerOpen}>
        <DialogContent className="max-w-lg max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>Select an Article</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto max-h-[50vh]">
            {articles?.filter((a) => a.is_published).map((article) => (
              <Card key={article.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => addArticleSection(article.id, pendingInsertIndex.current ?? undefined)}>
                <CardContent className="p-3 flex items-center gap-3">
                  {article.featured_image && (
                    <img src={article.featured_image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{article.language?.toUpperCase()} · {article.slug}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!articles || articles.filter((a) => a.is_published).length === 0) && (
              <p className="text-center text-muted-foreground py-4">No published articles found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Newsletter Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 rounded-lg p-4">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
