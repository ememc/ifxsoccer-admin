import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DatePicker from "../../../components/form/date-picker";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import {
  createEmptyNews,
  createNews as createNewsRequest,
  fetchNewsItem,
  getNewsDisplayTitle,
  updateNews as updateNewsRequest,
} from "./newsData";
import type { News as NewsData } from "./newsData";

const richTextClasses =
  "min-h-[360px] w-full rounded-b-xl border border-t-0 border-gray-300 bg-white px-5 py-4 text-sm leading-7 text-gray-800 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-5 [&_img]:max-h-[420px] [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3";

const previewContentClasses =
  "space-y-4 text-[18px] leading-8 text-[#2d3749] [&_h1]:text-[34px] [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:text-[#1d3570] [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-[#1d3570] [&_h3]:text-[22px] [&_h3]:font-semibold [&_h3]:text-[#1d3570] [&_img]:my-5 [&_img]:max-h-[560px] [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover [&_li]:ml-6 [&_li]:list-disc [&_p]:mb-3";

const sanitizeRichHtml = (html: string): string => {
  const content = String(html ?? "");

  if (typeof document === "undefined") {
    return content;
  }

  const template = document.createElement("template");
  template.innerHTML = content;

  template.content
    .querySelectorAll("script, style, iframe, object, embed, link, meta")
    .forEach((element) => element.remove());

  template.content.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isUnsafeUrl =
        (name === "href" || name === "src") &&
        (value.startsWith("javascript:") || value.startsWith("data:text/html"));

      if (name.startsWith("on") || name === "style" || isUnsafeUrl) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

interface NewsRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function NewsRichTextEditor({ value, onChange, disabled = false }: NewsRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef("");

  useEffect(() => {
    const editor = editorRef.current;
    const sanitizedValue = sanitizeRichHtml(value);

    if (!editor) {
      return;
    }

    if (sanitizedValue !== lastHtmlRef.current && editor.innerHTML !== sanitizedValue) {
      editor.innerHTML = sanitizedValue;
      lastHtmlRef.current = sanitizedValue;
    }
  }, [value]);

  const syncEditorHtml = () => {
    const editor = editorRef.current;
    const nextHtml = sanitizeRichHtml(editor?.innerHTML ?? "");
    lastHtmlRef.current = nextHtml;
    onChange(nextHtml);
  };

  const runEditorCommand = (command: string, commandValue?: string) => {
    if (disabled) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncEditorHtml();
  };

  const insertImage = () => {
    const imageUrl = window.prompt("URL de imagen");
    const trimmedUrl = imageUrl?.trim();

    if (!trimmedUrl) {
      return;
    }

    runEditorCommand("insertImage", trimmedUrl);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const content = html ? sanitizeRichHtml(html) : textToHtml(text);

    document.execCommand("insertHTML", false, content);
    syncEditorHtml();
  };

  const buttonClasses =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]";

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-xl border border-gray-300 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Titulo"
          onClick={() => runEditorCommand("formatBlock", "H1")}
        >
          H1
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Subtitulo"
          onClick={() => runEditorCommand("formatBlock", "H2")}
        >
          H2
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Parrafo"
          onClick={() => runEditorCommand("formatBlock", "P")}
        >
          P
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Negrita"
          onClick={() => runEditorCommand("bold")}
        >
          B
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Cursiva"
          onClick={() => runEditorCommand("italic")}
        >
          I
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Lista"
          onClick={() => runEditorCommand("insertUnorderedList")}
        >
          List
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Imagen"
          onClick={insertImage}
        >
          Img
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          title="Limpiar formato"
          onClick={() => runEditorCommand("removeFormat")}
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className={richTextClasses}
        contentEditable={!disabled}
        onBlur={syncEditorHtml}
        onInput={syncEditorHtml}
        onPaste={handlePaste}
        role="textbox"
        aria-label="Texto enriquecido de la noticia"
        suppressContentEditableWarning
      />
    </div>
  );
}

