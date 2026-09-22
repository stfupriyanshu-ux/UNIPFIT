'use client';

import React, { useState, useEffect } from 'react';

interface RoutineItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function UNIPFitDashboard() {
  const [routines, setRoutines] = useState<RoutineItem[]>([
    { id: '1', title: 'Morning Workout (30 mins)', completed: true },
    { id: '2', title: 'Drink 3L Water', completed: true },
    { id: '3', title: 'Post-workout Protein Shake', completed: false },
    { id: '4', title: 'Evening Walk / Cardio', completed: false },
  ]);

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>('08:00');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW Registration Failed:', err));
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return;
    }

    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('UNIPFIT Reminders Enabled! ⚡', {
          body: `Daily workouts reminder set for ${reminderTime}`,
          icon: '/icons/icon-192.png',
        });
      } else {
        alert('Please allow notification permissions in browser settings.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const completedCount = routines.filter((r) => r.completed).length;
  const percentage = Math.round((completedCount / routines.length) * 100) || 0;

  const getReactionEmoji = (pct: number) => {
    if (pct === 0) return { emoji: '😴', label: "Let's Get Started!" };
    if (pct <= 35) return { emoji: '🐢', label: 'Warming Up...' };
    if (pct <= 70) return { emoji: '🔥', label: 'On Fire!' };
    if (pct < 100) return { emoji: '💪', label: 'Almost There!' };
    return { emoji: '👑', label: 'Beast Mode!' };
  };

  const reaction = getReactionEmoji(percentage);

  const toggleRoutine = (id: string) => {
    setRoutines((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const weeklyActivity = [
    { day: 'Mon', score: 80 },
    { day: 'Tue', score: 60 },
    { day: 'Wed', score: 100 },
    { day: 'Thu', score: 40 },
    { day: 'Fri', score: 90 },
    { day: 'Sat', score: 75 },
    { day: 'Sun', score: percentage },
  ];

  return (
    <div className="relative min-h-screen bg-[#0C0F22] text-white p-4 md:p-8 overflow-hidden font-sans">
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-fuchsia-600/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500">
              UNIPFIT
            </h1>
            <p className="text-xs text-gray-400 mt-1">Daily Routine & Activity Tracker</p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/15 animate-bounce">
            <span className="text-3xl">{reaction.emoji}</span>
            <div className="text-right">
              <div className="text-xs font-bold text-cyan-300">{reaction.label}</div>
              <div className="text-lg font-black text-white">{percentage}%</div>
            </div>
          </div>
        </header>

        <section className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span>📊</span> Weekly Activity Chart
          </h2>
          <div className="flex items-end justify-between h-44 gap-2 pt-6 px-2">
            {weeklyActivity.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.score}%
                </span>
                <div className="w-full bg-white/10 rounded-t-lg h-full max-h-[120px] flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-cyan-400 transition-all duration-500 ease-out rounded-t-lg"
                    style={{ height: `${item.score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
            <span>⚡</span> Today&apos;s Routine
          </h2>
          <div className="space-y-2">
            {routines.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleRoutine(item.id)}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                  item.completed
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className={`text-sm font-semibold ${item.completed ? 'line-through' : ''}`}>
                  {item.title}
                </span>
                <span className="text-xl">{item.completed ? '✅' : '⭕'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Workout Reminders</h3>
              <p className="text-xs text-gray-400">Notification Alert & Time Config</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!notificationsEnabled}
              className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 disabled:opacity-40"
            />
            <button
              onClick={handleNotificationToggle}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                notificationsEnabled ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
