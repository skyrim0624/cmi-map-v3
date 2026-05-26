import { ImagePlus, X } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

interface EventPosterFieldProps {
  posterUrl: string;
  fileName?: string;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}

export function EventPosterField({
  posterUrl,
  fileName,
  onFileChange,
  onRemove,
}: EventPosterFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    onFileChange(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {posterUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#2e2a23]/12 bg-white">
          <img
            src={posterUrl}
            alt="活动海报预览"
            className="max-h-[22rem] w-full bg-[#f7efe0] object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/62 to-transparent px-3 pb-3 pt-12">
            <span className="min-w-0 truncate text-xs font-black text-white">
              {fileName || '活动海报'}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="min-h-9 rounded-full bg-white px-3 text-xs font-black text-[#242424]"
                onClick={() => fileInputRef.current?.click()}
              >
                更换
              </button>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#242424]"
                onClick={onRemove}
                aria-label="移除海报"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2e2a23]/18 bg-white text-sm font-black text-[#6d6a62] active:scale-[0.99]"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          添加活动海报
        </button>
      )}
    </div>
  );
}
