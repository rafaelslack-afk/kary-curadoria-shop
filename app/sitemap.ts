import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// URLs estáticas — sempre presentes mesmo se o Supabase não responder
const BASE_URLS: MetadataRoute.Sitemap = [
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
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const admin = createAdminClient();

    // Timeout de 8 s — evita travar o build se o Supabase demorar a responder
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 8000)
    );

    const fetchPromise = Promise.all([
      admin.from("products").select("slug, updated_at").eq("active", true),
      admin.from("categories").select("slug, updated_at").eq("active", true),
    ]);

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    // Timeout atingido — retorna só as URLs estáticas
    if (!result) return BASE_URLS;

    const [{ data: products }, { data: categories }] = result;

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

    return [...BASE_URLS, ...productUrls, ...categoryUrls];
  } catch {
    // Qualquer erro de conexão → retorna URLs estáticas sem travar o build
    return BASE_URLS;
  }
}
