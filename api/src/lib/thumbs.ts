/** 400 px JPEG thumbnail for a downloaded original (server-side imports: Instagram, Google Photos). */
export async function makeThumb(
  orig: Buffer,
): Promise<{ thumb: Buffer; width: number; height: number }> {
  const { Jimp } = await import('jimp');
  const img = await Jimp.read(orig);
  const width = img.width;
  const height = img.height;
  const scale = Math.min(1, 400 / Math.max(width, height));
  if (scale < 1) img.resize({ w: Math.round(width * scale) });
  return { thumb: await img.getBuffer('image/jpeg', { quality: 80 }), width, height };
}
