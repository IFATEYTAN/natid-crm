import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Undo2, MoveUp, MoveDown } from "lucide-react";


const PAGES = [
  { value: "HistoricalDataAnalysis", label: "ניתוח נתונים היסטוריים" },
];

const DEFAULT_CARDS_BY_PAGE = {
  HistoricalDataAnalysis: [
    { card_key: "onlyBot", label: "בוט בלבד", visible: true, order: 0 },
    { card_key: "onlyManual", label: "ידני בלבד", visible: true, order: 1 },
    { card_key: "both", label: "גם וגם", visible: true, order: 2 },
    { card_key: "none", label: "לא טופל", visible: true, order: 3 },
  ],
};

export default function AdminDisplaySettings() {
  const qc = useQueryClient();
  const [selectedPage, setSelectedPage] = useState(PAGES[0].value);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { currentUser: user } = usePermissions();

  useEffect(() => {
    if (user && !selectedUserId) setSelectedUserId(user.id);
  }, [user]);

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all(),
    enabled: !!user && user.role === 'admin',
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: pref, isLoading } = useQuery({
    queryKey: queryKeys.settings.display(selectedUserId, selectedPage),
    enabled: !!user && !!selectedPage,
    queryFn: async () => {
      const list = await base44.entities.UserDisplayPreference.filter({ user_id: selectedUserId, page_name: selectedPage });
      return list?.[0] || null;
    },
    initialData: null,
  });

  const [cards, setCards] = useState(DEFAULT_CARDS_BY_PAGE[selectedPage] || []);

  useEffect(() => {
    // reset cards when page changes or pref loads
    const defaults = DEFAULT_CARDS_BY_PAGE[selectedPage] || [];
    if (pref?.cards?.length) {
      // merge saved with defaults (keep missing ones appended)
      const savedMap = Object.fromEntries(pref.cards.map(c => [c.card_key, c]));
      const merged = defaults.map((d, idx) => ({
        ...d,
        ...(savedMap[d.card_key] || {}),
        order: (savedMap[d.card_key]?.order ?? idx),
      }));
      // include any unknown saved cards
      const extras = pref.cards.filter(c => !merged.find(m => m.card_key === c.card_key));
      setCards([...merged, ...extras].sort((a,b)=> (a.order ?? 0) - (b.order ?? 0)));
    } else {
      setCards(defaults);
    }
  }, [selectedPage, pref]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (pref?.id) {
        return base44.entities.UserDisplayPreference.update(pref.id, payload);
      }
      return base44.entities.UserDisplayPreference.create(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.display(user?.id, selectedPage) }),
  });

  const handleReorder = (index, direction) => {
    const newArr = [...cards];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newArr.length) return;
    [newArr[index], newArr[swapWith]] = [newArr[swapWith], newArr[index]];
    setCards(newArr.map((c, i) => ({ ...c, order: i })));
  };

  const handleChange = (idx, patch) => {
    const updated = cards.map((c, i) => i === idx ? { ...c, ...patch } : c);
    setCards(updated);
  };

  const handleReset = () => {
    setCards(DEFAULT_CARDS_BY_PAGE[selectedPage] || []);
  };

  const handleSave = async () => {
    if (!user) return;
    const payload = {
      user_id: selectedUserId,
      page_name: selectedPage,
      cards: cards.map((c, i) => ({
        card_key: c.card_key,
        label: c.label?.trim() || "",
        visible: !!c.visible,
        order: i,
      })),
    };
    await saveMutation.mutateAsync(payload);
  };

  if (!user) {
    return <div className="p-6">טוען משתמש…</div>;
  }

  if (user.role !== 'admin') {
    return <div className="p-6 text-red-600">גישה רק למנהלים</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הגדרות תצוגה (אדמין)</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>בחירת מסך</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="בחר משתמש" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="בחר מסך" />
            </SelectTrigger>
            <SelectContent>
              {PAGES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>כרטיסיות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cards.map((c, idx) => (
              <div key={c.card_key} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleReorder(idx, 'up')} disabled={idx === 0}>
                    <MoveUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleReorder(idx, 'down')} disabled={idx === cards.length - 1}>
                    <MoveDown className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-40">
                  <div className="text-xs text-gray-500">מפתח</div>
                  <div className="text-sm font-mono">{c.card_key}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">שם תצוגה</div>
                  <Input value={c.label} onChange={(e)=>handleChange(idx, { label: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id={`vis-${c.card_key}`} checked={!!c.visible} onCheckedChange={(v)=>handleChange(idx, { visible: !!v })} />
                  <label htmlFor={`vis-${c.card_key}`} className="text-sm">מוצג</label>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={handleReset}><Undo2 className="w-4 h-4"/> שחזור ברירת מחדל</Button>
            <Button onClick={handleSave} isLoading={saveMutation.isPending}><Save className="w-4 h-4"/> שמירה</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}