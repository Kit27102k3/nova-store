"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AddressMapLoader } from "@/components/address/AddressMapLoader";
import type { MapPosition } from "@/components/address/AddressMap";
import type { DeliveryAddressSuggestion } from "@/lib/geocoding/types";
import { Icon } from "@/components/ui/Icon";

type AddressSearchResponse = {
  addresses?: DeliveryAddressSuggestion[];
  error?: string;
};

export function AddressPicker({
  onSelect,
}: {
  onSelect: (address: DeliveryAddressSuggestion) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeliveryAddressSuggestion[]>([]);
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  const lookup = async (url: string, showResults: boolean) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError("");
    if (showResults) setResults([]);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json()) as AddressSearchResponse;
      if (!response.ok) throw new Error(data.error ?? "Không tìm thấy địa chỉ.");
      const addresses = data.addresses ?? [];
      if (showResults) {
        setResults(addresses);
        if (addresses.length === 0) {
          setError("Không tìm thấy địa chỉ phù hợp. Thử thêm tên phường hoặc quận.");
        }
      } else if (addresses[0]) {
        choose(addresses[0]);
      } else {
        setError("Không thể xác định địa chỉ tại vị trí này.");
      }
    } catch (lookupError) {
      if (lookupError instanceof DOMException && lookupError.name === "AbortError") {
        return;
      }
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Không thể tìm địa chỉ. Vui lòng thử lại.",
      );
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const choose = (address: DeliveryAddressSuggestion) => {
    setPosition({
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setResults([]);
    setQuery(address.label);
    onSelect(address);
  };

  const reverseLookup = (point: MapPosition) => {
    setPosition(point);
    void lookup(
      `/api/geocode?lat=${encodeURIComponent(point.latitude)}&lon=${encodeURIComponent(point.longitude)}`,
      false,
    );
  };

  const chooseMapPoint = (point: MapPosition) => {
    setPosition(point);
    setError("");
  };

  const search = () => {
    if (query.trim().length < 3) {
      setError("Nhập ít nhất 3 ký tự để tìm địa chỉ.");
      return;
    }
    const params = new URLSearchParams({ q: query.trim() });
    void lookup(`/api/geocode?${params.toString()}`, true);
  };

  const searchOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    search();
  };

  const useCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Trình duyệt này không hỗ trợ lấy vị trí hiện tại.");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        reverseLookup({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      (locationError) => {
        setPending(false);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Bạn chưa cấp quyền vị trí. Hãy cho phép truy cập vị trí rồi thử lại."
            : "Không lấy được vị trí hiện tại. Hãy kiểm tra GPS và thử lại.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <section aria-label="Tìm địa chỉ trên bản đồ">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-kicker">Chọn địa chỉ trên bản đồ</p>
          <p className="text-sm text-muted">
            Tìm địa chỉ hoặc chọn vị trí trực tiếp trên bản đồ.
          </p>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-navy transition hover:border-cobalt hover:text-cobalt disabled:opacity-50"
        >
          <Icon name="mapPin" className="size-4" />
          {pending ? "Đang xác định..." : "Dùng vị trí hiện tại"}
        </button>
      </div>

      <div role="search" className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="delivery-address-search">
          Tìm địa chỉ
        </label>
        <input
          id="delivery-address-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={searchOnEnter}
          maxLength={180}
          placeholder="Ví dụ: 12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line px-4 text-sm outline-none focus:border-cobalt"
        />
        <button
          type="button"
          onClick={search}
          disabled={pending || query.trim().length < 3}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50"
        >
          <Icon name="search" className="size-4" />
          Tìm
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-coral">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line bg-white shadow-soft">
          {results.map((address, index) => (
            <li key={`${address.latitude}:${address.longitude}:${index}`}>
              <button
                type="button"
                onClick={() => choose(address)}
                className="w-full border-b border-line px-4 py-3 text-left text-sm text-navy last:border-0 hover:bg-mist"
              >
                {address.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-line">
        <AddressMapLoader position={position} onChoose={chooseMapPoint} />
      </div>
      {position && (
        <button
          type="button"
          onClick={() => reverseLookup(position)}
          disabled={pending}
          className="mt-3 h-10 rounded-full border border-line px-4 text-sm font-bold text-navy hover:border-cobalt hover:text-cobalt disabled:opacity-50"
        >
          {pending ? "Đang lấy địa chỉ..." : "Lấy địa chỉ từ ghim trên bản đồ"}
        </button>
      )}
      <p className="mt-2 text-xs leading-5 text-muted">
        Nhấn hoặc kéo ghim trên bản đồ để chọn vị trí. Bản đồ © OpenStreetMap.
        Từ khóa tìm kiếm hoặc tọa độ vị trí sẽ được gửi đến dịch vụ Photon để
        tra cứu địa chỉ.
      </p>
    </section>
  );
}
