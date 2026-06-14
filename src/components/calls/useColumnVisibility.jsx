import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * מנהל נראות עמודות לכל משתמש, עם שמירה ב-UserDisplayPreference (לפי page_name)
 * ונפילה ל-localStorage עד לטעינת המשתמש/השמירה.
 *
 * @param {object} opts
 * @param {string} opts.pageName - מזהה המסך (לשמירה נפרדת לכל מסך)
 * @param {string[]} opts.allColumns - רשימת כותרות כל העמודות הזמינות
 * @returns {{hiddenColumns: string[], toggleColumn: Function, resetColumns: Function, isHidden: Function}}
 */
export function useColumnVisibility({ pageName, allColumns }) {
  const storageKey = `colvis:${pageName}`;
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [userId, setUserId] = useState(null);
  const [prefId, setPrefId] = useState(null);

  // טעינת המשתמש וההעדפה השמורה
  useEffect(() => {
    let active = true;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!active || !me) return;
      setUserId(me.id);
      const prefs = await base44.entities.UserDisplayPreference.filter({
        user_id: me.id,
        page_name: pageName,
      }).catch(() => []);
      if (!active) return;
      const pref = prefs?.[0];
      if (pref) {
        setPrefId(pref.id);
        const hidden = (pref.cards || []).filter((c) => c.visible === false).map((c) => c.card_key);
        setHiddenColumns(hidden);
      }
    })();
    return () => {
      active = false;
    };
  }, [pageName]);

  const persist = useCallback(
    async (nextHidden) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextHidden));
      } catch {
        /* ignore */
      }
      if (!userId) return;
      const cards = allColumns.map((header, idx) => ({
        card_key: header,
        label: header,
        visible: !nextHidden.includes(header),
        order: idx,
      }));
      try {
        if (prefId) {
          await base44.entities.UserDisplayPreference.update(prefId, { cards });
        } else {
          const created = await base44.entities.UserDisplayPreference.create({
            user_id: userId,
            page_name: pageName,
            cards,
          });
          setPrefId(created.id);
        }
      } catch {
        /* ignore persistence errors - localStorage already holds the value */
      }
    },
    [allColumns, pageName, prefId, storageKey, userId]
  );

  const toggleColumn = useCallback(
    (header) => {
      setHiddenColumns((prev) => {
        const next = prev.includes(header)
          ? prev.filter((h) => h !== header)
          : [...prev, header];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetColumns = useCallback(() => {
    setHiddenColumns([]);
    persist([]);
  }, [persist]);

  const isHidden = useCallback((header) => hiddenColumns.includes(header), [hiddenColumns]);

  return useMemo(
    () => ({ hiddenColumns, toggleColumn, resetColumns, isHidden }),
    [hiddenColumns, toggleColumn, resetColumns, isHidden]
  );
}