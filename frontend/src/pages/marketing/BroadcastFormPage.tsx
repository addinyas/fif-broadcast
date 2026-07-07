import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';
import { templateService } from '../../services/templateService';
import { broadcastService } from '../../services/broadcastService';
import { DynamicFormEditor } from '../../components/forms/DynamicFormEditor';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FORM_FIELDS } from '../../types';
import type { Customer, Template } from '../../types';

export function BroadcastFormPage() {
  const { isAdmin } = useAuth();
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const base = isAdmin ? '/admin' : '/marketing';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateBody, setTemplateBody] = useState('');

  useEffect(() => {
    if (customerId) {
      customerService.getById(parseInt(customerId)).then(setCustomer);
    }
    templateService.getAll().then(setTemplates);
  }, [customerId]);

  useEffect(() => {
    if (customer?.dynamic_data) {
      const dd = customer.dynamic_data;
      for (const field of FORM_FIELDS) {
        if (dd[field.key]) {
          setTemplateBody((prev) => prev.replace(`#${field.key}`, dd[field.key]));
        }
      }
    }
  }, [customer]);

  const handleTemplateSelect = (templateId: number) => {
    const t = templates.find((tmpl) => tmpl.id === templateId);
    if (t) {
      setSelectedTemplate(t);
      setTemplateBody(t.message_body);
      if (customer?.dynamic_data) {
        let body = t.message_body;
        for (const field of FORM_FIELDS) {
          if (customer.dynamic_data[field.key]) {
            body = body.replace(`#${field.key}`, customer.dynamic_data[field.key]);
          }
        }
        setTemplateBody(body);
      }
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`${base}/broadcast`)} icon={<ArrowLeft className="h-4 w-4" />}>
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Broadcast</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kirim pesan WhatsApp ke customer</p>
        </div>
      </div>

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
      />
    </div>
  );
}
