import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    admin.from("products").select("slug, updated_at").eq("active", true),
    admin.from("categories").select("slug, updated_at").eq("active", true),
  ]);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `https://karycuradoria.com.br/produtos/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `https://karycuradoria.com.br/produtos?categoria=${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    {
      url: "https://karycuradoria.com.br",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://karycuradoria.com.br/produtos",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...productUrls,
    ...categoryUrls,
  ];
}
