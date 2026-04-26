import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/badge/Badge";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { ImageItem, fetchImages } from "./imageData";

const PAGE_SIZE = 8;

export default function ImagesList() {
  const navigate = useNavigate();
  const [data, setData] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const images = await fetchImages();
        setData(images);
        setCurrentPage(1);
      } catch {
        setError("No se pudieron cargar las imagenes desde el API.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/images/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/images/new");
  };

  const moveItem = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setData((current) => {
      const next = [...current];
      const sourceIndex = next.findIndex((item) => item.id === sourceId);
      const targetIndex = next.findIndex((item) => item.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const [movedItem] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedItem);

      return next.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
    });
  };

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = data.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <>
      <PageMeta title="Images List" description="Images List" />
      <PageBreadcrumb pageTitle="Images List" />
      <div className="space-y-6">
        <ComponentCard title="Images">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Arrastra las tarjetas para reorganizar visualmente las imagenes.
              </p>
            </div>
            <Button onClick={onCreate}>New Image</Button>
          </div>
          {loading && <p className="mb-4 text-sm text-gray-500">Cargando imagenes...</p>}
          {error && <p className="mb-4 text-sm text-error-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (draggedId) {
                    moveItem(draggedId, item.id);
                  }
                  setDraggedId(null);
                }}
                onDragEnd={() => setDraggedId(null)}
                className={`overflow-hidden rounded-2xl border bg-white transition dark:border-white/[0.05] dark:bg-white/[0.03] ${
                  draggedId === item.id
                    ? "border-brand-500 shadow-lg opacity-70"
                    : "border-gray-200 shadow-sm"
                }`}
              >
                <div className="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/images/logo/ifx-logo.png";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Sin imagen
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700">
                    #{item.order}
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {item.title || "Untitled image"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.publishedAt || "Sin fecha"}
                      </p>
                    </div>
                    <Badge size="sm" color={item.enabled === 1 ? "success" : "error"}>
                      {item.enabled === 1 ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      Drag and drop
                    </span>
                    <Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!loading && !error && visibleItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No hay imagenes para mostrar.
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
