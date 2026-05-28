import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Política de Privacidade — Tendenci</title>
        <meta name="description" content="Política de Privacidade e tratamento de dados pessoais do ERP Tendenci, em conformidade com a LGPD." />
      </Helmet>
      <header className="border-b border-border/40 px-6 py-4">
        <Link to="/" className="text-sm font-semibold">Tendenci</Link>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 prose prose-invert prose-sm w-full">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <h2 className="mt-8 text-xl font-semibold">1. Controlador dos Dados</h2>
        <p>
          A <strong>Tendenci</strong> ("nós") é a controladora dos dados pessoais tratados nesta plataforma,
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Finalidade do Tratamento</h2>
        <p>
          Os dados pessoais coletados são tratados exclusivamente para a operação do ERP SaaS Tendenci, incluindo
          autenticação, gestão de empresas e usuários, processos comerciais, financeiros, produtivos e de relacionamento
          com clientes, bem como suporte técnico e melhorias do produto.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Base Legal</h2>
        <ul>
          <li>Execução de contrato (art. 7º, V da LGPD) — para entrega das funcionalidades contratadas.</li>
          <li>Legítimo interesse (art. 7º, IX) — para segurança, prevenção a fraudes e evolução do produto.</li>
          <li>Cumprimento de obrigação legal (art. 7º, II) — para retenção fiscal e contábil.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Dados Coletados</h2>
        <ul>
          <li>Identificação: nome, e-mail, CPF/CNPJ, telefone, endereço.</li>
          <li>Acesso: credenciais, registros de login, IP, navegador.</li>
          <li>Operacionais: pedidos, lançamentos, clientes, fornecedores cadastrados no ERP.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. Compartilhamento</h2>
        <p>
          Não comercializamos dados. Compartilhamos apenas com operadores essenciais à prestação do serviço
          (hospedagem em nuvem, processamento de pagamentos, comunicação transacional) sob contratos de confidencialidade.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Retenção</h2>
        <p>
          Os dados são mantidos durante a vigência do contrato. Dados fiscais e contábeis são retidos por <strong>5 anos</strong>
          após o encerramento, em cumprimento à legislação tributária. Dados pessoais não-fiscais podem ser excluídos
          mediante solicitação do titular.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Direitos do Titular</h2>
        <p>O titular dos dados pode, a qualquer momento:</p>
        <ul>
          <li>Confirmar a existência de tratamento.</li>
          <li>Acessar e exportar seus dados (disponível em <Link to="/configuracoes/perfil" className="underline">Perfil → Privacidade</Link>).</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar a exclusão da conta (também disponível na área de Perfil; a exclusão definitiva ocorre em 30 dias).</li>
          <li>Revogar o consentimento.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">8. Segurança</h2>
        <p>
          Aplicamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia em trânsito,
          isolamento multi-tenant com Row-Level Security e controle de acesso por perfil.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Encarregado (DPO)</h2>
        <p>
          Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados, entre em contato pelo e-mail
          <a href="mailto:dpo@tendencitech.com.br" className="underline ml-1">dpo@tendencitech.com.br</a>.
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
