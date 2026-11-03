import "server-only";

export type GhnTrackingStatus = {
  code: string;
  label: string;
};

type GhnDetailResponse = {
  code?: number;
  message?: string;
  data?: {
    status?: unknown;
    status_name?: unknown;
    status_text?: unknown;
  } | null;
};

const statusLabels: Record<string, string> = {
  ready_to_pick: "GHN đã tiếp nhận vận đơn",
  picking: "GHN đang lấy hàng",
  money_collect_picking: "GHN đang lấy hàng và thu hộ",
  picked: "GHN đã lấy hàng",
  storing: "Hàng đang ở kho GHN",
  transporting: "Hàng đang được vận chuyển",
  sorting: "Hàng đang được phân loại",
  delivering: "Đang giao hàng đến bạn",
  money_collect_delivering: "Đang giao hàng và thu hộ",
  delivered: "GHN đã giao hàng thành công",
  delivery_fail: "Giao hàng chưa thành công",
  waiting_to_return: "Đơn hàng đang chờ hoàn về",
  return: "Đơn hàng đang được hoàn",
  return_transporting: "Đơn hàng đang trên đường hoàn",
  return_sorting: "Đơn hàng đang được phân loại để hoàn",
  returning: "Đơn hàng đang được hoàn về shop",
  return_fail: "Hoàn hàng chưa thành công",
  returned: "Đơn hàng đã được hoàn về shop",
  cancel: "Vận đơn GHN đã bị hủy",
  exception: "Vận đơn gặp sự cố",
  damage: "Vận đơn gặp sự cố hư hỏng",
  lost: "Vận đơn gặp sự cố thất lạc",
};

function getGhnConfiguration() {
  const token = process.env.GHN_TOKEN?.trim();
  const shopId = process.env.GHN_SHOP_ID?.trim();
  if (!token || !shopId) return null;

  const baseUrl = (
    process.env.GHN_API_URL?.trim() ||
    "https://online-gateway.ghn.vn/shiip/public-api/v2"
  ).replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("GHN_API_URL không hợp lệ.");
  }
  if (
    url.protocol !== "https:" ||
    ![
      "online-gateway.ghn.vn",
      "dev-online-gateway.ghn.vn",
    ].includes(url.hostname)
  ) {
    throw new Error("GHN_API_URL phải dùng endpoint chính thức của GHN.");
  }
  return { token, shopId, baseUrl };
}

export function isGhnConfigured() {
  return Boolean(process.env.GHN_TOKEN?.trim() && process.env.GHN_SHOP_ID?.trim());
}

export function getGhnStatusLabel(status: string) {
  return statusLabels[status] ?? `Trạng thái GHN: ${status}`;
}

export async function getGhnTrackingStatus(
  orderCode: string,
): Promise<GhnTrackingStatus> {
  const config = getGhnConfiguration();
  if (!config) {
    throw new Error("Chưa cấu hình GHN_TOKEN và GHN_SHOP_ID trên máy chủ.");
  }

  const response = await fetch(`${config.baseUrl}/shipping-order/detail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Token: config.token,
      ShopId: config.shopId,
    },
    body: JSON.stringify({ order_code: orderCode }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`GHN không thể tra cứu vận đơn (${response.status}).`);
  }

  const result = (await response.json()) as GhnDetailResponse;
  if (result.code !== 200 || !result.data) {
    throw new Error(result.message || "GHN không trả về thông tin vận đơn.");
  }
  const rawStatus = result.data.status;
  if (typeof rawStatus !== "string" || !/^[a-z_]{2,64}$/.test(rawStatus)) {
    throw new Error("GHN trả về trạng thái vận đơn không hợp lệ.");
  }
  const providerLabel =
    typeof result.data.status_name === "string"
      ? result.data.status_name
      : typeof result.data.status_text === "string"
        ? result.data.status_text
        : null;

  return {
    code: rawStatus,
    label: statusLabels[rawStatus] || providerLabel || getGhnStatusLabel(rawStatus),
  };
}

export function getGhnTrackingUrl(orderCode: string) {
  return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(orderCode)}`;
}
