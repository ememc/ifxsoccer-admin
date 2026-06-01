import DatePicker from "../../../components/form/date-picker";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Button from "../../../components/ui/button/Button";
import { normalizeEnabled } from "./programData";
import type { Program } from "./programData";

interface ProgramDetailProps {
  program: Program;
  onChange: (patch: Partial<Program>) => void;
}

const createProgramSlug = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const createProgramApplyUrl = (title: string): string => {
  const slug = createProgramSlug(title);
  return slug ? `/programs/${slug}` : "";
};

export default function ProgramDetail({ program, onChange }: ProgramDetailProps) {
  const updateProgramTitle = (title: string) => {
    const currentGeneratedApplyUrl = createProgramApplyUrl(program.program_title);
    const shouldUpdateApplyUrl =
      program.program_apply.trim() === "" ||
      program.program_apply === currentGeneratedApplyUrl;

    onChange({
      program_title: title,
      ...(shouldUpdateApplyUrl ? { program_apply: createProgramApplyUrl(title) } : {}),
    });
  };

  return (
    <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
          Main Program Content
        </h3>
        <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
          Principal
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="program-id">Id</Label>
          <Input id="program-id" value={program.program_id} disabled />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="program-title">Titulo</Label>
            <Input
              id="program-title"
              value={program.program_title}
              onChange={(event) => updateProgramTitle(event.target.value)}
              placeholder="Nombre del programa"
            />
          </div>
          <div>
            <Label>Status</Label>
            <div className="flex gap-2">
              <Button
                variant={normalizeEnabled(program.program_enabled) === 1 ? "primary" : "outline"}
                onClick={() => onChange({ program_enabled: true })}
              >
                Enabled
              </Button>
              <Button
                variant={normalizeEnabled(program.program_enabled) === 0 ? "primary" : "outline"}
                onClick={() => onChange({ program_enabled: false })}
              >
                Disabled
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="program-description">Descripcion</Label>
          <TextArea
            rows={5}
            value={program.program_description}
            onChange={(value) => onChange({ program_description: value })}
            placeholder="Descripcion principal del programa"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="program-category">Categoria</Label>
            <Input
              id="program-category"
              value={program.program_category}
              onChange={(event) => onChange({ program_category: event.target.value })}
              placeholder="Categoria"
            />
          </div>
          <div>
            <Label htmlFor="program-status">Program Status</Label>
            <Input
              id="program-status"
              value={program.program_status}
              onChange={(event) => onChange({ program_status: event.target.value })}
              placeholder="Status"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="program-apply">Apply URL</Label>
            <Input
              id="program-apply"
              value={program.program_apply}
              onChange={(event) => onChange({ program_apply: event.target.value })}
              placeholder="/programs/program-slug"
            />
          </div>
          <div>
            <Label htmlFor="program-date">Fecha de Publicacion</Label>
            <DatePicker
              id="program-date"
              value={program.program_date}
              onDateChange={(program_date) => onChange({ program_date })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
