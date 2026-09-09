import { DirectoryVendor } from "./types";
import { Metadata } from "next";

export function generateDirectoryVendorSchema(vendor: DirectoryVendor) {
  const baseUrl = "https://vendorshield.app";
  const vendorUrl = `${baseUrl}/directory/${vendor.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${vendorUrl}#software`,
        name: vendor.name,
        applicationCategory: vendor.category,
        operatingSystem: "Cloud / Web",
        url: vendor.website,
        description: vendor.description,
      },
      {
        "@type": "Organization",
        "@id": `${vendorUrl}#organization`,
        name: vendor.name,
        url: vendor.website,
        address: {
          "@type": "PostalAddress",
          addressLocality: vendor.headquarters,
        },
        knowsAbout: vendor.certifications,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${vendorUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "SaaS Compliance Directory",
            item: `${baseUrl}/directory`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `${vendor.name} Compliance Profile`,
            item: vendorUrl,
          },
        ],
      },
    ],
  };
}

export function generateDirectoryMetadata(vendor: DirectoryVendor | undefined): Metadata {
  if (!vendor) {
    return {
      title: "Vendor Not Found | VendorShield Compliance Directory",
      description: "The requested SaaS sub-processor profile could not be located in the compliance registry.",
    };
  }

  const title = `${vendor.name} SOC 2, GDPR DPA & Security Profile | VendorShield`;
  const description = `Inspect ${vendor.name}'s verified sub-processor compliance posture, DPA links, ${vendor.certifications.join(", ")} certifications, and data processing scope.`;
  const canonical = `https://vendorshield.app/directory/${vendor.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${vendor.name} Sub-Processor Compliance Profile`,
      description,
      url: canonical,
      siteName: "VendorShield B2B Security Directory",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
