# Dispel: real AI-media detection in YouTube

## Current result

The former canned verdicts, timers, random certificates, arbitrary valid-hash page, and incomplete extension download are disabled in production. Dispel is not a working detector today. No provider credentials or approved paid video entitlement were found. No account, paid subscription, or external media upload was created in this work.

The target is AI-generated versus non-AI-generated media, with AI-edited and inconclusive where supported. It is not a factual-truth checker. Missing AI evidence must never become a guaranteed “real” result. C2PA can add signed provenance information, but absent metadata cannot establish non-AI origin, and a valid signature does not establish scene truth.

## Provider comparison (official pages checked September 20, 2026)

| Provider | Relevant capability | Access and cost evidence | Decision |
| --- | --- | --- | --- |
| Sightengine | Separate AI-generated image/video detection and face manipulation models; synchronous short video endpoint, asynchronous longer video jobs | Published Starter $29/month, 10,000 operations, $0.002/additional operation, 50 MB/video; no live-stream support. Free comparison explicitly excludes video processing. A scan is not necessarily one operation. | Best documented low-cost candidate for a bounded captured-clip pilot; requires approved paid entitlement and API user/secret. No purchase made. |
| Reality Defender RealAPI | Image, audio and video deepfake analysis through API | Free plan lists 50 scans, image/audio only; video is on Business. Page displays $399 with an annual-billing control; billing basis and commitment need checkout confirmation. | Free image/audio evaluation cannot complete the YouTube video requirement. |
| Hive | Separate AI-generated image/video and face-swap detection models | Official model docs found; usable account quota and price not verified | Alternative for a provider evaluation; not a verified free path. |
| Sensity | Deepfake detection API and upload workflows | Official API docs found; usable entitlement and pricing not verified | Alternative pending access. |

Sources: [Sightengine video API](https://sightengine.com/docs/ai-generated-video-detection), [pricing](https://sightengine.com/pricing), [supported video formats](https://sightengine.com/faq/video-formats-protocols-supported), [Reality Defender RealAPI](https://www.realitydefender.com/product/realapi), [Hive model documentation](https://docs.thehive.ai/docs/ai-image-and-video-detection), [Sensity documentation](https://docs.sensity.ai/), [C2PA explainer](https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html).

InsForge's current AI endpoint reports that AI requires a paid organization plan. That does not prevent calling an independent specialist API from the existing server; general multimodal generation is not a validated AI-media detector anyway.

## Concrete browser workflow

1. User clicks Dispel while watching a YouTube video.
2. Explain exactly what will be captured and sent, to which provider, and the retention setting. Require an explicit start action. Show capture progress and cancellation.
3. Use Chrome's user-invoked `tabCapture` with an offscreen document for a bounded clip. Capture only the requested visible content; handle pauses, navigation, black/protected frames and missing media as unavailable. Stop every track after capture/cancel. Do not download hidden YouTube streams or circumvent protections.
4. Preview the captured segment, then upload via authenticated backend. Keep provider secrets server-side. Enforce duration, byte limits, per-user quotas and a hard cost cap. Validate extension origin/identity and requests; do not expose an unrestricted public paid API proxy.
5. Call a genuine video model and record provider/model version, exact clip coverage, input hash, time and estimate. Add separate audio detection only if supported and explicitly consented.
6. Display results beside the watched video: evidence of AI generation, supported manipulation finding, no detected AI evidence, or inconclusive. Explain the analyzed interval and model limitations. Never describe a short clip as verification of the whole video.

An image-only pilot could instead analyze explicitly captured/cropped visible frames, but its on-page result must say “sampled frames only; video continuity and audio not analyzed.” It does not satisfy the requested full clip workflow. Do not substitute an upload-only website for the extension.

Chrome primary references: [tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture), [offscreen capture flow](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).

## Remaining access and validation gate

Needed from the owner: an existing specialist provider account/API entitlement, or explicit authorization for a bounded paid pilot (recommend evaluating Sightengine Starter first, subject to current checkout terms). Secrets belong in server environment settings, not chat, Git, or the extension. Confirm actual video-model entitlement, operation accounting, quotas, media-retention controls, and allowed use before sending real footage. Sightengine's GDPR FAQ says immediate deletion is possible; that is not evidence it is enabled by default. [Retention FAQ](https://sightengine.com/faq/gdpr-content-moderation), [security](https://sightengine.com/security).

Then build and test the actual extension package and provider adapter using licensed/authorized synthetic fixtures. Evaluate known real, generated and edited material, recompression, screen capture artifacts, overlays, low resolution, cartoons, mixed clips, audio-only edits, outages and exhausted quota. Set thresholds from held-out results, measure false positives and false negatives, and retain an inconclusive band. Provider marketing accuracy is not application validation. No production verdict should be re-enabled before this evidence exists.
