import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/test", "/thank-you"] },
    sitemap: "https://awesamarth.dev/sitemap.xml",
  };
}
