import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { buildS3PublicUrl } from "../../utils/s3Image";
import { Modal } from "../ui/modal";

interface S3DocumentItem {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
}

interface S3DocumentManagerProps {
  bucket?: string;
  region?: string;
  prefix?: string;
  publicBaseUrl?: string;
  selectedUrl?: string;
  accept?: string;
  onSelect: (url: string) => void;
}

const ITEMS_PER_PAGE = 15;
const DEFAULT_PUBLIC_BASE_URL = "https://docs.ifxsoccer.com";
const DEFAULT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.mov,.avi,.mkv";
const DOCUMENT_FILE_REGEX =
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z|mp3|mp4|mov|avi|mkv)$/i;

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
  const detail = `${fallback} (${code}${status ? ` ${status}` : ""}): ${message}`;

  if (status === 403 || code === "AccessDenied") {
    return `${detail}. Las credenciales pueden listar, pero necesitan permiso s3:PutObject para subir o s3:DeleteObject para borrar.`;
  }

  if (code === "TypeError" || /failed to fetch|network/i.test(message)) {
    return `${detail}. Si ocurre en el navegador, revisa CORS del bucket: debe permitir GET, PUT y DELETE con headers x-amz-*.`;
  }

  return detail;
};

const normalizePrefix = (prefix: string) => {
  if (!prefix.trim()) {
    return "";
  }

  return prefix.endsWith("/") ? prefix : `${prefix}/`;
};

const normalizeSelectedUrl = (
  value: string | undefined,
  bucket: string,
  region: string,
  publicBaseUrl: string,
) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("blob:") || value.startsWith("data:")) {
    return value;
  }

  return buildS3PublicUrl(value, { bucket, region, publicBaseUrl });
};

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
};

const getExtension = (key: string) => {
  const extension = key.split(".").pop()?.trim().toUpperCase();
  return extension || "FILE";
};

export default function S3DocumentManager({
  bucket = "docs.ifxsoccer.com",
  region = import.meta.env.VITE_AWS_REGION ?? "",
  prefix = "",
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  selectedUrl,
  accept = DEFAULT_ACCEPT,
  onSelect,
}: S3DocumentManagerProps) {
  const [items, setItems] = useState<S3DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? "";
  const sessionToken = import.meta.env.VITE_AWS_SESSION_TOKEN;

  const missingConfig = useMemo(() => {
    const missing: string[] = [];
    if (!bucket) missing.push("bucket");
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
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    });
  }, [accessKeyId, missingConfig, region, secretAccessKey, sessionToken]);

  const selectedDocumentUrl = normalizeSelectedUrl(selectedUrl, bucket, region, publicBaseUrl);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => item.key.toLowerCase().includes(normalizedSearch));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const listDocuments = useCallback(async () => {
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
        .filter((obj) => !!obj.Key && DOCUMENT_FILE_REGEX.test(obj.Key))
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
      setMessage(`${nextItems.length} archivo(s) cargados desde S3.`);
    } catch (err) {
      setError(getS3ErrorMessage(err, "No se pudieron listar archivos del bucket S3"));
    } finally {
      setIsLoading(false);
    }
  }, [bucket, client, prefix, publicBaseUrl, region]);

  const uploadDocument = useCallback(
    async (file: File) => {
      if (!client) {
        return;
      }

      if (!DOCUMENT_FILE_REGEX.test(file.name)) {
        setError("Tipo de archivo no permitido para esta biblioteca.");
        return;
      }

      setIsUploading(true);
      setError("");
      setMessage("");

      const normalizedPrefix = normalizePrefix(prefix);
      const cleanName = file.name.replace(/[^\w.-]+/g, "-");
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
        setMessage("Archivo subido correctamente.");
        await listDocuments();
        setCurrentPage(1);
      } catch (err) {
        setError(getS3ErrorMessage(err, "No se pudo subir el archivo a S3"));
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, client, listDocuments, onSelect, prefix, publicBaseUrl, region],
  );

  const deleteDocument = useCallback(
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

        setMessage("Archivo eliminado correctamente.");
        setItems((current) => current.filter((item) => item.key !== key));
      } catch (err) {
        setError(getS3ErrorMessage(err, "No se pudo eliminar el archivo en S3"));
      }
    },
    [bucket, client],
  );

  useEffect(() => {
    if (!isLibraryOpen) {
      return;
    }

    if (items.length === 0 && !isLoading) {
      void listDocuments();
    }
  }, [isLibraryOpen, items.length, isLoading, listDocuments]);

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
          Abrir biblioteca de documentos
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Biblioteca de documentos S3
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void listDocuments();
                }}
                disabled={isLoading || isUploading}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Cargando..." : "Actualizar"}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {isUploading ? "Subiendo..." : "Subir archivo"}
              </button>
              <input
                ref={fileInputRef}
                id="s3-doc-upload"
                type="file"
                accept={accept}
                disabled={isLoading || isUploading}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadDocument(file);
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
            <p className="text-sm text-gray-500">
              No hay archivos para mostrar en este bucket/prefix.
            </p>
          )}
          {items.length > 0 && filteredItems.length === 0 && (
            <p className="text-sm text-gray-500">
              No se encontraron archivos con ese nombre.
            </p>
          )}

          {paginatedItems.length > 0 && (
            <div className="space-y-3">
              {paginatedItems.map((item) => {
                const isSelected = selectedDocumentUrl === item.url;

                return (
                  <div
                    key={item.key}
                    className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 dark:border-brand-400 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {getExtension(item.key)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium text-gray-800 dark:text-white/90"
                          title={item.key}
                        >
                          {item.key}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatFileSize(item.size)}</span>
                          <span>
                            {item.lastModified
                              ? item.lastModified.toLocaleString()
                              : "Sin fecha"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Ver
                      </a>
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
                          void deleteDocument(item.key);
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
                Mostrando {startIndex + 1} -{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} de{" "}
                {filteredItems.length}
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

      {selectedDocumentUrl && (
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-300">
            Archivo seleccionado
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {getExtension(selectedDocumentUrl)}
            </div>
            <a
              href={selectedDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate text-sm text-brand-600 underline dark:text-brand-400"
            >
              {selectedDocumentUrl}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
