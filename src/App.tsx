import React, { useState, useEffect } from 'react';
import { Student } from './types';
import { PhoneSyncInspection } from './components/PhoneSyncInspection';
import { PhoneStatsAnalysis } from './components/PhoneStatsAnalysis';
import { loadStoredStudents } from './utils/storage';
import { subscribeToClassData } from './utils/cloudSync';
import {
  CheckSquare,
  BarChart3,
  Cloud,
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => loadStoredStudents());
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  
  // Real-time subscribe to cloud class and roster updates
  useEffect(() => {
    const unsub = subscribeToClassData(
      ({ students: cloudStudents }) => {
        if (cloudStudents && cloudStudents.length > 0) {
          setStudents(cloudStudents);
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Cloud sync offline or error', err);
        setIsCloudSynced(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Top Level Navigation: 'inspection' (现场核查与通报) | 'stats' (统计与分析)
  const [mainView, setMainView] = useState<'inspection' | 'stats'>('inspection');

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col antialiased">
      {/* Official Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Official Brand & System Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              管
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                学生手机定点存放管理系统
              </h1>
              <p className="text-xs text-slate-500">
                教学规范化管理 · 现场定时点验与官方通报
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setMainView('inspection')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
                mainView === 'inspection'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              现场点验与通报
            </button>

            <button
              onClick={() => setMainView('stats')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
                mainView === 'stats'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              统计与分析
            </button>
          </div>

          {/* Cloud Sync Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-600' : 'bg-amber-500'}`} />
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px]">{isCloudSynced ? '云端数据库连接正常' : '离线存储就绪'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full">
        {mainView === 'inspection' && (
          <PhoneSyncInspection
            students={students}
            onOpenStats={() => setMainView('stats')}
          />
        )}

        {mainView === 'stats' && (
          <PhoneStatsAnalysis
            students={students}
            onBackToInspection={() => setMainView('inspection')}
          />
        )}
      </main>

      {/* Minimal Formal Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>学生手机定点存放管理系统 · 规范化督导工作台</span>
          <span className="font-mono text-[11px]">数据多端实时云同步中</span>
        </div>
      </footer>
    </div>
  );
}
