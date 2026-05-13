import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — faltaUma",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-[#0a3d2a] hover:underline mb-8 inline-block">
          ← Voltar
        </Link>

        <h1
          className="text-3xl md:text-4xl text-zinc-900 mb-8"
          style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-1px' }}
        >
          Política de Privacidade
        </h1>

        <div className="prose prose-zinc max-w-none space-y-6 text-zinc-700 leading-relaxed">
          <p><strong>Última atualização:</strong> Janeiro de 2025</p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">1. Informações que coletamos</h2>
          <p>
            Ao utilizar o faltaUma, coletamos as seguintes informações:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Dados de conta:</strong> nome, e-mail e foto de perfil fornecidos pelo Google ao fazer login via OAuth.</li>
            <li><strong>Dados de perfil:</strong> informações de contato fornecidas voluntariamente, como número de WhatsApp e perfil do Instagram, para facilitar trocas com outros colecionadores. Esses dados só são compartilhados com usuários que você escolher ao iniciar uma troca.</li>
            <li><strong>Dados de uso:</strong> figurinhas adicionadas, trocas realizadas e interações com outros colecionadores.</li>
            <li><strong>Imagens enviadas:</strong> fotos de figurinhas enviadas voluntariamente pelos usuários para contribuir com o álbum.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">2. Como usamos suas informações</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Gerenciar sua conta e autenticação.</li>
            <li>Exibir seu progresso no álbum e facilitar trocas com outros colecionadores.</li>
            <li>Melhorar a experiência do usuário e o funcionamento da plataforma.</li>
            <li>Enviar comunicações relacionadas ao serviço (quando necessário).</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">3. Compartilhamento de dados</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins comerciais. Seus dados podem ser compartilhados apenas:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Com outros usuários da plataforma (nome e figurinhas disponíveis para troca, conforme suas configurações).</li>
            <li>Quando exigido por lei ou ordem judicial.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">4. Armazenamento e segurança</h2>
          <p>
            Seus dados são armazenados em servidores seguros fornecidos pela Supabase (infraestrutura AWS). Utilizamos criptografia em trânsito (HTTPS/TLS) e controles de acesso para proteger suas informações.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">5. Seus direitos</h2>
          <p>Você pode a qualquer momento:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Acessar seus dados pessoais.</li>
            <li>Solicitar a correção de informações incorretas.</li>
            <li>Solicitar a exclusão da sua conta e dados associados.</li>
          </ul>
          <p>
            Para exercer esses direitos, entre em contato pelo e-mail: <a href="mailto:contato@devpoolbr.com.br" className="text-[#0a3d2a] underline">contato@devpoolbr.com.br</a>
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">6. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies de rastreamento ou publicidade.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">7. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas na plataforma. O uso continuado do serviço após alterações constitui aceitação da política atualizada.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">8. Contato</h2>
          <p>
            Dúvidas sobre esta política? Entre em contato: <a href="mailto:contato@devpoolbr.com.br" className="text-[#0a3d2a] underline">contato@devpoolbr.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}
