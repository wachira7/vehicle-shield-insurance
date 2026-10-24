"use client";

import { useId, useState, type FormEvent } from "react";
import type { VehicleInputFull } from "@/lib/api";
import { useFieldErrors } from "@/lib/form";
import { Button } from "./ui";

export type VehicleFormValues = {
  plate: string;
  make: string;
  model: string;
  year: string;
  marketValue: string;
  mileageKm: string;
  condition: number;
  accidents: number;
  usage: "private" | "commercial";
};

export const emptyVehicle: VehicleFormValues = {
  plate: "",
  make: "",
  model: "",
  year: "",
  marketValue: "",
  mileageKm: "",
  condition: 7,
  accidents: 0,
  usage: "private",
};

const digits = (value: string) => value.replace(/[^\d]/g, "");

export function toVehicleInput(values: VehicleFormValues): VehicleInputFull {
  return {
    plate: values.plate.trim(),
    make: values.make.trim(),
    model: values.model.trim(),
    year: Number(values.year),
    marketValueUsdc: Number(values.marketValue),
    mileageKm: Number(values.mileageKm),
    condition: values.condition,
    accidentsLast3Years: values.accidents,
    usage: values.usage,
  };
}

export function VehicleForm({
  initial,
  submitLabel,
  busy,
  serverError,
  onSubmit,
}: {
  initial: VehicleFormValues;
  submitLabel: string;
  busy: boolean;
  serverError?: string;
  onSubmit: (values: VehicleFormValues) => void;
}) {
  const [values, setValues] = useState(initial);
  const set = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const year = Number(values.year);
  const errors: Partial<Record<keyof VehicleFormValues, string>> = {
    ...(!/^[A-Za-z0-9 -]{2,15}$/.test(values.plate.trim()) && { plate: "Enter the number plate as it's written" }),
    ...(!values.make.trim() && { make: "Enter the make" }),
    ...(!values.model.trim() && { model: "Enter the model" }),
    ...((year < 1950 || year > new Date().getFullYear() + 1) && { year: "Enter the model year" }),
    ...(!Number(values.marketValue) && { marketValue: "Enter what it's worth" }),
    ...(values.mileageKm === "" && { mileageKm: "Enter the mileage" }),
  };

  const { shown, blur, attemptSubmit } = useFieldErrors(errors);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (attemptSubmit()) onSubmit(values);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Number plate" value={values.plate} error={shown("plate")} onBlur={() => blur("plate")} onChange={(v) => set("plate", v.toUpperCase())} placeholder="KDA 123A" autoCapitalize="characters" />
        <Input label="Make" value={values.make} error={shown("make")} onBlur={() => blur("make")} onChange={(v) => set("make", v)} placeholder="Toyota" />
        <Input label="Model" value={values.model} error={shown("model")} onBlur={() => blur("model")} onChange={(v) => set("model", v)} placeholder="Axio" />
        <Input label="Model year" inputMode="numeric" value={values.year} error={shown("year")} onBlur={() => blur("year")} onChange={(v) => set("year", digits(v).slice(0, 4))} />
        <Input label="What it's worth ($)" inputMode="numeric" value={values.marketValue} error={shown("marketValue")} onBlur={() => blur("marketValue")} onChange={(v) => set("marketValue", digits(v).slice(0, 7))} />
        <Input label="Mileage (km)" inputMode="numeric" value={values.mileageKm} error={shown("mileageKm")} onBlur={() => blur("mileageKm")} onChange={(v) => set("mileageKm", digits(v).slice(0, 7))} />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="vehicle-condition" className="text-sm font-medium">
            Condition
          </label>
          <span className="text-sm text-ink-muted">{values.condition}/10</span>
        </div>
        <input id="vehicle-condition" type="range" min={1} max={10} value={values.condition} onChange={(e) => set("condition", Number(e.target.value))} className="mt-3 w-full accent-action" />
      </div>
      <Choice label="Accidents in the last 3 years" value={values.accidents} options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 3 ? "3+" : String(n) }))} onChange={(v) => set("accidents", v)} />
      <Choice
        label="How it's used"
        value={values.usage}
        options={[
          { value: "private" as const, label: "Private" },
          { value: "commercial" as const, label: "Business / ride-hailing" },
        ]}
        onChange={(v) => set("usage", v)}
      />
      {serverError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
          {serverError}
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function Input({ label, error, onChange, ...input }: { label: string; error?: string; onChange: (v: string) => void } & Omit<React.ComponentProps<"input">, "onChange">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        {...input}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-xl border bg-bg px-3 py-3 outline-none transition-colors focus:border-action ${error ? "border-danger" : "border-line"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${option.value === value ? "border-action bg-action/10 text-ink" : "border-line bg-bg text-ink-muted hover:text-ink"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
