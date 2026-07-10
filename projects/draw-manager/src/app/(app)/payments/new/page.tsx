import { redirect } from 'next/navigation'

// Payments are logged from within a project's detail page.
// This standalone route is no longer needed.
export default function LogPaymentPage() {
  redirect('/projects')
}
