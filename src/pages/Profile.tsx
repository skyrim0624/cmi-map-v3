import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendationsByUserId, deleteRecommendation, uploadAvatar, updateUserAvatar } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation } from '@/types/types';
import { getCategoryIconUrl } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, LogOut, Trash2, Camera } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadUserRecommendations();
    }
  }, [user]);

  const loadUserRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    const data = await getRecommendationsByUserId(user.id);
    setRecommendations(data);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('已退出登录');
    navigate('/');
  };

  const handleDeleteClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecommendation) return;

    const success = await deleteRecommendation(selectedRecommendation.id);
    
    if (success) {
      toast.success('删除成功');
      // 刷新列表
      loadUserRecommendations();
    } else {
      toast.error('删除失败，请重试');
    }
    
    setDeleteDialogOpen(false);
    setSelectedRecommendation(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小（1MB）
    if (file.size > 1024 * 1024) {
      toast.error('图片大小不能超过 1MB');
      return;
    }

    setUploading(true);
    
    try {
      // 上传头像
      const avatarUrl = await uploadAvatar(file, user.id);
      
      if (!avatarUrl) {
        toast.error('上传失败，请重试');
        return;
      }

      // 更新数据库
      const success = await updateUserAvatar(user.id, avatarUrl);
      
      if (success) {
        toast.success('头像更新成功');
        // 刷新用户信息
        if (refreshProfile) {
          await refreshProfile();
        }
      } else {
        toast.error('更新失败，请重试');
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
      // 清空 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayName = profile?.user_name || user?.email?.split('@')[0] || '用户';

  return (
    <div className="relative w-full min-h-screen bg-background">
      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full press-feedback"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* 退出登录按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full press-feedback"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="h-screen">
        <div className="px-6 py-12 space-y-8">
          {/* 用户信息 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* 编辑头像按钮 */}
              <Button
                size="icon"
                variant="default"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-lg press-feedback"
                onClick={handleAvatarClick}
                disabled={uploading}
              >
                <Camera className="w-4 h-4" />
              </Button>
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            {user?.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
          </div>

          {/* 统计数据 */}
          <div className="bg-card border-2 border-foreground p-6 text-center shadow-[4px_4px_0_hsl(var(--foreground))]">
            <p className="text-3xl font-bold text-primary mb-2">
              {recommendations.length}
            </p>
            <p className="text-sm text-muted-foreground">
              已贡献推荐
            </p>
          </div>

          {/* 我的推荐列表 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">我的推荐</h2>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                加载中...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">
                  你还没有贡献推荐
                </p>
                <Button onClick={() => navigate('/mark')}>
                  去标记一个地方
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="app-list-card bg-card p-4 border-2 border-foreground"
                  >
                    <div className="flex gap-4">
                      {/* 左侧图片或图标 */}
                      <div 
                        className="flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
                      >
                        {rec.images.length > 0 ? (
                          <img
                            src={rec.images[0]}
                            alt={rec.place_name}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center p-4">
                            <img src={getCategoryIconUrl(rec.category)} alt={rec.category} className="w-full h-full object-contain opacity-60" />
                          </div>
                        )}
                      </div>

                      {/* 右侧内容 */}
                      <div 
                        className="flex-1 min-w-0 space-y-2 cursor-pointer"
                        onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
                      >
                        {/* 推荐理由 */}
                        <p className="text-base leading-relaxed text-foreground line-clamp-2">
                          "{rec.reason}"
                        </p>

                        {/* 地点名称 */}
                        <p className="text-sm text-muted-foreground">
                          📍 {rec.place_name}
                        </p>

                        {/* 时间 */}
                        <p className="text-xs text-muted-foreground">
                          {new Date(rec.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>

                      {/* 删除按钮 */}
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(rec);
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除推荐「{selectedRecommendation?.place_name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
