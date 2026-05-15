import { SUPABASE_BUCKETS, SUPABASE_INVITATIONS_TABLE, isSupabaseConfigured, requireSupabase } from './supabase';

export interface CloudInvitationRecord {
  id: string;
  template: string;
  payload: unknown;
  cover_image_url: string | null;
  gallery_image_urls: string[] | null;
  bg_music_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInvitationInput {
  template: string;
  payload: unknown;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  bgMusicUrl?: string | null;
}

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const buildStoragePath = (folder: string, fileName: string) => {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const safeFileName = sanitizeFileName(fileName.replace(/\.[^.]+$/, ''));
  const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return `${folder}/${Date.now()}_${uniqueId}_${safeFileName}.${extension}`;
};

const getPublicUrl = (bucket: string, path: string) => {
  const client = requireSupabase();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const resolveUploadFileName = (file: Blob | File, fallbackFileName: string) => {
  if ('name' in file && typeof file.name === 'string' && file.name.trim()) {
    return file.name;
  }

  return fallbackFileName;
};

export const uploadFileToCloud = async (
  bucket: string,
  folder: string,
  file: Blob | File,
  fileName = 'file.bin'
) => {
  const client = requireSupabase();
  const resolvedFileName = resolveUploadFileName(file, fileName);
  const path = buildStoragePath(folder, resolvedFileName);
  const contentType = file.type || 'application/octet-stream';

  const { error } = await client.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType,
  });

  if (error) throw error;

  return getPublicUrl(bucket, path);
};

export const uploadImageDataUrlToCloud = async (folder: string, dataUrl: string, fileName = 'image.jpg') => {
  const file = await dataUrlToBlob(dataUrl);
  return uploadFileToCloud(SUPABASE_BUCKETS.images, folder, file, fileName);
};

export const uploadAudioFileToCloud = async (file: File) => {
  return uploadFileToCloud(SUPABASE_BUCKETS.audio, 'music', file);
};

export const createInvitationInCloud = async (input: CreateInvitationInput) => {
  const client = requireSupabase();

  const { data, error } = await client
    .from(SUPABASE_INVITATIONS_TABLE)
    .insert({
      template: input.template,
      payload: input.payload,
      cover_image_url: input.coverImageUrl ?? null,
      gallery_image_urls: input.galleryImageUrls ?? [],
      bg_music_url: input.bgMusicUrl ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;

  return data.id as string;
};

export const getInvitationFromCloud = async (id: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(SUPABASE_INVITATIONS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CloudInvitationRecord;
};

export { isSupabaseConfigured };
