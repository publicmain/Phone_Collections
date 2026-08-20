import React from 'react';
import { Student } from '../types';
import { Smartphone, CheckCircle2, Circle, Pencil } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  onTogglePhone?: (id: number) => void;
  onEdit?: (student: Student) => void;
  isCheckInMode?: boolean;
  isSelected?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onTogglePhone,
  onEdit,
  isCheckInMode = false,
  isSelected = false,
}) => {
  return (
    <div
      id={`student-card-${student.code}`}
      className={`relative group flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 shadow-md scale-[1.02]'
          : isCheckInMode && student.phoneStored
          ? 'bg-blue-50/60 border-blue-200 hover:border-blue-300'
          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* Number Badge */}
        <span
          className={`font-mono text-base font-bold px-2 py-0.5 rounded-lg shrink-0 ${
            isSelected ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-white'
          }`}
        >
          {student.code}
        </span>

        {/* Student Name */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-zinc-900 tracking-tight text-base truncate">
              {student.name}
            </span>
          </div>
          {student.pinyinOrEn && student.pinyinOrEn !== student.name && (
            <span className="text-xs text-zinc-600 font-mono truncate">
              {student.pinyinOrEn}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-1.5 pl-2 shrink-0">
        {isCheckInMode ? (
          <button
            type="button"
            id={`btn-toggle-phone-${student.code}`}
            onClick={() => onTogglePhone && onTogglePhone(student.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              student.phoneStored
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title={student.phoneStored ? '已入箱 (点击设为未放)' : '未入箱 (点击设为已放)'}
          >
            {student.phoneStored ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>已入箱</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" />
                <span>未放</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            id={`btn-edit-${student.code}`}
            onClick={() => onEdit && onEdit(student)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 transition-opacity"
            title="修改学生信息"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
