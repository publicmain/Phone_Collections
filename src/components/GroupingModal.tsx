import React, { useState } from 'react';
import { Student } from '../types';
import { Users, Shuffle, X, Copy, Check } from 'lucide-react';

interface GroupingModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

export const GroupingModal: React.FC<GroupingModalProps> = ({ students, isOpen, onClose }) => {
  const [groupCount, setGroupCount] = useState<number>(4);
  const [groups, setGroups] = useState<Student[][]>([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateGroups = () => {
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    const result: Student[][] = Array.from({ length: groupCount }, () => []);

    shuffled.forEach((student, index) => {
      result[index % groupCount].push(student);
    });

    setGroups(result);
  };

  const handleCopyGroups = async () => {
    if (groups.length === 0) return;
    const text = groups
      .map(
        (grp, idx) =>
          `【第 ${idx + 1} 组 (${grp.length}人)】: ${grp.map((s) => `${s.code} ${s.name}`).join('、')}`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-zinc-200 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900">班级随机分组工具</h3>
              <p className="text-xs text-zinc-600">全班共 {students.length} 人</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 my-4 p-3 bg-zinc-50 rounded-xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-700">分成小组数量：</span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGroupCount(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    groupCount === num
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateGroups}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              重新随机分配
            </button>
            {groups.length > 0 && (
              <button
                onClick={handleCopyGroups}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制分组结果'}
              </button>
            )}
          </div>
        </div>

        {/* Groups Display Area */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((grp, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs hover:border-zinc-300 transition-all"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                    <span className="font-bold text-sm text-zinc-900">
                      第 {idx + 1} 组
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md font-medium">
                      {grp.length} 人
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.map((s) => (
                      <span
                        key={s.id}
                        className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                          s.isNew
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <span className="font-mono text-zinc-600 mr-1">{s.code}</span>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-600">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-zinc-600" />
              <p className="text-xs font-medium">请点击上方「重新随机分配」生成分组</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
