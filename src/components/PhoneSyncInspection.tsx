import React, { useState, useMemo, useEffect } from 'react';
import { Student, TimeSlotId, InspectionRecord, NoticeConfig } from '../types';
import {
  TIME_SLOTS,
  detectCurrentTimeSlot,
  getTodayDateString,
  addInspectionRecord,
  getStoredClassName,
  setStoredClassName,
  getStoredNoticeConfig,
  saveStoredNoticeConfig,
  resetStoredNoticeConfig,
  DEFAULT_NOTICE_CONFIG,
} from '../utils/storage';
import { saveRecordToCloud, syncClassDataToCloud, syncNoticeConfigToCloud, subscribeToClassData } from '../utils/cloudSync';
import {
  Copy,
  Check,
  Calendar,
  Clock,
  Save,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Settings2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';

interface PhoneSyncInspectionProps {
  students: Student[];
  onRecordSaved?: (record: InspectionRecord) => void;
  onOpenStats?: () => void;
}

export const PhoneSyncInspection: React.FC<PhoneSyncInspectionProps> = ({
  students,
  onRecordSaved,
  onOpenStats,
}) => {
  // Current inspection states
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedSlotId, setSelectedSlotId] = useState<TimeSlotId>(() => detectCurrentTimeSlot());
  const [customTime, setCustomTime] = useState<string>('15:40');
  const [className, setClassName] = useState<string>(getStoredClassName());
  const [isEditingClassName, setIsEditingClassName] = useState<boolean>(false);

  // Unsubmitted student ID set (students who haven't handed in phones)
  // Default: empty set (everyone handed in)
  const [unsubmittedIds, setUnsubmittedIds] = useState<Set<number>>(new Set());

  // Stored Notice Configuration
  const initialNoticeConfig = useMemo(() => getStoredNoticeConfig(), []);
  
  const [templateType, setTemplateType] = useState<NoticeConfig['templateType']>(
    initialNoticeConfig.templateType || 'standard'
  );
  const [includeStudentCodes, setIncludeStudentCodes] = useState<boolean>(
    initialNoticeConfig.includeStudentCodes ?? true
  );
  const [customNoticeNote, setCustomNoticeNote] = useState<string>(
    initialNoticeConfig.customNoticeNote || DEFAULT_NOTICE_CONFIG.customNoticeNote
  );
  const [customSignature, setCustomSignature] = useState<string>(
    initialNoticeConfig.customSignature || DEFAULT_NOTICE_CONFIG.customSignature
  );
  const [customHeaderTitle, setCustomHeaderTitle] = useState<string>(
    initialNoticeConfig.customHeaderTitle || DEFAULT_NOTICE_CONFIG.customHeaderTitle || '关于学生手机定点存放点验情况的通告'
  );

  // Transient local edit override (never saved to database/storage so it never freezes student names!)
  const [userEditedNoticeText, setUserEditedNoticeText] = useState<string | null>(null);

  // Cloud sync status indicators
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastSyncTimeStr, setLastSyncTimeStr] = useState<string>('');

  // Real-time subscribe to Firestore template configurations
  useEffect(() => {
    const unsub = subscribeToClassData(
      ({ className: cloudClassName, noticeConfig: cloudConfig }) => {
        if (cloudClassName) {
          setClassName(cloudClassName);
        }
        if (cloudConfig) {
          if (cloudConfig.templateType) setTemplateType(cloudConfig.templateType);
          if (cloudConfig.includeStudentCodes !== undefined) setIncludeStudentCodes(cloudConfig.includeStudentCodes);
          if (cloudConfig.customNoticeNote !== undefined) setCustomNoticeNote(cloudConfig.customNoticeNote);
          if (cloudConfig.customSignature !== undefined) setCustomSignature(cloudConfig.customSignature);
          if (cloudConfig.customHeaderTitle !== undefined) setCustomHeaderTitle(cloudConfig.customHeaderTitle);
          setLastSyncTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      },
      (err) => {
        console.warn('Real-time sync listener notice error:', err);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // UI accordion / status states
  const [showTemplateSettings, setShowTemplateSettings] = useState<boolean>(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Helper to persist notice configurations (only formatting & rules, zero student names!)
  const persistNoticeConfig = (updates: Partial<NoticeConfig>) => {
    const currentConfig: NoticeConfig = {
      templateType,
      includeStudentCodes,
      customNoticeNote,
      customSignature,
      customHeaderTitle,
      ...updates,
    };
    saveStoredNoticeConfig(currentConfig);
    setIsCloudSyncing(true);
    syncNoticeConfigToCloud(currentConfig)
      .then(() => {
        setIsCloudSyncing(false);
        setLastSyncTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      })
      .catch((err) => {
        setIsCloudSyncing(false);
        console.error(err);
      });
  };

  // Auto-detect slot label
  const activeSlotConfig = useMemo(() => {
    return TIME_SLOTS.find((s) => s.id === selectedSlotId) || TIME_SLOTS[0];
  }, [selectedSlotId]);

  const activeSlotLabel = useMemo(() => {
    if (selectedSlotId === 'custom') {
      return `临时核查 (${customTime})`;
    }
    return activeSlotConfig.periodName;
  }, [selectedSlotId, customTime, activeSlotConfig]);

  // Derived lists
  const unsubmittedStudents = useMemo(() => {
    return students
      .filter((s) => unsubmittedIds.has(s.id))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [students, unsubmittedIds]);

  const submittedCount = students.length - unsubmittedStudents.length;

  // Toggle single student status
  const handleToggleStudent = (id: number) => {
    setUserEditedNoticeText(null);
    setUnsubmittedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick batch actions
  const handleMarkAllSubmitted = () => {
    setUserEditedNoticeText(null);
    setUnsubmittedIds(new Set());
  };

  const handleMarkAllUnsubmitted = () => {
    setUserEditedNoticeText(null);
    setUnsubmittedIds(new Set(students.map((s) => s.id)));
  };

  // Generate Notice Text (Official, Formal, Zero Emojis)
  const generatedNoticeText = useMemo(() => {
    const unsubmittedNames = unsubmittedStudents.map((s) =>
      includeStudentCodes ? `${s.code}号 ${s.name}` : s.name
    );

    const isAllSubmitted = unsubmittedStudents.length === 0;
    const complianceRate = students.length > 0 ? ((submittedCount / students.length) * 100).toFixed(1) : '100.0';
    const headerTitle = customHeaderTitle?.trim() || '关于学生手机定点存放点验情况的通告';
    const signatureText = customSignature.includes(className)
      ? customSignature
      : `${className} ${customSignature}`;

    // Standard Formal Official Notice Template
    if (templateType === 'standard') {
      if (isAllSubmitted) {
        return `${headerTitle}

一、检查基本情况
【检查班级】：${className}
【检查日期】：${selectedDate}
【核查时段】：${activeSlotLabel}
【应存人数】：${students.length} 人
【实存人数】：${submittedCount} 人
【未存人数】：0 人
【收存合规率】：100.0%

二、检查结果
经核查，本时段全体同学均已严格按照学校移动通讯设备管理规范将手机存入指定编号箱位，全员存放齐备，特此通报表扬。

三、管理要求
请全体同学继续保持严谨自律的学习风貌，共同维护良好的课堂教学秩序。

${signatureText}
${selectedDate}`;
      }

      return `${headerTitle}

一、检查基本情况
【检查班级】：${className}
【检查日期】：${selectedDate}
【核查时段】：${activeSlotLabel}
【应存人数】：${students.length} 人
【实存人数】：${submittedCount} 人
【未存人数】：${unsubmittedStudents.length} 人
【收存合规率】：${complianceRate}%

二、未按规定存放学生名单（共 ${unsubmittedStudents.length} 人）
${unsubmittedNames.join('、')}

三、管理规定与整改要求
${customNoticeNote}

${signatureText}
${selectedDate}`;
    }

    // Simple Official Template
    if (templateType === 'simple') {
      if (isAllSubmitted) {
        return `【${className} 手机存放点验通报】
日期时段：${selectedDate} ${activeSlotLabel}
应存：${students.length}人 | 实存：${submittedCount}人 | 未存：0人
核查结论：全员已按规定完成手机定点存放。
落款：${signatureText}`;
      }
      return `【${className} 手机存放点验通报】
日期时段：${selectedDate} ${activeSlotLabel}
应存：${students.length}人 | 实存：${submittedCount}人 | 未存：${unsubmittedStudents.length}人
未存名单：${unsubmittedNames.join('、')}
管理要求：${customNoticeNote}
落款：${signatureText}`;
    }

    // Compact Template
    if (templateType === 'compact') {
      if (isAllSubmitted) {
        return `[${selectedDate} ${activeSlotLabel}] ${className}手机存放点验通报：应存${students.length}人，实存${submittedCount}人，全员已交齐。(${signatureText})`;
      }
      return `[${selectedDate} ${activeSlotLabel}] ${className}手机存放点验通报：应存${students.length}人，实存${submittedCount}人，未存${unsubmittedStudents.length}人（名单：${unsubmittedNames.join('、')}）。${customNoticeNote} (${signatureText})`;
    }

    // Raw Names List
    return unsubmittedStudents.map((s) => (includeStudentCodes ? `${s.code} ${s.name}` : s.name)).join('\n');
  }, [
    className,
    selectedDate,
    activeSlotLabel,
    students.length,
    submittedCount,
    unsubmittedStudents,
    templateType,
    includeStudentCodes,
    customNoticeNote,
    customSignature,
    customHeaderTitle,
  ]);

  // The active final notice text
  const activeNoticeText = userEditedNoticeText !== null ? userEditedNoticeText : generatedNoticeText;

  // Handle user manual temporary editing in the textarea
  const handleNoticeTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserEditedNoticeText(e.target.value);
  };

  // Re-generate notice text from template
  const handleRegenerateFromTemplate = () => {
    setUserEditedNoticeText(null);
  };

  // Reset to factory defaults
  const handleResetFactoryDefaults = () => {
    const def = resetStoredNoticeConfig();
    setTemplateType(def.templateType);
    setIncludeStudentCodes(def.includeStudentCodes);
    setCustomNoticeNote(def.customNoticeNote);
    setCustomSignature(def.customSignature);
    setCustomHeaderTitle(def.customHeaderTitle || '关于学生手机定点存放点验情况的通告');
    setUserEditedNoticeText(null);
    syncNoticeConfigToCloud(def).catch(console.error);
    setTemplateSaveSuccess(true);
    setTimeout(() => setTemplateSaveSuccess(false), 2000);
  };

  // Explicit Save as Default Template button
  const handleSaveAsDefaultTemplate = () => {
    persistNoticeConfig({});
    setTemplateSaveSuccess(true);
    setTimeout(() => setTemplateSaveSuccess(false), 2000);
  };

  // Copy to clipboard
  const handleCopyNotice = async () => {
    try {
      await navigator.clipboard.writeText(activeNoticeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Record
  const handleSaveRecord = (andCopy: boolean = false) => {
    const record: InspectionRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: selectedDate,
      timeSlot: selectedSlotId,
      timeSlotLabel: activeSlotLabel,
      customTime: selectedSlotId === 'custom' ? customTime : undefined,
      totalStudents: students.length,
      submittedCount,
      unsubmittedCount: unsubmittedStudents.length,
      unsubmittedStudents: unsubmittedStudents.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
      })),
      note: unsubmittedStudents.length === 0 ? '全员交齐' : `未交${unsubmittedStudents.length}人`,
      createdAt: new Date().toISOString(),
    };

    addInspectionRecord(record);
    saveRecordToCloud(record).catch(console.error);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    if (onRecordSaved) {
      onRecordSaved(record);
    }

    if (andCopy) {
      handleCopyNotice();
    }
  };

  const handleSaveClassName = () => {
    setStoredClassName(className);
    syncClassDataToCloud(className, students).catch(console.error);
    setIsEditingClassName(false);
  };

  return (
    <div className="space-y-5">
      {/* Official Status Control Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">核查对象：</span>
              {isEditingClassName ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="px-2 py-0.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveClassName}
                    className="px-2 py-0.5 text-xs bg-slate-900 text-white rounded font-medium"
                  >
                    确认
                  </button>
                </div>
              ) : (
                <span
                  onClick={() => setIsEditingClassName(true)}
                  className="cursor-pointer text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                  title="点击修改班级名称"
                >
                  {className} (点击修改)
                </span>
              )}
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
              <span>应存：<strong className="text-slate-900 font-mono">{students.length}</strong> 人</span>
              <span>实存：<strong className="text-slate-900 font-mono">{submittedCount}</strong> 人</span>
              <span>未存：<strong className={`font-mono ${unsubmittedStudents.length > 0 ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>{unsubmittedStudents.length}</strong> 人</span>
              <span>合规率：<strong className="text-slate-900 font-mono">{((submittedCount / (students.length || 1)) * 100).toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Official Time Slot Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`flex flex-col items-start p-2.5 rounded border text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                    {slot.name}
                  </span>
                </div>
                <div className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {slot.id === 'custom' ? (
                    <input
                      type="text"
                      value={customTime}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCustomTime(e.target.value)}
                      placeholder="如 15:40"
                      className="w-16 px-1 py-0.2 bg-slate-800 text-white border border-slate-600 rounded text-[11px] font-mono focus:outline-hidden"
                    />
                  ) : (
                    slot.time
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid & Official Notice Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Physical Locker Grid */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                手机定点存放柜位点验表（共 {students.length} 位）
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                现场巡查时，若发现对应槽位未按规定入箱，点击该学生方格即可标记为未存。
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleMarkAllSubmitted}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded border border-slate-200 transition-colors"
              >
                全员已存
              </button>
              <button
                onClick={handleMarkAllUnsubmitted}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded border border-slate-200 transition-colors"
              >
                重置点验
              </button>
            </div>
          </div>

          {/* Status Indicator Legend */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded text-xs text-slate-600 border border-slate-200">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-white border border-slate-300 inline-block" />
                <span>已按规定存放 ({submittedCount})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-rose-700 border border-rose-800 inline-block" />
                <span className="text-rose-800 font-semibold">未按规定存放 ({unsubmittedStudents.length})</span>
              </span>
            </div>
            <span className="font-mono text-[11px]">
              收存合规状态：{unsubmittedStudents.length === 0 ? '规范齐备' : `存在缺交 (${unsubmittedStudents.length})`}
            </span>
          </div>

          {/* Grid Layout (5 Rows x 9 Columns) */}
          <div className="space-y-2 select-none pt-1">
            {Array.from({ length: 5 }).map((_, rowIdx) => {
              const rowStudents = students.slice(rowIdx * 9, (rowIdx + 1) * 9);
              return (
                <div key={`row-${rowIdx}`} className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-400 px-0.5">
                    第 {rowIdx + 1} 层 (槽位 {rowIdx * 9 + 1} - {Math.min((rowIdx + 1) * 9, students.length)})
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                    {rowStudents.map((student) => {
                      const isUnsubmitted = unsubmittedIds.has(student.id);
                      return (
                        <button
                          key={student.id}
                          id={`box-cell-${student.code}`}
                          type="button"
                          onClick={() => handleToggleStudent(student.id)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded border transition-colors min-h-[54px] ${
                            isUnsubmitted
                              ? 'bg-rose-700 border-rose-800 text-white font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] px-1 rounded-xs leading-tight mb-0.5 ${
                              isUnsubmitted ? 'bg-rose-900 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {student.code}
                          </span>
                          <span className="text-xs leading-tight truncate w-full text-center">
                            {student.name}
                          </span>
                        </button>
                      );
                    })}

                    {/* Empty Slots */}
                    {rowStudents.length < 9 &&
                      Array.from({ length: 9 - rowStudents.length }).map((_, emptyIdx) => (
                        <div
                          key={`empty-${emptyIdx}`}
                          className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center p-1.5 text-center text-slate-300 min-h-[54px]"
                        >
                          <span className="text-[10px] font-mono">{rowIdx * 9 + rowStudents.length + emptyIdx + 1}</span>
                          <span className="text-[10px]">无</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Official Notice Dispatcher */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">通报文稿与分发</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                unsubmittedStudents.length === 0 ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'
              }`}>
                {unsubmittedStudents.length === 0 ? '全员齐备' : `未存 ${unsubmittedStudents.length} 人`}
              </span>
            </div>

            {/* Unsubmitted List Tally */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1 flex justify-between">
                <span>未按规定存放名单：</span>
                <span className="font-mono text-slate-500">{unsubmittedStudents.length} / {students.length}</span>
              </div>
              {unsubmittedStudents.length === 0 ? (
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-center text-xs text-slate-600">
                  经核查，本时段全班学生手机均已按规定入箱。
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 p-2 bg-rose-50 rounded border border-rose-200 max-h-28 overflow-y-auto">
                  {unsubmittedStudents.map((st) => (
                    <span
                      key={st.id}
                      onClick={() => handleToggleStudent(st.id)}
                      className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-rose-300 text-rose-800 rounded text-xs hover:bg-rose-100 transition-colors"
                      title="点击可直接标记为已存"
                    >
                      <span className="font-mono text-[10px] text-rose-600">{st.code}</span>
                      <span>{st.name}</span>
                      <span className="text-rose-400 text-[10px]">✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>公文通报格式：</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={includeStudentCodes}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeStudentCodes(val);
                        persistNoticeConfig({ includeStudentCodes: val });
                      }}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0"
                    />
                    包含编号
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTemplateSettings(!showTemplateSettings)}
                    className="inline-flex items-center gap-0.5 text-slate-700 hover:text-slate-900 text-[11px] underline"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>设置</span>
                    {showTemplateSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded text-xs font-medium text-center">
                <button
                  onClick={() => {
                    setTemplateType('standard');
                    setUserEditedNoticeText(null);
                    persistNoticeConfig({ templateType: 'standard' });
                  }}
                  className={`py-1 rounded transition-colors ${
                    templateType === 'standard' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  规范公文
                </button>
                <button
                  onClick={() => {
                    setTemplateType('simple');
                    setUserEditedNoticeText(null);
                    persistNoticeConfig({ templateType: 'simple' });
                  }}
                  className={`py-1 rounded transition-colors ${
                    templateType === 'simple' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  简明通报
                </button>
                <button
                  onClick={() => {
                    setTemplateType('compact');
                    setUserEditedNoticeText(null);
                    persistNoticeConfig({ templateType: 'compact' });
                  }}
                  className={`py-1 rounded transition-colors ${
                    templateType === 'compact' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  单行摘要
                </button>
                <button
                  onClick={() => {
                    setTemplateType('raw');
                    setUserEditedNoticeText(null);
                    persistNoticeConfig({ templateType: 'raw' });
                  }}
                  className={`py-1 rounded transition-colors ${
                    templateType === 'raw' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  名单纯文本
                </button>
              </div>
            </div>

            {/* Template Settings Form */}
            {showTemplateSettings && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-800 pb-1 border-b border-slate-200">
                  <span>公文通报格式配置</span>
                  <button
                    type="button"
                    onClick={handleResetFactoryDefaults}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-normal"
                  >
                    恢复初始设置
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">公文标题：</label>
                  <input
                    type="text"
                    value={customHeaderTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomHeaderTitle(val);
                      persistNoticeConfig({ customHeaderTitle: val });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">管理规定与整改说明：</label>
                  <textarea
                    rows={2}
                    value={customNoticeNote}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomNoticeNote(val);
                      persistNoticeConfig({ customNoticeNote: val });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-hidden resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">落款部门：</label>
                  <input
                    type="text"
                    value={customSignature}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomSignature(val);
                      persistNoticeConfig({ customSignature: val });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAsDefaultTemplate}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium"
                  >
                    保存配置
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Notice Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">通报文稿预览（可直接编辑）：</span>
                {userEditedNoticeText !== null && (
                  <button
                    onClick={handleRegenerateFromTemplate}
                    className="text-slate-700 hover:text-slate-900 underline flex items-center gap-0.5 text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    按模板重新排版
                  </button>
                )}
              </div>

              <textarea
                value={activeNoticeText}
                onChange={handleNoticeTextChange}
                rows={9}
                className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 leading-relaxed resize-y focus:outline-hidden focus:border-slate-500"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncing ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                  <span>{isCloudSyncing ? '正在云端同步...' : `云端已同步 ${lastSyncTimeStr ? `(${lastSyncTimeStr})` : ''}`}</span>
                </span>
                {templateSaveSuccess && (
                  <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3" /> 已保存
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                id="btn-copy-and-save"
                onClick={() => handleSaveRecord(true)}
                className={`w-full py-2.5 px-4 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  copied ? 'bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制通报并归档记录' : '一键复制通报文本并归档'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyNotice}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  仅复制文本
                </button>

                <button
                  onClick={() => handleSaveRecord(false)}
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  仅保存记录
                </button>
              </div>

              {savedSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>已成功归档【{selectedDate} {activeSlotLabel}】点验数据。</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
