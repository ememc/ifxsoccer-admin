import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
import { buildS3PublicUrl, resolveS3ImageUrl } from "../../utils/s3Image";

interface S3ImageItem {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
}

interface S3ImageManagerProps {
  bucket?: string;
  region?: string;
  prefix?: string;
  publicBaseUrl?: string;
  selectedUrl?: string;
  onSelect: (url: string) => void;
}

const IMAGE_FILE_REGEX = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

const getS3ErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const maybeError = error as {
    name?: string;
    message?: string;
    Code?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  const code = maybeError.Code ?? maybeError.name ?? "S3Error";
  const message = maybeError.message ?? "Unknown error";
  const status = maybeError.$metadata?.httpStatusCode;

  return `${fallback} (${code}${status ? ` ${status}` : ""}): ${message}`;
};

const normalizePrefix = (prefix: string) => {
  if (!prefix.trim()) {
    return "";
  }

  return prefix.endsWith("/") ? prefix : `${prefix}/`;
};

export default function S3ImageManager({
  bucket = import.meta.env.VITE_AWS_S3_BUCKET ?? "",
  region = import.meta.env.VITE_AWS_REGION ?? "",
  prefix = import.meta.env.VITE_AWS_S3_PREFIX ?? "",
  publicBaseUrl = import.meta.env.VITE_AWS_S3_PUBLIC_BASE_URL,
  selectedUrl,
  onSelect,
}: S3ImageManagerProps) {
  const ITEMS_PER_PAGE = 12;
  const [items, setItems] = useState<S3ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? "";
  const sessionToken = import.meta.env.VITE_AWS_SESSION_TOKEN;

  const missingConfig = useMemo(() => {
    const missing: string[] = [];
    if (!bucket) missing.push("VITE_AWS_S3_BUCKET");
    if (!region) missing.push("VITE_AWS_REGION");
    if (!accessKeyId) missing.push("VITE_AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("VITE_AWS_SECRET_ACCESS_KEY");
    return missing;
  }, [accessKeyId, bucket, region, secretAccessKey]);

  const client = useMemo(() => {
    if (missingConfig.length > 0) {
      return null;
    }

    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    });
  }, [accessKeyId, missingConfig, region, secretAccessKey, sessionToken]);
  const normalizedSelectedUrl = resolveS3ImageUrl(selectedUrl, { bucket, region, publicBaseUrl });
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => item.key.toLowerCase().includes(normalizedSearch));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const listImages = useCallback(async () => {
    if (!client) {
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalizePrefix(prefix),
      });

      const response = await client.send(command);
      const content = response.Contents ?? [];

      const nextItems = content
        .filter((obj) => !!obj.Key && IMAGE_FILE_REGEX.test(obj.Key))
        .map((obj) => {
          const key = obj.Key ?? "";
          return {
            key,
            url: buildS3PublicUrl(key, { bucket, region, publicBaseUrl }),
            size: obj.Size ?? 0,
            lastModified: obj.LastModified,
          };
        })
        .sort((a, b) => {
          const dateA = a.lastModified ? a.lastModified.getTime() : 0;
          const dateB = b.lastModified ? b.lastModified.getTime() : 0;
          return dateB - dateA;
        });

      setItems(nextItems);
      setMessage(`${nextItems.length} imagen(es) cargadas desde S3.`);
    } catch (err) {
      setError(getS3ErrorMessage(err, "No se pudieron listar imagenes del bucket S3"));
    } finally {
      setIsLoading(false);
    }
  }, [bucket, client, prefix, publicBaseUrl, region]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!client) {
        return;
      }

      setIsUploading(true);
      setError("");
      setMessage("");

      const normalizedPrefix = normalizePrefix(prefix);
      const cleanName = file.name.replace(/[^\w.\-]+/g, "-");
      const key = `${normalizedPrefix}${Date.now()}-${cleanName}`;

      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file,
            ContentType: file.type || "application/octet-stream",
          }),
        );

        const newUrl = buildS3PublicUrl(key, { bucket, region, publicBaseUrl });
        onSelect(newUrl);
        setMessage("Imagen subida correctamente.");
        await listImages();
        setCurrentPage(1);
      } catch (err) {
        setError(getS3ErrorMessage(err, "No se pudo subir la imagen a S3"));
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, client, listImages, onSelect, prefix, publicBaseUrl, region],
  );

  const deleteImage = useCallback(
    async (key: string) => {
      if (!client) {
        return;
      }

      setError("");
      setMessage("");

      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );

        setMessage("Imagen eliminada correctamente.");
        setItems((current) => current.filter((item) => item.key !== key));
      } catch (err) {
        setError(getS3ErrorMessage(err, "No se pudo eliminar la imagen en S3"));
      }
    },
    [bucket, client],
  );

  useEffect(() => {
    if (!isLibraryOpen) {
      return;
    }

    if (items.length === 0 && !isLoading) {
      void listImages();
    }
  }, [isLibraryOpen, items.length, isLoading, listImages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  if (missingConfig.length > 0) {
    return (
      <div className="rounded-lg border border-error-300 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
        Configuracion incompleta de S3. Variables faltantes: {missingConfig.join(", ")}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setIsLibraryOpen(true);
          }}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Abrir biblioteca S3
        </button>
      </div>

      {message && <p className="text-sm text-success-600 dark:text-success-400">{message}</p>}
      {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}

      <Modal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        className="my-[5vh] max-h-[90vh] w-full max-w-6xl overflow-y-auto p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Biblioteca S3</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void listImages();
                }}
                disabled={isLoading || isUploading}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Cargando..." : "Actualizar"}
              </button>
              <Label
                htmlFor="s3-upload"
                className="mb-0 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {isUploading ? "Subiendo..." : "Subir imagen"}
              </Label>
              <input
                id="s3-upload"
                type="file"
                accept="image/*"
                disabled={isUploading}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadImage(file);
                  }

                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre de archivo o ruta..."
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />

          {items.length === 0 && !isLoading && (
            <p className="text-sm text-gray-500">No hay imagenes para mostrar en este bucket/prefix.</p>
          )}
          {items.length > 0 && filteredItems.length === 0 && (
            <p className="text-sm text-gray-500">No se encontraron imagenes con ese nombre.</p>
          )}

          {paginatedItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedItems.map((item) => {
                const isSelected = normalizedSelectedUrl === item.url;
                return (
                  <div
                    key={item.key}
                    className={`space-y-2 rounded-lg border p-3 ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 dark:border-brand-400 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="h-32 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                      <img src={item.url} alt={item.key} className="h-full w-full object-cover" />
                    </div>
                    <p className="truncate text-xs text-gray-600 dark:text-gray-300" title={item.key}>
                      {item.key}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(item.size / 1024)} KB</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item.url);
                          setIsLibraryOpen(false);
                        }}
                        className="rounded-md bg-success-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-600"
                      >
                        Usar URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteImage(item.key);
                        }}
                        className="rounded-md bg-error-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-error-600"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredItems.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} de {filteredItems.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  Pagina {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {normalizedSelectedUrl && (
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-300">Imagen seleccionada</p>
          <div className="h-32 w-48 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
            <img src={normalizedSelectedUrl} alt="Seleccionada" className="h-full w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
