import Link from "next/link";

export const metadata = {
  title: "Termos de Serviço — faltaUma",
};

export default function TermsPage() {
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
          Termos de Serviço
        </h1>

        <div className="prose prose-zinc max-w-none space-y-6 text-zinc-700 leading-relaxed">
          <p><strong>Última atualização:</strong> Janeiro de 2025</p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">1. Aceitação dos termos</h2>
          <p>
            Ao acessar e utilizar o faltaUma ("Plataforma"), você concorda com estes Termos de Serviço. Se não concordar, não utilize a plataforma.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">2. Descrição do serviço</h2>
          <p>
            O faltaUma é uma plataforma gratuita para gerenciamento de coleções de figurinhas da Copa do Mundo 2026. O serviço permite:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Registrar figurinhas que você possui (incluindo repetidas).</li>
            <li>Acompanhar o progresso de completude do álbum.</li>
            <li>Conectar-se com outros colecionadores para facilitar trocas.</li>
            <li>Contribuir com imagens de figurinhas para a comunidade.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">3. Cadastro e conta</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>O acesso requer autenticação via conta Google.</li>
            <li>Você é responsável por manter a segurança da sua conta.</li>
            <li>Informações fornecidas devem ser verdadeiras e atualizadas.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">4. Uso aceitável</h2>
          <p>Ao utilizar a plataforma, você concorda em NÃO:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Enviar conteúdo ofensivo, ilegal ou que viole direitos de terceiros.</li>
            <li>Enviar imagens que não sejam de figurinhas do álbum.</li>
            <li>Utilizar a plataforma para spam, fraude ou atividades maliciosas.</li>
            <li>Tentar acessar contas de outros usuários ou sistemas internos.</li>
            <li>Utilizar bots ou scripts automatizados sem autorização.</li>
          </ul>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">5. Conteúdo do usuário</h2>
          <p>
            Ao enviar imagens de figurinhas, você concede ao faltaUma uma licença não exclusiva, gratuita e mundial para exibir essas imagens na plataforma para outros usuários. Você garante que possui os direitos necessários sobre o conteúdo enviado.
          </p>
          <p>
            Reservamo-nos o direito de remover conteúdo que viole estes termos e suspender contas de usuários que enviem conteúdo inadequado repetidamente.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">6. Propriedade intelectual</h2>
          <p>
            As figurinhas, marcas e imagens oficiais da Copa do Mundo são propriedade de seus respectivos detentores. O faltaUma é uma ferramenta de gerenciamento de coleção e não possui vínculo oficial com a FIFA ou Panini.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">7. Disponibilidade do serviço</h2>
          <p>
            O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta e podemos modificar ou descontinuar funcionalidades a qualquer momento, com aviso prévio quando possível.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">8. Limitação de responsabilidade</h2>
          <p>
            O faltaUma não se responsabiliza por trocas realizadas entre usuários fora da plataforma, perdas de dados decorrentes de falhas técnicas imprevistas, ou danos indiretos relacionados ao uso do serviço.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">9. Encerramento de conta</h2>
          <p>
            Você pode solicitar o encerramento da sua conta a qualquer momento. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">10. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas na plataforma. O uso continuado após alterações constitui aceitação dos novos termos.
          </p>

          <h2 className="text-xl font-bold text-zinc-900 mt-8">11. Contato</h2>
          <p>
            Dúvidas sobre estes termos? Entre em contato: <a href="mailto:contato@devpoolbr.com.br" className="text-[#0a3d2a] underline">contato@devpoolbr.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}
