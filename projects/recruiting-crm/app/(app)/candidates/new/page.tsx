import Link from "next/link";
import { CandidateForm } from "@/components/candidate/candidate-form";

export default function NewCandidatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/candidates" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to candidates
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-3">Add Candidate</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manually entered candidates are created with status <strong>Active</strong> and no AI scores.
        </p>
      </div>

      <CandidateForm />
    </div>
  );
}
