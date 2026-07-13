import { useState, useEffect } from 'react';
import { X, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { useToast } from './Toast';
import type { User, ShareInfo } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  marketingUsers: User[];
}

type ShareType = 'all' | 'pending_only' | 'broadcast_only' | 'split';

export function RollingDataModal({ open, onClose, marketingUsers }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMarketingId, setSelectedMarketingId] = useState<number | ''>('');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [shareType, setShareType] = useState<ShareType>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedMarketingId('');
      setShareInfo(null);
      setCount(0);
      setShareType('all');
    }
  }, [open]);

  useEffect(() => {
    if (selectedMarketingId === '' || !open) {
      setShareInfo(null);
      return;
    }
    setLoadingInfo(true);
    customerService.getShareInfo(selectedMarketingId as number).then((info) => {
      setShareInfo(info);
      setCount(0);
      setLoadingInfo(false);
    });
  }, [selectedMarketingId, open]);

  if (!open) return null;

  const maxCount = shareInfo?.total ?? 0;

  const isShareTypeAvailable = (type: ShareType): boolean => {
    if (!shareInfo || count === 0) return false;
    if (count > maxCount) return false;
    switch (type) {
      case 'pending_only': return count <= shareInfo.pending_count;
      case 'broadcast_only': return count <= shareInfo.broadcast_count;
      case 'split': {
        const pendingNeed = Math.ceil(count / 2);
        const broadcastNeed = Math.floor(count / 2);
        return pendingNeed <= shareInfo.pending_count && broadcastNeed <= shareInfo.broadcast_count;
      }
      case 'all': return true;
    }
  };

  const shareTypeLabel = (type: ShareType): string => {
    switch (type) {
      case 'all': return 'Semua (campur random)';
      case 'pending_only': return `Belum di-broadcast saja (${shareInfo?.pending_count ?? 0} tersedia)`;
      case 'broadcast_only': return `Sudah di-broadcast saja (${shareInfo?.broadcast_count ?? 0} tersedia)`;
      case 'split': return `Kedua-duanya (bagi rata: ${Math.ceil(count / 2)} + ${Math.floor(count / 2)})`;
    }
  };

  const handleSubmit = async () => {
    if (!selectedMarketingId || count === 0) return;
    setSubmitting(true);
    try {
      await customerService.requestShare(selectedMarketingId as number, count, shareType);
      toast('success', 'Request berhasil dikirim. Menunggu approval UH.');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengirim request';
      toast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-fif-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {step === 1 ? 'Rolling Data' : 'Pilih Tipe Data'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Pilih marketing</label>
                <select
                  value={selectedMarketingId}
                  onChange={(e) => setSelectedMarketingId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                >
                  <option value="">— Pilih marketing —</option>
                  {marketingUsers.filter((u) => u.id !== user?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {loadingInfo && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center text-sm text-slate-500">Memuat data...</div>
              )}

              {shareInfo && !loadingInfo && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-1.5">
                  <div className="text-xs font-semibold text-blue-800 dark:text-blue-200">Rincian Data</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-slate-600 dark:text-slate-400">Total: <strong>{shareInfo.total}</strong></div>
                    <div className="text-emerald-600 dark:text-emerald-400">Sudah broadcast: <strong>{shareInfo.broadcast_count}</strong></div>
                    <div className="text-amber-600 dark:text-amber-400">Belum broadcast: <strong>{shareInfo.pending_count}</strong></div>
                  </div>
                </div>
              )}

              {shareInfo && !loadingInfo && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah mau dipinjam</label>
                  <input
                    type="number"
                    min={1}
                    max={maxCount}
                    value={count || ''}
                    onChange={(e) => setCount(Math.min(parseInt(e.target.value) || 0, maxCount))}
                    placeholder={`Maks ${maxCount}`}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3 text-sm text-slate-600 dark:text-slate-400">
                Pinjam <strong>{count}</strong> data dari <strong>{marketingUsers.find((u) => u.id === selectedMarketingId)?.name}</strong>
              </div>

              {(['all', 'pending_only', 'broadcast_only', 'split'] as ShareType[]).map((type) => {
                const available = isShareTypeAvailable(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      shareType === type
                        ? 'border-fif-500 bg-fif-50 dark:bg-fif-900/20 ring-1 ring-fif-500'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    } ${!available ? 'opacity-50' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name="share_type"
                      value={type}
                      checked={shareType === type}
                      onChange={() => available && setShareType(type)}
                      disabled={!available}
                      className="h-4 w-4 text-fif-600 focus:ring-fif-500"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{shareTypeLabel(type)}</span>
                      {!available && count > 0 && (
                        <span className="ml-2 text-xs text-red-500">— Tidak cukup</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
          {step === 2 && (
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedMarketingId || count === 0 || loadingInfo}
            >
              Lanjut <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} disabled={submitting || !isShareTypeAvailable(shareType)}>
              {submitting ? 'Mengirim...' : 'Request Pinjam'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
