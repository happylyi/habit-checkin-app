"use client";

type BarPoint = {
  label: string;
  value: number;
  tooltip?: string;
};

export function BarChart({
  data,
  height = 160,
}: {
  data: BarPoint[];
  height?: number;
}) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full" data-oid="wahh1cn">
      <div
        className="flex items-end justify-between gap-2"
        style={{ height }}
        data-oid="onjqhc7"
      >
        {data.map((d, idx) => {
          const pct = d.value / maxValue;
          const barH = Math.max(2, Math.round(pct * height));
          return (
            <div
              key={`${d.label}-${idx}`}
              className="flex flex-1 flex-col items-center justify-end"
              data-oid="mmf.qvk"
            >
              <div
                title={d.tooltip ?? `${d.label}: ${d.value}`}
                className="w-full rounded-md bg-zinc-900/90"
                style={{
                  height: barH,
                  minHeight: 10,
                }}
                data-oid="u55xcqv"
              />
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 grid grid-cols-14 gap-2 text-center"
        data-oid="._drump"
      >
        {data.map((d, idx) => (
          <div
            key={`${d.label}-${idx}`}
            className="text-[10px] text-zinc-500"
            data-oid="c44m7d7"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
