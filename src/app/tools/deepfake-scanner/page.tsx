import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <UnavailableCapability title="Deepfake scanning is unavailable">
      <p>This tool does not accept or analyze uploaded videos or images. It cannot establish whether YouTube or other web media is authentic.</p>
      <p>The previous sample buttons displayed a fixed result, including for the synthetic example. That misleading output has been removed.</p>
    </UnavailableCapability>
  );
}
