import type { MetadataRoute } from "next";

/** The portal is private; keep crawlers out of the login page and API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/login", "/api/"],
    },
  };
}
