import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import { createEmptyCategory, fetchCategory } from "./categoryData";
import type { Category } from "./categoryData";

export default function CategoryPreview() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category>(createEmptyCategory());

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
      setCategory(createEmptyCategory());
      return;
    }

    let isCurrent = true;

    const loadCategory = async () => {
      try {
        const found = await fetchCategory(decodedId);
        if (isCurrent) {
          setCategory(found);
        }
      } catch {
        if (isCurrent) {
          setCategory(createEmptyCategory(decodedId));
        }
      }
    };

    void loadCategory();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const previewImage = resolveS3ImageUrl(category.category_image);

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
              {category.category_title || "Category Title"}
            </h1>

            <div className="space-y-2 text-[14px] leading-6 text-[#28313f] sm:text-[16px]">
              {(category.category_text || "El texto principal de la categoria aparecera aqui.")
                .split(/\n+/)
                .filter((line) => line.trim().length > 0)
                .map((line, lineIndex) => (
                  <p key={lineIndex}>{line}</p>
                ))}
            </div>

            <div className="h-[220px] overflow-hidden bg-[#d2d2d2] sm:h-[360px]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={category.category_title || "Category preview"}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "/images/logo/ifx-logo.png";
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Imagen principal de la categoria
                </div>
              )}
            </div>

            <div className="space-y-10">
              {category.category_section.map((section, index) => {
                const previewUrl = resolveS3ImageUrl(section.section_image);

                return (
                  <section key={`${section.section_title}-${index}`} className="grid gap-6 lg:grid-cols-2">
                    <div className="h-[220px] overflow-hidden bg-[#d2d2d2] sm:h-[300px]">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={section.section_title || "Category section"}
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
                    <div className="space-y-3">
                      <h2 className="text-[24px] font-medium uppercase leading-tight text-[#1d3570] sm:text-[28px]">
                        {section.section_title || `Section ${index + 1}`}
                      </h2>
                      <p className="text-[14px] leading-7 text-[#394457] sm:text-[16px]">
                        {section.section_text || "El texto de la seccion aparecera aqui."}
                      </p>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
