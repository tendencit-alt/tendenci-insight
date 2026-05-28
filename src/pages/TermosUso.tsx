import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";

export default function TermosUso() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Termos de Uso — Tendenci</title>
        <meta name="description" content="Termos de Uso do ERP SaaS Tendenci." />
      </Helmet>
      <header className="border-b border-border/40 px-6 py-4">
        <Link to="/" className="text-sm font-semibold">Tendenci</Link>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 prose prose-invert prose-sm w-full">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground text-sm">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <h2 className="mt-8 text-xl font-semibold">1. Aceitação</h2>
        <p>
          Ao criar uma conta ou utilizar a plataforma Tendenci, o usuário concorda integralmente com estes Termos
          de Uso e com a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Objeto</h2>
        <p>
          A Tendenci disponibiliza um sistema ERP em modelo SaaS (Software as a Service) destinado a apoiar a gestão
          comercial, financeira, produtiva e operacional de pequenas e médias empresas.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Cadastro e Conta</h2>
        <p>
          O usuário é responsável por manter a confidencialidade de suas credenciais e por todas as atividades
          realizadas em sua conta. É proibido compartilhar credenciais com terceiros.
        </p>

        <h2 className="mt-6 text-xl font-semibold">4. Planos e Cobrança</h2>
        <p>
          A utilização dos planos pagos está sujeita ao pagamento das mensalidades. Atrasos podem resultar em
          suspensão do acesso. O cancelamento pode ser solicitado a qualquer momento, sem multa, observado o
          ciclo de cobrança vigente.
        </p>

        <h2 className="mt-6 text-xl font-semibold">5. Uso Aceitável</h2>
        <p>É vedado utilizar a plataforma para:</p>
        <ul>
          <li>Fins ilícitos ou contrários à legislação brasileira;</li>
          <li>Distribuição de malware, spam ou conteúdo ofensivo;</li>
          <li>Tentativas de engenharia reversa ou comprometimento da segurança do sistema.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">6. Propriedade Intelectual</h2>
        <p>
          Todos os direitos sobre o software, marca, layout e documentação são da Tendenci. Os dados inseridos pelo
          cliente permanecem de sua propriedade.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Disponibilidade</h2>
        <p>
          Buscamos a maior disponibilidade possível, mas não garantimos operação ininterrupta. Manutenções planejadas
          serão comunicadas com antecedência razoável.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. Limitação de Responsabilidade</h2>
        <p>
          A Tendenci não se responsabiliza por danos indiretos, lucros cessantes ou perdas decorrentes do uso
          inadequado da plataforma pelo cliente ou seus usuários.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Encerramento</h2>
        <p>
          Em caso de violação destes Termos, a Tendenci poderá suspender ou encerrar a conta, preservando o acesso
          para exportação de dados conforme a LGPD.
        </p>

        <h2 className="mt-6 text-xl font-semibold">10. Legislação e Foro</h2>
        <p>
          Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca da sede da Tendenci
          para dirimir quaisquer controvérsias.
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
