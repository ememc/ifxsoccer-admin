import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { createEmptyCategory, loadCategories } from "./categoryData";
import type { Category, CategorySection } from "./categoryData";

const chunkSections = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const SAMPLE_SECTIONS: CategorySection[] = [
  {
    id: "sample-1",
    title: "Soccer Trials In Spain - AD Alcorcon",
    text: "Elite summer experience focused on development, exposure and high-level sessions in Spain.",
    image: "/images/brand/brand-01.svg",
    learnMoreUrl: "#",
    applyOnlineUrl: "#",
    enabled: 1,
  },
  {
    id: "sample-2",
    title: "Paris Saint-Germain Academy Pro Europe",
    text: "Professional training environment with expert coaches and advanced methodology.",
    image: "/images/brand/brand-02.svg",
    learnMoreUrl: "#",
    applyOnlineUrl: "#",
    enabled: 1,
  },
  {
    id: "sample-3",
    title: "2026 IFX Germany Soccer Camps In Bayern",
    text: "Competitive development camps with immersive training and international exposure.",
    image: "/images/brand/brand-03.svg",
    learnMoreUrl: "#",
    applyOnlineUrl: "#",
    enabled: 1,
  },
];

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
  const previewSections =
    visibleSections.length >= 3
      ? visibleSections
      : [...visibleSections, ...SAMPLE_SECTIONS].slice(0, 3);
  const sectionGroups = chunkSections(previewSections, 3);

  return (
    <>
      <PageMeta title="Category Preview" description="Category preview page" />
      <PageBreadcrumb pageTitle="Category Preview" />
      <div className="space-y-6">
        <div className="flex justify-end px-1">
          <Button variant="outline" onClick={() => navigate(-1)} size="sm">
            Back
          </Button>
        </div>

        <section className="bg-white px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1180px] space-y-7">
            <h1 className="text-center text-[30px] font-semibold leading-tight text-[#1d4690] sm:text-[46px]">
              {category.title || "Category Title"}
            </h1>

            <div className="space-y-2 text-[14px] leading-6 text-[#28313f] sm:text-[16px]">
              {(category.mainText || "El texto principal de la categoria aparecera aqui.")
                .split(/\n+/)
                .filter((line) => line.trim().length > 0)
                .map((line, lineIndex) => (
                  <p key={lineIndex}>{line}</p>
                ))}
            </div>

            <div className="space-y-10">
              {sectionGroups.map((group, groupIndex) => (
                <section
                  key={`group-${groupIndex}`}
                  className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {group.map((section) => (
                    <article key={section.id} className="flex flex-col">
                      <div className="h-[180px] overflow-hidden bg-[#d2d2d2] sm:h-[220px]">
                        {section.image ? (
                          <img
                            src={section.image}
                            alt={section.title || "Category section"}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src = "/images/logo/ifx-logo.png";
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-gray-500">
                            Imagen de la seccion
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <h2 className="text-[24px] font-medium uppercase leading-tight text-[#1d3570] sm:text-[28px]">
                          {section.title || "Titulo de la seccion"}
                        </h2>
                        <p className="mt-2 line-clamp-3 min-h-[72px] text-[13px] leading-6 text-[#394457] sm:text-[14px]">
                          {section.text || "El texto de la seccion aparecera aqui."}
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                          <a
                            href={section.learnMoreUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[38px] min-w-[120px] items-center justify-center px-4 text-[13px] font-medium uppercase tracking-[0.02em] text-[#8a8253] transition hover:text-[#6e673f]"
                          >
                            Learn More
                          </a>
                          <a
                            href={section.applyOnlineUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[38px] min-w-[140px] items-center justify-center rounded-[4px] bg-[#2e3a84] px-4 text-[13px] font-semibold uppercase tracking-[0.02em] text-white transition hover:bg-[#23306f]"
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
        </section>
      </div>
    </>
  );
}
