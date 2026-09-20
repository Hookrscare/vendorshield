import { UnavailableCapability } from "@/components/UnavailableCapability";

export default function Page() {
  return (
    <div className="workspace-secondary">
      <UnavailableCapability title="Automated DPA analysis is unavailable">
        <p>
          The previous scanner used keyword guesses, assumed missing facts, and
          displayed a fixed compliance score. It did not provide legal analysis
          or save the displayed result to your register.
        </p>
        <p>
          That output has been removed. Review the actual agreement and enter
          confirmed vendor details in your register. No compliance verdict is
          issued here.
        </p>
      </UnavailableCapability>
    </div>
  );
}
