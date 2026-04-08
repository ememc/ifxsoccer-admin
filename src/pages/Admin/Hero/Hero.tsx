import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import FileInput from "../../../components/form/input/FileInput.tsx";

interface Hero {
    id: string;
    title: string;
    button: string;
    call: string;
    enable: 0 | 1;
    image: string;
}

export default function Hero() {

    const { id } = useParams<{ id: string }>();
    const heroId = atob(id!);

    const [hero, setHero] = useState<Hero | null>(null);

    useEffect(() => {
        const load = async () => {
            const res = await fetch("https://pqzs7h6sgdo23n2ano66himzoy0jwuxw.lambda-url.us-west-1.on.aws/");
            const list: Hero[] = await res.json();

            console.log(heroId);

            const found = list.find(h => h.id === heroId) || null;
            console.log(found);

            setHero(found);
        };

        load();
    }, [id]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log("Selected file:", file.name);
        }
    };

    return (
        <ComponentCard title="Hero">
            <div className="space-y-6">
                <div>
                    <Label htmlFor="id">Id</Label>
                    <Input type="text" id="id" value={id} />
                </div>
                <div>
                    <Label htmlFor="title">Title</Label>
                    <Input type="text" id="title" value={hero?.title} />
                </div>
                <div>
                    <Label htmlFor="buttonText">Button Text</Label>
                    <Input type="text" id="buttonText" value={hero?.button} />
                </div>
                <div>
                    <Label htmlFor="buttonCall">Button Call To Action</Label>
                    <Input type="text" id="buttonCall" value={hero?.call} />
                </div>
                <div>
                    <Label>Upload file</Label>
                    <FileInput onChange={handleFileChange} className="custom-class" />
                </div>
                <div>
                    <Label htmlFor="enabled">Enabled</Label>
                </div>
            </div>
        </ComponentCard>
    );
}
