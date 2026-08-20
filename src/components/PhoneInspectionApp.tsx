import React, { useEffect, useMemo, useState } from 'react';

/**
 * PhoneInspectionApp — 手机存放点验（iOS / Liquid Glass 设计实现）
 *
 * 说明给改动此文件的人（含 AI 助手）：
 * 本文件是「设计定稿」的实现，所有数值（颜色、圆角、模糊、阴影、间距、字号、
 * 动效曲线与时长、断点）均为设计规范的一部分，不是随手写的样式。
 * 修改功能可以，但**不要**改这些数值、不要改为 Tailwind class、不要引入 UI 库。
 */

export interface Student {
  id: number;
  code: string;
  name: string;
  pinyinOrEn?: string;
}

export interface InspectionRecordLite {
  date: string;
  slot: string;
  misses: number[];
}

interface Props {
  students: Student[];
  className?: string;
  /** 归档时回调：接到后写入 localStorage / Firestore */
  onArchive?: (record: InspectionRecordLite) => void;
  /** 云端历史记录；不传则只用本地 */
  records?: InspectionRecordLite[];
}

/* ── 设计令牌（勿改） ───────────────────────────────── */
const T = {
  accent: '#0071E3',
  red: '#FF3B30',
  green: '#34C759',
  greenInk: '#248A3D',
  ink: '#1D1D1F',
  ink2: 'rgba(60,60,67,0.62)',
  ink3: 'rgba(60,60,67,0.5)',
  ink4: 'rgba(60,60,67,0.4)',
  bg: '#F2F2F5',
  fill: 'rgba(120,120,128,0.13)',
  ease: 'cubic-bezier(.2,.8,.2,1)',
  font:
    "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','PingFang SC','Hiragino Sans GB','Helvetica Neue',sans-serif",
};
const glass = (a: number): React.CSSProperties => ({
  background: `rgba(255,255,255,${a})`,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
});
const PER_LAYER = 9;               // 每层固定 9 个槽位，对应实体柜
const MOBILE = 700;                // 断点
const SLOTS = [
  { id: 'morning', name: '早自习', time: '08:55' },
  { id: 'noon', name: '午间', time: '12:40' },
  { id: 'evening', name: '晚自习', time: '18:30' },
  { id: 'custom', name: '临时', time: '15:40' },
];
const TEMPLATES = [
  { key: 'standard', label: '规范公文' },
  { key: 'simple', label: '简明通报' },
  { key: 'compact', label: '单行摘要' },
  { key: 'raw', label: '纯名单' },
];
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const STORE_KEY = 'phone-collections-v2';

const KEYFRAMES = `
@keyframes pcRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pcFade{from{opacity:0}to{opacity:1}}
@keyframes pcSheetIn{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pcSheetUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms !important;transition-duration:.01ms !important}}
`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const autoSlot = () => {
  const h = new Date().getHours() * 60 + new Date().getMinutes();
  return h < 660 ? 'morning' : h < 900 ? 'noon' : 'evening';
};

