import { ArrowLeft, Camera, Loader2, MapPin, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createPlaceTrace, loadCheckInTargetRecommendations } from '@/features/check-ins/check-in-service';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getPlacePath } from '@/lib/paths';
import type { Recommendation } from '@/types/types';
import { getCategoryIconUrl, normalizeCategory } from '@/types/types';

export default function AddTrace() {
  const { placeName } = useParams<{ placeName: string }>();
  const decodedPlaceName = decodeURIComponent(placeName || '');
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', {
        state: { from: `/place/${encodeURIComponent(decodedPlaceName)}/add-trace` },
        replace: true,
      });
    }
  }, [decodedPlaceName, navigate, user]);

  useEffect(() => {
    const loadPlace = async () => {
      if (!decodedPlaceName) return;
      setLoading(true);
      const data = await loadCheckInTargetRecommendations(decodedPlaceName);
      setRecommendations(data);
      setLoading(false);
    };

    void loadPlace();
  }, [decodedPlaceName]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const sourceRecommendation = useMemo(() => recommendations[0] || null, [recommendations]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !sourceRecommendation) return;

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4) {
      toast.error('至少留下一句具体的话');
      return;
    }

    setSubmitting(true);
    try {
      const userName = profile?.user_name || user.email?.split('@')[0] || '匿名用户';
      const result = await createPlaceTrace({
        sourceRecommendation,
        reason: trimmedReason,
        userId: user.id,
        userName,
        imageFile,
      });

      if (result.status === 'image-upload-failed') {
        toast.error('照片没有传上去，请重试或先只留文字');
        setSubmitting(false);
        return;
      }

      if (result.status !== 'created') {
        throw new Error('创建推荐失败');
      }

      toast.success('你也在这里补了一句');
      navigate(getPlacePath(result.recommendation.place_name), {
        replace: true,
        state: { newTraceId: result.recommendation.id },
      });
    } catch (error) {
      console.error(error);
      toast.error('这句话没有留下来，请再试一次');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!sourceRecommendation) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          这个地点还没有公开推荐，不能直接补一句。
        </p>
        <Button onClick={() => navigate('/mark')}>新建一条推荐</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(getPlacePath(sourceRecommendation.place_name), { replace: true })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-black text-primary">我也来补一句</p>
            <h1 className="truncate text-xl font-black text-foreground">
              {sourceRecommendation.place_name}
            </h1>
          </div>
        </div>
      </header>

      <main className="space-y-5 px-4 pb-28 pt-5">
        <section className="rounded-[1.5rem] border-2 border-foreground bg-card p-4 shadow-[4px_5px_0_rgba(0,0,0,0.16)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-primary">
            <img
              src={getCategoryIconUrl(sourceRecommendation.category)}
              alt=""
              className="h-5 w-5 object-contain"
            />
            {normalizeCategory(sourceRecommendation.category)}
          </div>
          <p className="text-base font-semibold leading-relaxed text-foreground">
            "{getRecommendationReasonText(sourceRecommendation)}"
          </p>
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            —— {sourceRecommendation.user_name}
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
            <MapPin className="h-4 w-4" />
            不用重新选点，会挂在同一个地点下面
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={180}
            placeholder="比如：我今天下午去了，靠窗的位置很适合写东西，但五点后会有点吵。"
            className="min-h-36 resize-none rounded-2xl border-2 bg-card px-4 py-4 text-base leading-relaxed"
          />
          <div className="flex justify-end text-xs font-medium text-muted-foreground">
            {reason.trim().length}/180
          </div>
        </section>

        <section className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={imagePreview} alt="" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                onClick={clearImage}
                aria-label="移除照片"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-28 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-bold text-muted-foreground active:scale-[0.99]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              可选，加一张你看到的照片
            </button>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Button
          className="h-12 w-full rounded-full border-2 border-foreground font-black shadow-[3px_4px_0_rgba(0,0,0,0.16)]"
          onClick={handleSubmit}
          disabled={submitting || !reason.trim()}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在留下这一句
            </>
          ) : (
            '留下这一句'
          )}
        </Button>
      </div>
    </div>
  );
}
