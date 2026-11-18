import React, { useState, useEffect } from 'react';
import { 
  User, 
  Camera, 
  Trash2, 
  Lock, 
  Save, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft
} from 'lucide-react';
import { Avatar } from './common/Avatar';

interface ProfileViewProps {
  currentUser?: any;
  onProfileUpdated?: (updatedUser: any) => void;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser: _currentUser,
  onProfileUpdated,
  onBack,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());

  // Form states
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [favoriteGames, setFavoriteGames] = useState<string>('');

  // Companion form states
  const [hourlyRate, setHourlyRate] = useState<number>(100000);
  const [availability, setAvailability] = useState<'ONLINE' | 'BUSY' | 'OFFLINE'>('ONLINE');
  const [gameAccountId, setGameAccountId] = useState<string>('');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number>(10);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar upload states
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setProfile(p);
        setDisplayName(p.display_name || '');
        setBio(p.bio || '');
        setDateOfBirth(p.date_of_birth ? p.date_of_birth.split('T')[0] : '');
        setFavoriteGames(p.favorite_games || '');
        if (p.companion_profile) {
          setHourlyRate(p.companion_profile.hourly_rate || 100000);
          setAvailability(p.companion_profile.availability || 'ONLINE');
          setGameAccountId(p.companion_profile.game_account_id || '');
          setMaxHoursPerDay(p.companion_profile.max_hours_per_day || 10);
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Không thể tải thông tin hồ sơ: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        display_name: displayName,
        bio: bio,
        favorite_games: favoriteGames,
        date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      };

      if (profile?.companion_profile) {
        payload.hourly_rate = Number(hourlyRate);
        payload.availability = availability;
        payload.game_account_id = gameAccountId;
        payload.max_hours_per_day = Number(maxHoursPerDay);
      }

      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setMsg({ type: 'success', text: 'Cập nhật hồ sơ cá nhân thành công!' });
        if (onProfileUpdated) {
          onProfileUpdated(data.data);
        }
      } else {
        setMsg({ type: 'error', text: data.error?.message || 'Có lỗi xảy ra khi lưu hồ sơ.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi mạng khi lưu hồ sơ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Dung lượng tệp ảnh không được vượt quá 2MB.' });
      return;
    }

    setAvatarLoading(true);
    setMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const token = localStorage.getItem('token');
        const res = await fetch('/api/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            avatar_base64: base64Data,
            file_name: file.name,
          }),
        });

        const data = await res.json();
        if (data.success) {
          const newAvatarUrl = data.data.avatar_url;
          setAvatarVersion(Date.now());
          setProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
          setMsg({ type: 'success', text: 'Ảnh đại diện đã được cập nhật an toàn (đã loại bỏ metadata EXIF).' });

          try {
            const rawUser = localStorage.getItem('user');
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              parsed.avatar_url = newAvatarUrl;
              localStorage.setItem('user', JSON.stringify(parsed));
            }
          } catch {}
          window.dispatchEvent(new CustomEvent('user-updated', { detail: { avatar_url: newAvatarUrl } }));

          if (onProfileUpdated) {
            onProfileUpdated({ ...profile, avatar_url: newAvatarUrl });
          }
        } else {
          setMsg({ type: 'error', text: data.error?.message || 'Không thể tải lên ảnh đại diện.' });
        }
      } catch (err: any) {
        setMsg({ type: 'error', text: 'Lỗi tải ảnh: ' + err.message });
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại?')) return;

    setAvatarLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAvatarVersion(Date.now());
        setProfile((prev: any) => ({ ...prev, avatar_url: null }));
        setMsg({ type: 'success', text: 'Đã xóa ảnh đại diện thành công.' });

        try {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            parsed.avatar_url = null;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        } catch {}
        window.dispatchEvent(new CustomEvent('user-updated', { detail: { avatar_url: null } }));

        if (onProfileUpdated) {
          onProfileUpdated({ ...profile, avatar_url: null });
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi xóa ảnh: ' + err.message });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error?.message || 'Không thể đổi mật khẩu.' });
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Lỗi mạng khi đổi mật khẩu.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#E11D2E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Đang tải hồ sơ cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-[#1C1C1C] hover:bg-[#2A2A2A] text-slate-300 transition cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#E11D2E]" />
              <span>Hồ sơ cá nhân & Tài khoản</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Quản lý thông tin hiển thị, ảnh đại diện an toàn và bảo mật tài khoản
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-full text-xs font-mono font-bold text-amber-400">
          Vai trò: {profile?.role}
        </span>
      </div>

      {/* Alert Notification */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            msg.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Grid: Avatar + Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Trust / Role info */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name}
              size="2xl"
              version={avatarVersion}
              className="border-2 border-[#E11D2E]/60 shadow-lg"
            />

            <label
              htmlFor="avatar-upload-input"
              className="absolute bottom-0 right-0 p-2 bg-[#E11D2E] hover:bg-rose-700 text-white rounded-full shadow-lg cursor-pointer transition"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                disabled={avatarLoading}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-white">{profile?.display_name}</h3>
            <p className="text-xs text-slate-400">{profile?.email}</p>
            {profile?.phone_number && (
              <p className="text-[11px] text-slate-500 font-mono">SĐT: {profile.phone_number}</p>
            )}
          </div>

          {profile?.avatar_url && (
            <button
              onClick={handleDeleteAvatar}
              disabled={avatarLoading}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer pt-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Gỡ ảnh đại diện</span>
            </button>
          )}

          <div className="w-full pt-4 border-t border-[#2A2A2A] space-y-2 text-left text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Định dạng:</span>
              <span className="text-slate-200 font-mono">PNG / JPG / WebP</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Dung lượng:</span>
              <span className="text-slate-200 font-mono">Tối đa 2MB</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Bảo mật:</span>
              <span className="text-emerald-400 font-semibold">Tự động xóa EXIF/GPS</span>
            </div>
          </div>

          {profile?.companion_profile && (
            <div className="w-full p-3 bg-[#141414] border border-[#2A2A2A] rounded-xl text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Điểm uy tín:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {profile.companion_profile.trust_score.toFixed(1)} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cấp bậc:</span>
                <span className="font-bold text-sky-400">
                  {profile.companion_profile.tier_name || 'Đã xác minh'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Game chính:</span>
                <span className="text-white">{profile.companion_profile.game_name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (2 cols): Profile Edit Form */}
        <div className="md:col-span-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-6 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Thông tin cơ bản
              </span>
              <span className="text-[11px] text-slate-500 italic">
                * Không chia sẻ SĐT, email trong tên và tiểu sử
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="Nhập tên hiển thị (2-40 ký tự)"
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#E11D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#E11D2E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Game yêu thích
              </label>
              <input
                type="text"
                value={favoriteGames}
                onChange={(e) => setFavoriteGames(e.target.value)}
                placeholder="Ví dụ: LMHT, VALORANT, TFT"
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#E11D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tiểu sử / Giới thiệu bản thân
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Mô tả phong cách chơi game, thời gian rảnh hoặc kinh nghiệm..."
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#E11D2E]"
              />
              <p className="text-[10px] text-slate-500 text-right mt-1 font-mono">
                {bio.length} / 500 ký tự
              </p>
            </div>

            {/* Companion specific settings */}
            {profile?.companion_profile && (
              <div className="pt-4 border-t border-[#2A2A2A] space-y-4">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Cài đặt Companion
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Giá thuê mỗi giờ (VND)
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      step={10000}
                      min={50000}
                      max={1000000}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Trạng thái nhận đơn
                    </label>
                    <select
                      value={availability}
                      onChange={(e: any) => setAvailability(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                    >
                      <option value="ONLINE">🟢 Sẵn sàng (ONLINE)</option>
                      <option value="BUSY">🟡 Đang bận (BUSY)</option>
                      <option value="OFFLINE">⚪ Tạm nghỉ (OFFLINE)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tên ingame / Riot ID
                    </label>
                    <input
                      type="text"
                      value={gameAccountId}
                      onChange={(e) => setGameAccountId(e.target.value)}
                      placeholder="Ví dụ: Player#VN2"
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Giới hạn giờ nhận đơn/ngày
                    </label>
                    <input
                      type="number"
                      value={maxHoursPerDay}
                      onChange={(e) => setMaxHoursPerDay(Number(e.target.value))}
                      min={1}
                      max={16}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Mặc định tối đa 10h theo quy tắc</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#E11D2E] hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>

          {/* Change Password Section */}
          <div className="pt-6 border-t border-[#2A2A2A] space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Đổi mật khẩu tài khoản
              </span>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{passwordLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
