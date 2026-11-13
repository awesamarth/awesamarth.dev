import type { MetadataRoute } from "next";

const pages = ["", "/projects", "/writings", "/videos", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(path => ({
    url: `https://awesamarth.dev${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
