import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import { createEmptyCategory, fetchCategory } from "./categoryData";
import type { Category } from "./categoryData";

export default function CategoryPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const previewCategory = location.state?.previewCategory as Category | undefined;
  const [loadedCategory, setLoadedCategory] = useState<Category | null>(null);

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
    if (previewCategory || decodedId === "" || decodedId === "new") {
      return;
    }

    let isCurrent = true;

    const loadCategory = async () => {
      try {
        const category = await fetchCategory(decodedId);
        if (isCurrent) {
          setLoadedCategory(category);
        }
      } catch {
        if (isCurrent) {
          setLoadedCategory(createEmptyCategory(decodedId));
        }
      }
    };

    void loadCategory();

    return () => {
      isCurrent = false;
    };
  }, [decodedId, previewCategory]);

  const category =
    previewCategory ??
    loadedCategory ??
    createEmptyCategory(decodedId === "" || decodedId === "new" ? undefined : decodedId);

  const heroImage = resolveS3ImageUrl(category.category_hero[0]?.image_url);

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

        <section className="bg-white px-3 py-4 text-[#1e1e1e] sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1180px] space-y-8">
            {heroImage && (
              <div className="h-[260px] overflow-hidden rounded-xl bg-gray-100 sm:h-[380px]">
                <img
                  src={heroImage}
                  alt={category.category_hero[0]?.image_text || category.category_title}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "/images/logo/ifx-logo.png";
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <p className="text-center text-sm font-semibold uppercase text-[#8a8253]">
                {category.category_category}
              </p>
              <h1 className="text-center text-[30px] font-semibold leading-tight text-[#1d4690] sm:text-[46px]">
                {category.category_title || "Category Title"}
              </h1>
            </div>

            <div className="space-y-2 text-[14px] leading-6 text-[#28313f] sm:text-[16px]">
              {(
                category.category_description ||
                "El texto principal de la categoria aparecera aqui."
              )
                .split(/\n+/)
                .filter((line) => line.trim().length > 0)
                .map((line, lineIndex) => (
                  <p key={lineIndex}>{line}</p>
                ))}
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {category.category_section.map((section, index) => {
                const sectionImage = resolveS3ImageUrl(section.section_image);

                return (
                  <article key={`section-${index}`} className="space-y-3">
                    {sectionImage && (
                      <div className="h-[220px] overflow-hidden bg-[#d2d2d2]">
                        <img
                          src={sectionImage}
                          alt={section.section_title}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = "/images/logo/ifx-logo.png";
                          }}
                        />
                      </div>
                    )}
                    <h2 className="text-[24px] font-medium uppercase leading-tight text-[#1d3570]">
                      {section.section_title || "Titulo de la seccion"}
                    </h2>
                    <p className="whitespace-pre-line text-[14px] leading-6 text-[#394457]">
                      {section.section_text || "El texto de la seccion aparecera aqui."}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
