import { useState, useEffect } from 'react';
import { Users, Send, Clock, CheckCircle2, XCircle, Loader2, UserCheck, UserX } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { customerService } from '../../services/customerService';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import type { BroadcastStats, DistributionReport } from '../../types';

export function DashboardPage() {
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [dist, setDist] = useState<DistributionReport | null>(null);

  useEffect(() => {
    broadcastService.getStats().then(setStats);
    customerService.getDistribution().then(setDist);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Overview FIF Broadcast system</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Customer" value={dist?.total_customers ?? '-'} icon={<Users className="h-5 w-5" />} color="blue" />
        <StatCard title="Assigned" value={dist?.assigned ?? '-'} icon={<UserCheck className="h-5 w-5" />} color="purple" />
        <StatCard title="Unassigned" value={dist?.unassigned ?? '-'} icon={<UserX className="h-5 w-5" />} color="amber" />
        <StatCard title="Total Broadcast" value={stats?.total ?? '-'} icon={<Send className="h-5 w-5" />} color="green" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Pending" value={stats?.pending ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard title="Processing" value={stats?.processing ?? '-'} icon={<Loader2 className="h-5 w-5" />} color="blue" />
        <StatCard title="Sent" value={stats?.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" />
        <StatCard title="Failed" value={stats?.failed ?? '-'} icon={<XCircle className="h-5 w-5" />} color="red" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribution by Marketing</CardTitle>
        </CardHeader>
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Marketing</th>
                <th className="px-5 py-3.5">Total Customers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dist?.by_marketing.map((item) => (
                <tr key={item.marketing_id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/80">
                  <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                    {item.marketing?.name || `User #${item.marketing_id}`}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="info">{item.total}</Badge>
                  </td>
                </tr>
              ))}
              {dist?.by_marketing.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">Belum ada distribusi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
