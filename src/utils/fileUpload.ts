/**
 * Helper utility to read Image or PDF files from the user's device (phone / laptop)
 * into a persistent Base64 DataURL for instant multi-device cloud synchronization.
 */
export function readFileAsDataUrl(file: File, compressImage = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Không tìm thấy tệp tin'));
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      reject(new Error('Chỉ hỗ trợ định dạng Hình ảnh (JPG, PNG, WEBP) hoặc Tài liệu PDF (.pdf)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lỗi khi đọc tệp từ thiết bị'));
    reader.onload = () => {
      const result = reader.result as string;
      if (isPdf || !compressImage) {
        resolve(result);
        return;
      }

      // Always compress images using HTML Canvas to max 800px & 0.7 quality to ensure small base64 footprint (~50KB)
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
  Safe wrapper around localStorage.setItem to catch QuotaExceededError and keep app running smoothly
 */
export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[localStorage] QuotaExceededError caught for key "${key}":`, e);
    try {
      if (key === 'agu_proofs') {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((p: any) => ({
            ...p,
            fileUrl: p.fileUrl && p.fileUrl.length > 50000 ? undefined : p.fileUrl,
            imageUrl: p.imageUrl && p.imageUrl.length > 50000 ? undefined : p.imageUrl
          }));
          localStorage.setItem(key, JSON.stringify(sanitized));
        }
      }
    } catch {
      // ignore secondary storage failure
    }
  }
}
