import React, { useEffect, useState } from 'react';
import { Student } from './types';
import PhoneInspectionApp from './components/PhoneInspectionApp';
import { loadStoredStudents } from './utils/storage';
import { subscribeToClassData, saveRecordToCloud } from './utils/cloudSync';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => loadStoredStudents());
  const [className, setClassName] = useState('高二 (3) 班');

  useEffect(() => {
    const unsub = subscribeToClassData(
      ({ students: cloud, className: cn }) => {
        if (cloud && cloud.length) setStudents(cloud);
        if (cn) setClassName(cn);
      },
      err => console.warn('cloud offline', err)
    );
    return () => { if (unsub) unsub(); };
  }, []);

  return (
    <PhoneInspectionApp
      students={students}
      className={className}
      onArchive={rec => {
        saveRecordToCloud({
          id: `rec-${Date.now()}`,
          date: rec.date,
          timeSlot: 'custom',
          timeSlotLabel: rec.slot,
          totalStudents: students.length,
          submittedCount: students.length - rec.misses.length,
          unsubmittedCount: rec.misses.length,
          unsubmittedStudents: rec.misses.map(id => {
            const s = students.find(x => x.id === id)!;
            return { id: s.id, code: s.code, name: s.name };
          }),
          createdAt: new Date().toISOString(),
        } as any).catch(console.error);
      }}
    />
  );
}