const formatPreviewDate = (dateValue: string) => {
  if (!dateValue) {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function News() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const decodedId = useMemo(() => {
    if (!id || id === "new") {
      return "new";
    }

    try {
      return atob(id);
    } catch {
      return "";
    }
  }, [id]);

  useEffect(() => {
    if (decodedId === "" || decodedId === "new") {
      setNews(createEmptyNews());
      setLoadError(null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadNews = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchNewsItem(decodedId);

        if (!isCurrent) {
          return;
        }

        setNews(found);
      } catch {
        if (!isCurrent) {
          return;
        }

        setNews(createEmptyNews(decodedId));
        setLoadError("No se pudo cargar la noticia del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadNews();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeNews = news ?? createEmptyNews(decodedId === "new" ? undefined : decodedId || undefined);
  const previewDate = useMemo(() => formatPreviewDate(safeNews.date), [safeNews.date]);
  const previewTitle = getNewsDisplayTitle(safeNews);
  const previewDescription = safeNews.description.trim();
  const previewHtml = sanitizeRichHtml(
    safeNews.text || "<p>El texto enriquecido de la noticia aparecera aqui.</p>"
  );

  const updateNews = (patch: Partial<NewsData>) => {
    setNews({ ...safeNews, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewNews = decodedId === "new";
      const newsToSave = {
        ...(isNewNews ? safeNews : { ...safeNews, id: decodedId }),
        text: sanitizeRichHtml(safeNews.text),
      };
      const savedNews = isNewNews
        ? await createNewsRequest(newsToSave)
        : await updateNewsRequest(newsToSave);

      setNews(savedNews);
      setSaveMessage(
        isNewNews ? "Noticia creada correctamente." : "Noticia actualizada correctamente."
      );

      if (isNewNews) {
        navigate(`/news/${btoa(savedNews.id)}`, { replace: true });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear la noticia en el API.${apiError}`
          : `No se pudo actualizar la noticia en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="News" description="News editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New News" : "News Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New News" : "News"}
          desc="Carga de noticia con imagen, metadata y contenido enriquecido."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">
                  {saveMessage}
                </p>
              )}
              {saveError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {saveError}
                </p>
              )}
              {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cargando noticia...
                </p>
              )}
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {loadError}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openModal}>
                Preview News
              </Button>
              <Button variant="outline" onClick={() => navigate("/news-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save News"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main News Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Main
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="news-title">Title</Label>
                  <Input
                    id="news-title"
                    value={safeNews.title}
                    onChange={(e) => updateNews({ title: e.target.value })}
                    placeholder="Title of the news"
                  />
                </div>
                <div>
                  <Label>Main News</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeNews.principal === 1 ? "primary" : "outline"}
                      onClick={() => updateNews({ principal: 1 })}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={safeNews.principal === 0 ? "primary" : "outline"}
                      onClick={() => updateNews({ principal: 0 })}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="news-description">Description</Label>
                <Input
                  id="news-description"
                  value={safeNews.description}
                  onChange={(e) => updateNews({ description: e.target.value })}
                  placeholder="Brief description of the news"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="news-date">Date</Label>
                  <DatePicker
                    id="news-date"
                    value={safeNews.date}
                    onDateChange={(date) => updateNews({ date })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeNews.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateNews({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeNews.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateNews({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="news-state">State</Label>
                  <Input
                    id="news-state"
                    value={safeNews.state}
                    onChange={(e) => updateNews({ state: e.target.value })}
                    placeholder="published / draft"
                  />
                </div>
                <div>
                  <Label htmlFor="news-category">Category</Label>
                  <Input
                    id="news-category"
                    value={safeNews.category}
                    onChange={(e) => updateNews({ category: e.target.value })}
                    placeholder="Category"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="news-program-by">Program By</Label>
                  <Input
                    id="news-program-by"
                    value={safeNews.programBy}
                    onChange={(e) => updateNews({ programBy: e.target.value })}
                    placeholder="Program or author"
                  />
                </div>
                <div>
                  <Label htmlFor="news-tags">Tags</Label>
                  <Input
                    id="news-tags"
                    value={safeNews.tags}
                    onChange={(e) => updateNews({ tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="news-image">News Image</Label>
                <Input
                  id="news-image"
                  value={safeNews.image}
                  onChange={(e) => updateNews({ image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Biblioteca S3 News Image</Label>
                <S3ImageManager
                  selectedUrl={safeNews.image}
                  onSelect={(url) => updateNews({ image: url })}
                />
              </div>

              <div>
                <Label>Texto enriquecido</Label>
                <NewsRichTextEditor
                  value={safeNews.text}
                  onChange={(value) => updateNews({ text: value })}
                  disabled={loading || isSaving}
                />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="mx-4 max-w-7xl p-0">
        <div className="max-h-[88vh] overflow-y-auto bg-[#e3e3e3] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white text-[#1e1e1e]">
            <article className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[14px] text-[#4a4a4a]">Posted On {previewDate}</p>

              <div className="space-y-2">
                <h1 className="text-[34px] font-semibold leading-tight text-[#1d3570]">
                  {previewTitle}
                </h1>
                {previewDescription && (
                  <p className="text-[18px] leading-7 text-[#4a4a4a]">
                    {previewDescription}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-white">
                {safeNews.category && (
                  <span className="inline-flex min-w-[125px] items-center justify-center bg-[#3f4c96] px-4 py-2">
                    {safeNews.category}
                  </span>
                )}
                <span
                  className={`inline-flex min-w-[125px] items-center justify-center px-4 py-2 ${
                    safeNews.principal === 1 ? "bg-[#c27a2c]" : "bg-[#6b7280]"
                  }`}
                >
                  {safeNews.principal === 1 ? "Principal" : "Secundaria"}
                </span>
                {safeNews.programBy && (
                  <span className="inline-flex min-w-[125px] items-center justify-center bg-[#2d9cdc] px-4 py-2">
                    {safeNews.programBy}
                  </span>
                )}
                {safeNews.tags && (
                  <span className="inline-flex min-w-[125px] items-center justify-center bg-[#88854a] px-4 py-2">
                    {safeNews.tags}
                  </span>
                )}
              </div>

              <div className="overflow-hidden bg-[#d7d7d7]">
                {safeNews.image ? (
                  <img
                    src={safeNews.image}
                    alt={previewTitle || "News"}
                    className="h-[260px] w-full object-cover sm:h-[560px]"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-gray-500 sm:h-[560px]">
                    Imagen de la noticia
                  </div>
                )}
              </div>

              <div
                className={previewContentClasses}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </article>
          </div>
        </div>
      </Modal>
    </>
  );
}
