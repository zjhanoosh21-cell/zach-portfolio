import { ClientForm } from "@/components/client/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <a href="/clients" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to clients
      </a>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Client</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a law firm, corporate HR contact, or other hiring organization.
        </p>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
