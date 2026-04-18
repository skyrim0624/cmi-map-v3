sed -i '' '/import dayjs from/d' src/pages/PlaceDetail.tsx
sed -i '' 's/dayjs(rec.created_at).format.*YYYY.*DD日.*)/new Date(rec.created_at || Date.now()).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })/g' src/pages/PlaceDetail.tsx
