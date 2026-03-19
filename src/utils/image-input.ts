import { z } from 'zod';

const HTTP_IMAGE_URL_PATTERN = /^https?:\/\//i;
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i;
const BASE64_PAYLOAD_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

function getImageUrlError(url: string): string | null {
  if (HTTP_IMAGE_URL_PATTERN.test(url)) {
    return null;
  }

  if (!url.startsWith('data:')) {
    return '必须是 http(s) URL 或 data:image/<png|jpeg|webp|gif>;base64,...';
  }

  const mimeMatch = url.match(/^data:([^;,]+)/i);
  if (!mimeMatch) {
    return 'Data URL 缺少合法的 MIME 类型';
  }

  if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(url)) {
    return 'Data URL 仅支持 image/png、image/jpeg、image/webp、image/gif，且必须包含 ;base64';
  }

  const parts = url.split(',', 2);
  if (parts.length < 2 || !parts[1]?.trim()) {
    return 'Data URL 缺少 base64 数据段';
  }

  if (!BASE64_PAYLOAD_PATTERN.test(parts[1])) {
    return 'Data URL 的 base64 数据段包含非法字符';
  }

  if (!DATA_URL_PATTERN.test(url)) {
    return 'Data URL 格式不合法';
  }

  return null;
}

export const OpenAiImageUrlSchema = z
  .string()
  .min(1, '不能为空')
  .superRefine((value, ctx) => {
    const error = getImageUrlError(value);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      });
    }
  })
  .describe('支持 http(s) URL 或 data:image/{png|jpeg|webp|gif};base64,...');

export const ImageUrlPayloadSchema = z
  .object({
    url: OpenAiImageUrlSchema,
  })
  .strict();

export const ImageUrlContentSchema = z
  .object({
    type: z.literal('image_url'),
    image_url: ImageUrlPayloadSchema,
  })
  .strict()
  .describe(
    'OpenAI 标准图片输入项，格式为 { type: "image_url", image_url: { url: "https://..." } } 或 Data URL。'
  );

export function normalizeImageUrlContent(input: z.infer<typeof ImageUrlContentSchema>) {
  return {
    type: 'image_url' as const,
    image_url: {
      url: input.image_url.url.trim(),
    },
  };
}

export function formatZodError(prefix: string, error: z.ZodError): string {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return `❌ ${prefix}: 输入不合法`;
  }

  const path = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'input';
  return `❌ ${prefix}: ${path} ${firstIssue.message}`;
}
