export interface UserNameAvailabilityClient {
  rpc: (
    functionName: string,
    params: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

export const normalizeProfileUserName = (userName: string) => userName.normalize('NFKC').trim();

export const checkUserNameAvailability = async (
  client: UserNameAvailabilityClient,
  userName: string
) => {
  const normalizedName = normalizeProfileUserName(userName);
  if (!normalizedName) return { available: false, error: null };

  const { data, error } = await client.rpc('is_user_name_available', {
    target_user_name: normalizedName,
  });

  if (error) {
    return { available: false, error: new Error(error.message ?? '昵称检查失败') };
  }

  return { available: Boolean(data), error: null };
};
