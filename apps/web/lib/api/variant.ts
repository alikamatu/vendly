const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err?.message)
      ? err.message[0]
      : err?.message || "Request failed";
    throw new Error(msg);
  }
  const json = await res.json();
  return json && typeof json === "object" && "data" in json ? (json as any).data : json;
}

export interface Variant {
  id: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active: boolean;
}

export interface VariantInput {
  id?: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active?: boolean;
}

export const variantApi = {
  list: (productId: string) =>
    fetch(`${API_URL}/products/${productId}/variants`).then((r) => handle<Variant[]>(r)),

  replaceAll: (token: string, productId: string, variants: VariantInput[]) =>
    fetch(`${API_URL}/products/${productId}/variants/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ variants }),
    }).then((r) => handle<Variant[]>(r)),
};
