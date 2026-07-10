import { redirect } from 'next/navigation'

// Draw creation is accessed from within a project's detail page.
// This standalone route is no longer needed.
export default function CreateDrawPage() {
  redirect('/projects')
}
