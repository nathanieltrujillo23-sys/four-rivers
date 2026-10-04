const SIZE = 160;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL = 55_000; // the database accepts up to 60,000

/** Shrinks a chosen photo to a square JPEG small enough to store with the profile. */
export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) throw new Error("unusable image");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unusable image");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_DATA_URL) return url;
  }
  throw new Error("unusable image");
}
