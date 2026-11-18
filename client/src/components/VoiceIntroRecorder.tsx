import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, Check, AlertCircle, Volume2, Trash2 } from 'lucide-react';

interface VoiceIntroRecorderProps {
  currentAudioUrl?: string | null;
  authToken: string;
  onSuccess: (newAudioUrl: string) => void;
}

export const VoiceIntroRecorder: React.FC<VoiceIntroRecorderProps> = ({
  currentAudioUrl,
  authToken,
  onSuccess,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('audio/webm');
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clear timer when unmounting
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start recording via MediaRecorder (max 30s)
  const startRecording = async () => {
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setFileName(`voice-record-${Date.now()}.webm`);
        setFileType('audio/webm');
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      const interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      timerRef.current = interval;
    } catch (err: any) {
      console.error('Không thể truy cập Microphone:', err);
      setStatusMessage({
        type: 'error',
        text: 'Không thể truy cập Microphone. Vui lòng cấp quyền hoặc tải lên file âm thanh.',
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Choose file from local disk
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Dung lượng file vượt quá giới hạn tối đa 2MB.' });
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mp3' && ext !== 'webm') {
      setStatusMessage({ type: 'error', text: 'Chỉ chấp nhận tệp định dạng .mp3 hoặc .webm.' });
      return;
    }

    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setFileName(file.name);
    setFileType(ext === 'mp3' ? 'audio/mp3' : 'audio/webm');
  };

  const togglePlayback = () => {
    const playTarget = audioUrl || currentAudioUrl;
    if (!playTarget) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(playTarget);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
      audioPlayerRef.current.onerror = () => {
        setIsPlaying(false);
        setStatusMessage({ type: 'error', text: 'Không thể phát file âm thanh.' });
      };
    } else if (audioPlayerRef.current.src !== playTarget) {
      audioPlayerRef.current.src = playTarget;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Upload to server
  const handleSaveAudio = async () => {
    if (!audioBlob) return;
    setUploading(true);
    setStatusMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        // Bóc tách base64 payload
        const base64Content = result.includes(',') ? result.split(',')[1] : result;

        const res = await fetch('/api/companion/profile/voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            file_name: fileName || 'voice_intro.webm',
            file_type: fileType,
            file_size_bytes: audioBlob.size,
            file_content_base64: base64Content,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatusMessage({ type: 'success', text: 'Đã lưu đoạn ghi âm giới thiệu thành công!' });
          onSuccess(data.data.audio_bio_url);
          setAudioBlob(null);
        } else {
          setStatusMessage({ type: 'error', text: data.error?.message || 'Lỗi tải lên đoạn ghi âm.' });
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setStatusMessage({ type: 'error', text: 'Lỗi đọc tệp âm thanh.' });
        setUploading(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (err: any) {
      console.error('Lỗi khi lưu audio:', err);
      setStatusMessage({ type: 'error', text: 'Đã xảy ra sự cố khi tải lên tệp âm thanh.' });
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#FFFFFF] flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-[#E11D2E]" />
          <span>Ghi âm giới thiệu giọng nói</span>
        </label>
        <span className="text-[10px] text-[#A3A3A3]">Tối đa 30 giây, dung lượng không quá 2MB</span>
      </div>

      {/* Current audio preview if available */}
      {currentAudioUrl && !audioUrl && (
        <div className="flex items-center justify-between bg-[#141414] border border-[#2A2A2A] p-2.5 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[#A3A3A3] text-[11px] truncate max-w-[180px]">Đoạn ghi âm hiện tại đã lưu</span>
          </div>
          <button
            type="button"
            onClick={togglePlayback}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2A2A2A] hover:bg-[#E11D2E] text-white text-[11px] font-medium transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Dừng' : 'Nghe thử'}</span>
          </button>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="flex items-center justify-between bg-[#E11D2E]/10 border border-[#E11D2E]/40 p-3 rounded-lg text-xs animate-pulse">
          <div className="flex items-center gap-2 text-[#E11D2E] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D2E] animate-ping" />
            <span>Đang ghi âm... ({recordingSeconds}s / 30s)</span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-bold text-xs cursor-pointer"
          >
            <Square className="w-3 h-3 fill-white" /> Dừng
          </button>
        </div>
      )}

      {/* Recorded / Selected audio preview */}
      {audioUrl && !isRecording && (
        <div className="space-y-2 bg-[#141414] border border-[#2A2A2A] p-3 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate max-w-[200px] text-[#FFFFFF] font-medium">
              <Volume2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <span className="text-[10px] text-[#A3A3A3]">
              {audioBlob ? `${(audioBlob.size / 1024).toFixed(0)} KB` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#2A2A2A] hover:bg-[#333333] text-white text-xs font-medium cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#E11D2E]" /> : <Play className="w-3.5 h-3.5 text-[#22C55E]" />}
              <span>{isPlaying ? 'Dừng phát' : 'Nghe lại đoạn thu'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setFileName('');
              }}
              className="p-1.5 rounded bg-[#2A2A2A] hover:bg-rose-950 text-[#A3A3A3] hover:text-[#E11D2E] cursor-pointer"
              title="Hủy đoạn ghi âm này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons: Record & Select file */}
      {!isRecording && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white text-xs font-medium transition cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Thu âm mới</span>
          </button>

          <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white text-xs font-medium transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>Chọn file audio</span>
            <input
              type="file"
              accept=".mp3,.webm,audio/mp3,audio/webm"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Save button */}
      {audioBlob && !isRecording && (
        <button
          type="button"
          disabled={uploading}
          onClick={handleSaveAudio}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-[#E11D2E]/20"
        >
          {uploading ? (
            <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Đang tải lên...' : 'Lưu đoạn ghi âm'}</span>
        </button>
      )}

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
            statusMessage.type === 'success'
              ? 'bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E]'
              : 'bg-[#E11D2E]/10 border border-[#E11D2E]/40 text-[#E11D2E]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
