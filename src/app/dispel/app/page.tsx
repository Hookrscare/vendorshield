import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <UnavailableCapability title="Video authenticity analysis is unavailable">
      <p>No media analysis is performed on this page. It cannot verify a video, camera source, biometric pulse, or AI origin.</p>
      <p>The preset verdicts and generated certificates have been disabled. No authenticity verdict or proof is issued.</p>
    </UnavailableCapability>
  );
}
