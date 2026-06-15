import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-green-950 text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
        <p className="text-gray-400 mb-8">
          Não encontramos nenhum colecionador com este nome de usuário.
          Verifique se o nome está correto ou explore outros perfis.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
          <Link
            href="/players/collectors"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10 transition-colors"
          >
            Ver colecionadores
          </Link>
        </div>
      </div>
    </div>
  );
}
