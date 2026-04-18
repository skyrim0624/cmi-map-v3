sed -i '' 's/upvotes?: { user_id: string }\[\];/upvotes?: { user_id: string }\[\];\n  wishlists?: { user_id: string }\[\];/g' src/types/types.ts