export const PhoneInspectionApp: React.FC<Props> = ({
  students,
  className = '高二 (3) 班',
  onArchive,
  records: cloudRecords,
}) => {
  const [view, setView] = useState<'inspection' | 'stats'>('inspection');
  const [date, setDate] = useState(todayISO());
  const [slotId, setSlotId] = useState(autoSlot());
  const [unsubmitted, setUnsubmitted] = useState<number[]>([]);
  const [template, setTemplate] = useState('standard');
  const [edited, setEdited] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localRecords, setLocalRecords] = useState<InspectionRecordLite[]>([]);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setLocalRecords(Array.isArray(d.records) ? d.records : []);
        if (d.date === todayISO()) {
          setUnsubmitted(d.unsubmitted || []);
          if (d.slotId) setSlotId(d.slotId);
        }
        if (d.template) setTemplate(d.template);
      }
    } catch {}
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ records: localRecords, unsubmitted, template, date, slotId })
      );
    } catch {}
  }, [localRecords, unsubmitted, template, date, slotId]);

  const records = cloudRecords && cloudRecords.length ? cloudRecords : localRecords;
  const mob = vw < MOBILE;
  const narrow = vw < 420;
  const slot = SLOTS.find(s => s.id === slotId) || SLOTS[0];
  const total = students.length;
  const list = students.filter(s => unsubmitted.includes(s.id));
  const sub = total - list.length;

  const layers = useMemo(() => {
    const rows: (Student | null)[][] = [];
    for (let i = 0; i < Math.ceil(total / PER_LAYER); i++) {
      const row: (Student | null)[] = [];
      for (let c = 0; c < PER_LAYER; c++) row.push(students[i * PER_LAYER + c] || null);
      rows.push(row);
    }
    return rows;
  }, [students, total]);

  const gap = mob ? (narrow ? 5 : 6) : 11;
  const cellW = mob
    ? Math.floor((Math.min(vw, MOBILE) - 32 - 12 - gap * (PER_LAYER - 1)) / PER_LAYER)
    : 92;
  const vertical = cellW < 54;                       // 窄屏中文姓名竖排
  const cellPad = mob ? (narrow ? '10px 2px' : '11px 3px') : '15px 8px';
  const cellMinH = mob ? (vertical ? 86 : 66) : 74;
  const cellRadius = mob ? (narrow ? 13 : 15) : 20;

  const toggle = (id: number) => {
    setEdited(null);
    setUnsubmitted(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  };

  const notice = useMemo(() => {
    if (edited !== null) return edited;
    const names = list.map(s => `${s.code}号 ${s.name}`);
    const rate = ((sub / (total || 1)) * 100).toFixed(1);
    const label = `${slot.name} ${slot.time}`;
    const sign = `${className} 班级管理组`;
    if (template === 'raw') return names.join('\n') || '（本时段无未存学生）';
    if (template === 'compact')
      return list.length === 0
        ? `[${date} ${label}] ${className}手机存放点验：应存${total}人，全员已交齐。(${sign})`
        : `[${date} ${label}] ${className}手机存放点验：应存${total}人，实存${sub}人，未存${list.length}人（${names.join('、')}）。(${sign})`;
    if (template === 'simple')
      return `【${className} 手机存放点验通报】\n日期时段：${date} ${label}\n应存：${total}人 | 实存：${sub}人 | 未存：${list.length}人${
        list.length === 0 ? '\n核查结论：全员已按规定完成手机定点存放。' : `\n未存名单：${names.join('、')}`
      }\n落款：${sign}`;
    const head = `【检查日期】：${date}\n【核查时段】：${label}\n【未存人数】：${list.length} 人\n\n`;
    return list.length === 0
      ? `${head}全员已按规定完成手机定点存放。`
      : `${head}未按规定存放学生名单（共 ${list.length} 人）\n${names.join('、')}\n请上述同学下课后立即把手机存入指定箱位。`;
  }, [edited, list, sub, total, slot, className, date, template]);

  const copy = () => {
    navigator.clipboard?.writeText(notice).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const archive = () => {
    const rec = { date, slot: slot.name, misses: [...unsubmitted] };
    setLocalRecords(r => [rec, ...r]);
    onArchive?.(rec);
    setTimeout(() => setSheetOpen(false), 700);
  };

  const missCount: Record<number, number> = {};
  records.forEach(r => r.misses.forEach(id => (missCount[id] = (missCount[id] || 0) + 1)));
  const maxMiss = Math.max(1, ...Object.values(missCount), 1);
  const ranking = Object.keys(missCount)
    .map(id => ({ st: students.find(s => s.id === +id), count: missCount[+id] }))
    .filter(r => r.st)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const totalMisses = records.reduce((n, r) => n + r.misses.length, 0);
  const avg = records.length
    ? records.reduce((n, r) => n + (total - r.misses.length) / (total || 1), 0) / records.length
    : 1;

  const seg = (on: boolean): React.CSSProperties => ({
    padding: '7px 18px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: on ? 600 : 500,
    background: on ? '#fff' : 'transparent',
    color: on ? T.ink : 'rgba(60,60,67,0.55)',
    boxShadow: on ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
    transition: `all .22s ${T.ease}`,
  });
  const card: React.CSSProperties = {
    borderRadius: 24,
    ...glass(0.62),
    boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 30px rgba(0,0,0,0.05)',
  };
  const dateLabel = (() => {
    const [y, m, d_] = date.split('-');
    const d = new Date(Number(y), Number(m) - 1, Number(d_));
    return isNaN(d.getTime()) ? date : `${d.getMonth() + 1}月${d.getDate()}日 · ${WEEKDAYS[d.getDay()]}`;
  })();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, fontFamily: T.font, color: T.ink, overflowX: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(760px 520px at 12% -8%, rgba(0,113,227,0.13), transparent 62%), radial-gradient(680px 480px at 92% 4%, rgba(255,149,0,0.09), transparent 60%), radial-gradient(900px 620px at 50% 108%, rgba(88,86,214,0.08), transparent 64%)' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 960, margin: '0 auto', padding: mob ? '12px 16px 150px' : '22px 28px 190px' }}>
        {/* 顶部浮动玻璃条 */}
        <div style={{ position: 'sticky', top: mob ? 10 : 16, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: mob ? 10 : 20, padding: mob ? '8px 8px 8px 16px' : '9px 10px 9px 20px', borderRadius: 26, ...glass(0.62), boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 34px rgba(0,0,0,0.07)', animation: `pcRise .6s ${T.ease} both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>手机存放点验</span>
            {!narrow && <span style={{ fontSize: 14, color: T.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{className}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {!mob && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.ink3, whiteSpace: 'nowrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: T.green, boxShadow: '0 0 0 4px rgba(52,199,89,0.16)' }} />已同步
              </span>
            )}
            <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 19, background: 'rgba(120,120,128,0.14)' }}>
              <button onClick={() => setView('inspection')} style={seg(view === 'inspection')}>点验</button>
              <button onClick={() => setView('stats')} style={seg(view === 'stats')}>统计</button>
            </div>
          </div>
        </div>

        {view === 'inspection' && (
          <>
            <header style={{ padding: 'clamp(34px,7vw,52px) 6px clamp(22px,4vw,30px)', animation: `pcRise .6s ${T.ease} .05s both` }}>
              <div style={{ fontSize: 'clamp(14px,3.6vw,15px)', fontWeight: 500, color: T.ink3 }}>{dateLabel}</div>
              <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(32px,8.6vw,46px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-1.4px' }}>{slot.name}点验</h1>
              <p style={{ margin: '12px 0 0', fontSize: 'clamp(16px,4.2vw,19px)', lineHeight: 1.5, color: T.ink2, maxWidth: 620, textWrap: 'pretty' as any }}>
                {list.length === 0
                  ? `全部 ${total} 位同学的手机均已入箱，可直接生成通报。`
                  : `共 ${total} 位，${sub} 位已存、${list.length} 位未存。点按柜位即可切换状态。`}
              </p>
            </header>

            {/* 时段 + 日期 */}
            <div style={{ display: 'flex', gap: mob ? 8 : 10, flexWrap: mob ? 'nowrap' : 'wrap', overflowX: mob ? 'auto' : 'visible', padding: mob ? '0 6px 22px' : '0 6px 26px', animation: `pcRise .6s ${T.ease} .1s both` }}>
              {SLOTS.map(s => {
                const on = s.id === slotId;
                return (
                  <button key={s.id} onClick={() => { setSlotId(s.id); setEdited(null); }}
                    style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, flexShrink: 0, padding: mob ? '11px 16px' : '11px 20px', border: 'none', borderRadius: 18, cursor: 'pointer', fontSize: 15, fontWeight: on ? 600 : 500, background: on ? T.accent : 'rgba(255,255,255,0.6)', color: on ? '#fff' : 'rgba(60,60,67,0.8)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: on ? `0 8px 22px ${T.accent}40` : '0 6px 18px rgba(0,0,0,0.05)', transition: `all .25s ${T.ease}` }}>
                    <span>{s.name}</span>
                    <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: on ? 'rgba(255,255,255,0.72)' : T.ink4 }}>{s.time}</span>
                  </button>
                );
              })}
              <input type="date" value={date} onChange={e => { setDate(e.target.value); setEdited(null); }}
                style={{ marginLeft: mob ? 0 : 'auto', flexShrink: 0, padding: mob ? '10px 14px' : '11px 16px', border: 'none', borderRadius: 18, ...glass(0.6), boxShadow: '0 6px 18px rgba(0,0,0,0.05)', fontSize: 15, color: 'rgba(60,60,67,0.75)' }} />
            </div>

            {/* 柜位：每层固定 9 槽 */}
            <section style={{ padding: '0 6px', animation: `pcRise .6s ${T.ease} .15s both` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '0 4px 14px' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>柜位</h2>
                <button onClick={() => { setUnsubmitted([]); setEdited(null); }} style={{ border: 'none', background: 'none', padding: '6px 2px', fontSize: 15, fontWeight: 500, color: T.accent, cursor: 'pointer' }}>全部已存</button>
              </div>
              <div style={{ overflowX: mob ? 'visible' : 'auto', margin: '0 -6px', padding: '0 6px 6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 14 : 20, minWidth: mob ? 0 : PER_LAYER * 92 }}>
                  {layers.map((layer, li) => (
                    <div key={li} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ padding: '0 4px', fontSize: 'clamp(11px,3vw,13px)', fontWeight: 500, color: 'rgba(60,60,67,0.45)' }}>
                        第 {li + 1} 层 · 槽位 {li * PER_LAYER + 1} – {(li + 1) * PER_LAYER}
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PER_LAYER},minmax(0,1fr))`, gap }}>
                        {layer.map((s, ci) => {
                          const idx = li * PER_LAYER + ci;
                          const delay = `${(0.18 + idx * 0.01).toFixed(3)}s`;
                          if (!s)
                            return (
                              <div key={ci} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: cellPad, minHeight: cellMinH, border: '1px dashed rgba(60,60,67,0.16)', borderRadius: cellRadius, color: 'rgba(60,60,67,0.3)', animation: `pcFade .5s ease both`, animationDelay: delay }}>
                                <span style={{ fontSize: mob ? 10 : 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'rgba(60,60,67,0.26)' }}>{String(idx + 1).padStart(2, '0')}</span>
                                <span style={{ fontSize: mob ? 11 : 12 }}>空位</span>
                              </div>
                            );
                          const bad = unsubmitted.includes(s.id);
                          const latin = /^[\x00-\x7F]+$/.test(s.name);
                          return (
                            <button key={s.id} onClick={() => toggle(s.id)} aria-label={`${s.code}号 ${s.name}${bad ? '，未存' : '，已存'}`}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: cellPad, minHeight: cellMinH, border: 'none', borderRadius: cellRadius, cursor: 'pointer', textAlign: 'center', background: bad ? T.red : 'rgba(255,255,255,0.62)', color: bad ? '#fff' : T.ink, backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)', boxShadow: bad ? '0 10px 26px rgba(255,59,48,0.32)' : '0 1px 0 rgba(255,255,255,0.7) inset, 0 6px 20px rgba(0,0,0,0.05)', transition: `transform .22s ${T.ease}, background .25s, box-shadow .25s`, animation: `pcRise .5s ${T.ease} both`, animationDelay: delay }}>
                              <span style={{ fontSize: mob ? 10 : 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: bad ? 'rgba(255,255,255,0.75)' : T.ink4 }}>{s.code}</span>
                              <span style={vertical && !latin
                                ? { fontSize: 13, fontWeight: 500, lineHeight: 1.1, letterSpacing: '0.5px', writingMode: 'vertical-rl', textOrientation: 'upright', maxHeight: 58, overflow: 'hidden' } as React.CSSProperties
                                : { fontSize: vertical ? 10 : mob ? 13 : 15, fontWeight: 500, letterSpacing: '-0.2px', lineHeight: 1.25, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {view === 'stats' && (
          <>
            <header style={{ padding: 'clamp(34px,7vw,52px) 6px clamp(24px,5vw,34px)', animation: `pcRise .6s ${T.ease} .05s both` }}>
              <div style={{ fontSize: 'clamp(14px,3.6vw,15px)', fontWeight: 500, color: T.ink3 }}>近 {records.length} 次点验</div>
              <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(32px,8.6vw,46px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-1.4px' }}>统计</h1>
              <p style={{ margin: '12px 0 0', fontSize: 'clamp(16px,4.2vw,19px)', lineHeight: 1.5, color: T.ink2, maxWidth: 620 }}>
                整体合规率 {(avg * 100).toFixed(1)}%，共 {totalMisses} 人次未按规定存放。
              </p>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, padding: '0 6px 30px' }}>
              {[
                { v: `${(avg * 100).toFixed(1)}%`, l: '平均合规率', c: T.green },
                { v: String(totalMisses), l: '未存人次', c: T.ink },
                { v: String(records.filter(r => r.misses.length === 0).length), l: '全员齐备时段', c: T.ink },
              ].map(m => (
                <div key={m.l} style={{ ...card, padding: '22px 24px' }}>
                  <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-1.4px', fontVariantNumeric: 'tabular-nums', color: m.c }}>{m.v}</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'rgba(60,60,67,0.55)' }}>{m.l}</div>
                </div>
              ))}
            </div>
            <section style={{ padding: '0 6px 30px' }}>
              <h2 style={{ margin: '0 0 14px', padding: '0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>需要关注</h2>
              <div style={{ ...card, padding: '8px 6px' }}>
                {ranking.map(r => (
                  <div key={r.st!.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.3px' }}>{r.st!.name}</span>
                      <span style={{ fontSize: 13, color: T.ink3 }}>{r.st!.code} 号 · {r.st!.pinyinOrEn}</span>
                    </div>
                    {!narrow && (
                      <div style={{ width: mob ? 64 : 140, height: 5, borderRadius: 99, background: 'rgba(120,120,128,0.16)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${Math.round((r.count / maxMiss) * 100)}%`, height: '100%', borderRadius: 99, background: r.count >= maxMiss ? T.red : 'rgba(60,60,67,0.35)', transition: `width .4s ${T.ease}` }} />
                      </div>
                    )}
                    <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 28, textAlign: 'right' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ padding: '0 6px' }}>
              <h2 style={{ margin: '0 0 14px', padding: '0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>历史</h2>
              <div style={{ ...card, padding: '8px 6px' }}>
                {records.slice(0, 8).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.3px' }}>{r.date} · {r.slot}</span>
                      <span style={{ fontSize: 13, color: T.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.misses.length ? r.misses.map(id => students.find(s => s.id === id)?.name).join('、') : '全员按规定存放'}
                      </span>
                    </div>
                    <span style={{ padding: '5px 12px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: r.misses.length ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.13)', color: r.misses.length ? '#D70015' : T.greenInk }}>
                      {r.misses.length ? `未存 ${r.misses.length}` : '齐备'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* 底部浮动操作条 */}
      {view === 'inspection' && (
        <div style={{ position: 'fixed', left: 0, right: 0, zIndex: 40, bottom: mob ? 'calc(12px + env(safe-area-inset-bottom))' : 26, display: 'flex', justifyContent: 'center', padding: mob ? '0 12px' : '0 20px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: mob ? 12 : 18, width: mob ? '100%' : 'auto', padding: mob ? '9px 9px 9px 18px' : '10px 10px 10px 24px', borderRadius: 30, ...glass(0.66), boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 16px 44px rgba(0,0,0,0.14)', pointerEvents: 'auto', animation: `pcRise .6s ${T.ease} .25s both` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', color: list.length ? T.red : T.greenInk }}>
                {list.length === 0 ? '全员齐备' : `${list.length} 人未存`}
              </span>
              <span style={{ fontSize: 12, color: T.ink3 }}>{slot.name} · {((sub / (total || 1)) * 100).toFixed(1)}% 合规</span>
            </div>
            <button onClick={() => setSheetOpen(true)}
              style={{ padding: mob ? '14px 20px' : '14px 26px', border: 'none', borderRadius: 22, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 48, fontSize: 16, fontWeight: 600, color: '#fff', background: T.accent, boxShadow: `0 10px 26px ${T.accent}4d`, transition: `all .22s ${T.ease}` }}>
              生成通报
            </button>
          </div>
        </div>
      )}

      {/* 通报浮层：桌面居中卡片 / 手机底部抽屉 */}
      {sheetOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: mob ? 'flex-end' : 'center', justifyContent: 'center', padding: mob ? 0 : 24, background: 'rgba(0,0,0,0.24)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'pcFade .25s ease both' }}>
          <div onClick={() => setSheetOpen(false)} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: mob ? 'none' : 660, maxHeight: mob ? '92vh' : '86vh', overflowY: 'auto', padding: mob ? '22px 18px calc(26px + env(safe-area-inset-bottom))' : 28, borderRadius: mob ? '28px 28px 0 0' : 32, ...glass(0.88), boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 80px rgba(0,0,0,0.24)', animation: `${mob ? 'pcSheetUp .42s' : 'pcSheetIn .38s'} ${T.ease} both` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 'clamp(24px,6vw,28px)', fontWeight: 700, letterSpacing: '-0.9px' }}>通报</h2>
                <p style={{ margin: '6px 0 0', fontSize: 15, color: 'rgba(60,60,67,0.55)' }}>
                  {date} · {slot.name} {slot.time} · {list.length ? `未存 ${list.length} 人` : '全员齐备'}
                </p>
              </div>
              <button onClick={() => setSheetOpen(false)} aria-label="关闭" style={{ width: 34, height: 34, border: 'none', borderRadius: 99, background: 'rgba(120,120,128,0.14)', color: 'rgba(60,60,67,0.6)', fontSize: 17, cursor: 'pointer', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 3, margin: '22px 0 16px', padding: 3, borderRadius: 16, background: T.fill }}>
              {TEMPLATES.map(t => {
                const on = t.key === template;
                return (
                  <button key={t.key} onClick={() => { setTemplate(t.key); setEdited(null); }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 13, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: on ? 600 : 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : 'rgba(60,60,67,0.55)', boxShadow: on ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', transition: `all .22s ${T.ease}` }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
            <textarea value={notice} onChange={e => setEdited(e.target.value)} rows={13}
              style={{ width: '100%', padding: 18, border: 'none', borderRadius: 20, background: 'rgba(120,120,128,0.09)', fontSize: 14, lineHeight: 1.75, resize: 'vertical', fontFamily: T.font }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={copy} style={{ flex: 1, padding: 15, border: 'none', borderRadius: 18, background: T.fill, color: T.accent, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>仅复制</button>
              <button onClick={() => { copy(); archive(); }}
                style={{ flex: 2, padding: 15, border: 'none', borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#fff', background: copied ? T.green : T.accent, boxShadow: `0 10px 26px ${copied ? 'rgba(52,199,89,0.35)' : T.accent + '4d'}`, transition: `all .25s ${T.ease}` }}>
                {copied ? '已复制并归档' : '复制并归档'}
              </button>
            </div>
            <p style={{ margin: '14px 2px 0', fontSize: 13, lineHeight: 1.5, color: T.ink3 }}>文稿可直接编辑；切换模板或改动名单会按模板重新排版。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneInspectionApp;
