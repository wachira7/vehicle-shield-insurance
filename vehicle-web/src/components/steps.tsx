/// Progress through a short flow: labelled steps over a bar that fills as you go.
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <div>
      <div className="relative h-1 overflow-hidden rounded-full bg-line" aria-hidden>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-action transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-3 flex justify-between text-xs">
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className={`transition-colors duration-300 ${index <= current ? "font-medium text-ink" : "text-ink-faint"}`}
          >
            <span className="sr-only">Step {index + 1} of {steps.length}: </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
