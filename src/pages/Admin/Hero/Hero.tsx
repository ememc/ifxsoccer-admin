import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { URL_API_BASE } from "../../../config/api";
import { resolveS3ImageUrl } from "../../../utils/s3Image";

interface Hero {
    id: number | string;
    title: string;
    button: string;
    call: string;
    enabled: 0 | 1;
    image: string;
}

export default function Hero() {
    const { id } = useParams<{ id: string }>();

    const [hero, setHero] = useState<Hero | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const decodedId = (() => {
        try {
            return id ? atob(id) : "";
        } catch {
            return "";
        }
    })();
    const numericDecodedId = Number(decodedId);


    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(URL_API_BASE);
                if (!res.ok) {
                    throw new Error(`Error ${res.status}`);
                }

                const list: Hero[] = await res.json();
                const found = list.find((h) => String(h.id) === decodedId) || null;

                if (found) {
                    setHero({
                        ...found,
                        image: resolveS3ImageUrl(found.image),
                    });
                } else {
                    setHero({
                        id: Number.isNaN(numericDecodedId) ? decodedId : numericDecodedId,
                        title: "",
                        button: "",
                        call: "",
                        enabled: 0,
                        image: "",
                    });
                    setError("No se encontro el hero en el API con ese id.");
                }
            } catch {
                setError("No se pudo cargar la data del API.");
            } finally {
                setLoading(false);
            }
        };

        if (!decodedId) {
            setError("Id invalido en la URL.");
            setLoading(false);
            return;
        }

        void load();
    }, [decodedId, numericDecodedId]);

    const safeHero: Hero = hero ?? {
        id: Number.isNaN(numericDecodedId) ? decodedId : numericDecodedId,
        title: "",
        button: "",
        call: "",
        enabled: 0,
        image: "",
    };

    const saveHero = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSaveMessage(null);

        const payload = {
            id: safeHero.id,
            title: safeHero.title,
            button: safeHero.button,
            call: safeHero.call,
            enabled: safeHero.enabled,
            image: resolveS3ImageUrl(safeHero.image),
        };

        const methods: Array<"PUT" | "POST" | "PATCH"> = ["PUT", "POST", "PATCH"];

        try {
            let lastStatus: number | null = null;

            for (const method of methods) {
                const response = await fetch(URL_API_BASE, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                lastStatus = response.status;
                if (response.ok) {
                    setSaveMessage(`Cambios guardados correctamente (${method}).`);
                    return;
                }
            }

            setSaveError(`No se pudo guardar. El API respondio con estado ${lastStatus ?? "desconocido"}.`);
        } catch {
            setSaveError("Error de red al intentar guardar cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ComponentCard title="Hero">
            <div className="space-y-6">
                {loading && <p className="text-sm text-gray-500">Cargando hero...</p>}
                {error && <p className="text-sm text-error-600">{error}</p>}
                {saveMessage && <p className="text-sm text-success-600">{saveMessage}</p>}
                {saveError && <p className="text-sm text-error-600">{saveError}</p>}
                <div>
                    <Label htmlFor="id">Id</Label>
                    <Input type="text" id="id" value={safeHero.id} disabled />
                </div>
                <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                        type="text"
                        id="title"
                        value={safeHero.title}
                        onChange={(e) => {
                            setHero({ ...safeHero, title: e.target.value });
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="buttonText">Button Text</Label>
                    <Input
                        type="text"
                        id="buttonText"
                        value={safeHero.button}
                        onChange={(e) => {
                            setHero({ ...safeHero, button: e.target.value });
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="buttonCall">Button Call To Action</Label>
                    <Input
                        type="text"
                        id="buttonCall"
                        value={safeHero.call}
                        onChange={(e) => {
                            setHero({ ...safeHero, call: e.target.value });
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="heroImage">Image URL</Label>
                    <Input
                        type="text"
                        id="heroImage"
                        value={safeHero.image}
                        onChange={(e) => {
                            setHero({ ...safeHero, image: e.target.value });
                        }}
                        placeholder="https://bucket.s3.region.amazonaws.com/path/image.jpg"
                    />
                </div>
                <div>
                    <Label>Biblioteca S3</Label>
                    <S3ImageManager
                        selectedUrl={safeHero.image}
                        onSelect={(url) => {
                            setHero({ ...safeHero, image: url });
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="enabled">Enabled</Label>
                    <Input type="text" id="enabled" value={safeHero.enabled} disabled />
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => { void saveHero(); }} disabled={isSaving || loading}>
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </div>
            </div>
        </ComponentCard>
    );
}
