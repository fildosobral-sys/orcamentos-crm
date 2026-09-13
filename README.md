# Orçamentos CRM — estrutura consolidada

- `orcamentos.html`: única aplicação oficial de orçamento.
- `index.html`: apenas redireciona para a aplicação oficial.
- `orcamentos-2.html`: redirecionamento de compatibilidade para links antigos.
- `crm-api-v2.js`: única autenticação do CRM; credenciais usam namespace `crm_*` e não sobrescrevem o token da Central.
- `home-transition.js`: somente navegação/retorno; não faz autenticação nem chamadas de rede.
- `orcamentos-gestao.html`: gestão/BI.

## Central x CRM
A Central guarda sua sessão antes de abrir o CRM. O CRM mantém uma credencial própria neste navegador. Ao usar a casinha, a sessão da Central é restaurada antes do retorno.

Como os dois backends são diferentes, a primeira autorização do CRM em um navegador continua sendo necessária. Depois disso, Central ⇄ CRM funciona sem novo login enquanto as sessões permanecerem válidas.
