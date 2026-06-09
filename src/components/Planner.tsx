import React, { useState } from 'react';
import { StudyPlan, StudyLog } from '../types';
import { 
  Calendar, 
  Trash2, 
  Plus, 
  TrendingUp, 
  BookOpen, 
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface PlannerProps {
  plans: StudyPlan[];
  logs: StudyLog[];
  onAddPlan: (plan: StudyPlan) => void;
  onDeletePlan: (id: string) => void;
}

export default function Planner({ plans, logs, onAddPlan, onDeletePlan }: PlannerProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM
  });
  const [subject, setSubject] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Common subject quick selection
  const commonSubjects = ['國文', '英文', '數學', '物理', '化學', '生物', '歷史', '地理', '程式設計', '專業科目'];

  // Helper to calculate actual hours studied in a specific month for a subject
  const getActualHours = (monthString: string, subjectName: string): number => {
    const filteredLogs = logs.filter(log => {
      return log.date.startsWith(monthString) && log.subject === subjectName;
    });
    const totalMinutes = filteredLogs.reduce((sum, log) => sum + log.duration, 0);
    return parseFloat((totalMinutes / 60).toFixed(1));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !targetHours || isNaN(parseFloat(targetHours))) return;

    // Check if a plan already exists for this subject this month
    const exists = plans.some(p => p.month === selectedMonth && p.subject === subject.trim());
    if (exists) {
      alert(`已存在 ${selectedMonth} 的「${subject.trim()}」讀書計畫。`);
      return;
    }

    const newPlan: StudyPlan = {
      id: Math.random().toString(36).substr(2, 9),
      month: selectedMonth,
      subject: subject.trim(),
      targetHours: parseFloat(targetHours),
    };

    onAddPlan(newPlan);
    setSubject('');
    setTargetHours('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, subject: string, month: string) => {
    const confirmed = window.confirm(`是否確定要刪除「${month} - ${subject}」的讀書計畫目標？`);
    if (confirmed) {
      onDeletePlan(id);
    }
  };

  // Filter plans for the selected month
  const monthlyPlans = plans.filter(p => p.month === selectedMonth);

  // Stats calculate
  const totalTargetHours = monthlyPlans.reduce((sum, p) => sum + p.targetHours, 0);
  const totalActualHours = monthlyPlans.reduce((sum, p) => sum + getActualHours(selectedMonth, p.subject), 0);
  const totalProgressPercent = totalTargetHours > 0 
    ? Math.min(Math.round((totalActualHours / totalTargetHours) * 100), 100) 
    : 0;

  return (
    <div className="flex flex-col space-y-5 animate-fade-in text-sm" id="planner-container">
      {/* Date & Month Selector */}
      <div className="bg-white border border-natural-border p-4.5 rounded-3xl flex items-center justify-between shadow-sm" id="planner-month-bar">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-natural-primary" />
          <span className="font-semibold text-natural-text font-serif">計畫月份：</span>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-natural-bg border border-natural-border rounded-xl px-3.5 py-1.5 text-xs text-natural-text font-bold focus:outline-none focus:border-natural-primary"
        />
      </div>

      {/* Monthly summary progress box */}
      {monthlyPlans.length > 0 && (
        <div className="bg-natural-primary border border-natural-primary p-5 rounded-3xl space-y-3 shadow-md text-white" id="planner-progress-box">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-xs text-natural-bg/75 font-semibold tracking-wider">{selectedMonth.replace('-', ' 年 ')} 月總覽</span>
              <p className="text-lg font-bold text-white flex items-baseline space-x-1 font-serif">
                <span>{totalActualHours}</span>
                <span className="text-xs font-normal text-natural-bg/70">/ {totalTargetHours} 小時已讀</span>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex px-2.5 py-1.5 bg-white/15 border border-white/10 text-white rounded-2xl text-xs font-black font-sans">
                {totalProgressPercent}%
              </div>
            </div>
          </div>

          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-natural-secondary rounded-full transition-all duration-500"
              style={{ width: `${totalProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Header section with add button */}
      <div className="flex justify-between items-center" id="planner-list-header">
        <h3 className="font-semibold text-natural-text font-serif">科目讀書目標</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 bg-natural-primary hover:bg-natural-primary/95 text-white font-medium px-4 py-1.5 rounded-2xl text-xs active:scale-95 transition-all cursor-pointer shadow-sm"
            id="add-plan-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增科目計畫</span>
          </button>
        )}
      </div>

      {/* Adding plan form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 animate-slide-up shadow-sm" id="add-plan-form">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">計畫科目</label>
              <input
                type="text"
                placeholder="請輸入或是點選下方快速鍵"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-natural-border rounded-2xl px-4 py-3 text-natural-text text-xs focus:outline-none focus:border-natural-primary placeholder-natural-text/40"
              />
              {/* Quick choices */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {commonSubjects.map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className="px-2.5 py-1 bg-natural-bg hover:bg-natural-light border border-natural-border rounded-xl text-[10px] text-natural-text/80 font-medium transition-all"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">目標時數 (小時)</label>
              <input
                type="number"
                placeholder="例如：30"
                required
                min="0.1"
                step="any"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                className="w-full bg-white border border-natural-border rounded-2xl px-4 py-3 text-natural-text text-xs focus:outline-none focus:border-natural-primary placeholder-natural-text/40"
              />
            </div>
          </div>

          <div className="flex space-x-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 bg-white hover:bg-neutral-50 text-natural-text/70 border border-natural-border py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 bg-natural-primary hover:bg-natural-primary/95 text-white py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              建立計畫
            </button>
          </div>
        </form>
      )}

      {/* Plan list */}
      <div className="space-y-3" id="planner-list">
        {monthlyPlans.length === 0 ? (
          <div className="bg-white border border-natural-border py-10 rounded-3xl text-center text-natural-text/40 flex flex-col items-center justify-center space-y-2" id="planner-empty">
            <BookOpen className="w-8 h-8 text-natural-primary/50" />
            <span className="text-xs font-serif italic">這個月目前沒有安排計畫</span>
          </div>
        ) : (
          monthlyPlans.map((plan) => {
            const actual = getActualHours(selectedMonth, plan.subject);
            const percent = plan.targetHours > 0 
              ? Math.min(Math.round((actual / plan.targetHours) * 100), 100) 
              : 0;

            return (
              <div key={plan.id} className="bg-natural-light border border-natural-border p-4.5 rounded-3xl space-y-3 transition-all hover:bg-natural-light/80 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* Subject Title */}
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-natural-primary" />
                    <span className="font-bold text-natural-text text-sm font-serif">{plan.subject}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-natural-text/60">
                      {actual} / {plan.targetHours} 小時
                    </span>
                    <button
                      onClick={() => handleDelete(plan.id, plan.subject, plan.month)}
                      className="p-1.5 bg-white border border-natural-border text-natural-text/50 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-all cursor-pointer shadow-sm"
                      title="刪除"
                      id={`delete-plan-${plan.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Individual progress meter */}
                <div className="space-y-1">
                  <div className="w-full bg-natural-bg h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 100 
                          ? 'bg-natural-primary' 
                          : 'bg-natural-secondary'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-natural-text/50 font-sans">
                    <span>達成率</span>
                    <span className={percent >= 100 ? 'text-natural-primary font-bold' : ''}>
                      {percent}% {percent >= 100 ? '達標 🎉' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
