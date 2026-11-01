import { NextRequest, NextResponse } from "next/server";
import type { DeliveryAddressSuggestion } from "@/lib/geocoding/types";

type PhotonProperties = {
  name?: string;
  housenumber?: string;
  street?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: PhotonProperties;
};

type PhotonResponse = { features?: PhotonFeature[] };

const photonBaseUrl = "https://photon.komoot.io/api/";
let photonQueue = Promise.resolve();
let lastPhotonRequestAt = 0;

function makeAddress(feature: PhotonFeature): DeliveryAddressSuggestion | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number" ||
    !properties
  ) {
    return null;
  }
  const [longitude, latitude] = coordinates;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const street = [properties.housenumber, properties.street ?? properties.name]
    .filter(Boolean)
    .join(" ");
  const district =
    properties.district ?? properties.locality ?? properties.county ?? "";
  const city = properties.city ?? properties.state ?? "";
  const label = [
    street,
    district,
    city,
    properties.postcode,
    properties.country,
  ]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ");
  if (!label) return null;

  return { label, street, district, city, latitude, longitude };
}

async function requestPhoton(url: URL) {
  const request = photonQueue.then(async () => {
    const wait = Math.max(0, lastPhotonRequestAt + 1_100 - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastPhotonRequestAt = Date.now();
    return fetch(url, {
      cache: "no-store",
      headers: {
        "Accept-Language": "vi,en",
        "User-Agent": "NovaStore/0.1.0 (address search)",
      },
      signal: AbortSignal.timeout(8_000),
    });
  });
  photonQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim();
  const latitudeValue = params.get("lat");
  const longitudeValue = params.get("lon");
  const isReverse = latitudeValue !== null || longitudeValue !== null;

  if (isReverse && (latitudeValue === null || longitudeValue === null)) {
    return errorResponse("Tọa độ vị trí chưa đầy đủ.", 400);
  }
  if (!isReverse && (!query || query.length < 3 || query.length > 180)) {
    return errorResponse("Nhập ít nhất 3 ký tự để tìm địa chỉ.", 400);
  }

  const url = new URL(
    isReverse
      ? "https://photon.komoot.io/reverse"
      : photonBaseUrl,
  );
  if (isReverse) {
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return errorResponse("Tọa độ vị trí không hợp lệ.", 400);
    }
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
  } else {
    url.searchParams.set("q", `${query} Vietnam`);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lat", "16.0");
    url.searchParams.set("lon", "107.5");
  }

  try {
    const response = await requestPhoton(url);
    if (!response.ok) {
      console.error("Photon geocoding API returned an error.", response.status);
      return errorResponse("Dịch vụ tìm địa chỉ hiện không khả dụng.", 502);
    }
    const data = (await response.json()) as PhotonResponse;
    const addresses = (data.features ?? [])
      .map(makeAddress)
      .filter((address): address is DeliveryAddressSuggestion => address !== null);
    return NextResponse.json(
      { addresses },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Không thể kết nối dịch vụ tìm địa chỉ Photon.", error);
    return errorResponse(
      "Không kết nối được dịch vụ bản đồ. Vui lòng thử lại sau.",
      502,
    );
  }
}
