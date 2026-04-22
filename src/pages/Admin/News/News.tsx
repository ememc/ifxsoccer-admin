import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { createEmptyNews, loadNews, upsertNews } from "./newsData";
import type { News as NewsData } from "./newsData";

export default function News() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [news, setNews] = useState<NewsData | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const previewDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

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
      return;
    }

    const found = loadNews().find((item) => item.id === decodedId);
    setNews(found ?? createEmptyNews());
  }, [decodedId]);

  const safeNews = news ?? createEmptyNews();

  const updateNews = (patch: Partial<NewsData>) => {
    setNews({ ...safeNews, ...patch });
    setSaveMessage(null);
  };

  const onSave = () => {
    upsertNews(safeNews);
    setSaveMessage("Noticia guardada localmente.");

    if (decodedId === "new") {
      navigate(`/news/${btoa(safeNews.id)}`, { replace: true });
    }
  };

  return (
    <>
      <PageMeta title="News" description="News editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New News" : "News Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New News" : "News"}
          desc="Front provisional con persistencia local mientras definimos el API de noticias."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">
                  {saveMessage}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openModal}>
                Preview News
              </Button>
              <Button variant="outline" onClick={() => navigate("/news-list")}>
                Back to List
              </Button>
              <Button onClick={onSave}>Save News</Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main News Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="news-title">Titulo</Label>
                  <Input
                    id="news-title"
                    value={safeNews.title}
                    onChange={(e) => updateNews({ title: e.target.value })}
                    placeholder="Titulo de la noticia"
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

              <div>
                <Label htmlFor="news-image">Imagen</Label>
                <Input
                  id="news-image"
                  value={safeNews.image}
                  onChange={(e) => updateNews({ image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Biblioteca S3 Imagen</Label>
                <S3ImageManager
                  selectedUrl={safeNews.image}
                  onSelect={(url) => updateNews({ image: url })}
                />
              </div>

              <div>
                <Label>Texto</Label>
                <TextArea
                  rows={8}
                  value={safeNews.text}
                  onChange={(value) => updateNews({ text: value })}
                  placeholder="Contenido de la noticia"
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

              <h1 className="text-[28px] font-medium leading-tight text-[#1d3570] sm:text-[46px]">
                {safeNews.title || "News Title"}
              </h1>

              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-white">
                <span className="inline-flex min-w-[125px] items-center justify-center bg-[#3f4c96] px-4 py-2">
                  Share
                </span>
                <span className="inline-flex min-w-[125px] items-center justify-center bg-[#2d9cdc] px-4 py-2">
                  Tweet
                </span>
                <span className="inline-flex min-w-[125px] items-center justify-center bg-[#88854a] px-4 py-2">
                  Share by Email
                </span>
              </div>

              <div className="overflow-hidden bg-[#d7d7d7]">
                {safeNews.image ? (
                  <img
                    src={safeNews.image}
                    alt={safeNews.title || "News"}
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

              <div className="space-y-3 text-[18px] leading-8 text-[#2d3749]">
                {(safeNews.text || "El texto de la noticia aparecera aqui.")
                  .split(/\n+/)
                  .filter((line) => line.trim().length > 0)
                  .map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
              </div>
            </article>
          </div>
        </div>
      </Modal>
    </>
  );
}
