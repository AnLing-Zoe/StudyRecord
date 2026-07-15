import React, { useState } from 'react';
import { Exam } from '../types';
import { 
  Calendar, 
  Trash2,   
  Plus, 
  AlarmClock, 
  Clock,
  Pin,
  Pencil
} from 'lucide-react';

interface CountdownProps {
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onUpdateExam: (updatedExam: Exam) => void;
}

export default function Countdown({ 
  exams, 
  onAddExam, 
  onDeleteExam, 
  onUpdateExam 
}: CountdownProps) {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Inline Editing states
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPinned, setEditPinned] = useState(false);

  // Helper to calculate days remaining
  const getDaysRemaining = (dateString: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !examDate) return;

    const newExam: Exam = {
      id: Math.random().toString(36).substr(2, 9),
      name: examName.trim(),
      date: examDate,
      pinned: newPinned
    };

    onAddExam(newExam);
    setExamName('');
    setExamDate('');
    setNewPinned(false);
    setIsAdding(false);
  };

  const handleDelete = (id: string, _name: string) => {
    onDeleteExam(id);
  };

  const handleStartEdit = (exam: Exam) => {
    setEditingExamId(exam.id);
    setEditName(exam.name);
    setEditDate(exam.date);
    setEditPinned(!!exam.pinned);
  };

  const handleUpdateSave = (id: string) => {
    if (!editName.trim() || !editDate) return;
    onUpdateExam({
      id,
      name: editName.trim(),
      date: editDate,
      pinned: editPinned
    });
    setEditingExamId(null);
  };

  // Sort exams: closest first, overdue at the bottom
  const sortedExams = [...exams].sort((a, b) => {
    const daysA = getDaysRemaining(a.date);
    const daysB = getDaysRemaining(b.date);
    
    // Put negative values (overdue) last
    if (daysA < 0 && daysB >= 0) return 1;
    if (daysB < 0 && daysA >= 0) return -1;
    
    return daysA - daysB;
  });

  // Filter out pinned exams
  const pinnedExams = sortedExams.filter(exam => exam.pinned);

  return (
    <div className="flex flex-col space-y-5 text-sm text-natural-text" id="countdown-manager">
      
      {/* Target Countdowns ("目標倒數") Pinned cards display */}
      <div className="space-y-3" id="target-countdowns-area">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-natural-text text-sm flex items-center space-x-1.5">
            <Pin className="w-4 h-4 text-natural-primary fill-natural-primary" />
            <span>目標倒數 ({pinnedExams.length})</span>
          </h3>
          {pinnedExams.length > 0 && (
            <span className="text-[10px] text-natural-text/50 font-sans">
              可在下方列表中變更掛置項目
            </span>
          )}
        </div>

        {pinnedExams.length === 0 ? (
          /* Placeholder Guide Card when no items are explicitly pinned */
          <div className="border border-dashed border-natural-border/90 bg-natural-light/25 p-5.5 rounded-3xl text-center space-y-2 shadow-inner">
            <Pin className="w-5 h-5 text-natural-primary/50 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-natural-text font-serif">尚未掛置考程</p>
              <p className="text-[11px] text-natural-text/60 leading-relaxed font-sans max-w-[290px] mx-auto">
                您可以在下方考程列表中，點擊 📌 圖示將任一項目掛置在此，支援同時掛置多張精美的目標卡片。
              </p>
            </div>
          </div>
        ) : (
          /* Grid/Stack of pinned exams */
          <div className="grid grid-cols-1 gap-3.5" id="pinned-grid">
            {pinnedExams.map((exam, index) => {
              const daysLeft = getDaysRemaining(exam.date);
              const isOverdue = daysLeft < 0;
              
              // Soft gradient styling palette matched to Natural vibes
              const cardThemes = [
                'bg-natural-primary text-white border border-natural-primary/20',
                'bg-[#a5a58d] text-white border border-[#a5a58d]/20',
                'bg-[#d4a373] text-white border border-[#d4a373]/20',
                'bg-[#ccd5ae] text-natural-text border border-[#ccd5ae]/20',
              ];
              const themeClass = cardThemes[index % cardThemes.length];

              const badgeText = daysLeft <= 7 ? '危急 🚨' : daysLeft <= 30 ? '警惕' : '充裕';
              const badgeClass = daysLeft <= 7 
                ? 'bg-red-500/25 text-red-100 border border-red-500/10' 
                : daysLeft <= 30
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/10'
                : 'bg-white/20 text-white/90 border border-white/10';

              return (
                <div 
                  key={`pinned-${exam.id}`} 
                  className={`exam-card relative p-5 rounded-3xl overflow-hidden shadow-sm ${themeClass}`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Clock className="w-16 h-16" />
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="space-y-1 pr-6">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-serif font-bold text-base truncate max-w-[190px]" title={exam.name}>
                          {exam.name}
                        </span>
                        {!isOverdue && (
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-sans font-extrabold ${badgeClass}`}>
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-80 flex items-center space-x-1 font-sans">
                        <Calendar className="w-3 h-3 text-current/80" />
                        <span>目標日期：{exam.date}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => onUpdateExam({ ...exam, pinned: false })}
                      className="text-white/60 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-ui absolute top-3.5 right-3.5 cursor-pointer"
                      title="取消掛置"
                    >
                      <Pin className="w-3.5 h-3.5 fill-current text-current" />
                    </button>
                  </div>

                  <div className="mt-3.5 flex items-baseline space-x-1" id={`pinned-countdown-${exam.id}`}>
                    {isOverdue ? (
                      <span className="font-serif font-bold text-lg">順利考完 🎉</span>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold font-serif">
                          {daysLeft}
                        </span>
                        <span className="text-xs font-semibold opacity-90">天</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Header section with add button */}
      <div className="flex justify-between items-center pt-2" id="exam-list-header">
        <h3 className="font-semibold text-natural-text font-serif">所有考程列表 ({exams.length})</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 bg-natural-primary hover:bg-natural-primary/95 text-white font-medium px-4 py-1.5 rounded-2xl text-xs transition-ui cursor-pointer shadow-sm"
            id="add-exam-mode-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增考程</span>
          </button>
        )}
      </div>

      {/* Add exam form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-natural-border p-5 rounded-3xl space-y-4 surface-enter shadow-sm" id="add-exam-form">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">考試名稱</label>
              <input
                type="text"
                placeholder="例如：高中學測、多益、中級英文檢定"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full bg-white border border-natural-border rounded-2xl px-4 py-3 text-natural-text text-xs focus:outline-none focus:border-natural-primary placeholder-natural-text/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-natural-text/70 mb-1.5">考試日期</label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white border border-natural-border rounded-2xl px-4 py-3 text-natural-text text-xs focus:outline-none focus:border-natural-primary"
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="new-pinned-checkbox"
                checked={newPinned}
                onChange={(e) => setNewPinned(e.target.checked)}
                className="rounded text-natural-primary focus:ring-natural-primary w-4 h-4 accent-natural-primary cursor-pointer"
              />
              <label htmlFor="new-pinned-checkbox" className="text-xs font-semibold text-natural-text/80 cursor-pointer flex items-center space-x-1 select-none">
                <Pin className="w-3 h-3 text-natural-primary fill-natural-primary" />
                <span>直接掛置於最上方「目標倒數」</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 bg-white hover:bg-neutral-50 text-natural-text/70 border border-natural-border py-2.5 rounded-2xl text-xs transition-ui cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 bg-natural-primary hover:bg-natural-primary/95 text-white py-2.5 rounded-2xl text-xs font-semibold transition-ui cursor-pointer shadow-sm"
            >
              建立並新增
            </button>
          </div>
        </form>
      )}

      {/* Exam list */}
      <div className="space-y-2.5" id="exam-list">
        {exams.length === 0 ? (
          <div className="bg-white border border-natural-border py-8 rounded-3xl text-center text-natural-text/40 flex flex-col items-center justify-center space-y-2" id="exam-empty">
            <AlarmClock className="w-8 h-8 text-natural-primary/50" />
            <span className="text-xs font-serif italic">目前沒有添加考試時程</span>
          </div>
        ) : (
          sortedExams.map((exam) => {
            const daysLeft = getDaysRemaining(exam.date);
            const isOverdue = daysLeft < 0;

            let badgeColor = 'bg-natural-primary/10 text-natural-primary border border-natural-primary/15';
            if (daysLeft <= 7) badgeColor = 'bg-natural-secondary/15 text-natural-secondary border border-natural-secondary/20';
            else if (daysLeft <= 30) badgeColor = 'bg-amber-100/70 text-[#d4a373] border border-[#d4a373]/20';

            // Check if this item is currently in edit state
            const isEditing = editingExamId === exam.id;

            if (isEditing) {
              return (
                <div 
                  key={exam.id}
                  className="bg-white border-2 border-natural-primary/30 p-4.5 rounded-3xl space-y-4 shadow-md surface-enter"
                  id={`edit-form-wrap-${exam.id}`}
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-natural-text/70 mb-1">修改考試名稱</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white border border-natural-border rounded-xl px-3.5 py-2 text-natural-text text-xs focus:outline-none focus:border-natural-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-natural-text/70 mb-1">修改考試日期</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-white border border-natural-border rounded-xl px-3.5 py-2 text-natural-text text-xs focus:outline-none focus:border-natural-primary"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <input
                        type="checkbox"
                        id={`edit-pinned-${exam.id}`}
                        checked={editPinned}
                        onChange={(e) => setEditPinned(e.target.checked)}
                        className="rounded text-natural-primary focus:ring-natural-primary w-4 h-4 accent-natural-primary cursor-pointer"
                      />
                      <label htmlFor={`edit-pinned-${exam.id}`} className="text-xs font-semibold text-natural-text/80 cursor-pointer flex items-center space-x-1 select-none">
                        <Pin className="w-3 h-3 text-natural-primary fill-natural-primary" />
                        <span>掛置於最上方「目標倒數」</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-1 border-t border-natural-border/40">
                    <button
                      type="button"
                      onClick={() => setEditingExamId(null)}
                      className="flex-1 bg-white hover:bg-neutral-50 text-natural-text/70 border border-natural-border py-2 rounded-xl text-xs font-medium cursor-pointer transition-ui"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSave(exam.id)}
                      className="flex-1 bg-natural-primary hover:bg-natural-primary/95 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-ui"
                    >
                      儲存修改
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={exam.id}
                className={`bg-natural-light border border-natural-border p-4 rounded-3xl flex items-center justify-between transition-colors duration-150 hover:bg-natural-light/80 shadow-sm ${
                  exam.pinned ? 'ring-1 ring-natural-primary/30 bg-white/70' : ''
                }`}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    {exam.pinned && <Pin className="w-3.5 h-3.5 text-natural-primary fill-natural-primary flex-shrink-0" />}
                    <h4 className="font-semibold text-natural-text font-serif truncate">{exam.name}</h4>
                  </div>
                  <p className="text-[11px] text-natural-text/50 flex items-center space-x-1 mt-1">
                    <Calendar className="w-3 h-3 text-natural-text/40" />
                    <span>考試日期：{exam.date}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className={`px-2.5 py-1.5 rounded-2xl text-[11px] font-semibold border ${isOverdue ? 'bg-neutral-100 text-neutral-400 border-neutral-200' : badgeColor}`}>
                    {isOverdue ? '已完成 ✨' : `${daysLeft} 天`}
                  </div>

                  {/* Pin/Unpin rapid action button */}
                  <button
                    onClick={() => onUpdateExam({ ...exam, pinned: !exam.pinned })}
                    className={`p-2 border rounded-xl transition-ui cursor-pointer shadow-sm ${
                      exam.pinned 
                        ? 'bg-natural-primary/10 border-natural-primary/25 text-natural-primary' 
                        : 'bg-white border-natural-border text-natural-text/45 hover:text-natural-primary hover:bg-natural-light/50'
                    }`}
                    title={exam.pinned ? '取消上方掛置' : '掛置到上方目標倒數'}
                    id={`pin-toggle-${exam.id}`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${exam.pinned ? 'fill-natural-primary' : ''}`} />
                  </button>

                  {/* Edit action button */}
                  <button
                    onClick={() => handleStartEdit(exam)}
                    className="p-2 bg-white border border-natural-border text-natural-text/45 hover:text-natural-primary hover:bg-neutral-50 rounded-xl transition-ui cursor-pointer shadow-sm"
                    title="編輯考程"
                    id={`edit-trigger-${exam.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(exam.id, exam.name)}
                    className="p-2 bg-white border border-natural-border text-natural-text/50 hover:text-red-500 hover:bg-red-50 rounded-xl transition-ui cursor-pointer shadow-sm"
                    title="刪除"
                    id={`delete-exam-${exam.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
