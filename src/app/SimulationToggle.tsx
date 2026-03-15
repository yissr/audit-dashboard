"use client";

import { useTransition } from "react";
import { setSimulationMode } from "./settings/actions";

interface Props {
  initialEnabled: boolean;
}

export default function SimulationToggle({ initialEnabled }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setSimulationMode(!initialEnabled);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`ml-auto text-xs font-medium px-3 py-1 rounded-full transition-colors disabled:opacity-60 ${
        initialEnabled
          ? "bg-amber-500 text-white hover:bg-amber-600"
          : "bg-white/10 text-blue-100 hover:bg-white/20"
      }`}
    >
      ⚡ Simulation: {initialEnabled ? "ON" : "OFF"}
    </button>
  );
}
