import { useState } from "react";
import type { WorkshopAgreement, WorkshopSignature } from "../../../types";
import { Button } from "../../ui/Button";
import { Field, TextInput } from "../../ui/Field";
import { SignatureView, SignaturePad } from "./SignaturePad";
import { AGREEMENT_URL } from "./workshopContent";

/**
 * The Daily Bread workshop agreement: the analyst and the participant read the one-page agreement together, then
 * each prints their name and signs. The signed record is kept with the meeting.
 */
export function AgreementPanel({
  agreement,
  participantName,
  onSign,
  onUnsign,
}: {
  agreement: WorkshopAgreement | null;
  participantName: string;
  onSign: (a: WorkshopAgreement) => void;
  onUnsign: () => void;
}) {
  const [analystName, setAnalystName] = useState("");
  const [partName, setPartName] = useState(participantName);
  const [analystSig, setAnalystSig] = useState<WorkshopSignature | null>(null);
  const [partSig, setPartSig] = useState<WorkshopSignature | null>(null);
  const [agreed, setAgreed] = useState(false);
  const ready = !!analystName.trim() && !!partName.trim() && !!analystSig && !!partSig && agreed;

  if (agreement) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-olive/40 bg-olive/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-ink">
            Agreement signed on {new Date(agreement.signedAt).toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>
          <div className="flex gap-2">
            <a href={AGREEMENT_URL} target="_blank" rel="noreferrer">
              <Button variant="secondary">Open the agreement</Button>
            </a>
            <Button
              variant="ghost"
              onClick={() => {
                if (window.confirm("Remove these signatures so the agreement can be signed again?")) onUnsign();
              }}
            >
              Sign again
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-soft">Analyst</p>
            <p className="font-medium text-ink">{agreement.analystName}</p>
            <SignatureView sig={agreement.analystSignature} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Participant</p>
            <p className="font-medium text-ink">{agreement.participantName}</p>
            <SignatureView sig={agreement.participantSignature} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-parchment-deep/40 p-4">
      <div>
        <p className="font-semibold text-ink">Before you begin: the workshop agreement</p>
        <p className="text-sm text-ink-soft">
          Read the one-page agreement together. It covers the educational purpose, that this is not financial advice, and strict
          confidentiality. Then both of you sign below.
        </p>
      </div>
      <div>
        <a href={AGREEMENT_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary">Open the agreement to read</Button>
        </a>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Field label="Analyst's printed name">
            <TextInput value={analystName} onChange={(e) => setAnalystName(e.target.value)} autoComplete="name" />
          </Field>
          <SignaturePad label="Analyst's signature" printedName={analystName} onChange={setAnalystSig} />
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Participant's printed name">
            <TextInput value={partName} onChange={(e) => setPartName(e.target.value)} />
          </Field>
          <SignaturePad label="Participant's signature" printedName={partName} onChange={setPartSig} />
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
        />
        We have read the agreement, understand this workshop is education and not financial advice, and agree to keep everything
        shared confidential.
      </label>
      <div>
        <Button
          disabled={!ready}
          onClick={() =>
            onSign({
              analystName: analystName.trim(),
              analystSignature: analystSig!,
              participantName: partName.trim(),
              participantSignature: partSig!,
              signedAt: new Date().toISOString(),
            })
          }
        >
          Sign the agreement
        </Button>
      </div>
    </div>
  );
}
