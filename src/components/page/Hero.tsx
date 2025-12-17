import { useState } from "react";
import ComponentCard from "../common/ComponentCard";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox.tsx";
import FileInput from "../form/input/FileInput.tsx";
export default function Hero() {

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
                    <Label htmlFor="title">Title</Label>
                    <Input type="text" id="title" />
                </div>
                <div>
                    <Label htmlFor="buttonText">Button Text</Label>
                    <Input type="text" id="buttonText" />
                </div>
                <div>
                    <Label htmlFor="buttonCall">Button Call To Action</Label>
                    <Input type="text" id="buttonCall" />
                </div>
                <div>
                    <Label>Upload file</Label>
                    <FileInput onChange={handleFileChange} className="custom-class" />                </div>
                <div>
                    <Label htmlFor="enabled">Enabled</Label>
                    <Checkbox id="enabled" />
                </div>
            </div>
        </ComponentCard>
    );
}
