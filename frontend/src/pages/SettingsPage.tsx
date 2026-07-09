import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Camera, Trash2, Trash, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { useToast } from '../components/ui/Toast';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [npoMceId, setNpoMceId] = useState(user?.npo_mce_id || '');
  const [kiosName, setKiosName] = useState(user?.kios_name || '');
  const [kiosId, setKiosId] = useState(user?.kios_id || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarPreview(user.avatar_url);
    }
  }, [user?.avatar_url]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setUploading(true);
    try {
      await profileService.uploadAvatar(file);
      const profile = await profileService.getProfile();
      updateUser(profile.data);
      setAvatarPreview(profile.data.avatar_url || null);
      toast('success', 'Avatar berhasil diupload');
    } catch {
      toast('error', 'Gagal upload avatar');
      setAvatarPreview(user?.avatar_url || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    try {
      await profileService.deleteAvatar();
      const profile = await profileService.getProfile();
      updateUser(profile.data);
      setAvatarPreview(null);
      toast('success', 'Avatar berhasil dihapus');
    } catch {
      toast('error', 'Gagal menghapus avatar');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileService.updateProfile({
        name,
        gender: gender || null,
        npo_mce_id: npoMceId || null,
        kios_name: kiosName || null,
        kios_id: kiosId || null,
      });
      updateUser(res.data);
      toast('success', 'Profile berhasil disimpan');
    } catch {
      toast('error', 'Gagal menyimpan profile');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const res = await profileService.clearCache();
      const count = res.details?.length ?? 0;
      toast('success', count > 0 ? `${count} item berhasil dibersihkan` : 'Cache berhasil dibersihkan');
    } catch {
      toast('error', 'Gagal membersihkan cache');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola profil dan pengaturan akun Anda
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-6 text-lg font-semibold text-slate-800 dark:text-slate-100">Foto Profil</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-slate-400" />
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-fif-600 text-white shadow hover:bg-fif-700 dark:border-slate-800"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPEG, PNG, GIF, WebP. Maks 2MB.
            </p>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
                Hapus foto
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-6 text-lg font-semibold text-slate-800 dark:text-slate-100">Informasi Profil</h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nama
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Jenis Kelamin
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 p-3 transition-colors has-checked:border-fif-500 has-checked:bg-fif-50 dark:border-slate-600 dark:has-checked:border-fif-400 dark:has-checked:bg-fif-500/10">
                <input
                  type="radio"
                  name="gender"
                  value="L"
                  checked={gender === 'L'}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-4 w-4 text-fif-600 accent-fif-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Laki-laki</span>
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 p-3 transition-colors has-checked:border-fif-500 has-checked:bg-fif-50 dark:border-slate-600 dark:has-checked:border-fif-400 dark:has-checked:bg-fif-500/10">
                <input
                  type="radio"
                  name="gender"
                  value="P"
                  checked={gender === 'P'}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-4 w-4 text-fif-600 accent-fif-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Perempuan</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              ID NPO/MCE
            </label>
            <input
              type="text"
              value={npoMceId}
              onChange={(e) => setNpoMceId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Masukkan ID NPO atau MCE"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nama Kios
            </label>
            <input
              type="text"
              value={kiosName}
              onChange={(e) => setKiosName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Masukkan nama kios"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              ID Kios
            </label>
            <input
              type="text"
              value={kiosId}
              onChange={(e) => setKiosId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Masukkan ID kios"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-fif-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-fif-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClearCache}
        disabled={clearing}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl disabled:opacity-50 lg:bottom-8"
      >
        {clearing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Trash className="h-5 w-5" />
        )}
        Clear Cache
      </button>
    </div>
  );
}
