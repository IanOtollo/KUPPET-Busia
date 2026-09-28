import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KUPPET Busia Branch Portal",
    short_name: "KUPPET Busia",
    description:
      "Official Members and Administration portal for Kenya Union of Post Primary Education Teachers (KUPPET) Busia County Branch.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#1F3D5C",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
