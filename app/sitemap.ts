import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";

const routes = [
  "",
  "/about",
  "/career-intern",
  "/career",
  "/explore",
  "/hardware-agents",
  "/summer-school",
  "/tech-education",
  "/software-agents",
  "/edge-product",
  "/talents"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified
  }));
}
