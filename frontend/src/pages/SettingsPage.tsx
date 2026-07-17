import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Camera, Trash, User, Loader2, Lock, Eye, EyeOff, Network, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { useToast } from '../components/ui/Toast';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [npoMceId, setNpoMceId] = useState(user?.npo_mce_id || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [waProxy, setWaProxy] = useState(user?.wa_proxy || '');
  const [showTermuxGuide, setShowTermuxGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);

  const tunnelPort = user?.id ? 1080 + user.id : 1080;
  const proxyAddress = `socks5://127.0.0.1:${tunnelPort}`;
  const setupCmd = `pkg update -y && pkg upgrade -y && pkg install openssh autossh termux-api -y && mkdir -p ~/.termux/boot && cat > ~/fif << 'EOF'
#!/bin/bash
if ! pgrep -x sshd > /dev/null; then sshd; fi
if pgrep -f "ssh -R ${tunnelPort}" > /dev/null; then
  echo "[FIF] Tunnel sudah aktif. Buka FIF > WhatsApp > Connect"
  exit 0
fi
echo "[FIF] Menjalankan tunnel..."
autossh -M 0 -R ${tunnelPort}:localhost:8022 root@202.10.42.237 -N -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" &
sleep 2
if kill -0 $! 2>/dev/null; then
  echo "[FIF] Tunnel aktif! Buka FIF > WhatsApp > Connect"
  echo "[FIF] Jangan tutup Termux. Tekan Ctrl+C untuk stop."
  wait
else
  echo "[FIF] Gagal. Cek password & koneksi internet."
fi
EOF
chmod +x ~/fif && cat > ~/.bashrc << 'EOF2'
if command -v fif &>/dev/null && ! pgrep -f "ssh -R ${tunnelPort}" >/dev/null; then fif & fi
EOF2
echo "✅ Setup selesai! Tutup Termux, lalu buka lagi untuk test auto-start."`;

  const copyToClipboard = async (text: string, type: 'cmd' | 'proxy') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'cmd') { setCopiedCmd(true); setTimeout(() => setCopiedCmd(false), 2000); }
      else { setCopiedProxy(true); setTimeout(() => setCopiedProxy(false), 2000); }
      toast('success', 'Berhasil disalin!');
    } catch { toast('error', 'Gagal menyalin'); }
  };

  useEffect(() => {
    if (user?.wa_proxy === null && user?.id) {
      setWaProxy(proxyAddress);
    }
  }, [user?.wa_proxy, user?.id, proxyAddress]);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarPreview(user.avatar_url);
    }
  }, [user?.avatar_url]);

  useEffect(() => {
    setName(user?.name || '');
    setDisplayName(user?.display_name || '');
    setPhoneNumber(user?.phone_number || '');
    setGender(user?.gender || '');
    setNpoMceId(user?.npo_mce_id || '');
    setWaProxy(user?.wa_proxy || '');
  }, [user?.name, user?.display_name, user?.phone_number, user?.gender, user?.npo_mce_id, user?.wa_proxy]);

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
        display_name: displayName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        gender: gender || null,
        npo_mce_id: npoMceId || null,
        wa_proxy: waProxy.trim() || null,
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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast('error', 'Semua field password wajib diisi');
      return;
    }
    if (newPassword.length < 8) {
      toast('error', 'Password baru minimal 8 karakter');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast('error', 'Password harus mengandung huruf besar, huruf kecil, dan angka');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('error', 'Konfirmasi password tidak cocok');
      return;
    }
    setChangingPassword(true);
    try {
      await profileService.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('success', 'Password berhasil diubah');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengubah password';
      toast('error', msg);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="font-poppins space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pengaturan</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Kelola profil dan pengaturan akun Anda
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/90">
        <h2 className="mb-6 font-subheading text-lg font-semibold text-slate-800 dark:text-slate-100">Foto Profil</h2>
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
              JPEG, PNG, GIF, WebP. Maks 8MB.
            </p>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
              >
                <Trash className="h-3 w-3" />
                Hapus foto
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/90">
        <h2 className="mb-6 font-subheading text-lg font-semibold text-slate-800 dark:text-slate-100">Informasi Profil</h2>
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 uppercase placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Masukkan ID NPO atau MCE"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nama Panggilan (Broadcast)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="Contoh: Admin FIF"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Nama yang muncul di broadcast sebagai #namapanggilan
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Kios
            </label>
            <input
              type="text"
              value={user?.kios_name ? `${user.kios_name} (${user.kios_id})` : '-'}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Hubungi superadmin untuk mengubah kios</p>
          </div>

          <div className="border-t border-slate-200/80 pt-5 dark:border-slate-700/80">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">WhatsApp Tunnel (Termux)</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Proxy Address (otomatis per akun)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={waProxy}
                    onChange={(e) => setWaProxy(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 font-mono outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-amber-400"
                    placeholder="socks5://127.0.0.1:PORT"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(waProxy || proxyAddress, 'proxy')}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    {copiedProxy ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedProxy ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Isi sekali saja — tidak pernah berubah. Setiap akun punya port berbeda.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Setup Command (copy-paste ke Termux)
                </label>
                <div className="relative">
                  <pre className="max-h-32 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-pre-wrap break-all">
                    {setupCmd}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(setupCmd, 'cmd')}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    {copiedCmd ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedCmd ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Buka Termux di HP → paste command ini → Enter → selesai.
                  <button type="button" onClick={() => setShowTermuxGuide(!showTermuxGuide)} className="ml-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 underline font-medium">
                    {showTermuxGuide ? 'Sembunyikan' : 'Lihat panduan'}
                  </button>
                </p>
              </div>
            </div>

            {showTermuxGuide && (
              <div className="mt-4 rounded-lg bg-amber-50/80 border border-amber-200 p-4 text-xs text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300 space-y-3">
                <p className="font-semibold text-sm">Setup Awal (Sekali Saja)</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Install <b>F-Droid</b> dari <b>f-droid.org</b> → install <b>Termux</b></li>
                  <li>Klik tombol <b>Salin</b> di Setup Command (di atas)</li>
                  <li>Buka Termux di HP → paste → Enter → tunggu selesai</li>
                  <li>Kembali ke halaman ini → klik <b>Simpan</b></li>
                </ol>

                <p className="font-semibold text-sm mt-3">Setiap Hari (Mau Connect WA)</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Buka <b>Termux</b> di HP → tunnel auto-start otomatis</li>
                  <li>Buka FIF → <b>WhatsApp</b> → Connect (Pairing Code / QR)</li>
                  <li>Selesai! Tidak perlu ketik apapun.</li>
                </ol>

                <p className="font-semibold text-sm mt-3">Setelah Broadcast Selesai</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><b>Biarkan saja</b> — WA auto-disconnect setelah 8 jam (otomatis)</li>
                  <li><b>Stop sekarang</b> — Disconnect WA dari FIF → Ctrl+C di Termux</li>
                </ul>

                <p className="font-semibold text-sm mt-3">Paket Data</p>
                <p className="ml-2">Matikan WiFi → buka Termux → tunnel pakai kuota HP. HP tetap online.</p>
                <p className="mt-2 text-amber-700 dark:text-amber-400">
                  <b>Panduan lengkap:</b> <code className="bg-amber-100 px-1 rounded dark:bg-amber-800/40">docs/termux-setup.md</code>
                </p>
              </div>
            )}
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

      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/90">
        <h2 className="mb-6 font-subheading text-lg font-semibold text-slate-800 dark:text-slate-100">Ubah Password</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password Saat Ini</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
                placeholder="Masukkan password saat ini"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password Baru</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Konfirmasi Password Baru</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-fif-400"
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 rounded-xl bg-fif-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-fif-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Ubah Password
            </button>
          </div>
        </div>
      </div>

      {user?.role === 'superadmin' && (
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
      )}
    </div>
  );
}
