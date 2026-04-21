const encodeS3Key = (key: string) =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getDefaultConfig = () => ({
  bucket: import.meta.env.VITE_AWS_S3_BUCKET ?? "",
  region: import.meta.env.VITE_AWS_REGION ?? "",
  publicBaseUrl: import.meta.env.VITE_AWS_S3_PUBLIC_BASE_URL ?? "",
});

export const buildS3PublicUrl = (
  key: string,
  config?: {
    bucket?: string;
    region?: string;
    publicBaseUrl?: string;
  },
) => {
  const { bucket, region, publicBaseUrl } = {
    ...getDefaultConfig(),
    ...config,
  };
  const normalizedKey = key.replace(/^\/+/, "");

  if (!normalizedKey) {
    return "";
  }

  if (publicBaseUrl) {
    const normalized = publicBaseUrl.replace(/\/+$/, "");
    return `${normalized}/${encodeS3Key(normalizedKey)}`;
  }

  if (!bucket || !region) {
    return normalizedKey;
  }

  return `https://s3.${region}.amazonaws.com/${bucket}/${encodeS3Key(normalizedKey)}`;
};

export const resolveS3ImageUrl = (
  value: string | undefined | null,
  config?: {
    bucket?: string;
    region?: string;
    publicBaseUrl?: string;
  },
) => {
  if (!value) {
    return "";
  }

  if (isAbsoluteUrl(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  return buildS3PublicUrl(value, config);
};
