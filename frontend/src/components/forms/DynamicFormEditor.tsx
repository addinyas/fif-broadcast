import { useState, useCallback, useMemo } from 'react';
import { Eye, Send } from 'lucide-react';
import { FORM_FIELDS } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

interface DynamicFormEditorProps {
  templateBody: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const READ_ONLY_FIELDS = new Set(['nomor_contract', 'no_contract', 'namapanggilanakun', 'nama', 'pelunasan', 'terima']);
const COMPUTED_FIELDS = new Set(['pelunasan', 'terima']);

export function DynamicFormEditor({ templateBody, onSubmit, onCancel, loading, disabled, disabledReason }: DynamicFormEditorProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FORM_FIELDS.map((f) => [f.key, '']))
  );

  const update = useCallback((key: string, val: string) => {
    if (COMPUTED_FIELDS.has(key)) return;

    setValues((prev) => {
      const next = { ...prev, [key]: val };

      if (key === 'dinego_jadi') {
        next.pelunasan = val;
      }

      if (key === 'pinjaman' || key === 'pelunasan' || key === 'dinego_jadi') {
        const pinjaman = parseFloat(next.pinjaman) || 0;
        const pelunasan = parseFloat(next.pelunasan) || 0;
        next.terima = (pinjaman - pelunasan).toString();
      }

      return next;
    });
  }, []);

  const preview = useMemo(
    () => templateBody.replace(/#(\w+)/g, (_, key) => values[key] || `{{${key}}}`),
    [templateBody, values]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Broadcast</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FORM_FIELDS.map((field) => {
            const isReadOnly = READ_ONLY_FIELDS.has(field.key);
            return (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {field.label}
                  {isReadOnly && <span className="ml-1.5 text-xs text-slate-400">(read-only)</span>}
                </label>
                <input
                  type="text"
                  value={values[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  readOnly={isReadOnly}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${
                    isReadOnly
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      : 'border-slate-300 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20'
                  }`}
                  placeholder={field.label}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-400" />
              Preview Pesan
            </CardTitle>
          </CardHeader>
          <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700">
            {preview}
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <div className="relative group">
          <Button onClick={() => onSubmit(values)} loading={loading} disabled={disabled} icon={<Send className="h-4 w-4" />}>
            Kirim Broadcast
          </Button>
          {disabled && disabledReason && (
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
              {disabledReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
