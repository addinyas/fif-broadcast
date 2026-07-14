import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, WifiOff, Smartphone, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';
import { templateService } from '../../services/templateService';
import { broadcastService } from '../../services/broadcastService';
import { getSocket } from '../../services/socketService';
import { DynamicFormEditor } from '../../components/forms/DynamicFormEditor';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FORM_FIELDS } from '../../types';
import type { Customer, Template } from '../../types';

export function BroadcastFormPage() {
  const { isAdmin, user } = useAuth();
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const base = isAdmin ? '/admin' : '/marketing';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateBody, setTemplateBody] = useState('');
  const [waStatus, setWaStatus] = useState<string>('disconnected');

  useEffect(() => {
    if (customerId) {
      customerService.getById(parseInt(customerId)).then(setCustomer);
    }
    templateService.getAll().then(setTemplates);
  }, [customerId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('wa:request_status');
    const handler = (data: { status: string }) => {
      setWaStatus(data.status);
    };
    socket.on('wa:status', handler);
    return () => { socket.off('wa:status', handler); };
  }, []);

  useEffect(() => {
    if (customer?.dynamic_data && templateBody) {
      const dd = customer.dynamic_data;
      let body = templateBody;
      for (const field of FORM_FIELDS) {
        if (dd[field.key]) {
          body = body.replaceAll(`#${field.key}`, dd[field.key]);
        }
      }
      setTemplateBody(body);
    }
  }, [customer]);

  const handleTemplateSelect = (templateId: number) => {
    const t = templates.find((tmpl) => tmpl.id === templateId);
    if (t) {
      setSelectedTemplate(t);
      let body = t.message_body;
      if (customer?.dynamic_data) {
        for (const field of FORM_FIELDS) {
          if (customer.dynamic_data[field.key]) {
            body = body.replaceAll(`#${field.key}`, customer.dynamic_data[field.key]);
          }
        }
      }
      setTemplateBody(body);
    }
  };

  const handleSubmit = async (values: Record<string, string>) => {
    if (!customerId) return;
    setLoading(true);
    try {
      await broadcastService.prepare(parseInt(customerId), templateBody, values);
      navigate(`${base}/broadcast`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`${base}/broadcast`)} icon={<ArrowLeft className="h-4 w-4" />}>
          Kembali
        </Button>
        <div>
          <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Broadcast</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kirim pesan WhatsApp ke customer</p>
        </div>
      </div>

      {waStatus !== 'connected' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          {waStatus === 'awaiting_scan' ? (
            <Smartphone className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">WhatsApp belum terhubung</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {waStatus === 'awaiting_scan'
                ? 'Scan QR atau masukkan kode pairing di halaman Connect.'
                : 'Hubungkan WhatsApp terlebih dahulu untuk mengirim pesan.'}
              {' '}<a href="/marketing/connect" className="underline font-semibold">Buka halaman Connect</a>
            </p>
          </div>
        </div>
      )}

      {(!user?.broadcast_sender_name || !user?.phone_number) && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {!user?.broadcast_sender_name && !user?.phone_number
                ? 'Nama Panggilan & Nomor Telepon belum diisi'
                : !user?.broadcast_sender_name
                  ? 'Nama Panggilan belum diatur'
                  : 'Nomor Telepon belum diisi'}
            </p>
          </div>
          <button
            onClick={() => navigate(user?.role === 'marketing' ? '/marketing/settings' : '/admin/settings')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-amber-700"
          >
            <Settings className="h-3.5 w-3.5" />
            Ke Settings
          </button>
        </div>
      )}

      {customer && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fif-50 text-fif-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">{customer.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{customer.phone_number}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pilih Template</label>
        <select
          onChange={(e) => handleTemplateSelect(parseInt(e.target.value))}
          value={selectedTemplate?.id || ''}
          className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">-- Pilih Template --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      <DynamicFormEditor
        templateBody={templateBody}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`${base}/broadcast`)}
        loading={loading}
        disabled={waStatus !== 'connected'}
        disabledReason={waStatus === 'awaiting_scan' ? 'Scan QR atau masukkan kode pairing terlebih dahulu' : 'Hubungkan WhatsApp terlebih dahulu di menu Connect'}
      />
    </div>
  );
}
