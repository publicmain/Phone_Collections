import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { X, Check } from 'lucide-react';

interface StudentEditModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: Student) => void;
}

export const StudentEditModal: React.FC<StudentEditModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pinyinOrEn, setPinyinOrEn] = useState('');
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (student) {
      setCode(student.code);
      setName(student.name);
      setPinyinOrEn(student.pinyinOrEn || '');
      setIsNew(student.isNew || false);
    } else {
      setCode('');
      setName('');
      setPinyinOrEn('');
      setIsNew(false);
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: student ? student.id : Date.now(),
      code: code.trim() || '99',
      name: name.trim(),
      pinyinOrEn: pinyinOrEn.trim(),
      isNew: isNew,
      phoneStored: student?.phoneStored || false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900">
            {student ? `编辑学生信息 (${student.code})` : '添加新学生'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              序号 / 编号 (如 07, 39)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              placeholder="01"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              姓名 (如 叶文轩 / Jiang Anqi)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              placeholder="请输入姓名"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              拼音 / 英文名 (选填)
            </label>
            <input
              type="text"
              value={pinyinOrEn}
              onChange={(e) => setPinyinOrEn(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              placeholder="如 Ye Wenxuan"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isNewCheck"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="isNewCheck" className="text-xs font-medium text-zinc-700">
              标记为「新同学」高亮徽章
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
