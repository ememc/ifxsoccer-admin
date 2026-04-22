import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { createEmptyCategory, loadCategories } from "./categoryData";
import type { Category } from "./categoryData";

const chunkSections = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export default function CategoryPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const previewCategory = location.state?.previewCategory as Category | undefined;

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

  const category = useMemo(() => {
    if (previewCategory) {
      return previewCategory;
    }

    if (decodedId === "" || decodedId === "new") {
      return createEmptyCategory();
    }

    return (
      loadCategories().find((item) => item.id === decodedId) ?? createEmptyCategory()
    );
  }, [decodedId, previewCategory]);

  const visibleSections = category.sections.filter((section) => section.enabled === 1);
  const sectionGroups = chunkSections(visibleSections, 3);

  return (
    <>
      <PageMeta title="Category Preview" description="Category preview page" />
      <PageBreadcrumb pageTitle="Category Preview" />
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>

        <section className="rounded-[32px] bg-gray-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Category Preview
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">
              {category.title || "Category Title"}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
              {category.mainText || "El texto principal de la categoria aparecera aqui."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={category.learnMoreUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-200"
              >
                Learn More
              </a>
              <a
                href={category.applyOnlineUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Apply Online
              </a>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {sectionGroups.map((group, groupIndex) => (
            <section
              key={`group-${groupIndex}`}
              className="grid gap-6 lg:grid-cols-3"
            >
              {group.map((section) => (
                <article
                  key={section.id}
                  className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {section.image ? (
                      <img
                        src={section.image}
                        alt={section.title || "Category section"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Imagen de la seccion
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
                      {section.title || "Titulo de la seccion"}
                    </h2>
                    <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                      {section.text || "El texto de la seccion aparecera aqui."}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <a
                        href={section.learnMoreUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
                      >
                        Learn More
                      </a>
                      <a
                        href={section.applyOnlineUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-white/10"
                      >
                        Apply Online
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
