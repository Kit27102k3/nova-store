"use client";

import dynamic from "next/dynamic";
import type { MapPosition } from "@/components/address/AddressMap";

const AddressMap = dynamic(
  () =>
    import("@/components/address/AddressMap").then(
      (module) => module.AddressMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Đang tải bản đồ"
        className="h-[300px] animate-pulse rounded-2xl bg-mist"
      />
    ),
  },
);

export function AddressMapLoader({
  position,
  onChoose,
}: {
  position: MapPosition | null;
  onChoose: (position: MapPosition) => void;
}) {
  return <AddressMap position={position} onChoose={onChoose} />;
}
