export type CartAddon = {
  addonId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type CartFlavor = {
  id: string;
  name: string;
};

export type CartComboSelection = {
  productId: string;
  productName: string;
  sizeMl: number;
  flavorIds: string[];
  flavors: CartFlavor[];
  addons: CartAddon[];
  configurationHash: string;
};

export type CartItem = {
  id: string;
  kind: "product" | "combo";
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sizeMl: number;
  flavorIds: string[];
  flavors: CartFlavor[];
  addons: CartAddon[];
  comboId?: string;
  comboSelections?: CartComboSelection[];
  configurationHash: string;
  unitPriceCents: number;
  quantity: number;
  note: string;
};

export type AddCartItemInput = Omit<CartItem, "id" | "quantity" | "note">;
