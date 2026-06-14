const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type PagesContext = {
  request: Request;
  env: {
    CMI_MAP_SEGMENT_MODEL_URL?: string;
    CMI_MAP_SEGMENT_MODEL_TOKEN?: string;
    CMI_MAP_SPECIES_MODEL_URL?: string;
    CMI_MAP_SPECIES_MODEL_TOKEN?: string;
  };
};

type CloudflareImageFetchInit = RequestInit & {
  cf: {
    image: {
      segment: 'foreground';
      format: 'png';
    };
  };
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });

const getSegmentModelUrl = (env: PagesContext['env']) => {
  const configuredUrl = env.CMI_MAP_SEGMENT_MODEL_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const speciesModelUrl = env.CMI_MAP_SPECIES_MODEL_URL?.trim();
  return speciesModelUrl && /\/identify\/?$/.test(speciesModelUrl)
    ? speciesModelUrl.replace(/\/identify\/?$/, '/segment')
    : '';
};

const getSegmentModelToken = (env: PagesContext['env']) =>
  env.CMI_MAP_SEGMENT_MODEL_TOKEN?.trim() || env.CMI_MAP_SPECIES_MODEL_TOKEN?.trim() || '';

const normalizeImageUrl = (value: unknown) => {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
};

const createCloudflareForegroundCutout = async (imageUrl: string) => {
  try {
    const response = await fetch(new Request(imageUrl, {
      headers: { 'accept': 'image/png,image/*' },
    }), {
      cf: {
        image: {
          segment: 'foreground',
          format: 'png',
        },
      },
    } as CloudflareImageFetchInit);
    if (!response.ok) throw new Error('Cloudflare foreground segmentation failed');

    return new Response(response.body, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.warn('Cloudflare Images 前景分割失败:', error);
    return jsonResponse({
      status: 'unavailable',
      message: '抠图服务暂时不可用',
    }, { status: 503 });
  }
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const requestFormData = await request.formData();
  const image = requestFormData.get('image');
  const imageUrl = normalizeImageUrl(requestFormData.get('imageUrl'));
  const subjectBox = requestFormData.get('subjectBox');

  if (!(image instanceof File) && !imageUrl) {
    return jsonResponse({ status: 'error', message: '需要上传图片或图片地址' }, { status: 400 });
  }

  if (image instanceof File && !image.type.startsWith('image/')) {
    return jsonResponse({ status: 'error', message: '需要上传图片' }, { status: 400 });
  }

  if (image instanceof File && image.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ status: 'error', message: '图片太大，请重新拍一张' }, { status: 413 });
  }

  const segmentModelUrl = getSegmentModelUrl(env);
  if (!segmentModelUrl) {
    if (!imageUrl) {
      return jsonResponse({
        status: 'unavailable',
        message: '抠图服务暂时不可用',
      }, { status: 503 });
    }

    return createCloudflareForegroundCutout(imageUrl);
  }

  if (!(image instanceof File)) {
    return jsonResponse({ status: 'error', message: '需要上传图片' }, { status: 400 });
  }

  const formData = new FormData();
  formData.append('image', image, image.name || 'animal-checkin.jpg');
  if (typeof subjectBox === 'string' && subjectBox.trim()) {
    formData.append('subjectBox', subjectBox);
  }

  const headers = new Headers({ 'accept': 'image/png' });
  const token = getSegmentModelToken(env);
  if (token) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(segmentModelUrl, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    return jsonResponse({
      status: 'unavailable',
      message: '抠图服务暂时不可用',
    }, { status: 503 });
  }

  if (!response.ok) {
    const message = response.status >= 500 ? '抠图服务繁忙，请稍后再试' : '抠图失败，请换张照片';
    return jsonResponse({ status: 'error', message }, { status: response.status });
  }

  const imageBytes = await response.arrayBuffer();
  return new Response(imageBytes, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': 'no-store',
    },
  });
};
