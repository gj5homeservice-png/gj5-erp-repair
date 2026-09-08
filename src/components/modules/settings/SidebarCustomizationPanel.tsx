"use client"

import React, { useEffect, useState } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ALL_SIDEBAR_MODULES, DEFAULT_SIDEBAR_ORDER, ALWAYS_VISIBLE_MODULE, resolveSidebarOrder } from '@/lib/nav-items';

// Editable, unsaved working copy of order + hidden-set. Mirrors the pattern
// every other Settings section uses (its own local form state, committed to
// the server only when "Save Changes" is clicked) rather than writing to the
// real store on every drag/toggle.
export function SidebarCustomizationPanel({ store }: { store: any }) {
  const { toast } = useToast();

  const [order, setOrder] = useState<string[]>(() => resolveSidebarOrder(store.navOrder).map((m) => m.name));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(
    ALL_SIDEBAR_MODULES.map((m) => m.name).filter((name) => store.visibility?.tabs?.[name] === false)
  ));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dragOverName, setDragOverName] = useState<string | null>(null);

  // Resync the working copy whenever the real saved values change under us
  // (e.g. after Save's own refetch, or a change made from another device) —
  // but never while there are unsaved local edits, so a background refresh
  // can't silently discard something the user is mid-way through arranging.
  useEffect(() => {
    if (dirty) return;
    setOrder(resolveSidebarOrder(store.navOrder).map((m) => m.name));
    setHidden(new Set(
      ALL_SIDEBAR_MODULES.map((m) => m.name).filter((name) => store.visibility?.tabs?.[name] === false)
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.navOrder, store.visibility]);

  const byName = new Map(ALL_SIDEBAR_MODULES.map((m) => [m.name, m]));

  const moveTo = (targetName: string) => {
    if (!draggedName || draggedName === targetName) return;
    setOrder((prev) => {
      const next = prev.filter((n) => n !== draggedName);
      const targetIndex = next.indexOf(targetName);
      next.splice(targetIndex, 0, draggedName);
      return next;
    });
    setDirty(true);
  };

  const handleDrop = (targetName: string) => (e: React.DragEvent) => {
    e.preventDefault();
    moveTo(targetName);
    setDraggedName(null);
    setDragOverName(null);
  };

  const toggleHidden = (name: string) => {
    if (name === ALWAYS_VISIBLE_MODULE) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setDirty(true);
  };

  const handleReset = () => {
    setOrder([...DEFAULT_SIDEBAR_ORDER]);
    setHidden(new Set());
    setDirty(true);
    toast({ title: 'Reset to Default', description: 'Click Save Changes to apply the default menu order.' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      store.setNavOrder(order);
      const tabs = Object.fromEntries(ALL_SIDEBAR_MODULES.map((m) => [m.name, !hidden.has(m.name)]));
      store.setVisibility({ ...(store.visibility || {}), tabs });
      setDirty(false);
      toast({ title: 'Sidebar Updated', description: 'Menu order and visibility saved.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-headline font-bold text-white">Sidebar Menu Order</h3>
        <p className="text-xs text-slate-500 mt-1">
          Drag modules to reorder the sidebar, or hide ones you don&apos;t use. Changes apply everywhere you&apos;re signed in once saved.
        </p>
      </div>

      <div className="space-y-2">
        {order.map((name) => {
          const mod = byName.get(name);
          if (!mod) return null;
          const Icon = mod.icon;
          const isHidden = hidden.has(name);
          const isLocked = name === ALWAYS_VISIBLE_MODULE;
          const isDragOver = dragOverName === name && draggedName !== name;

          return (
            <div
              key={name}
              draggable
              onDragStart={() => setDraggedName(name)}
              onDragOver={(e) => { e.preventDefault(); if (dragOverName !== name) setDragOverName(name); }}
              onDragLeave={() => setDragOverName((cur) => (cur === name ? null : cur))}
              onDrop={handleDrop(name)}
              onDragEnd={() => { setDraggedName(null); setDragOverName(null); }}
              className={cn(
                "flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border transition-all",
                isDragOver ? "border-[#123C8C] ring-2 ring-[#123C8C]/40" : "border-slate-800",
                draggedName === name && "opacity-40",
                isHidden && "opacity-60"
              )}
            >
              <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
              <div className={cn("p-2 rounded-xl shrink-0", isHidden ? "bg-slate-800/60 text-slate-500" : "bg-[#123C8C]/10 text-[#123C8C]")}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn("text-xs font-bold tracking-tight flex-1 min-w-0 truncate", isHidden ? "text-slate-500" : "text-slate-100")}>
                {name}
              </span>
              {isHidden && (
                <Badge className="bg-slate-800/60 text-slate-400 border-slate-700 text-[9px] uppercase shrink-0">Hidden</Badge>
              )}
              {isLocked ? (
                <span title="Settings always stays visible" className="p-2 text-slate-700 shrink-0">
                  <Lock className="w-4 h-4" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleHidden(name)}
                  title={isHidden ? 'Show in sidebar' : 'Hide from sidebar'}
                  className={cn(
                    "p-2 rounded-lg transition-colors shrink-0",
                    isHidden ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  )}
                >
                  {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={handleReset} className="border-slate-800 h-11 px-6 font-bold uppercase text-xs">
          <RotateCcw className="w-4 h-4 mr-2" /> Reset to Default
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 font-bold uppercase text-xs">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
