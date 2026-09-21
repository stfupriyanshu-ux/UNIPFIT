export type MediaPurpose = 'promise' | 'strict_photo' | 'note_photo' | 'avatar' | 'future_photo' | 'future_media';
const AUDIO = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'];
const VIDEO = ['video/webm', 'video/mp4'];
const IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

export const MEDIA_RULES: Record<MediaPurpose, { bucket: 'promises' | 'photos' | 'future-self'; mimes: string[]; maxBytes: number }> = {
  promise:       { bucket: 'promises',    mimes: [...AUDIO, ...VIDEO], maxBytes: 10 * 1024 * 1024 },
  strict_photo:  { bucket: 'photos',      mimes: IMAGE,                maxBytes: 5 * 1024 * 1024 },
  note_photo:    { bucket: 'photos',      mimes: IMAGE,                maxBytes: 5 * 1024 * 1024 },
  avatar:        { bucket: 'photos',      mimes: IMAGE,                maxBytes: 2 * 1024 * 1024 },
  future_photo:  { bucket: 'photos',      mimes: IMAGE,                maxBytes: 5 * 1024 * 1024 },
  future_media:  { bucket: 'future-self', mimes: [...AUDIO.slice(0, 3), ...VIDEO], maxBytes: 50 * 1024 * 1024 },
};
export const EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
  'video/webm': 'webm', 'video/mp4': 'mp4', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
/** "audio/webm;codecs=opus" -> "audio/webm" */
export const baseMime = (m: string) => m.split(';')[0].trim().toLowerCase();
