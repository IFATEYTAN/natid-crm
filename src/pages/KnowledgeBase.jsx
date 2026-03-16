import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Loader2,
  Lightbulb,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/components/permissions/PermissionsContext';

const CATEGORIES = {
  mechanical: { label: 'תקלה מכנית', icon: Wrench, color: 'bg-blue-100 text-blue-800' },
  electrical: { label: 'חשמל', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800' },
  towing: { label: 'גרירה', icon: Wrench, color: 'bg-orange-100 text-orange-800' },
  battery: { label: 'מצבר', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  flat_tire: { label: "פנצ'ר", icon: Wrench, color: 'bg-purple-100 text-purple-800' },
  lockout: { label: 'נעילת רכב', icon: Wrench, color: 'bg-indigo-100 text-indigo-800' },
  general: { label: 'כללי', icon: Lightbulb, color: 'bg-gray-100 text-gray-800' },
  process: { label: 'תהליכים', icon: BookOpen, color: 'bg-green-100 text-green-800' },
};

export default function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('settings', 'edit');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    problem: '',
    solution: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledgeBase'],
    queryFn: () => base44.entities.KnowledgeArticle.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeArticle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast.success('מאמר נוסף בהצלחה');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeArticle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast.success('מאמר עודכן');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeArticle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast.success('מאמר נמחק');
    },
  });

  const resetForm = () => {
    setShowCreateDialog(false);
    setEditingArticle(null);
    setForm({ title: '', category: 'general', problem: '', solution: '', tags: '' });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.problem.trim() || !form.solution.trim()) {
      toast.error('יש למלא כותרת, בעיה ופתרון');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      category: form.category,
      problem_description: form.problem,
      solution: form.solution,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(','),
    };

    if (editingArticle) {
      await updateMutation.mutateAsync({ id: editingArticle.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setSaving(false);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setForm({
      title: article.title || '',
      category: article.category || 'general',
      problem: article.problem_description || '',
      solution: article.solution || '',
      tags: article.tags || '',
    });
    setShowCreateDialog(true);
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter articles
  const filtered = articles.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.problem_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.solution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            מאגר תקלות נפוצות
          </h1>
          <p className="text-[#616161] text-sm mt-1">
            {articles.length} מאמרים | חפש פתרון לתקלה
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            מאמר חדש
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש תקלה, פתרון או מילת מפתח..."
            className="pr-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery ? 'לא נמצאו תוצאות' : 'אין מאמרים עדיין'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => {
            const isExpanded = expandedIds.has(article.id);
            const catConfig = CATEGORIES[article.category] || CATEGORIES.general;
            const CatIcon = catConfig.icon;

            return (
              <Card key={article.id} className="bg-white">
                <CardContent className="p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleExpand(article.id)}
                  >
                    <CatIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#212121]">{article.title}</h3>
                        <Badge className={catConfig.color + ' text-xs'}>{catConfig.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {article.problem_description}
                      </p>
                      {article.tags && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {article.tags.split(',').map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              <Tag className="w-3 h-3" />
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(article);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('למחוק מאמר זה?')) {
                                deleteMutation.mutate(article.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-red-600 mb-1">תיאור הבעיה</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {article.problem_description}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-600 mb-1">פתרון</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {article.solution}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'עריכת מאמר' : 'מאמר חדש למאגר הידע'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="כותרת קצרה ומתארת"
              />
            </div>
            <div>
              <Label>קטגוריה</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תיאור הבעיה *</Label>
              <Textarea
                value={form.problem}
                onChange={(e) => setForm({ ...form, problem: e.target.value })}
                placeholder="תאר את הבעיה / התקלה..."
                rows={3}
              />
            </div>
            <div>
              <Label>פתרון *</Label>
              <Textarea
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                placeholder="תאר את הפתרון שלב אחרי שלב..."
                rows={4}
              />
            </div>
            <div>
              <Label>תגיות (מופרדות בפסיק)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="מצבר, התנעה, חורף"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingArticle ? 'עדכן' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
