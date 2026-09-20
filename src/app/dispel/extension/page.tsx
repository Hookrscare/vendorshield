import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <UnavailableCapability title="The Dispel browser extension is not available">
      <p>There is no complete installable extension here for YouTube, Zoom, or other websites.</p>
      <p>The earlier download contained only a manifest, without the scripts, popup, and icons it referenced. The incomplete download and installation instructions have been removed.</p>
    </UnavailableCapability>
  );
}
