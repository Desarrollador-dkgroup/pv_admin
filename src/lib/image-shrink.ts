// Reduce una imagen en el navegador antes de subirla: cabe en el tamaño indicado y pesa menos de
// `maxBytes`. Así el propietario puede subir cualquier foto, incluso la original del teléfono.

const SHRINK_BYTES = 1024 * 1024; // 1 MB

export async function shrinkImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  maxBytes: number = SHRINK_BYTES,
): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  if (scale === 1 && file.size <= maxBytes) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Baja la calidad hasta que quepa en el peso indicado.
  let blob: Blob | null = null;
  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) break;
  }
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// Pone el archivo reducido en el campo de archivo, para que el formulario lo envíe.
export function setInputFile(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}
