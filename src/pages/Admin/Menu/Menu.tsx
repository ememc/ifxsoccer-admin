import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import {
  createEmptyMenu,
  createEmptyMenuDetail,
  createEmptyMenuHeader,
  createEmptyMenuSection,
  createMenu as createMenuRequest,
  fetchMenu,
  normalizeEnabled,
  updateMenu as updateMenuRequest,
} from "./menuData";
import type { MenuDetail, MenuHeader, MenuItem, MenuSection } from "./menuData";

const panelCardClass =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

export default function Menu() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [menu, setMenu] = useState<MenuItem | null>(null);
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
      setMenu(createEmptyMenu());
      setLoadError(decodedId === "" ? "Id invalido en la URL." : null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadMenu = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchMenu(decodedId);

        if (!isCurrent) {
          return;
        }

        setMenu(found);
      } catch {
        if (!isCurrent) {
          return;
        }

        setMenu(createEmptyMenu(decodedId));
        setLoadError("No se pudo cargar el menu del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadMenu();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeMenu = menu ?? createEmptyMenu();

  const updateMenuState = (patch: Partial<MenuItem>) => {
    setMenu({ ...safeMenu, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const updateHeader = (headerIndex: number, patch: Partial<MenuHeader>) => {
    updateMenuState({
      menu_header: safeMenu.menu_header.map((item, itemIndex) =>
        itemIndex === headerIndex ? { ...item, ...patch } : item
      ),
    });
  };

  const updateSection = (
    headerIndex: number,
    sectionIndex: number,
    patch: Partial<MenuSection>
  ) => {
    updateHeader(headerIndex, {
      menu_section: safeMenu.menu_header[headerIndex].menu_section.map((item, itemIndex) =>
        itemIndex === sectionIndex ? { ...item, ...patch } : item
      ),
    });
  };

  const updateDetail = (
    headerIndex: number,
    sectionIndex: number,
    detailIndex: number,
    patch: Partial<MenuDetail>
  ) => {
    updateSection(headerIndex, sectionIndex, {
      menu_detail: safeMenu.menu_header[headerIndex].menu_section[sectionIndex].menu_detail.map(
        (item, itemIndex) => (itemIndex === detailIndex ? { ...item, ...patch } : item)
      ),
    });
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewMenu = decodedId === "new";
      const menuToSave = isNewMenu ? safeMenu : { ...safeMenu, menu_id: decodedId };
      const savedMenu = isNewMenu
        ? await createMenuRequest(menuToSave)
        : await updateMenuRequest(menuToSave);

      setMenu(savedMenu);
      setSaveMessage(isNewMenu ? "Menu creado correctamente." : "Menu actualizado correctamente.");

      if (isNewMenu) {
        navigate(`/menu/${btoa(savedMenu.menu_id)}`, { replace: true });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear el menu en el API.${apiError}`
          : `No se pudo actualizar el menu en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderImageField = (
    idPrefix: string,
    value: string,
    onChange: (value: string) => void
  ) => {
    const previewUrl = resolveS3ImageUrl(value);

    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${idPrefix}-image`}>Image URL</Label>
          <Input
            id={`${idPrefix}-image`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://.../image.jpg"
          />
        </div>
        {previewUrl && (
          <div className="h-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-900">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = "/images/logo/ifx-logo.png";
              }}
            />
          </div>
        )}
        <S3ImageManager selectedUrl={value} onSelect={onChange} />
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Menu" description="Menu editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Menu" : "Menu Detail"} />
      <div className="space-y-6">
        <div className="sticky top-4 z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {decodedId === "new" ? "New Menu" : "Menu Detail"}
              </h1>
              <div>
                {saveMessage && (
                  <p className="text-sm text-success-600 dark:text-success-400">{saveMessage}</p>
                )}
                {saveError && (
                  <p className="text-sm text-error-600 dark:text-error-400">{saveError}</p>
                )}
                {loading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cargando menu...
                  </p>
                )}
                {loadError && (
                  <p className="text-sm text-error-600 dark:text-error-400">{loadError}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/menu-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Menu"}
              </Button>
            </div>
          </div>
        </div>

        <ComponentCard
          title="Menu Editor"
          desc="Edita headers, sections y details de la estructura del menu."
        >
          <div className="space-y-6">
            <div className={panelCardClass}>
              <Label htmlFor="menu-id">Menu Id</Label>
              <Input id="menu-id" value={safeMenu.menu_id} disabled />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateMenuState({
                    menu_header: [
                      ...safeMenu.menu_header,
                      createEmptyMenuHeader(safeMenu.menu_header.length + 1),
                    ],
                  })
                }
              >
                Add Header
              </Button>
            </div>

            {safeMenu.menu_header.map((header, headerIndex) => (
              <div key={header.header_id || `header-${headerIndex}`} className={panelCardClass}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Header {headerIndex + 1}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateMenuState({
                        menu_header: removeAt(safeMenu.menu_header, headerIndex),
                      })
                    }
                  >
                    Delete Header
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`header-id-${headerIndex}`}>Header Id</Label>
                    <Input
                      id={`header-id-${headerIndex}`}
                      value={header.header_id}
                      onChange={(event) =>
                        updateHeader(headerIndex, { header_id: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`header-text-${headerIndex}`}>Header Text</Label>
                    <Input
                      id={`header-text-${headerIndex}`}
                      value={header.header_text}
                      onChange={(event) =>
                        updateHeader(headerIndex, { header_text: event.target.value })
                      }
                      placeholder="Main menu label"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`header-order-${headerIndex}`}>Header Order</Label>
                    <Input
                      id={`header-order-${headerIndex}`}
                      type="number"
                      value={header.header_order}
                      onChange={(event) =>
                        updateHeader(headerIndex, {
                          header_order: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`header-call-${headerIndex}`}>Header Call</Label>
                    <Input
                      id={`header-call-${headerIndex}`}
                      value={header.header_call}
                      onChange={(event) =>
                        updateHeader(headerIndex, { header_call: event.target.value })
                      }
                      placeholder="#"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`header-target-${headerIndex}`}>Header Target</Label>
                    <Input
                      id={`header-target-${headerIndex}`}
                      value={header.header_target}
                      onChange={(event) =>
                        updateHeader(headerIndex, { header_target: event.target.value })
                      }
                      placeholder="_blank"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={
                          normalizeEnabled(header.header_enabled) === 1 ? "primary" : "outline"
                        }
                        size="sm"
                        onClick={() => updateHeader(headerIndex, { header_enabled: true })}
                      >
                        Enabled
                      </Button>
                      <Button
                        variant={
                          normalizeEnabled(header.header_enabled) === 0 ? "primary" : "outline"
                        }
                        size="sm"
                        onClick={() => updateHeader(headerIndex, { header_enabled: false })}
                      >
                        Disabled
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateHeader(headerIndex, {
                          menu_section: [
                            ...header.menu_section,
                            createEmptyMenuSection(header.menu_section.length + 1),
                          ],
                        })
                      }
                    >
                      Add Section
                    </Button>
                  </div>

                  {header.menu_section.map((section, sectionIndex) => (
                    <div
                      key={section.section_id || `section-${sectionIndex}`}
                      className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          Section {sectionIndex + 1}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateHeader(headerIndex, {
                              menu_section: removeAt(header.menu_section, sectionIndex),
                            })
                          }
                        >
                          Delete Section
                        </Button>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        {renderImageField(
                          `section-${headerIndex}-${sectionIndex}`,
                          section.section_image,
                          (value) => updateSection(headerIndex, sectionIndex, { section_image: value })
                        )}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`section-id-${headerIndex}-${sectionIndex}`}>
                              Section Id
                            </Label>
                            <Input
                              id={`section-id-${headerIndex}-${sectionIndex}`}
                              value={section.section_id}
                              onChange={(event) =>
                                updateSection(headerIndex, sectionIndex, {
                                  section_id: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`section-title-${headerIndex}-${sectionIndex}`}>
                              Section Title
                            </Label>
                            <Input
                              id={`section-title-${headerIndex}-${sectionIndex}`}
                              value={section.section_title}
                              onChange={(event) =>
                                updateSection(headerIndex, sectionIndex, {
                                  section_title: event.target.value,
                                })
                              }
                              placeholder="Section title"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`section-call-${headerIndex}-${sectionIndex}`}>
                                Section Call
                              </Label>
                              <Input
                                id={`section-call-${headerIndex}-${sectionIndex}`}
                                value={section.section_call}
                                onChange={(event) =>
                                  updateSection(headerIndex, sectionIndex, {
                                    section_call: event.target.value,
                                  })
                                }
                                placeholder="#"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`section-target-${headerIndex}-${sectionIndex}`}>
                                Section Target
                              </Label>
                              <Input
                                id={`section-target-${headerIndex}-${sectionIndex}`}
                                value={section.section_target}
                                onChange={(event) =>
                                  updateSection(headerIndex, sectionIndex, {
                                    section_target: event.target.value,
                                  })
                                }
                                placeholder="_self"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`section-order-${headerIndex}-${sectionIndex}`}>
                                Section Order
                              </Label>
                              <Input
                                id={`section-order-${headerIndex}-${sectionIndex}`}
                                type="number"
                                value={section.section_order}
                                onChange={(event) =>
                                  updateSection(headerIndex, sectionIndex, {
                                    section_order: Number(event.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Has Detail</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant={section.section_detail ? "primary" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    updateSection(headerIndex, sectionIndex, {
                                      section_detail: true,
                                      menu_detail:
                                        section.menu_detail.length > 0
                                          ? section.menu_detail
                                          : [createEmptyMenuDetail(1)],
                                    })
                                  }
                                >
                                  Yes
                                </Button>
                                <Button
                                  variant={!section.section_detail ? "primary" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    updateSection(headerIndex, sectionIndex, {
                                      section_detail: false,
                                      menu_detail: [],
                                    })
                                  }
                                >
                                  No
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {section.section_detail && (
                        <div className="mt-6 space-y-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateSection(headerIndex, sectionIndex, {
                                  menu_detail: [
                                    ...section.menu_detail,
                                    createEmptyMenuDetail(section.menu_detail.length + 1),
                                  ],
                                })
                              }
                            >
                              Add Detail
                            </Button>
                          </div>

                          {section.menu_detail.map((detail, detailIndex) => (
                            <div
                              key={detail.detail_id || `detail-${detailIndex}`}
                              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                  Detail {detailIndex + 1}
                                </h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateSection(headerIndex, sectionIndex, {
                                      menu_detail: removeAt(section.menu_detail, detailIndex),
                                    })
                                  }
                                >
                                  Delete Detail
                                </Button>
                              </div>

                              <div className="grid gap-6 lg:grid-cols-2">
                                {renderImageField(
                                  `detail-${headerIndex}-${sectionIndex}-${detailIndex}`,
                                  detail.section_image,
                                  (value) =>
                                    updateDetail(headerIndex, sectionIndex, detailIndex, {
                                      section_image: value,
                                    })
                                )}
                                <div className="space-y-4">
                                  <div>
                                    <Label
                                      htmlFor={`detail-id-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                    >
                                      Detail Id
                                    </Label>
                                    <Input
                                      id={`detail-id-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                      value={detail.detail_id}
                                      onChange={(event) =>
                                        updateDetail(headerIndex, sectionIndex, detailIndex, {
                                          detail_id: event.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`detail-title-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                    >
                                      Detail Title
                                    </Label>
                                    <Input
                                      id={`detail-title-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                      value={detail.detail_title}
                                      onChange={(event) =>
                                        updateDetail(headerIndex, sectionIndex, detailIndex, {
                                          detail_title: event.target.value,
                                        })
                                      }
                                      placeholder="Detail title"
                                    />
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <Label
                                        htmlFor={`detail-call-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                      >
                                        Detail Call
                                      </Label>
                                      <Input
                                        id={`detail-call-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                        value={detail.section_call}
                                        onChange={(event) =>
                                          updateDetail(headerIndex, sectionIndex, detailIndex, {
                                            section_call: event.target.value,
                                          })
                                        }
                                        placeholder="#"
                                      />
                                    </div>
                                    <div>
                                      <Label
                                        htmlFor={`detail-target-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                      >
                                        Detail Target
                                      </Label>
                                      <Input
                                        id={`detail-target-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                        value={detail.section_target}
                                        onChange={(event) =>
                                          updateDetail(headerIndex, sectionIndex, detailIndex, {
                                            section_target: event.target.value,
                                          })
                                        }
                                        placeholder="_self"
                                      />
                                    </div>
                                    <div>
                                      <Label
                                        htmlFor={`detail-order-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                      >
                                        Detail Order
                                      </Label>
                                      <Input
                                        id={`detail-order-${headerIndex}-${sectionIndex}-${detailIndex}`}
                                        type="number"
                                        value={detail.section_order}
                                        onChange={(event) =>
                                          updateDetail(headerIndex, sectionIndex, detailIndex, {
                                            section_order: Number(event.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
