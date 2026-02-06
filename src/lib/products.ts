export type ProductOption = {
  id: string;
  label: string;
  price: number; // GBP
  requiresText?: boolean; // if true, we show personalisation + font picker
};

export type Product = {
  id: string;
  name: string;
  description: string;
  image: string; // /images/...
  options: ProductOption[];
  // Optional font guide image for custom text products
  fontGuideImage?: string; // /images/...
};

export const products: Product[] = [
  {
    id: "steel-photo",
    name: "304 Stainless Steel Photo",
    description:
      "Personalised 304 stainless steel photo keepsake. Choose your size.",
    image: "/images/steel-photo.jpg",
    options: [
      { id: "steel-100x100", label: "100mm × 100mm — £20", price: 20 },
      { id: "steel-100x200", label: "100mm × 200mm — £40", price: 40 },
    ],
  },
  {
    id: "metal-wallet-photo",
    name: "Metal Wallet Photo Card",
    description:
      "Metal wallet photo card — keep your special moments with you at all times.",
    image: "/images/wallet-photo.jpg",
    fontGuideImage: "/images/wallet-fonts.jpg",
    options: [
      { id: "wallet-photo-only", label: "Photo only — £4", price: 4 },
      {
        id: "wallet-photo-text",
        label: "Photo + custom text — £5.50",
        price: 5.5,
        requiresText: true,
      },
    ],
  },
];
