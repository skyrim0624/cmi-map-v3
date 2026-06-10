# CMI Map 物种识别模型服务

这是给 `/api/animal-identify` 调用的自托管专业物种识别后端。它不替代 CMI Map 主站，只负责接收照片，返回中文名、英文名、拉丁学名、分类等级和置信度。

## 模型组合

- 主模型：`hf-hub:imageomics/bioclip-2.5-vith14`
- 兜底模型：`hf-hub:imageomics/bioclip-2`
- 候选库：`catalog/chiang-mai-animals.json`

默认策略是 BioCLIP 2.5 先判定；如果置信度或前两名差距不够，调用 BioCLIP 2 复核。显存足够时可把 `BIOCLIP_FALLBACK_MODE=always`，每张图都跑双模型。

## 本地启动

```bash
services/species-model/scripts/bootstrap-local.sh
SPECIES_MODEL_TOKEN=dev-token services/species-model/scripts/start-local.sh
```

本地脚本默认会在启动时预加载 BioCLIP 2.5，并默认关闭 BioCLIP 2 兜底模型。这样启动会慢一些，但用户第一次识别不用等冷启动。需要双模型复核时再手动开启：

```bash
SPECIES_MODEL_TOKEN=dev-token BIOCLIP_FALLBACK_MODE=auto services/species-model/scripts/start-local.sh
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

识别测试：

```bash
curl -X POST http://127.0.0.1:8000/identify \
  -H 'Authorization: Bearer dev-token' \
  -F 'image=@/path/to/photo.jpg' \
  -F 'coarseCandidates=[{"nameZh":"鸟类","nameEn":"Bird","scientificName":"Aves","taxonRank":"CLASS","score":0.8}]'
```

临时接到线上 CMI Map：

```bash
services/species-model/scripts/start-tunnel.sh
```

复制输出里的 `https://*.trycloudflare.com`，在末尾加 `/identify` 后填入 `CMI_MAP_SPECIES_MODEL_URL`。

返回格式：

```json
{
  "animalPresent": true,
  "commonNameZh": "蓝翡翠",
  "commonNameEn": "Black-capped kingfisher",
  "scientificName": "Halcyon pileata",
  "taxonRank": "SPECIES",
  "confidence": 0.91
}
```

## Docker 启动

```bash
cd services/species-model
docker build -t cmi-species-model .
docker run --rm -p 8000:8000 \
  -e SPECIES_MODEL_TOKEN=dev-token \
  -e BIOCLIP_DEVICE=auto \
  -e BIOCLIP_FALLBACK_MODE=auto \
  cmi-species-model
```

第一次启动会下载模型权重，时间取决于网络和机器。正式活动建议用 GPU 机器常驻服务；CPU 可以跑，但延迟会明显变长。

## 接到 CMI Map

部署服务后，在 Cloudflare Pages 项目 `cmi-map` 配：

```txt
CMI_MAP_SPECIES_MODEL_URL=https://你的模型服务域名/identify
CMI_MAP_SPECIES_MODEL_TOKEN=和 SPECIES_MODEL_TOKEN 相同的密钥
```

CMI Map 主站已经会优先调用这个服务；没有配置时继续走现有粗识别链路。

## 可调参数

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SPECIES_MODEL_TOKEN` | 空 | 模型服务自己的 Bearer Token |
| `BIOCLIP_PRIMARY_MODEL` | `hf-hub:imageomics/bioclip-2.5-vith14` | 主模型 |
| `BIOCLIP_FALLBACK_MODEL` | `hf-hub:imageomics/bioclip-2` | 兜底模型 |
| `BIOCLIP_FALLBACK_MODE` | `auto` | `auto` / `always` / `never` |
| `BIOCLIP_DEVICE` | `auto` | `auto` / `cuda` / `mps` / `cpu` |
| `BIOCLIP_PRELOAD` | `0` | `1` 表示启动时预加载模型；本地脚本默认设为 `1` |
| `SPECIES_MIN_CONFIDENCE` | `0.68` | 低于这个值不返回物种 |
| `SPECIES_MIN_MARGIN` | `0.06` | 前两名差距太小不返回物种 |
| `SPECIES_MAX_CANDIDATES` | `180` | 单次参与比对的最大候选数 |
| `SPECIES_CATALOG_PATH` | 内置清迈候选库 | 自定义候选库路径 |
