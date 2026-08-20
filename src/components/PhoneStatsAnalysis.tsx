import React, { useState, useMemo, useEffect } from 'react';
import { Student, InspectionRecord, TimeSlotId, StudentStatSummary } from '../types';
import {
  loadInspectionRecords,
  deleteInspectionRecord,
  getDemoSeedRecords,
  saveInspectionRecords,
  clearAllRecords,
} from '../utils/storage';
import {
  subscribeToInspectionRecords,
  clearAllCloudRecords,
  deleteRecordFromCloud,
  batchSyncRecordsToCloud,
} from '../utils/cloudSync';
import {
  BarChart3,
  Calendar,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Clock,
  Search,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

interface PhoneStatsAnalysisProps {
  students: Student[];
  onBackToInspection?: () => void;
}

type ConfirmActionType =
  | { type: 'clear_all' }
  | { type: 'reset_demo' }
  | { type: 'delete_one'; id: string; label: string }
  | null;

export const PhoneStatsAnalysis: React.FC<PhoneStatsAnalysisProps> = ({
  students,
  onBackToInspection,
}) => {
  const [records, setRecords] = useState<InspectionRecord[]>(() => loadInspectionRecords());
  const [dateRangeFilter, setDateRangeFilter] = useState<'7days' | '30days' | 'all' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [slotFilter, setSlotFilter] = useState<'all' | TimeSlotId>('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [copiedWeeklyReport, setCopiedWeeklyReport] = useState<boolean>(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentStatSummary | null>(null);

  // In-app confirmation dialog and processing states
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show transient toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Real-time subscribe to cloud inspection records
  useEffect(() => {
    const unsub = subscribeToInspectionRecords((cloudRecords) => {
      setRecords(cloudRecords);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Execute confirmed modal action
  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);

    try {
      if (confirmAction.type === 'clear_all') {
        // 1. Clear local storage
        clearAllRecords();
        // 2. Clear Firestore collection
        await clearAllCloudRecords();
        // 3. Clear local state
        setRecords([]);
        showToast('已成功清空所有点验记录与统计数据');
      } else if (confirmAction.type === 'reset_demo') {
        const demo = getDemoSeedRecords();
        saveInspectionRecords(demo);
        await batchSyncRecordsToCloud(demo);
        setRecords(demo);
        showToast('已成功载入演示点验历史数据');
      } else if (confirmAction.type === 'delete_one') {
        const updated = deleteInspectionRecord(confirmAction.id);
        await deleteRecordFromCloud(confirmAction.id);
        setRecords(updated);
        showToast('已删除该条点验记录');
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
      showToast('操作执行失败，请检查网络后重试');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  // Filtered records based on date and slot
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      if (slotFilter !== 'all' && r.timeSlot !== slotFilter) {
        return false;
      }

      const recordDate = new Date(r.date);
      if (dateRangeFilter === '7days') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        past7.setHours(0, 0, 0, 0);
        return recordDate >= past7;
      }

      if (dateRangeFilter === '30days') {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        past30.setHours(0, 0, 0, 0);
        return recordDate >= past30;
      }

      if (dateRangeFilter === 'custom') {
        if (customStartDate && r.date < customStartDate) return false;
        if (customEndDate && r.date > customEndDate) return false;
      }

      return true;
    });
  }, [records, slotFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Overall KPI metrics
  const totalInspections = filteredRecords.length;
  const totalUnsubmittedEvents = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + curr.unsubmittedCount, 0);
  }, [filteredRecords]);

  const allClearInspections = useMemo(() => {
    return filteredRecords.filter((r) => r.unsubmittedCount === 0).length;
  }, [filteredRecords]);

  const averageComplianceRate = useMemo(() => {
    if (totalInspections === 0 || students.length === 0) return 100;
    const totalPossibleSubmissions = totalInspections * students.length;
    const actualSubmissions = totalPossibleSubmissions - totalUnsubmittedEvents;
    return Math.max(0, Math.min(100, (actualSubmissions / totalPossibleSubmissions) * 100));
  }, [totalInspections, students.length, totalUnsubmittedEvents]);

  // Student Unsubmitted Ranking Aggregation
  const studentRankings = useMemo<StudentStatSummary[]>(() => {
    const map = new Map<number, StudentStatSummary>();

    students.forEach((s) => {
      map.set(s.id, {
        studentId: s.id,
        code: s.code,
        name: s.name,
        unsubmittedTotal: 0,
        morningCount: 0,
        noonCount: 0,
        eveningCount: 0,
        customCount: 0,
        rate: 0,
      });
    });

    filteredRecords.forEach((rec) => {
      rec.unsubmittedStudents.forEach((unSub) => {
        const existing = map.get(unSub.id);
        if (existing) {
          existing.unsubmittedTotal += 1;
          if (rec.timeSlot === 'morning') existing.morningCount += 1;
          else if (rec.timeSlot === 'noon') existing.noonCount += 1;
          else if (rec.timeSlot === 'evening') existing.eveningCount += 1;
          else existing.customCount += 1;

          if (!existing.lastUnsubmittedDate || rec.date > existing.lastUnsubmittedDate) {
            existing.lastUnsubmittedDate = `${rec.date} ${rec.timeSlotLabel}`;
          }
        }
      });
    });

    const result = Array.from(map.values()).map((item) => ({
      ...item,
      rate: totalInspections > 0 ? (item.unsubmittedTotal / totalInspections) * 100 : 0,
    }));

    return result.sort((a, b) => {
      if (b.unsubmittedTotal !== a.unsubmittedTotal) {
        return b.unsubmittedTotal - a.unsubmittedTotal;
      }
      return a.code.localeCompare(b.code);
    });
  }, [students, filteredRecords, totalInspections]);

  // Filter student rankings by search
  const filteredRankings = useMemo(() => {
    const q = searchStudentQuery.trim().toLowerCase();
    if (!q) return studentRankings;
    return studentRankings.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.includes(q)
    );
  }, [studentRankings, searchStudentQuery]);

  // Timeslot Breakdown Stats
  const slotBreakdown = useMemo(() => {
    let morning = 0;
    let noon = 0;
    let evening = 0;
    let custom = 0;

    filteredRecords.forEach((r) => {
      if (r.timeSlot === 'morning') morning += r.unsubmittedCount;
      else if (r.timeSlot === 'noon') noon += r.unsubmittedCount;
      else if (r.timeSlot === 'evening') evening += r.unsubmittedCount;
      else custom += r.unsubmittedCount;
    });

    const total = morning + noon + evening + custom || 1;
    return {
      morning,
      morningPercent: Math.round((morning / total) * 100),
      noon,
      noonPercent: Math.round((noon / total) * 100),
      evening,
      eveningPercent: Math.round((evening / total) * 100),
      custom,
      customPercent: Math.round((custom / total) * 100),
    };
  }, [filteredRecords]);

  // Generate Formal Summary Text
  const generateWeeklyReportText = () => {
    const top3 = studentRankings
      .filter((s) => s.unsubmittedTotal > 0)
      .slice(0, 5)
      .map((s) => `${s.code}号 ${s.name}（累计未存 ${s.unsubmittedTotal} 次）`)
      .join('、');

    const perfectCount = studentRankings.filter((s) => s.unsubmittedTotal === 0).length;
    const periodLabel =
      dateRangeFilter === '7days'
        ? '近7天（周度）'
        : dateRangeFilter === '30days'
        ? '近30天（月度）'
        : '全部历史周期';

    return `关于学生手机定点存放情况的周期分析通报

一、统计周期与总体概况
1. 统计周期：${periodLabel}
2. 点验总次数：${totalInspections} 次
3. 班级平均收存合规率：${averageComplianceRate.toFixed(1)}%
4. 全员齐备达标次数：${allClearInspections} 次
5. 累计未按规范入箱：${totalUnsubmittedEvents} 人次

二、各时段未按规定存放分布
1. 晨读早自习（08:55）：${slotBreakdown.morning} 人次（占比 ${slotBreakdown.morningPercent}%）
2. 午休后课前（13:30）：${slotBreakdown.noon} 人次（占比 ${slotBreakdown.noonPercent}%）
3. 晚自习收纳（18:00）：${slotBreakdown.evening} 人次（占比 ${slotBreakdown.eveningPercent}%）

三、重点关注与表扬名单
1. 重点督导关注名单：${top3 ? top3 : '无（全体同学在此周期内均按时存放）'}
2. 全程规范存放表扬：全班共有 ${perfectCount} 名同学全程 100% 遵守管理规定，特此通报表扬。

四、管理要求
请全体同学严格遵守校规校纪，共同维护规范有序的学习环境。

班级规范化管理工作组`;
  };

  const handleCopyWeeklyReport = async () => {
    const text = generateWeeklyReportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWeeklyReport(true);
      setTimeout(() => setCopiedWeeklyReport(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['学号', '姓名', '未存总次数', '早自习未存', '午自习未存', '晚自习未存', '未存率(%)', '最近未存时间'];
    const rows = studentRankings.map((s) => [
      s.code,
      s.name,
      s.unsubmittedTotal,
      s.morningCount,
      s.noonCount,
      s.eveningCount,
      s.rate.toFixed(1),
      s.lastUnsubmittedDate || '无',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `手机点验统计报表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 relative">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Filter & Action Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {onBackToInspection && (
              <button
                onClick={onBackToInspection}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回现场点验
              </button>
            )}
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              点验数据报表与合规分析
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWeeklyReport}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                copiedWeeklyReport ? 'bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedWeeklyReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWeeklyReport ? '已复制分析通报' : '复制周期通报'}
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              导出报表 (CSV)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">统计周期：</span>
            <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setDateRangeFilter('7days')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  dateRangeFilter === '7days' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                近7天
              </button>
              <button
                onClick={() => setDateRangeFilter('30days')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  dateRangeFilter === '30days' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                近30天
              </button>
              <button
                onClick={() => setDateRangeFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  dateRangeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                全部记录
              </button>
            </div>

            <span className="text-slate-300 mx-1">|</span>

            <span className="text-slate-500 font-medium">时段筛选：</span>
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value as any)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden"
            >
              <option value="all">全部核查时段</option>
              <option value="morning">晨读前 (08:55)</option>
              <option value="noon">预备前 (13:30)</option>
              <option value="evening">晚自习 (18:00)</option>
              <option value="custom">临时核查</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmAction({ type: 'reset_demo' })}
              className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
            >
              载入演示数据
            </button>
            <button
              onClick={() => setConfirmAction({ type: 'clear_all' })}
              className="text-[11px] text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded transition-colors font-medium"
            >
              清空数据
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">累计核查次数</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalInspections} <span className="text-xs font-normal text-slate-500">次</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">平均收存合规率</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {averageComplianceRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">全员齐备达标率</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalInspections > 0 ? Math.round((allClearInspections / totalInspections) * 100) : 0}%
            <span className="text-xs font-normal text-slate-500 ml-1.5">({allClearInspections}/{totalInspections})</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">未按规定存放累计</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 mt-1">
            {totalUnsubmittedEvents} <span className="text-xs font-normal text-slate-500">人次</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Frequency Rankings (Left) + Detailed Logs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Student Missing Frequency Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                学生未按规定存放频次汇总
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                按未按时存放发生次数降序排列，用于日常重点督导关注。
              </p>
            </div>

            <div className="relative w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="搜索姓名或编号..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-700">
                  <th className="py-2 px-2.5 font-semibold">编号</th>
                  <th className="py-2 px-2.5 font-semibold">姓名</th>
                  <th className="py-2 px-2.5 font-semibold text-center">累计未存</th>
                  <th className="py-2 px-2.5 font-semibold text-center">早自习</th>
                  <th className="py-2 px-2.5 font-semibold text-center">午自习</th>
                  <th className="py-2 px-2.5 font-semibold text-center">晚自习</th>
                  <th className="py-2 px-2.5 font-semibold">最近未存记录</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredRankings.slice(0, 20).map((st) => (
                  <tr
                    key={st.studentId}
                    className={`hover:bg-slate-50 transition-colors ${st.unsubmittedTotal > 0 ? 'bg-rose-50/20' : ''}`}
                  >
                    <td className="py-2 px-2.5 font-mono text-slate-500">{st.code}</td>
                    <td className="py-2 px-2.5 font-medium">{st.name}</td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold">
                      {st.unsubmittedTotal > 0 ? (
                        <span className="text-rose-700">{st.unsubmittedTotal}次</span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600">{st.morningCount || '-'}</td>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600">{st.noonCount || '-'}</td>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600">{st.eveningCount || '-'}</td>
                    <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px] truncate max-w-[140px]">
                      {st.lastUnsubmittedDate || '全程齐备'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Historical Inspection Logs */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              点验流水记录 ({filteredRecords.length} 条)
            </h3>
            <span className="text-xs text-slate-500">按时间倒序</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-slate-700">暂无点验历史记录</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">您可以在现场点验页面点击“保存本次点验记录”，或载入演示数据体验。</div>
                </div>
                <button
                  onClick={() => setConfirmAction({ type: 'reset_demo' })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  载入演示数据
                </button>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{record.date}</span>
                      <span className="text-slate-500 font-normal">{record.timeSlotLabel}</span>
                    </div>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'delete_one',
                          id: record.id,
                          label: `${record.date} ${record.timeSlotLabel}`,
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                      title="删除此记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                    <span>实存 {record.submittedCount} / 应存 {record.totalStudents}</span>
                    <span className={`font-medium ${record.unsubmittedCount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {record.unsubmittedCount === 0 ? '全员交齐' : `未存 ${record.unsubmittedCount} 人`}
                    </span>
                  </div>

                  {record.unsubmittedStudents && record.unsubmittedStudents.length > 0 && (
                    <div className="pt-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                      <span className="text-slate-500 font-medium">未存名单：</span>
                      {record.unsubmittedStudents.map((s) => `${s.code}号 ${s.name}`).join('、')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal (Iframe-safe, beautifully styled) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmAction.type === 'clear_all' || confirmAction.type === 'delete_one'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {confirmAction.type === 'clear_all' || confirmAction.type === 'delete_one' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmAction.type === 'clear_all' && '确定清空所有点验历史记录？'}
                  {confirmAction.type === 'reset_demo' && '确定载入演示点验历史数据？'}
                  {confirmAction.type === 'delete_one' && '确定删除单条点验记录？'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmAction.type === 'clear_all' &&
                    '此操作将永久清空本地与云端数据库中的所有历史点验流水与学生未交频次统计数据。此操作不可逆，请谨慎操作。'}
                  {confirmAction.type === 'reset_demo' &&
                    '此操作将加载系统内置的模拟点验历史流水（过去5天的早/中/晚自习数据），便于查看报表效果。'}
                  {confirmAction.type === 'delete_one' &&
                    `将删除【${confirmAction.label}】的点验记录，删除后相关统计指标将重新计算。`}
                </p>
              </div>
              <button
                disabled={isProcessing}
                onClick={() => setConfirmAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                disabled={isProcessing}
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition-colors"
              >
                取消
              </button>
              <button
                disabled={isProcessing}
                onClick={handleExecuteConfirmedAction}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium text-white transition-colors shadow-xs ${
                  confirmAction.type === 'clear_all' || confirmAction.type === 'delete_one'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmAction.type === 'clear_all' && (isProcessing ? '正在清空...' : '确认清空全部数据')}
                {confirmAction.type === 'reset_demo' && (isProcessing ? '正在载入...' : '确认载入演示数据')}
                {confirmAction.type === 'delete_one' && (isProcessing ? '正在删除...' : '确认删除')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

