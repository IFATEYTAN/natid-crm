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
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { serviceTypeLabels } from '@/config/labels';

const SCRIPT_TYPES = {
  opening: { label: 'פתיחת שיחה', color: 'bg-blue-100 text-blue-800' },
  diagnosis: { label: 'אבחון תקלה', color: 'bg-yellow-100 text-yellow-800' },
  escalation: { label: 'הסלמה', color: 'bg-red-100 text-red-800' },
  closing: { label: 'סגירת שיחה', color: 'bg-green-100 text-green-800' },
  complaint: { label: 'טיפול בתלונה', color: 'bg-orange-100 text-orange-800' },
  upsell: { label: 'שדרוג שירות', color: 'bg-purple-100 text-purple-800' },
};

export default function CallScriptsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('settings', 'edit');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [form, setForm] = useState({
    title: '',
    script_type: 'opening',
    service_type: 'all',
    content: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['callScripts'],
    queryFn: () => base44.entities.CallScript.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CallScript.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      toast.success('תסריט נוסף בהצלחה');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CallScript.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      toast.success('תסריט עודכן');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CallScript.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      toast.success('תסריט נמחק');
    },
  });

  const resetForm = () => {
    setShowCreateDialog(false);
    setEditingScript(null);
    setForm({ title: '', script_type: 'opening', service_type: 'all', content: '', notes: '' });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('יש למלא כותרת ותוכן התסריט');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      script_type: form.script_type,
      service_type: form.service_type,
      content: form.content,
      notes: form.notes,
    };

    if (editingScript) {
      await updateMutation.mutateAsync({ id: editingScript.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setSaving(false);
  };

  const handleEdit = (script) => {
    setEditingScript(script);
    setForm({
      title: script.title || '',
      script_type: script.script_type || 'opening',
      service_type: script.service_type || 'all',
      content: script.content || '',
      notes: script.notes || '',
    });
    setShowCreateDialog(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('תסריט הועתק');
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = scripts.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || s.script_type === typeFilter;
    const matchesService = serviceFilter === 'all' || s.service_type === serviceFilter || s.service_type === 'all';
    return matchesSearch && matchesType && matchesService;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-2">
            <FileText className="w-6 h-6" />
            תסריטי שיחה
          </h1>
          <p className="text-[#616161] text-sm mt-1">
            {scripts.length} תסריטים | מדריכי שיחה למוקדנים
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
            תסריט חדש
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש תסריט..."
            className="pr-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="סוג תסריט" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(SCRIPT_TYPES).map(([key, st]) => (
              <SelectItem key={key} value={key}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="סוג שירות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל סוגי השירות</SelectItem>
            {Object.entries(serviceTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scripts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery ? 'לא נמצאו תסריטים' : 'אין תסריטים עדיין'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((script) => {
            const isExpanded = expandedIds.has(script.id);
            const typeConfig = SCRIPT_TYPES[script.script_type] || SCRIPT_TYPES.opening;

            return (
              <Card key={script.id} className="bg-white">
                <CardContent className="p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleExpand(script.id)}
                  >
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#212121]">{script.title}</h3>
                        <Badge className={typeConfig.color + ' text-xs'}>{typeConfig.label}</Badge>
                        {script.service_type && script.service_type !== 'all' && (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">
                            {serviceTypeLabels[script.service_type] || script.service_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{script.content}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="העתק תסריט"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(script.content);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(script);
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
                              if (window.confirm('למחוק תסריט זה?')) {
                                deleteMutation.mutate(script.id);
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
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">תסריט השיחה</h4>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {script.content}
                        </p>
                      </div>
                      {script.notes && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-1">הערות למוקדן</h4>
                          <p className="text-sm text-gray-500 whitespace-pre-wrap">{script.notes}</p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => copyToClipboard(script.content)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        העתק תסריט
                      </Button>
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
            <DialogTitle>{editingScript ? 'עריכת תסריט' : 'תסריט שיחה חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="שם התסריט"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג תסריט</Label>
                <Select
                  value={form.script_type}
                  onValueChange={(v) => setForm({ ...form, script_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCRIPT_TYPES).map(([key, st]) => (
                      <SelectItem key={key} value={key}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג שירות</Label>
                <Select
                  value={form.service_type}
                  onValueChange={(v) => setForm({ ...form, service_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל סוגי השירות</SelectItem>
                    {Object.entries(serviceTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>תוכן התסריט *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={`שלום, מדבר/ת [שם] ממוקד נתי.\nאני רואה שפתחת קריאת שירות...\n\nאיך אני יכול/ה לעזור?`}
                rows={6}
              />
            </div>
            <div>
              <Label>הערות למוקדן</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="טיפים, דגשים, מה לשים לב..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingScript ? 'עדכן' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
