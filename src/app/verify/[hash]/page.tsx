import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <UnavailableCapability title="No attestation can be verified here">
      <p>This page has no trusted verification registry and cannot validate the supplied identifier, a report, or an organization’s compliance.</p>
      <p>Earlier versions displayed a valid status for arbitrary identifiers. That claim has been removed. A generated report is a record export, not a certification or independent audit.</p>
    </UnavailableCapability>
  );
}
