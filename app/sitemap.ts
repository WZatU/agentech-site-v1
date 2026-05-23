import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";

const routes = [
  "",
  "/about",
  "/news",
  "/career-intern",
  "/career",
  "/agentech-robotic",
  "/agentech-education",
  "/agentech-bots",
  "/ai-robotics-club",
  "/ai-robotics-club/zh",
  "/ai-robotics-club/apply",
  "/tech-education",
  "/talents"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified
  }));
}
