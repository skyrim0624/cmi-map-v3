# CMI Map 地点收藏卡模板 v1

这个目录从概念图拆出了可复用素材。

## 主要文件

- `fixed-background-empty-slots.png`：固定底图。保留固定文字和装饰，照片、地点名、标签文字、推荐语、二维码位置已留空。
- `source-generated-card.png`：原始概念图备份。
- `variable-slots-guide.png`：留白区域参考图，仅用于对位检查。
- `asset-manifest.json`：画布尺寸、素材列表和可变内容坐标。

## 可变内容

- 照片：放入 `photo` 区域，建议按 `photo-slot-mask.png` 做圆角裁切。
- 地点名：放入 `placeName` 区域。
- 分类标签：放入 `categoryText` 区域。
- 推荐人：放入 `recommenderText` 区域。
- 推荐语：放入 `recommendationText` 区域。
- 二维码：放入 `qrCode` 区域，建议按 `qr-slot-mask.png` 做圆角裁切。

## 单独素材

- `photo-sample-rounded.png` / `photo-sample-raw.png`：概念图里的照片裁切样本。
- `outer-border-overlay.png`：外层紫色圆角边框素材。
- `deco-top-left-pin-badge.png`：左上角定位图标。
- `deco-top-right-map-stamp.png`：右上角地图邮戳。
- `deco-mini-map.png`：中部小地图装饰。
- `deco-bottom-pin-badge.png`：底部定位图标。
- `pill-category-empty.png`：分类标签空底。
- `pill-recommender-empty.png`：推荐人标签空底。
- `recommendation-box-empty.png`：推荐语空框。
- `qr-frame-empty.png`：二维码空框。
- `bottom-scan-panel-empty-qr.png`：底部扫码区域，二维码已留空。
