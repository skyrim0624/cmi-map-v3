// 本地存储工具

const USER_NAME_KEY = 'cmi_map_user_name';
const USER_AVATAR_KEY = 'cmi_map_user_avatar';

// 保存用户名
export const saveUserName = (name: string): void => {
  localStorage.setItem(USER_NAME_KEY, name);
};

// 获取用户名
export const getUserName = (): string | null => {
  return localStorage.getItem(USER_NAME_KEY);
};

// 保存用户头像（默认头像索引）
export const saveUserAvatar = (avatarIndex: number): void => {
  localStorage.setItem(USER_AVATAR_KEY, avatarIndex.toString());
};

// 获取用户头像
export const getUserAvatar = (): number => {
  const avatar = localStorage.getItem(USER_AVATAR_KEY);
  return avatar ? parseInt(avatar, 10) : 0;
};

// 清除所有本地数据
export const clearLocalData = (): void => {
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_AVATAR_KEY);
};
