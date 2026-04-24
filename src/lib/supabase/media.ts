import { getSupabaseBrowserClient } from './client';

const PUBLIC_MEDIA_BUCKET = 'public-media';

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
}

export async function uploadPublicImage(file: File, folder: string) {
  try {
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${sanitizeFileName(file.name.replace(new RegExp(`\\.${ext}$`), ''))}.${ext.toLowerCase()}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Image upload could not reach Supabase Storage. The need can still be posted without an image.');
    }

    throw error;
  }
}
