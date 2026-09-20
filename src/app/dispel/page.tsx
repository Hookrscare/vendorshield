import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <UnavailableCapability title="Dispel Lens is an unfinished prototype">
      <p>Dispel Lens does not currently analyze videos, detect deepfakes, or establish whether a YouTube video is authentic.</p>
      <p>The earlier interface displayed preset examples and generated random certificate strings. Those results were not media analysis or cryptographic evidence. Analysis, certificate downloads, and paid offers have been removed.</p>
    </UnavailableCapability>
  );
}
