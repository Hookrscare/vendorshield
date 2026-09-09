import { describe, it, expect } from "vitest";
import { generateDirectoryVendorSchema, generateDirectoryMetadata } from "./directory-schema";
import { DIRECTORY_VENDORS } from "./initial-data";

describe("QA-111: Programmatic SEO Directory Schema & Metadata", () => {
  it("generates valid Schema.org graph for a vendor", () => {
    const openai = DIRECTORY_VENDORS.find((v) => v.slug === "openai");
    expect(openai).toBeDefined();

    const schema = generateDirectoryVendorSchema(openai!);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@graph"]).toHaveLength(3);

    const software = schema["@graph"].find((node) => node["@type"] === "SoftwareApplication");
    expect(software).toBeDefined();
    expect(software?.name).toBe("OpenAI");
    expect(software?.applicationCategory).toBe("AI & Machine Learning");

    const org = schema["@graph"].find((node) => node["@type"] === "Organization");
    expect(org).toBeDefined();
    expect(org?.name).toBe("OpenAI");
    expect(org?.knowsAbout).toContain("SOC 2 Type II");

    const breadcrumbs = schema["@graph"].find((node) => node["@type"] === "BreadcrumbList");
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.itemListElement).toHaveLength(2);
    expect(breadcrumbs?.itemListElement?.[0]?.item).toBe("https://vendorshield.app/directory");
    expect(breadcrumbs?.itemListElement?.[1]?.item).toBe("https://vendorshield.app/directory/openai");
  });

  it("generates correct SEO metadata with canonical tags", () => {
    const aws = DIRECTORY_VENDORS.find((v) => v.slug === "amazon-web-services");
    expect(aws).toBeDefined();

    const meta = generateDirectoryMetadata(aws);
    expect(meta.title).toContain("Amazon Web Services (AWS)");
    expect(meta.title).toContain("SOC 2, GDPR DPA");
    expect(meta.alternates?.canonical).toBe("https://vendorshield.app/directory/amazon-web-services");
    expect(meta.openGraph?.title).toContain("Amazon Web Services (AWS)");
  });

  it("handles non-existent vendor metadata safely", () => {
    const meta = generateDirectoryMetadata(undefined);
    expect(meta.title).toContain("Vendor Not Found");
  });
});
