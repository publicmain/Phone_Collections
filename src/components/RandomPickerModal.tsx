import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { Sparkles, Dices, RotateCcw, X, Volume2 } from 'lucide-react';

interface RandomPickerModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({ students, isOpen, onClose }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<Student[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!isOpen) return null;

  const startRoll = () => {
    if (isRolling || students.length === 0) return;
    setIsRolling(true);

    let counter = 0;
    const totalSteps = 25;
    const intervalTime = 60;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      setSelectedStudent(students[randomIndex]);
      counter++;

      if (counter >= totalSteps) {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalStudent = students[Math.floor(Math.random() * students.length)];
        setSelectedStudent(finalStudent);
        setIsRolling(false);
        setHistory((prev) => [finalStudent, ...prev.slice(0, 7)]);
      }
    }, intervalTime);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setHistory([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Dices className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-zinc-900">随机点名 / 抽选学生</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Area */}
        <div className="my-8 py-10 px-4 bg-gradient-to-b from-zinc-50 to-zinc-100/80 rounded-2xl border border-zinc-200/80 relative overflow-hidden">
          {selectedStudent ? (
            <div className="flex flex-col items-center justify-center space-y-2 animate-in zoom-in-75 duration-150">
              <span className="font-mono text-xs font-semibold px-3 py-1 bg-zinc-900 text-white rounded-full">
                编号 {selectedStudent.code}
              </span>
              <div className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {selectedStudent.name}
              </div>
              {selectedStudent.pinyinOrEn && selectedStudent.pinyinOrEn !== selectedStudent.name && (
                <div className="text-sm text-zinc-600 font-mono">
                  {selectedStudent.pinyinOrEn}
                </div>
              )}
              {selectedStudent.isNew && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md mt-1">
                  <Sparkles className="w-3 h-3" /> 新加入同学
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-600 py-4">
              <Dices className="w-12 h-12 stroke-[1.5] mb-2 opacity-50 text-zinc-600" />
              <p className="text-sm font-medium">点击下方按钮开始随机抽选</p>
            </div>
          )}
        </div>

        {/* Control Button */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={startRoll}
            disabled={isRolling}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-white text-base shadow-md transition-all ${
              isRolling
                ? 'bg-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98]'
            }`}
          >
            {isRolling ? '抽取中...' : '开始随机点名'}
          </button>
          {history.length > 0 && (
            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
              title="重置抽取记录"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-100 text-left">
            <span className="text-xs font-semibold text-zinc-600 block mb-2">最近抽中名单：</span>
            <div className="flex flex-wrap gap-1.5">
              {history.map((st, idx) => (
                <span
                  key={`${st.id}-${idx}`}
                  className="text-xs px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg font-medium"
                >
                  {st.code} {st.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
