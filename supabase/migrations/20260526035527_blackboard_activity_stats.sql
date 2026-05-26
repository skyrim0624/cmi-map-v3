create or replace function public.get_blackboard_activity_stats(target_author_ids uuid[])
returns table (
  author_id uuid,
  post_count bigint,
  comment_count bigint,
  activity_score bigint
)
language sql
stable
as $$
  with target_authors as (
    select distinct unnest(target_author_ids) as author_id
  ),
  post_counts as (
    select blackboard_posts.author_id, count(*)::bigint as post_count
    from public.blackboard_posts
    where blackboard_posts.author_id = any(target_author_ids)
    group by blackboard_posts.author_id
  ),
  comment_counts as (
    select blackboard_comments.author_id, count(*)::bigint as comment_count
    from public.blackboard_comments
    where blackboard_comments.author_id = any(target_author_ids)
    group by blackboard_comments.author_id
  )
  select
    target_authors.author_id,
    coalesce(post_counts.post_count, 0)::bigint as post_count,
    coalesce(comment_counts.comment_count, 0)::bigint as comment_count,
    (coalesce(post_counts.post_count, 0) * 3 + coalesce(comment_counts.comment_count, 0))::bigint as activity_score
  from target_authors
  left join post_counts on post_counts.author_id = target_authors.author_id
  left join comment_counts on comment_counts.author_id = target_authors.author_id;
$$;

grant execute on function public.get_blackboard_activity_stats(uuid[]) to anon, authenticated, service_role;
