export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    targetSizeKB = 600,
  } = options;

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB hard ceiling
  const MIN_QUALITY = 0.1;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');

        const drawResized = (width: number, height: number) => {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return false;
          }
          ctx.drawImage(img, 0, 0, width, height);
          return true;
        };

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        width = Math.round(width);
        height = Math.round(height);

        if (!drawResized(width, height)) return;

        const compressCanvas = (
          startQuality: number,
          done: (blob: Blob) => void,
          onFail: (err: Error) => void
        ) => {
          let currentQuality = startQuality;

          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  onFail(new Error('Failed to compress image'));
                  return;
                }

                if (blob.size > MAX_BYTES && currentQuality <= MIN_QUALITY) {
                  onFail(
                    new Error(
                      'Photo is still above 5MB after compression. Please choose a smaller image.'
                    )
                  );
                  return;
                }

                const sizeKB = blob.size / 1024;
                if (sizeKB > targetSizeKB && currentQuality > MIN_QUALITY) {
                  currentQuality = Math.max(MIN_QUALITY, currentQuality - 0.05);
                  tryCompress();
                  return;
                }

                if (blob.size <= MAX_BYTES) {
                  done(blob);
                } else {
                  onFail(
                    new Error(
                      'Photo is still above 5MB after compression. Please choose a smaller image.'
                    )
                  );
                }
              },
              'image/jpeg',
              currentQuality
            );
          };

          tryCompress();
        };

        compressCanvas(
          quality,
          (blob) => resolve(blob),
          () => {
            const fallbackScale = 0.75;
            const fallbackWidth = Math.max(640, Math.round(width * fallbackScale));
            const fallbackHeight = Math.max(640, Math.round(height * fallbackScale));

            if (!drawResized(fallbackWidth, fallbackHeight)) return;

            compressCanvas(0.8, (blob) => resolve(blob), (err) => reject(err));
          }
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!file.type) {
    return {
      valid: false,
      error: 'Photo type could not be detected. Please choose a JPEG, PNG, or WebP image.',
    };
  }

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, or WebP)',
    };
  }

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      error: 'Photo must be 5MB or less.',
    };
  }

  return { valid: true };
}
