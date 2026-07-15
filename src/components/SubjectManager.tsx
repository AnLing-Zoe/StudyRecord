import { FormEvent, useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Subject } from '../types';

interface SubjectManagerProps {
  subjects: Subject[];
  onAddSubject: (subject: string) => Promise<boolean>;
  onDeleteSubject: (id: string) => Promise<boolean>;
}

export default function SubjectManager({ subjects, onAddSubject, onDeleteSubject }: SubjectManagerProps) {
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = subject.trim();
    if (!value) return;
    setIsSaving(true);
    if (await onAddSubject(value)) setSubject('');
    setIsSaving(false);
  };

  return (
    <section className="bg-white border border-natural-border p-5 rounded-[28px] space-y-3 shadow-sm" aria-labelledby="subject-manager-title">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-4 h-4 text-natural-primary" />
        <h3 id="subject-manager-title" className="font-semibold text-sm font-serif">讀書科目維護</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="新增科目"
          maxLength={50}
          className="min-w-0 flex-1 bg-white border border-natural-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-natural-primary"
          aria-label="讀書科目名稱"
        />
        <button
          type="submit"
          disabled={isSaving || !subject.trim()}
          className="p-2 bg-natural-primary text-white rounded-xl transition-ui disabled:opacity-40 cursor-pointer"
          aria-label="新增讀書科目"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {subjects.length === 0 ? (
        <p className="text-xs text-natural-text/45">尚未建立科目，可先新增一個常用科目。</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {subjects.map((item) => (
            <div key={item.id} className="flex items-center gap-1 rounded-xl border border-natural-border bg-natural-light px-2.5 py-1.5 text-xs">
              <span>{item.name}</span>
              <button
                type="button"
                onClick={() => void onDeleteSubject(item.id)}
                className="p-0.5 text-natural-text/35 hover:text-red-600 transition-colors cursor-pointer"
                aria-label={`刪除「${item.name}」科目`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
