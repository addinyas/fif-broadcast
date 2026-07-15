import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Users, Loader2 } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { useToast } from '../../components/ui/Toast';
import type { CustomerShareRequest } from '../../types';

export function RollingApprovalPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomerShareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerService.getPendingShares();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await customerService.approveShare(id);
      toast('success', 'Request berhasil di-approve');
      fetchRequests();
    } catch {
      toast('error', 'Gagal approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (id: number) => {
    setProcessingId(id);
    try {
      await customerService.revokeShare(id);
      toast('success', 'Request berhasil direvoke');
      fetchRequests();
    } catch {
      toast('error', 'Gagal revoke request');
    } finally {
      setProcessingId(null);
    }
  };

  const shareTypeLabel = (type: string): string => {
    switch (type) {
      case 'all': return 'Semua';
      case 'pending_only': return 'Belum broadcast';
      case 'broadcast_only': return 'Sudah broadcast';
      case 'split': return 'Bagi rata';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Rolling Data Approval</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Approve atau reject request pinjam data antar marketing</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-slate-400 animate-spin" />
          <p className="mt-3 text-sm text-slate-500">Memuat data...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Tidak ada request pending</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    <span className="text-fif-600 dark:text-fif-400">{req.requested_by.name}</span>
                    {' '}meminta{' '}
                    <strong>{req.count}</strong> data
                    {' '}dari{' '}
                    <span className="text-fif-600 dark:text-fif-400">{req.from_marketing.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-medium">{shareTypeLabel(req.share_type)}</span>
                    <span>{new Date(req.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRevoke(req.id)}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
