import React from 'react';
import { StudyLog } from '../types';
import { formatLocalDate } from '../date';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  Trash2, 
  FileText,
  Calendar
} from 'lucide-react';

interface StatsProps {
  logs: StudyLog[];
  onDeleteLog: (id: string) => void;
}

export default function Stats({ logs, onDeleteLog }: StatsProps) {
  // Format log delete
  const handleDeleteLog = (id: string, _subject: string, _duration: number) => {
    onDeleteLog(id);
  };

  // 1. Time aggregations
  const totalAllTimeMinutes = logs.reduce((sum, log) => sum + log.duration, 0);
  const totalAllTimeHours = parseFloat((totalAllTimeMinutes / 60).toFixed(1));

  // Filter logs for Today
  const todayStr = formatLocalDate();
  const todayMinutes = logs
    .filter(log => log.date === todayStr)
    .reduce((sum, log) => sum + log.duration, 0);
  const todayHours = parseFloat((todayMinutes / 60).toFixed(1));

  // Filter logs for Current Month
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const monthMinutes = logs
    .filter(log => log.date.startsWith(currentMonthStr))
    .reduce((sum, log) => sum + log.duration, 0);
  const monthHours = parseFloat((monthMinutes / 60).toFixed(1));

  // 2. Generate 7-day Trend Data
  const getLast7Days = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalDate(d);
      // Label in mm/dd
      const label = dateStr.slice(5).replace('-', '/');
      result.push({
        dateStr,
        label,
        '時數 (小時)': 0,
      });
    }
    return result;
  };

  const trendData = getLast7Days();
  trendData.forEach(item => {
    const dailyLogs = logs.filter(log => log.date === item.dateStr);
    const dailyMins = dailyLogs.reduce((sum, log) => sum + log.duration, 0);
    item['時數 (小時)'] = parseFloat((dailyMins / 60).toFixed(1));
  });

  // 3. Subject-wise aggregation
  const subjectMap: { [key: string]: number } = {};
  logs.forEach(log => {
    subjectMap[log.subject] = (subjectMap[log.subject] || 0) + log.duration;
  });

  const subjectRanking = Object.keys(subjectMap)
    .map(name => ({
      name,
      hours: parseFloat((subjectMap[name] / 60).toFixed(1)),
      minutes: subjectMap[name],
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const highestDuration = subjectRanking[0]?.minutes || 1;

  // 4. Sorted logs (Recent first)
  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div className="flex flex-col space-y-4.5 text-sm text-natural-text" id="stats-dashboard">
      
      {/* Visual BENTO Grid: General recap stats */}
      <div className="grid grid-cols-3 gap-2.5" id="bento-recap">
        <div className="bg-natural-light border border-natural-border p-3.5 rounded-2xl flex flex-col justify-between text-center min-h-[95px] shadow-sm">
          <span className="text-[10px] text-natural-text/60 font-semibold tracking-wider uppercase">今日時數</span>
          <p className="text-xl font-serif font-black text-natural-primary mt-1">{todayHours}</p>
          <span className="text-[10px] text-natural-text/45 font-sans">小時</span>
        </div>
        <div className="bg-natural-light border border-natural-border p-3.5 rounded-2xl flex flex-col justify-between text-center min-h-[95px] shadow-sm">
          <span className="text-[10px] text-natural-text/60 font-semibold tracking-wider uppercase">本月累積</span>
          <p className="text-xl font-serif font-black text-natural-secondary mt-1">{monthHours}</p>
          <span className="text-[10px] text-natural-text/45 font-sans">小時</span>
        </div>
        <div className="bg-natural-light border border-natural-border p-3.5 rounded-2xl flex flex-col justify-between text-center min-h-[95px] shadow-sm">
          <span className="text-[10px] text-natural-text/60 font-semibold tracking-wider uppercase">累計投入</span>
          <p className="text-xl font-serif font-black text-natural-primary mt-1">{totalAllTimeHours}</p>
          <span className="text-[10px] text-natural-text/45 font-sans">小時</span>
        </div>
      </div>

      {/* Recharts chart block: Trend */}
      <div className="bg-white border border-natural-border p-4.5 rounded-[28px] space-y-3 shadow-sm" id="trend-chart-card">
        <div className="flex items-center space-x-2 text-natural-text">
          <TrendingUp className="w-4 h-4 text-natural-primary" />
          <h3 className="font-semibold text-xs font-serif italic">近 7 日讀書趨勢圖</h3>
        </div>

        <div className="w-full h-[180px] font-sans text-xs" id="trend-chart-viewport">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 350, height: 180 }}>
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" vertical={false} />
              <XAxis dataKey="label" stroke="#a3a39e" tickLine={false} style={{ fontSize: '10px' }} />
              <YAxis stroke="#a3a39e" tickLine={false} style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e6e6df', borderRadius: '12px', color: '#4a4a40' }}
                labelStyle={{ fontWeight: 'bold', color: '#4a4a40' }}
              />
              <Bar dataKey="時數 (小時)" fill="#5a5a40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject focus distribution breakdown */}
      <div className="bg-white border border-natural-border p-4.5 rounded-[28px] space-y-3 shadow-sm" id="subject-rank-card">
        <div className="flex items-center space-x-1.5 text-natural-text">
          <Award className="w-4 h-4 text-natural-primary" />
          <h3 className="font-semibold text-xs font-serif italic">研讀科目時間分佈</h3>
        </div>

        {subjectRanking.length === 0 ? (
          <div className="text-natural-text/40 text-xs text-center py-6">目前沒有時數數據</div>
        ) : (
          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1" id="ranking-list">
            {subjectRanking.map((item, idx) => {
              const rectPercent = Math.max(8, Math.round((item.minutes / highestDuration) * 100));

              return (
                <div key={item.name} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-natural-text/80">
                    <span className="font-semibold flex items-center space-x-1.5 font-serif">
                      <span className="text-natural-text/40 font-mono">#{idx+1}</span>
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono text-natural-text/60">{item.hours} 小時 ({item.minutes}分)</span>
                  </div>
                  <div className="w-full bg-natural-bg h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-[width] duration-200 ${
                        idx === 0 ? 'bg-natural-primary' : 'bg-natural-secondary/70'
                      }`}
                      style={{ width: `${rectPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabular view of recent logs */}
      <div className="bg-white border border-natural-border p-4.5 rounded-[28px] space-y-3 shadow-sm" id="log-list-card">
        <div className="flex items-center space-x-1.5 text-natural-text">
          <Calendar className="w-4 h-4 text-natural-primary" />
          <h3 className="font-semibold text-xs font-serif italic">近期讀書歷史紀錄</h3>
        </div>

        <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 mb-2" id="recent-logs-scroller">
          {recentLogs.length === 0 ? (
            <div className="text-natural-text/40 text-xs text-center py-8">
              尚未有讀書時數，請到「計時器」頁面開始！
            </div>
          ) : (
            recentLogs.map((log) => (
              <div 
                key={log.id} 
                className="bg-natural-light border border-natural-border p-3 rounded-2xl flex items-start justify-between space-x-2 text-xs"
              >
                <div className="flex-1 min-w-0 space-y-1 font-sans">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-natural-text font-serif">{log.subject}</span>
                    <span className="text-[10px] text-natural-text/40 font-mono">{log.date}</span>
                  </div>

                  {log.notes && (
                    <p className="text-natural-text/75 text-[11px] leading-relaxed break-words">{log.notes}</p>
                  )}

                  <div className="flex items-center space-x-1 text-[10px] text-natural-secondary font-bold font-sans">
                    <Clock className="w-3 h-3 text-natural-text/40" />
                    <span>{log.duration} 分鐘</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteLog(log.id, log.subject, log.duration)}
                  className="p-1.5 text-natural-text/40 hover:text-red-600 hover:bg-neutral-100 rounded-lg transition-ui cursor-pointer flex-shrink-0"
                  title="刪除"
                  aria-label={`刪除「${log.subject}」讀書紀錄`}
                  id={`delete-log-${log.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
