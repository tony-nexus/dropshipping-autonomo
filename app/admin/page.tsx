import { redirect } from 'next/navigation'

export default function AdminRootPage() {
  // Redireciona quem entra em /admin direto para o Dashboard
  redirect('/admin/dashboard')
}
