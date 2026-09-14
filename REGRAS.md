# DIRETRIZES OBRIGATÓRIAS DE DESENVOLVIMENTO, ARQUITETURA E CLEAN CODE

Estas regras devem ser consideradas **obrigatórias durante qualquer criação, alteração, refatoração, correção de bug ou implementação de nova funcionalidade no projeto**.

O objetivo principal é manter uma aplicação:

* extremamente modular;
* fácil de entender;
* fácil de manter;
* fácil de expandir;
* reutilizável;
* padronizada;
* performática;
* segura;
* testável;
* com baixo acoplamento;
* sem duplicação de código;
* sem arquivos gigantes;
* com responsabilidades claramente separadas.

Sempre priorize **arquitetura e manutenibilidade a longo prazo**, mesmo quando uma solução mais rápida puder ser implementada em menos linhas naquele momento.

---

# 1. PRINCÍPIO FUNDAMENTAL: ARQUIVOS PEQUENOS E RESPONSABILIDADES ISOLADAS

Nunca permita que um arquivo concentre responsabilidades demais.

Cada arquivo deve possuir uma responsabilidade principal claramente identificável.

Antes de adicionar código a um arquivo existente, sempre faça mentalmente a pergunta:

> "Esta responsabilidade realmente pertence a este arquivo ou deveria existir em um módulo separado?"

Se a responsabilidade puder ser isolada, **crie outro arquivo**.

Nunca tenha medo de criar novos arquivos quando isso melhorar:

* organização;
* reutilização;
* legibilidade;
* manutenção;
* testabilidade;
* isolamento de responsabilidades.

Prefira:

```text
feature/
├── components/
├── hooks/
├── services/
├── utils/
├── types/
├── config/
├── themes/
├── tests/
└── index.ts
```

em vez de:

```text
feature/
└── feature.tsx
```

contendo centenas de linhas.

---

# 2. NUNCA DEIXAR UM ARQUIVO CRESCER DESNECESSARIAMENTE

Arquivos grandes devem ser tratados como um possível sinal de problema arquitetural.

Ao perceber que um arquivo está crescendo muito, interrompa a implementação e analise quais partes podem ser separadas.

Procure especialmente por:

* funções auxiliares;
* regras de negócio;
* chamadas de API;
* transformações de dados;
* estados;
* efeitos;
* validações;
* constantes;
* configurações;
* JSX;
* estilos;
* tipos;
* interfaces;
* textos;
* handlers;
* filtros;
* mapeamentos;
* lógica de formulários.

Essas responsabilidades devem ser extraídas quando possível.

Não existe uma quantidade absoluta de linhas proibida, mas utilize como alerta:

* acima de ~150 linhas: analisar possibilidade de separação;
* acima de ~250 linhas: provavelmente precisa ser modularizado;
* acima de ~400 linhas: considerar um problema arquitetural, salvo exceção realmente justificável.

O número de linhas não é a única métrica.

Mesmo um arquivo de 100 linhas deve ser dividido se estiver misturando responsabilidades diferentes.

---

# 3. UMA RESPONSABILIDADE CENTRAL POR MÓDULO

Cada módulo deve ter uma responsabilidade clara.

Exemplos:

```text
components/
```

Responsável por componentes reutilizáveis.

```text
ui/
```

Responsável por componentes visuais genéricos.

```text
hooks/
```

Responsável por estado, efeitos e comportamentos reutilizáveis.

```text
services/
```

Responsável pela comunicação com serviços externos e regras relacionadas à infraestrutura.

```text
api/
```

Responsável pela camada HTTP/API.

```text
utils/
```

Responsável por funções puras e utilitárias.

```text
types/
```

Responsável por tipos e interfaces compartilhados.

```text
config/
```

Responsável por configurações, flags, estruturas declarativas e comportamentos configuráveis.

```text
themes/
```

Responsável pelas propriedades visuais centralizadas.

```text
i18n/
```

Responsável por textos e traduções.

```text
logger/
```

Responsável pelo sistema de logs.

```text
tests/
```

Responsável por testes.

```text
modes/
```

Responsável por comportamentos específicos de diferentes modos da aplicação.

Não misture essas responsabilidades arbitrariamente.

---

# 4. COMPONENTES DEVEM SER FINOS

Um componente visual não deve concentrar:

* chamadas HTTP;
* regras de negócio complexas;
* grandes transformações;
* validações extensas;
* dezenas de estados;
* dezenas de handlers;
* lógica de persistência;
* formatação complexa de dados.

O componente deve principalmente:

1. obter dados por hooks;
2. receber propriedades;
3. montar componentes menores;
4. exibir a interface.

Exemplo inadequado:

```tsx
const Page = () => {
    const [x, setX] = useState('');
    const [y, setY] = useState('');
    const [z, setZ] = useState('');

    useEffect(() => {
        // muita lógica
    }, []);

    useEffect(() => {
        // muita lógica
    }, []);

    const handleX = () => {
        // muita lógica
    };

    const handleY = () => {
        // muita lógica
    };

    const handleZ = () => {
        // muita lógica
    };

    return (
        // JSX enorme
    );
};
```

Prefira:

```tsx
const Page = () => {
    const pageActions = usePageActions();

    return <PageContent {...pageActions} />;
};
```

E distribua as responsabilidades:

```text
hooks/
├── usePageActions.ts
├── usePageState.ts
└── usePageEffects.ts
```

quando necessário.

---

# 5. EXTRAIR ESTADO E COMPORTAMENTO PARA HOOKS

Estados relacionados devem ser agrupados semanticamente.

Evite:

```tsx
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

quando toda essa lógica puder ser abstraída.

Prefira algo como:

```tsx
const userForm = useUserForm();
```

ou:

```tsx
const {
    fields,
    status,
    actions,
} = useUserForm();
```

O hook deve encapsular comportamento relacionado.

Não crie hooks gigantes apenas para transferir o problema de arquivo.

Se necessário, um hook central pode coordenar hooks menores.

Exemplo:

```text
useCheckout/
├── useCheckout.ts
├── useCheckoutState.ts
├── useCheckoutValidation.ts
├── useCheckoutPayment.ts
└── useCheckoutSubmission.ts
```

---

# 6. HOOKS ORQUESTRADORES SÃO PREFERÍVEIS A COMPONENTES INTELIGENTES GIGANTES

Quando uma página possui diversas funcionalidades relacionadas, crie um hook coordenador.

Exemplo:

```tsx
const dashboard = useDashboard();
```

Internamente:

```tsx
export const useDashboard = () => {
    const filters = useDashboardFilters();
    const metrics = useDashboardMetrics();
    const pagination = useDashboardPagination();

    return {
        filters,
        metrics,
        pagination,
    };
};
```

Assim, a página não precisa conhecer detalhes internos da implementação.

---

# 7. NÃO DUPLICAR LÓGICA

É estritamente proibido reimplementar a mesma lógica em componentes diferentes sem necessidade.

Antes de escrever uma função, sempre verifique conceitualmente se já existe algo equivalente.

Se duas funcionalidades fazem praticamente a mesma coisa, procure criar uma abstração compartilhada.

Isso vale para:

* componentes;
* hooks;
* funções;
* validações;
* services;
* schemas;
* formatadores;
* chamadas de API;
* transformações;
* filtros;
* handlers;
* estilos;
* configurações;
* textos;
* webhooks;
* tipos;
* queries;
* mutations;
* regras de negócio.

Regra:

> Se uma alteração futura precisaria ser feita em dois arquivos para corrigir exatamente o mesmo comportamento, provavelmente existe duplicação.

Centralize essa responsabilidade.

---

# 8. CRIAR COMPONENTES REALMENTE REUTILIZÁVEIS

Antes de criar:

```text
CreateCustomerButton
CreateProductButton
CreateSupplierButton
```

avalie se é melhor criar:

```tsx
<ActionButton />
```

configurável por propriedades.

Exemplo:

```tsx
<ActionButton
    icon={PlusIcon}
    label={t.actions.createCustomer}
    onClick={handleCreate}
/>
```

Não crie componentes quase idênticos apenas mudando texto, ícone ou callback.

---

# 9. NÃO CRIAR ABSTRAÇÕES ARTIFICIAIS

Reutilização não significa transformar cada pequena linha em uma abstração.

Crie abstrações quando houver:

* responsabilidade clara;
* comportamento reutilizável;
* redução real de duplicação;
* melhoria de legibilidade;
* isolamento útil;
* possibilidade concreta de evolução independente.

Não crie dezenas de wrappers inúteis apenas para diminuir artificialmente o tamanho do arquivo.

Cada abstração deve possuir uma justificativa arquitetural.

---

# 10. JSX DEVE SER DIVIDIDO EM COMPONENTES

Evite páginas contendo centenas de linhas de JSX.

Inadequado:

```tsx
return (
    <div>
        {/* centenas de linhas */}
    </div>
);
```

Prefira:

```tsx
return (
    <PageLayout>
        <PageHeader />
        <PageFilters />
        <PageContent />
        <PagePagination />
    </PageLayout>
);
```

Cada bloco visual semanticamente independente deve ser candidato a componente próprio.

---

# 11. COMPONENTES DEVEM SER ORGANIZADOS POR DOMÍNIO

Evite criar uma pasta global `components` contendo centenas de arquivos sem organização.

Prefira:

```text
features/
├── customers/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── config/
│   └── index.ts
│
├── products/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── index.ts
```

Elementos realmente compartilhados podem ficar em:

```text
shared/
├── components/
├── hooks/
├── utils/
├── services/
├── types/
├── themes/
└── config/
```

Regra:

> Código específico de um domínio fica naquele domínio. Código verdadeiramente genérico pode ir para `shared`.

---

# 12. UTILIZAR BARREL EXPORTS / INDEX.TS

Evite componentes importando dezenas de caminhos independentes.

Não recomendado:

```tsx
import { A } from './components/A';
import { B } from './components/B';
import { C } from './components/C';
import { D } from './components/D';
import { E } from './components/E';
```

Prefira:

```tsx
import {
    A,
    B,
    C,
    D,
    E,
} from './components';
```

Com:

```text
components/
├── A.tsx
├── B.tsx
├── C.tsx
├── D.tsx
├── E.tsx
└── index.ts
```

Entretanto:

**não crie um único `components/index.ts` gigantesco para toda a aplicação.**

Prefira barrels por:

* domínio;
* feature;
* módulo;
* camada.

Isso reduz risco de:

* dependências circulares;
* acoplamento;
* imports obscuros;
* dificuldade de rastrear código.

---

# 13. EVITAR DEPENDÊNCIAS CIRCULARES

A arquitetura deve possuir fluxo de dependência previsível.

Por exemplo:

```text
UI
↓
Hooks
↓
Services
↓
API
```

Não permita situações como:

```text
Component A
↓
Service B
↓
Hook C
↓
Component A
```

Dependências devem seguir uma direção clara.

Camadas inferiores não devem depender desnecessariamente de camadas superiores.

---

# 14. CONFIGURAÇÕES DEVEM SER EXTERNALIZADAS

Tudo que puder variar deve ser centralizado em configuração apropriada.

Exemplos:

* limites;
* valores padrão;
* URLs;
* feature flags;
* opções;
* timeouts;
* paginação;
* estratégias;
* mapeamentos;
* comportamento declarativo;
* parâmetros;
* IDs;
* nomes internos;
* configurações de componentes.

Evite:

```tsx
if (attempts >= 5) {
```

Prefira:

```tsx
if (attempts >= authConfig.maxAttempts) {
```

Exemplo:

```text
config/
├── auth.ts
├── pagination.ts
├── environment.ts
└── features.ts
```

---

# 15. DIFERENCIAR CONFIGURAÇÃO DE IMPLEMENTAÇÃO

Quando uma funcionalidade possuir comportamento variável, deixe a **definição desse comportamento** na configuração.

Por exemplo:

```tsx
const paymentMethods = {
    pix: {
        enabled: true,
        requiresConfirmation: true,
    },
};
```

Entretanto, a implementação da regra de negócio deve continuar em:

```text
services/
hooks/
strategies/
```

Não transforme arquivos de configuração em arquivos gigantes contendo toda a implementação da aplicação.

Configuração deve preferencialmente ser declarativa.

---

# 16. NUNCA ESPALHAR TEXTOS HARDCODED

Textos visíveis para o usuário não devem ficar diretamente dentro dos componentes.

Não faça:

```tsx
<Button>Salvar</Button>
```

Prefira:

```tsx
<Button>{t.actions.save}</Button>
```

---

# 17. I18N OBRIGATÓRIO

A aplicação deve possuir estrutura preparada para internacionalização.

Exemplo:

```text
i18n/
└── locales/
    ├── pt-BR/
    │   ├── common/
    │   │   ├── actions.ts
    │   │   └── messages.ts
    │   └── pages/
    │       ├── welcome.ts
    │       └── dashboard.ts
    │
    └── en-US/
        └── ...
```

Exemplo:

```ts
export const welcome = {
    title: 'Bem-vindo',
    description: '...',
};
```

Não espalhe traduções gigantes em um único arquivo.

Separe por:

* módulo;
* feature;
* página;
* domínio.

---

# 18. TEMAS DEVEM SER CENTRALIZADOS

Nenhuma página deve criar arbitrariamente seu próprio padrão visual quando já existe um padrão na aplicação.

Sempre reutilize:

* cores;
* espaçamentos;
* sombras;
* bordas;
* radius;
* tipografia;
* dimensões;
* breakpoints;
* animações;
* transições;
* z-index;
* estados hover;
* estados active;
* estados disabled;
* estados error;
* estados success.

---

# 19. CADA COMPONENTE VISUAL IMPORTANTE DEVE POSSUIR SEU TEMA

Estrutura esperada:

```text
themes/
├── globalHeader.ts
├── globalFooterNav.ts
├── background.ts
├── cards/
│   ├── default.ts
│   └── highlighted.ts
├── buttons/
│   ├── base.ts
│   ├── submit.ts
│   ├── close.ts
│   └── destructive.ts
└── inputs/
    ├── base.ts
    ├── identificationFields.ts
    └── search.ts
```

Componentes devem consumir essas definições.

Evite repetir:

```tsx
borderRadius: 8
padding: 12
fontSize: 14
```

em vários componentes.

Centralize.

---

# 20. NÃO CRIAR UM DESIGN DIFERENTE PARA CADA PÁGINA

Todas as páginas pertencentes ao mesmo sistema devem parecer parte da mesma aplicação.

Utilize componentes compartilhados como:

```text
PageLayout
PageHeader
PageSection
Card
Button
Input
Select
Modal
Table
EmptyState
LoadingState
ErrorState
Pagination
Toolbar
```

Não recrie esses elementos individualmente para cada página.

---

# 21. DESIGN TOKENS

Utilize tokens globais para propriedades fundamentais.

Exemplo:

```ts
export const tokens = {
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
    },
    radius: {
        sm: 4,
        md: 8,
        lg: 16,
    },
};
```

Componentes específicos devem derivar desses tokens.

Isso permite alterar o visual global sem modificar dezenas de arquivos.

---

# 22. NÃO UTILIZAR MAGIC NUMBERS E MAGIC STRINGS

Evite:

```tsx
setTimeout(callback, 3500);
```

Prefira:

```tsx
setTimeout(callback, notificationConfig.duration);
```

Evite:

```tsx
if (status === 'completed') {
```

quando houver uma constante ou enum apropriado.

Prefira:

```tsx
if (status === OrderStatus.Completed) {
```

---

# 23. TIPOS DEVEM SER REUTILIZADOS

Não recrie interfaces equivalentes em arquivos diferentes.

Não:

```ts
interface User {
    id: string;
    name: string;
}
```

em cinco arquivos diferentes.

Crie:

```text
types/
└── user.ts
```

e reutilize.

Tipos específicos de uma feature podem permanecer dentro dela.

Tipos compartilhados devem ser promovidos para a camada compartilhada.

---

# 24. EVITAR `any`

Não utilize `any` como solução rápida.

Prefira:

* interfaces;
* generics;
* unions;
* discriminated unions;
* `unknown` com validação;
* tipos derivados;
* inferência adequada.

`any` só deve existir quando tecnicamente inevitável e deve possuir justificativa clara.

---

# 25. FUNÇÕES DEVEM SER PEQUENAS

Uma função deve fazer uma coisa principal.

Evite funções que:

1. validam;
2. transformam;
3. salvam;
4. enviam API;
5. atualizam cache;
6. exibem notificação;
7. redirecionam;

tudo dentro do mesmo bloco.

Prefira:

```ts
validateOrder();
prepareOrder();
saveOrder();
notifyOrderCreated();
```

ou uma função coordenadora:

```ts
createOrder();
```

que chama funções menores internamente.

---

# 26. FUNÇÕES PURAS DEVEM SER PRIORIZADAS

Sempre que uma lógica puder ser implementada como função pura, prefira esse modelo.

Funções puras são mais:

* previsíveis;
* reutilizáveis;
* testáveis;
* fáceis de depurar.

Evite misturar efeitos colaterais com transformação de dados.

---

# 27. SEPARAR REGRAS DE NEGÓCIO DA INTERFACE

A regra:

```text
"Cliente inadimplente não pode realizar determinada operação"
```

não deve existir escondida dentro de um botão React.

Ela deve pertencer à camada adequada de domínio/service.

A interface apenas utiliza o resultado.

---

# 28. CAMADA DE SERVICES

Comunicação e regras relacionadas a serviços devem ficar isoladas.

Exemplo:

```text
services/
├── customers/
│   ├── createCustomer.ts
│   ├── updateCustomer.ts
│   ├── deleteCustomer.ts
│   └── index.ts
```

Evite arquivos como:

```text
customerService.ts
```

com milhares de linhas.

Divida operações quando necessário.

---

# 29. CAMADA DE API

Centralize configuração HTTP.

Evite em cada página:

```tsx
fetch(...)
axios.get(...)
axios.post(...)
```

Prefira:

```text
api/
├── client.ts
├── interceptors/
├── endpoints/
└── errors/
```

Services utilizam a API.

Componentes utilizam services através de hooks quando adequado.

---

# 30. TRATAMENTO DE ERROS CENTRALIZADO

Não implemente tratamento completamente diferente em cada página.

Crie estruturas reutilizáveis para:

* erros HTTP;
* erros de validação;
* erros inesperados;
* erros de autenticação;
* erros de permissão;
* erros de rede.

Exemplo:

```text
errors/
├── normalizeError.ts
├── AppError.ts
├── ApiError.ts
└── errorMessages.ts
```

---

# 31. LOGS EXTENSOS E ÚTEIS

Utilize o sistema `CustomLogger` do projeto.

Deve haver logs suficientes para rastrear:

* entrada em operações importantes;
* sucesso;
* falha;
* tempo de execução;
* chamadas de API relevantes;
* exceções;
* mudanças de estado importantes;
* inicialização;
* operações críticas;
* autenticação;
* sincronização;
* processamento.

Exemplo:

```ts
CustomLogger.info('Customer creation started', {
    customerId,
});
```

Em erro:

```ts
CustomLogger.error('Customer creation failed', {
    customerId,
    error,
});
```

---

# 32. LOGS NÃO DEVEM EXPOR DADOS SENSÍVEIS

Nunca registrar diretamente:

* senha;
* token;
* cookie;
* segredo;
* chave de API;
* cartão;
* dados pessoais sensíveis;
* informações de autenticação completas.

Quando necessário, aplique mascaramento.

---

# 33. CONTEXTUALIZAR LOGS

Evite logs vagos:

```ts
console.log('erro');
```

Prefira:

```ts
CustomLogger.error('Failed to synchronize product inventory', {
    productId,
    operation: 'inventory-sync',
    error,
});
```

O desenvolvedor deve conseguir localizar o problema rapidamente apenas lendo o log.

---

# 34. NÃO USAR `console.log` COMO SISTEMA PRINCIPAL

Logs importantes devem utilizar `CustomLogger`.

`console.log` temporário utilizado durante debugging deve ser removido antes da conclusão da implementação.

---

# 35. PERFORMANCE É UMA RESPONSABILIDADE ARQUITETURAL

Durante qualquer implementação, considere:

* renders desnecessários;
* cálculos repetidos;
* chamadas duplicadas;
* requests desnecessários;
* loops custosos;
* manipulação excessiva de DOM;
* payloads grandes;
* bundle desnecessariamente pesado;
* carregamento de módulos não utilizados.

---

# 36. EVITAR RE-RENDERS DESNECESSÁRIOS

Não utilize `useMemo`, `useCallback` ou `memo` indiscriminadamente.

Utilize-os quando existir benefício real.

Primeiro organize corretamente:

* responsabilidade;
* estado;
* dependências;
* componentização.

Depois aplique otimizações específicas quando justificadas.

---

# 37. LAZY LOADING QUANDO APROPRIADO

Recursos pesados e funcionalidades raramente utilizadas devem considerar carregamento sob demanda.

Exemplo:

* modais complexos;
* editores;
* gráficos;
* páginas secundárias;
* bibliotecas pesadas.

---

# 38. SEGURANÇA DEVE SER CONSIDERADA EM TODA IMPLEMENTAÇÃO

Antes de concluir qualquer funcionalidade, avalie:

* validação de entrada;
* sanitização;
* autorização;
* autenticação;
* exposição de dados;
* manipulação de parâmetros;
* injections;
* XSS;
* CSRF quando aplicável;
* armazenamento inseguro;
* secrets no frontend;
* permissões excessivas.

Nunca confie apenas em validação frontend para regras de segurança.

---

# 39. NÃO EXPOR SEGREDOS

Nunca colocar diretamente no código:

```ts
const API_KEY = '...';
```

Utilize variáveis de ambiente ou sistemas adequados de secrets.

---

# 40. VALIDAR DADOS NAS FRONTEIRAS DO SISTEMA

Dados vindos de:

* APIs;
* usuários;
* banco;
* integrações;
* webhooks;
* arquivos;
* localStorage;

devem ser considerados não confiáveis até serem validados.

---

# 41. WEBHOOKS DEVEM SER MODULARES

Evite um único handler gigantesco.

Prefira:

```text
webhooks/
├── handlers/
│   ├── paymentCreated.ts
│   ├── paymentCancelled.ts
│   └── paymentRefunded.ts
├── validators/
├── security/
├── registry.ts
└── index.ts
```

Um roteador central deve identificar o evento e delegar para o handler correspondente.

---

# 42. FORMULÁRIOS DEVEM POSSUIR ARQUITETURA REUTILIZÁVEL

Separe:

* schema;
* estado;
* campos;
* validação;
* transformação;
* submissão;
* mensagens.

Exemplo:

```text
customerForm/
├── components/
├── hooks/
├── schema/
├── config/
├── types/
└── index.ts
```

---

# 43. EVITAR BOOLEANOS CONFUSOS

Evite APIs como:

```tsx
<Button
    small
    dark
    rounded
    important
/>
```

Prefira propriedades semânticas:

```tsx
<Button
    size="small"
    variant="primary"
/>
```

---

# 44. NOMES DEVEM EXPLICAR INTENÇÃO

Evite:

```ts
const x = ...
const data2 = ...
const temp = ...
const handle = ...
```

Prefira:

```ts
const activeCustomer = ...
const normalizedProducts = ...
const handleCustomerCreation = ...
```

O nome deve explicar **o motivo e significado**, não apenas o tipo do dado.

---

# 45. EVITAR ABREVIAÇÕES OBSCURAS

Não utilize nomes como:

```text
usr
cfg
mgr
fnc
tmp
```

quando nomes completos melhorarem a leitura.

Abreviações universalmente compreendidas como:

```text
API
URL
ID
HTTP
```

são aceitáveis.

---

# 46. BOOLEANOS DEVEM TER NOMES SEMÂNTICOS

Prefira:

```ts
isLoading
hasPermission
canEdit
shouldRefresh
```

em vez de:

```ts
loading
permission
edit
refresh
```

---

# 47. MAPEAMENTO VISUAL OBRIGATÓRIO

Cada página ou funcionalidade central deve possuir uma representação simples que permita a um humano entender:

* quais módulos existem;
* responsabilidade de cada um;
* fluxo dos dados;
* dependências;
* comunicação entre módulos.

Exemplo:

```text
CustomersPage
│
├── CustomersHeader
│
├── CustomersFilters
│   └── useCustomerFilters
│
├── CustomersTable
│   ├── CustomerRow
│   └── CustomerActions
│
└── useCustomersPage
    ├── useCustomerQuery
    ├── useCustomerFilters
    └── useCustomerPagination
             │
             ▼
      CustomerService
             │
             ▼
          API Client
```

Esse mapa deve ser atualizado quando a arquitetura mudar significativamente.

---

# 48. EXPLICAR O FLUXO DE DADOS

Quando implementar uma funcionalidade relevante, documentar de forma resumida algo como:

```text
Usuário
   ↓
CustomerForm
   ↓
useCustomerForm
   ↓
CustomerService
   ↓
API
   ↓
Backend
```

Para eventos retornando:

```text
Backend
   ↓
API
   ↓
Service
   ↓
Hook
   ↓
State
   ↓
UI
```

---

# 49. MÓDULOS CENTRAIS PODEM ORQUESTRAR, NÃO IMPLEMENTAR TUDO

É aceitável possuir:

```text
useCustomersPage.ts
```

como coordenador.

Mas ele não deve possuir toda a implementação.

Ele pode combinar:

```text
useCustomersQuery
useCustomerFilters
useCustomerPagination
useCustomerActions
```

Isso cria uma interface simples para a página sem concentrar responsabilidades.

---

# 50. MANTER UMA API INTERNA LIMPA PARA CADA MÓDULO

Um módulo deve expor somente aquilo que outros módulos precisam utilizar.

Exemplo:

```ts
export {
    CustomerTable,
    useCustomers,
    customerService,
};
```

Detalhes internos devem permanecer internos.

Não exponha dezenas de implementações que não precisam ser conhecidas externamente.

---

# 51. EVITAR ACOPLAMENTO ENTRE FEATURES

Uma feature não deve importar detalhes internos de outra.

Ruim:

```text
features/orders/components/X
→
features/customers/internal/hooks/privateHook
```

Prefira consumir a API pública do módulo:

```ts
import { useCustomer } from '@/features/customers';
```

---

# 52. UTILIZAR INVERSÃO DE DEPENDÊNCIA QUANDO NECESSÁRIO

Componentes e regras importantes não devem depender desnecessariamente de implementações concretas.

Quando fizer sentido, abstraia dependências por:

* interfaces;
* adapters;
* providers;
* strategies.

Isso facilita:

* testes;
* substituição de serviços;
* manutenção;
* integração com diferentes backends.

---

# 53. ADAPTERS PARA SERVIÇOS EXTERNOS

Integrações externas devem ser isoladas.

Exemplo:

```text
integrations/
├── stripe/
├── whatsapp/
├── firebase/
└── google/
```

O restante da aplicação não deve conhecer detalhes internos dessas APIs.

---

# 54. CENTRALIZAR NORMALIZAÇÃO E MAPEAMENTO

Se dados da API possuem estrutura diferente daquela utilizada pela UI, crie mapper.

Exemplo:

```text
mappers/
└── customerMapper.ts
```

Não transforme os mesmos dados manualmente em múltiplos componentes.

---

# 55. NÃO MUTAR DADOS DESNECESSARIAMENTE

Prefira operações imutáveis.

Evite modificar objetos recebidos por referência quando isso puder gerar efeitos colaterais imprevisíveis.

---

# 56. TESTES DEVEM ACOMPANHAR LÓGICAS IMPORTANTES

Priorizar testes para:

* regras de negócio;
* validações;
* parsers;
* transformações;
* cálculos;
* services;
* hooks importantes;
* utilitários;
* correções de bugs.

Quando um bug for corrigido e puder ser reproduzido por teste, criar um teste que impeça sua regressão.

---

# 57. TESTES TAMBÉM DEVEM SER MODULARES

Evite arquivos gigantes de testes.

Organize-os por:

* unidade;
* feature;
* serviço;
* comportamento.

---

# 58. NÃO TESTAR DETALHES INTERNOS DESNECESSÁRIOS

Prefira testar comportamento observável.

Teste:

> "Ao enviar dados inválidos, a criação é bloqueada."

em vez de depender excessivamente de detalhes internos da implementação.

---

# 59. CONSTANTES DEVEM TER LOCAL APROPRIADO

Não crie um arquivo global:

```text
constants.ts
```

com centenas de constantes desconexas.

Organize por domínio:

```text
constants/
├── auth.ts
├── orders.ts
├── payments.ts
└── validation.ts
```

---

# 60. CONFIGURAÇÃO GLOBAL NÃO DEVE VIRAR DEPÓSITO DE CÓDIGO

O mesmo princípio vale para:

```text
config.ts
utils.ts
helpers.ts
types.ts
constants.ts
```

Esses arquivos não devem virar arquivos gigantes.

Quando crescerem, devem ser subdivididos por responsabilidade.

---

# 61. EVITAR `utils.ts` GENÉRICO

Ao invés de:

```text
utils.ts
```

com 100 funções diferentes, prefira:

```text
utils/
├── date/
├── currency/
├── strings/
├── arrays/
└── validation/
```

---

# 62. ESTRUTURA DE DIRETÓRIOS DEVE REPRESENTAR A ARQUITETURA

Ao olhar apenas para a árvore de arquivos, um desenvolvedor deve conseguir aproximadamente entender a arquitetura do sistema.

A organização do projeto deve ser autoexplicativa.

---

# 63. COMENTÁRIOS DEVEM EXPLICAR "POR QUÊ"

Evite comentários óbvios:

```ts
// incrementa contador
counter++;
```

Use comentários para explicar decisões não óbvias:

```ts
// O backend utiliza indexação iniciada em 1,
// enquanto a tabela utiliza índice iniciado em 0.
const apiPage = currentPage + 1;
```

---

# 64. NÃO UTILIZAR COMENTÁRIOS PARA COMPENSAR CÓDIGO CONFUSO

Antes de escrever um comentário enorme explicando uma função, tente melhorar:

* nomes;
* separação;
* estrutura;
* abstração.

O código deve ser o mais autoexplicativo possível.

---

# 65. DOCUMENTAR DECISÕES ARQUITETURAIS IMPORTANTES

Quando uma escolha estrutural importante for feita, registrar:

* problema;
* solução;
* motivo;
* impacto;
* alternativas relevantes.

Pode ser utilizado:

```text
docs/
└── architecture/
```

---

# 66. TRATAR REFATORAÇÃO COMO PARTE DA IMPLEMENTAÇÃO

Ao implementar uma nova funcionalidade, não simplesmente encaixe código em uma arquitetura inadequada.

Se o módulo existente precisar ser reorganizado para receber corretamente a funcionalidade, faça a refatoração necessária.

Evite "remendos".

---

# 67. REGRA DO ESCOTEIRO

Sempre que modificar um módulo, procure deixá-lo um pouco melhor do que estava, desde que a melhoria esteja dentro do escopo e não introduza risco desnecessário.

Exemplos:

* remover duplicação relacionada;
* melhorar nome;
* extrair constante;
* corrigir tipo;
* simplificar função;
* melhorar log;
* remover código morto.

---

# 68. NÃO FAZER REFATORAÇÕES GIGANTES SEM NECESSIDADE

Embora melhorias sejam encorajadas, não misture uma alteração pequena com uma reescrita completa e desnecessária do sistema.

Refatore de forma incremental e segura.

---

# 69. CÓDIGO MORTO DEVE SER REMOVIDO

Não deixar:

* funções sem uso;
* imports sem uso;
* componentes antigos;
* variáveis esquecidas;
* comentários contendo implementações antigas;
* versões duplicadas.

O controle de versão existe para preservar histórico.

---

# 70. EVITAR CÓDIGO "TEMPORÁRIO" SEM CONTROLE

Se uma solução temporária for inevitável, documente claramente:

* por que existe;
* o que precisa ser corrigido;
* qual condição permite removê-la.

---

# 71. MANTER PADRÃO DE NOMENCLATURA

Defina e siga consistentemente padrões como:

```text
PascalCase    → componentes/classes
camelCase     → funções/variáveis
useSomething  → hooks
SomethingType → tipos quando necessário
SomethingConfig → configurações
SomethingService → serviços
```

Não alternar arbitrariamente estilos diferentes.

---

# 72. PADRONIZAR ESTRUTURA DAS FEATURES

Sempre que possível, features semelhantes devem possuir estrutura semelhante.

Exemplo:

```text
features/
├── customers/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── config/
│   ├── types/
│   ├── themes/
│   ├── tests/
│   └── index.ts
│
└── products/
    ├── components/
    ├── hooks/
    ├── services/
    ├── config/
    ├── types/
    ├── themes/
    ├── tests/
    └── index.ts
```

---

# 73. COMPONENTES DE PÁGINA DEVEM SER ORQUESTRADORES

Idealmente:

```tsx
export function CustomersPage() {
    const page = useCustomersPage();

    return (
        <PageLayout>
            <CustomersHeader {...page.header} />
            <CustomersFilters {...page.filters} />
            <CustomersTable {...page.table} />
        </PageLayout>
    );
}
```

A página deve ser extremamente fácil de ler.

Um desenvolvedor deve conseguir entender a composição geral dela em poucos segundos.

---

# 74. EVITAR PROP DRILLING EXCESSIVO

Se uma propriedade precisar atravessar muitos níveis apenas para chegar a um componente distante, avalie:

* composição;
* context;
* store;
* hook compartilhado;
* arquitetura do componente.

Não adote estado global automaticamente.

Primeiro utilize a solução de menor complexidade adequada.

---

# 75. ESTADO DEVE FICAR O MAIS PRÓXIMO POSSÍVEL DE ONDE É NECESSÁRIO

Não coloque tudo no estado global.

Classifique o estado como:

* estado local;
* estado da feature;
* estado do servidor;
* estado global.

Utilize a ferramenta adequada para cada caso.

---

# 76. ESTADO DERIVADO NÃO DEVE SER DUPLICADO

Evite:

```tsx
const [products, setProducts] = ...
const [productCount, setProductCount] = ...
```

quando:

```tsx
const productCount = products.length;
```

for suficiente.

Duplicação de estado gera inconsistências.

---

# 77. NÃO USAR `useEffect` PARA TUDO

Antes de utilizar `useEffect`, determine se aquilo realmente é um efeito colateral.

Não utilize efeito para calcular dados que podem ser derivados diretamente.

Evite sincronizações artificiais entre estados.

Prefira:

* valores derivados;
* handlers;
* selectors;
* queries;
* reducers;
* hooks apropriados.

---

# 78. EFEITOS DEVEM TER UMA RESPONSABILIDADE CLARA

Evite:

```tsx
useEffect(() => {
    // autenticação
    // fetch
    // cálculo
    // analytics
    // alteração de estado
    // armazenamento
}, []);
```

Divida responsabilidades ou extraia para hooks adequados.

---

# 79. COMPONENTES DEVEM SER PREVISÍVEIS

Sempre que possível:

```text
props + state → UI
```

Evite componentes com efeitos colaterais escondidos e comportamento difícil de rastrear.

---

# 80. PADRONIZAR ESTADOS DA INTERFACE

Estados comuns devem possuir componentes reutilizáveis:

```text
LoadingState
ErrorState
EmptyState
UnauthorizedState
NotFoundState
```

Não recrie versões diferentes deles em cada página.

---

# 81. ACESSIBILIDADE FAZ PARTE DO COMPONENTE

Componentes reutilizáveis devem considerar:

* semântica HTML;
* navegação por teclado;
* labels;
* foco;
* aria quando necessário;
* contraste;
* feedback visual.

Não criar acessibilidade separadamente em cada página.

---

# 82. RESPONSIVIDADE DEVE VIR DO SISTEMA DE DESIGN

Breakpoints e regras responsivas devem ser centralizados.

Evite valores diferentes arbitrariamente para cada tela.

---

# 83. NÃO REPETIR MEDIA QUERIES DESNECESSARIAMENTE

Centralize:

* breakpoints;
* tamanhos;
* helpers;
* padrões responsivos.

---

# 84. ERROS DE DOMÍNIO DEVEM SER SEMÂNTICOS

Em vez de:

```ts
throw new Error('error');
```

utilize algo como:

```ts
throw new CustomerNotFoundError(customerId);
```

quando a complexidade da aplicação justificar.

Isso melhora:

* logs;
* tratamento;
* debugging;
* observabilidade.

---

# 85. FUNÇÕES DEVEM RETORNAR ESTRUTURAS PREVISÍVEIS

Evite uma função retornar tipos completamente diferentes dependendo do cenário.

Utilize estruturas claras.

Exemplo:

```ts
type Result<T> =
    | { success: true; data: T }
    | { success: false; error: AppError };
```

quando esse padrão for adequado.

---

# 86. CAMADAS NÃO DEVEM VAZAR DETALHES INTERNOS

Um componente não deveria precisar saber:

* URL de endpoint;
* estrutura interna do banco;
* header HTTP específico;
* token;
* detalhe do provider externo.

Essas responsabilidades pertencem a outras camadas.

---

# 87. NÃO OTIMIZAR APENAS PARA O CÓDIGO ATUAL

Ao definir uma abstração, considere alterações plausíveis no futuro.

Porém:

> não implementar funcionalidades futuras que ainda não foram solicitadas.

A arquitetura deve permitir expansão sem adicionar complexidade especulativa.

---

# 88. EVITAR OVERENGINEERING

Modularização não significa complexidade gratuita.

A melhor estrutura é aquela que:

* separa responsabilidades;
* reduz duplicação;
* facilita entendimento;
* permite evolução;
* continua simples.

Se uma abstração tornar o código mais difícil de entender sem trazer benefício concreto, não utilize.

---

# 89. IMPORTS DEVEM SER ORGANIZADOS

Quando o projeto permitir, seguir uma ordem consistente:

```text
1. bibliotecas externas
2. módulos compartilhados
3. módulos da feature
4. imports relativos
5. estilos/tipos
```

Utilizar aliases como:

```ts
@/components
@/features
@/shared
```

quando configurados no projeto.

---

# 90. EVITAR CAMINHOS RELATIVOS PROFUNDOS

Evite:

```ts
../../../../components/Button
```

Prefira:

```ts
@/shared/components/Button
```

quando a arquitetura permitir.

---

# 91. INDEX.TS DEVE REPRESENTAR A API PÚBLICA DO MÓDULO

Exemplo:

```ts
export { CustomersPage } from './CustomersPage';
export { useCustomers } from './hooks';
export type { Customer } from './types';
```

Não exporte automaticamente todos os arquivos internos.

---

# 92. NOVA FUNCIONALIDADE DEVE PRIMEIRO SER MAPEADA

Antes de implementar uma feature relevante, identificar:

```text
1. responsabilidade da feature;
2. componentes necessários;
3. hooks necessários;
4. services necessários;
5. tipos necessários;
6. configurações;
7. textos/i18n;
8. temas;
9. integrações;
10. testes.
```

Depois implementar seguindo esse mapa.

---

# 93. ANTES DE CRIAR UM NOVO COMPONENTE, PROCURAR REUTILIZAÇÃO

Faça conceitualmente esta sequência:

```text
Existe componente igual?
        ↓
SIM → reutilizar

NÃO
        ↓
Existe componente semelhante que pode ser generalizado?
        ↓
SIM → generalizar

NÃO
        ↓
Criar novo componente
```

---

# 94. ANTES DE CRIAR UMA NOVA FUNÇÃO, PROCURAR REUTILIZAÇÃO

Mesmo procedimento:

```text
Existe função equivalente?
        ↓
Reutilizar

Existe função quase equivalente?
        ↓
Avaliar generalização

Não existe?
        ↓
Criar nova função
```

---

# 95. ANTES DE CRIAR NOVO ESTILO, VERIFICAR O DESIGN SYSTEM

Fluxo obrigatório:

```text
Existe token?
↓
Existe tema?
↓
Existe variante?
↓
Pode ampliar componente existente?
↓
Somente então criar nova definição.
```

---

# 96. EVITAR ALTERAÇÕES LOCAIS QUE QUEBREM PADRÕES GLOBAIS

Se uma página precisar de um comportamento que provavelmente será útil em outras, prefira melhorar o componente compartilhado.

Não crie exceções locais constantemente.

---

# 97. PRESERVAR COMPATIBILIDADE

Durante refatorações:

* preservar comportamento esperado;
* preservar contratos públicos quando possível;
* evitar regressões;
* atualizar consumidores quando contrato mudar;
* atualizar testes.

---

# 98. NÃO QUEBRAR FUNCIONALIDADES NÃO RELACIONADAS

Antes de alterar módulos compartilhados, identificar quais features dependem deles.

Mudanças em elementos compartilhados exigem cuidado maior.

---

# 99. VALIDAÇÃO APÓS ALTERAÇÕES

Depois de implementar ou refatorar, verificar sempre que disponível:

```text
lint
typecheck
tests
build
```

Não considerar a tarefa concluída enquanto erros introduzidos pela alteração permanecerem.

---

# 100. NÃO IGNORAR ERROS PARA "FAZER FUNCIONAR"

Não solucionar problemas utilizando:

```ts
// @ts-ignore
```

`any`, casts inseguros ou desativação de lint apenas para esconder o erro.

Primeiro identificar a causa real.

---

# 101. NÃO SILENCIAR EXCEÇÕES

Evite:

```ts
try {
    ...
} catch {
}
```

Erros relevantes devem ser:

* tratados;
* convertidos;
* registrados;
* propagados quando necessário.

---

# 102. CONCORRÊNCIA E REQUESTS DEVEM SER CONTROLADOS

Quando aplicável, considerar:

* requests duplicados;
* race conditions;
* abort controllers;
* debounce;
* throttle;
* retries controlados;
* idempotência.

---

# 103. NÃO DUPLICAR DADOS DE API DESNECESSARIAMENTE

Quando existir biblioteca apropriada de gerenciamento de server state, utilize cache e invalidação corretamente.

Evite copiar dados da query para vários `useState` sem necessidade.

---

# 104. CENTRALIZAR QUERY KEYS

Caso a aplicação utilize query/cache:

```text
queries/
├── customerKeys.ts
├── productKeys.ts
└── orderKeys.ts
```

Evite strings de cache espalhadas pelo sistema.

---

# 105. MODAIS DEVEM SER REUTILIZÁVEIS

Não recrie estrutura de modal para cada funcionalidade.

Crie estrutura base:

```tsx
<Modal>
    <Modal.Header />
    <Modal.Content />
    <Modal.Footer />
</Modal>
```

E componha conteúdos específicos.

---

# 106. TABELAS DEVEM SER REUTILIZÁVEIS

Elementos como:

* paginação;
* loading;
* empty state;
* header;
* ordenação;
* seleção;
* ações;

devem ser compartilhados quando possível.

---

# 107. FILTROS DEVEM SER CONFIGURÁVEIS

Quando várias páginas possuem filtros semelhantes, considere estruturas declarativas.

Exemplo:

```ts
const filters = [
    {
        key: 'status',
        type: 'select',
        options: statusOptions,
    },
];
```

E um componente genérico:

```tsx
<FilterBar filters={filters} />
```

---

# 108. FORMULÁRIOS PODEM SER DECLARATIVOS QUANDO ISSO REDUZ DUPLICAÇÃO

Campos repetitivos podem utilizar configuração:

```ts
const fields = [
    {
        name: 'email',
        type: 'email',
        labelKey: 'customer.fields.email',
    },
];
```

Não force abordagem declarativa quando a interface exigir lógica altamente específica.

---

# 109. EVITAR COMPONENTES DUPLICADOS PARA DESKTOP E MOBILE

Sempre que possível, utilize:

* responsividade;
* composição;
* pequenas variantes;

em vez de manter duas implementações completas com a mesma lógica.

---

# 110. OBSERVABILIDADE

Funcionalidades críticas devem permitir entender:

```text
o que aconteceu;
quando aconteceu;
onde aconteceu;
qual operação estava sendo executada;
qual entidade estava envolvida;
qual foi o resultado.
```

Utilize `CustomLogger` estrategicamente para isso.

---

# 111. IDs DE CORRELAÇÃO QUANDO APLICÁVEL

Operações complexas podem utilizar identificadores para correlacionar logs entre:

```text
UI
API
service
backend
webhook
```

facilitando debugging.

---

# 112. NÃO FAZER LOG EXCESSIVO DE RENDER

Logs não devem prejudicar performance.

Evite registrar eventos irrelevantes a cada renderização.

Logar operações semanticamente importantes.

---

# 113. DOCUMENTAÇÃO DE COMPONENTES REUTILIZÁVEIS

Componentes globais importantes devem possuir documentação suficiente para explicar:

* objetivo;
* props;
* variantes;
* exemplos;
* restrições.

---

# 114. PADRONIZAR PROPS

Componentes semelhantes devem utilizar nomes semelhantes.

Exemplo:

```text
isDisabled
isLoading
onClick
variant
size
```

Evite `disabled` em um componente, `blocked` em outro e `inactive` em outro para representar exatamente o mesmo conceito.

---

# 115. EVITAR APIs INTERNAS CONFUSAS

Prefira:

```tsx
<Button variant="danger" />
```

a:

```tsx
<Button red strong special />
```

A API de componentes deve ser previsível.

---

# 116. NÃO CRIAR COMPONENTES "GOD COMPONENT"

Se um componente sabe sobre:

* autenticação;
* filtros;
* API;
* modal;
* tabela;
* notificações;
* permissões;
* validação;
* navegação;

ele provavelmente precisa ser quebrado.

---

# 117. NÃO CRIAR SERVICES "GOD SERVICE"

O mesmo vale para services.

Um arquivo:

```text
appService.ts
```

com todas as regras da aplicação é proibido.

---

# 118. NÃO CRIAR HOOKS "GOD HOOK"

Um hook central pode orquestrar outros hooks.

Ele não deve acumular toda a implementação.

---

# 119. NÃO CRIAR CONFIGURAÇÕES "GOD CONFIG"

Não concentrar toda configuração da aplicação em:

```text
config.ts
```

Dividir por domínio e responsabilidade.

---

# 120. NÃO CRIAR TEMA GLOBAL GIGANTESCO

Um tema pode possuir tokens globais, mas componentes específicos devem possuir seus próprios módulos de tema.

Exemplo:

```text
themes/
├── tokens/
├── components/
├── layouts/
└── pages/
```

---

# 121. REUTILIZAÇÃO DEVE FUNCIONAR ENTRE FEATURES

Quando dois módulos utilizarem o mesmo componente genuinamente genérico, movê-lo para a camada compartilhada adequada.

Não copie.

---

# 122. EVITAR GENERALIZAÇÃO PREMATURA

Não mova imediatamente um componente específico para `shared` apenas porque *talvez* seja reutilizado algum dia.

Promova quando houver utilidade clara ou quando ele for naturalmente genérico.

---

# 123. REGRAS DE DOMÍNIO DEVEM POSSUIR FONTE ÚNICA DA VERDADE

Uma regra como:

```text
taxa máxima = 10%
```

não pode estar definida de formas diferentes em três locais.

Deve existir uma única fonte de verdade.

---

# 124. SINGLE SOURCE OF TRUTH

Aplicar o conceito de fonte única da verdade para:

* regras;
* configurações;
* textos;
* temas;
* dados compartilhados;
* enums;
* permissões;
* rotas;
* endpoints;
* schemas.

---

# 125. PERMISSÕES DEVEM SER CENTRALIZADAS

Evite:

```tsx
if (user.role === 'admin')
```

espalhado por dezenas de páginas.

Prefira abstrações como:

```ts
permissions.canEditCustomer(user);
```

ou:

```tsx
<Can permission="customer.edit">
```

quando adequado.

---

# 126. ROTAS DEVEM POSSUIR CONFIGURAÇÃO CENTRAL

Evite strings como:

```ts
navigate('/customers/new');
```

espalhadas.

Prefira:

```ts
routes.customers.create();
```

---

# 127. ENDPOINTS DEVEM POSSUIR CONFIGURAÇÃO CENTRAL

Evite:

```ts
'/api/customers'
```

repetido.

Utilize:

```ts
endpoints.customers.list
```

---

# 128. FORMATADORES DEVEM SER CENTRALIZADOS

Exemplo:

```text
formatters/
├── currency.ts
├── date.ts
├── phone.ts
└── document.ts
```

Não reimplementar:

```ts
Intl.NumberFormat(...)
```

em várias páginas sem necessidade.

---

# 129. VALIDADORES DEVEM SER REUTILIZADOS

Exemplo:

```text
validators/
├── email.ts
├── phone.ts
├── cpf.ts
└── required.ts
```

Quando houver schemas, estes também devem ser organizados por domínio.

---

# 130. NÃO MISTURAR VALIDAÇÃO VISUAL E REGRA DE NEGÓCIO

Validação de formulário pode informar o usuário.

Validação de negócio deve existir na camada apropriada e não depender exclusivamente da interface.

---

# 131. ERROS DEVEM TER MENSAGENS TRADUZÍVEIS

Evite retornar diretamente textos fixos da regra de negócio para a UI.

Quando possível, utilize códigos de erro que podem ser convertidos pelo i18n.

---

# 132. ARQUITETURA DEVE FACILITAR TROCA DE IMPLEMENTAÇÃO

Exemplo:

Se hoje a aplicação utiliza serviço A para pagamentos e amanhã precisar do serviço B, a troca idealmente deve ocorrer dentro da camada de integração, sem modificar dezenas de componentes.

---

# 133. NÃO ACESSAR STORAGE DIRETAMENTE EM TODA A APLICAÇÃO

Centralize acesso a:

* localStorage;
* sessionStorage;
* cookies;
* IndexedDB.

Exemplo:

```text
storage/
├── authStorage.ts
├── preferencesStorage.ts
└── index.ts
```

---

# 134. NÃO ACESSAR VARIÁVEIS DE AMBIENTE EM TODO O PROJETO

Centralize leitura e validação.

Exemplo:

```text
config/
└── env.ts
```

Os outros módulos consomem `env`.

---

# 135. VARIÁVEIS DE AMBIENTE DEVEM SER VALIDADAS

Falhar de forma clara caso uma variável obrigatória esteja ausente.

Não esperar um erro obscuro aparecer posteriormente.

---

# 136. CAMADA VISUAL NÃO DEVE CONHECER DETALHES DO BACKEND

A UI deve trabalhar com modelos adequados ao domínio da aplicação.

Utilize adapters/mappers quando necessário.

---

# 137. NOMES DE ARQUIVOS DEVEM SER PREVISÍVEIS

Evite nomes como:

```text
stuff.ts
misc.ts
new.ts
functions2.ts
helpers-final.ts
test-new.ts
```

O nome deve indicar claramente a responsabilidade.

---

# 138. ARQUITETURA DEVE SER CONSISTENTE

Se uma feature segue:

```text
components/
hooks/
services/
types/
```

não crie outra feature arbitrariamente com estrutura completamente diferente sem motivo técnico.

---

# 139. EVITAR PASTAS DESNECESSARIAMENTE PROFUNDAS

Modularização não significa criar vinte níveis de pasta.

Prefira agrupamentos semanticamente claros.

Exemplo bom:

```text
features/customers/components/form/
```

Evite hierarquias artificiais sem ganho real.

---

# 140. FACILITAR NAVEGAÇÃO HUMANA

Um desenvolvedor novo deve conseguir responder rapidamente:

```text
Onde está a página?
Onde está a lógica?
Onde está a API?
Onde está o tema?
Onde estão os textos?
Onde estão os tipos?
Onde estão os testes?
```

Se essas respostas forem difíceis, a arquitetura precisa ser melhorada.

---

# 141. APLICAÇÃO DEVE POSSUIR PADRÕES CLAROS

Quando uma nova implementação for necessária, primeiro procurar um padrão já existente no projeto.

Novo código deve seguir o padrão arquitetural existente quando este estiver correto.

Não introduzir uma nova maneira de resolver o mesmo problema sem necessidade.

---

# 142. REFATORAR PADRÕES RUINS EXISTENTES QUANDO NECESSÁRIO

"Código antigo já faz assim" não é justificativa automática para repetir uma arquitetura ruim.

Se um padrão existente estiver claramente inadequado, melhorar gradualmente.

---

# 143. ALTERAÇÕES DEVEM TER ESCOPO CLARO

Ao modificar uma funcionalidade, identificar:

```text
arquivos adicionados;
arquivos modificados;
arquivos removidos;
dependências afetadas;
comportamentos afetados.
```

---

# 144. AO CONCLUIR UMA IMPLEMENTAÇÃO, RESUMIR A ARQUITETURA

Sempre que houver alteração relevante, fornecer um resumo objetivo.

Exemplo:

```text
CustomersPage
├── UI
│   ├── CustomersHeader
│   ├── CustomersFilters
│   └── CustomersTable
│
├── Logic
│   └── useCustomersPage
│
├── Data
│   └── customerService
│
└── Infrastructure
    └── apiClient
```

---

# 145. MOSTRAR COMO OS ARQUIVOS SE INTERLIGAM

Não limitar a documentação à lista de arquivos.

Mostrar dependências:

```text
CustomersPage
      │
      ▼
useCustomersPage
      │
      ├──────────┐
      ▼          ▼
useFilters   useCustomersQuery
                 │
                 ▼
          customerService
                 │
                 ▼
             apiClient
```

---

# 146. PRESERVAR A VISÃO DE ALTO NÍVEL

Mesmo quando uma funcionalidade possuir muitos arquivos internos, deve existir uma interface central simples.

Exemplo:

```tsx
const checkout = useCheckout();
```

Pode esconder dezenas de detalhes internos.

Isso é desejável quando mantém o código externo simples sem criar uma abstração monolítica internamente.

---

# 147. SEPARAR ORQUESTRAÇÃO DE EXECUÇÃO

Um módulo central pode dizer **o que deve acontecer**.

Módulos especializados executam **como deve acontecer**.

Exemplo:

```text
useCheckout
│
├── valida → checkoutValidation
├── paga → paymentService
├── salva → orderService
└── notifica → notificationService
```

---

# 148. EVITAR DEPENDÊNCIAS OCULTAS

Uma função não deve depender misteriosamente de estados globais se eles puderem ser explicitamente fornecidos.

Dependências claras tornam código mais:

* testável;
* previsível;
* reutilizável.

---

# 149. PRIORIZAR COMPOSIÇÃO

Prefira montar comportamentos através de componentes, hooks e funções menores.

Evite heranças complexas ou estruturas rígidas quando composição resolver melhor.

---

# 150. PRINCÍPIO DRY, MAS COM BOM SENSO

DRY significa evitar duplicação de conhecimento e comportamento.

Não significa obrigatoriamente eliminar toda linha visualmente semelhante.

Duas linhas iguais mas semanticamente independentes não necessariamente precisam ser abstraídas.

Entretanto, **regras compartilhadas nunca devem possuir múltiplas fontes de verdade**.

---

# 151. PRINCÍPIO KISS

Escolha a solução arquitetural mais simples que atenda corretamente:

* o problema atual;
* manutenção;
* reutilização necessária;
* crescimento esperado.

Complexidade deve ser justificada.

---

# 152. PRINCÍPIO YAGNI

Não implementar funcionalidades especulativas.

Prepare a arquitetura para extensão, mas não escreva dezenas de módulos para recursos que ainda não existem.

---

# 153. PRINCÍPIO SOLID

Aplicar os princípios SOLID quando forem úteis:

* Single Responsibility;
* Open/Closed;
* Liskov Substitution;
* Interface Segregation;
* Dependency Inversion.

Não utilizar SOLID como desculpa para criar complexidade artificial.

---

# 154. CHECKLIST OBRIGATÓRIO ANTES DE FINALIZAR

Antes de considerar qualquer tarefa de programação concluída, verificar:

* [ ] Existe código duplicado?
* [ ] Alguma lógica foi reimplementada?
* [ ] Algum arquivo ficou grande demais?
* [ ] Algum componente possui responsabilidades demais?
* [ ] Algum hook possui responsabilidades demais?
* [ ] Algum service possui responsabilidades demais?
* [ ] Existe JSX que deveria virar componente?
* [ ] Existem strings hardcoded?
* [ ] Existem magic numbers?
* [ ] O i18n está sendo utilizado corretamente?
* [ ] Os temas estão centralizados?
* [ ] Existe CSS repetido?
* [ ] Existe componente reutilizável que poderia ter sido usado?
* [ ] Os tipos estão adequadamente compartilhados?
* [ ] Existe `any` desnecessário?
* [ ] Existem imports confusos?
* [ ] Existem dependências circulares?
* [ ] Existe código morto?
* [ ] Existem logs suficientes?
* [ ] Logs podem expor dados sensíveis?
* [ ] Erros estão sendo corretamente tratados?
* [ ] Entradas externas estão sendo validadas?
* [ ] A implementação introduz risco de segurança?
* [ ] A implementação introduz problema de performance?
* [ ] Existem testes para regras importantes?
* [ ] Alguma correção de bug precisa de teste de regressão?
* [ ] A estrutura é fácil para outro desenvolvedor entender?
* [ ] A documentação/mapeamento estrutural precisa ser atualizada?
* [ ] Lint continua funcionando?
* [ ] Typecheck continua funcionando?
* [ ] Testes continuam funcionando?
* [ ] Build continua funcionando?

---

# 155. ORDEM DE PRIORIDADE DURANTE IMPLEMENTAÇÕES

Quando houver várias soluções possíveis, utilize esta ordem de decisão:

```text
1. Correção
        ↓
2. Segurança
        ↓
3. Clareza arquitetural
        ↓
4. Reutilização
        ↓
5. Manutenibilidade
        ↓
6. Testabilidade
        ↓
7. Performance
        ↓
8. Quantidade de código
```

Não escolha uma solução pior arquiteturalmente apenas porque possui menos linhas.

---

# 156. REGRA FINAL

A pergunta principal durante qualquer implementação deve ser:

> "Se outro desenvolvedor abrir este projeto daqui a um ano, ele conseguirá entender rapidamente onde cada responsabilidade está e alterar uma funcionalidade sem precisar procurar a mesma lógica espalhada por dezenas de arquivos?"

Se a resposta for **não**, repensar a implementação.

A aplicação deve sempre buscar:

```text
Código pequeno
        +
Módulos especializados
        +
Componentes reutilizáveis
        +
Fonte única da verdade
        +
Configuração centralizada
        +
Temas reutilizáveis
        +
i18n
        +
Logs completos
        +
Segurança
        +
Testes
        +
Documentação visual
        =
Arquitetura sustentável
```

# 157. ESCOPO OBRIGATÓRIO DAS DIRETRIZES: TODA A STACK

Todas as regras deste documento devem ser aplicadas à aplicação como um sistema completo.

Elas não são exclusivas do frontend.

Devem ser consideradas obrigatoriamente em:

```text
Frontend
Backend
API
Banco de dados
Workers
Jobs
Cron jobs
Filas
Webhooks
Cache
Integrações externas
Autenticação
Autorização
Storage
Infraestrutura
Observabilidade
Testes
Deploy
CI/CD
Ferramentas internas
Scripts
Migrações
Processamento assíncrono
```

Ao receber qualquer tarefa, a IA deve analisar quais camadas serão impactadas.

Uma alteração aparentemente simples no frontend pode exigir revisão de:

```text
UI
↓
Hook
↓
API
↓
Backend
↓
Service
↓
Repository
↓
Banco de dados
```

A implementação não deve ser considerada correta se apenas uma camada tiver sido adaptada enquanto as demais permanecem arquiteturalmente inadequadas.

---

# 158. TODA FEATURE DEVE SER ANALISADA DE PONTA A PONTA

Antes de implementar uma funcionalidade relevante, mapear:

```text
Usuário
   ↓
Interface
   ↓
Estado
   ↓
Validação local
   ↓
API Client
   ↓
Endpoint
   ↓
Validação de entrada
   ↓
Autorização
   ↓
Regra de negócio
   ↓
Service
   ↓
Repository
   ↓
Banco de dados
   ↓
Resposta
   ↓
UI
```

Quando existirem sistemas assíncronos:

```text
Request
   ↓
Backend
   ↓
Queue
   ↓
Worker
   ↓
Service
   ↓
Database
   ↓
Evento
   ↓
Frontend
```

A arquitetura deve ser compreensível em ambos os sentidos.

---

# 159. SEGURANÇA É UM REQUISITO FUNCIONAL

Segurança nunca deve ser tratada como uma etapa opcional realizada depois da implementação.

Ela faz parte da definição da funcionalidade.

Toda implementação deve responder:

```text
Quem pode executar?
Que dados podem ser enviados?
Que dados podem ser recebidos?
Que dados podem ser alterados?
Como a identidade é comprovada?
Como a autorização é verificada?
Como abuso pode ocorrer?
Como dados podem vazar?
Como a operação pode ser rastreada?
Como a aplicação reage a entradas maliciosas?
```

---

# 160. SEGURANÇA DEVE SER APLICADA EM PROFUNDIDADE

Nunca depender de apenas uma barreira de proteção.

Utilizar defesa em profundidade.

Exemplo:

```text
Cliente
↓
Validação da interface
↓
Validação da API
↓
Autenticação
↓
Autorização
↓
Sanitização
↓
Regra de negócio
↓
Permissões do banco
↓
Constraints do banco
```

Uma camada deve reduzir o impacto caso outra falhe.

---

# 161. FRONTEND NUNCA É FRONTEIRA DE SEGURANÇA

Nenhuma decisão crítica pode depender exclusivamente do frontend.

Exemplos proibidos:

```tsx
if (user.isAdmin) {
    showDeleteButton();
}
```

como único mecanismo de autorização.

Ocultar um botão não impede uma chamada direta ao endpoint.

Toda operação sensível deve ser validada novamente no backend.

---

# 162. AUTORIZAÇÃO DEVE SER SERVER-SIDE

Toda operação protegida deve validar autorização no servidor.

Isso inclui:

```text
leitura;
criação;
edição;
exclusão;
download;
exportação;
upload;
ações administrativas;
alteração de permissões;
operações financeiras;
acesso a dados de terceiros.
```

Nunca assumir que o usuário possui autorização apenas porque conseguiu chegar até determinada tela.

---

# 163. PRINCÍPIO DO MENOR PRIVILÉGIO

Cada usuário, serviço, worker, token ou conexão deve possuir apenas as permissões necessárias para sua responsabilidade.

Aplicar isso a:

```text
usuários;
roles;
tokens;
API keys;
banco de dados;
workers;
serviços internos;
CI/CD;
storage;
cloud;
integrações externas.
```

Não utilizar permissões administrativas como padrão.

---

# 164. NEGAR POR PADRÃO

Na ausência de uma permissão explicitamente concedida:

```text
DENY
```

deve ser o comportamento padrão.

Evite modelos onde tudo é permitido e exceções são removidas posteriormente.

---

# 165. CENTRALIZAR POLÍTICAS DE AUTORIZAÇÃO

Não espalhar verificações como:

```ts
user.role === 'admin'
```

por dezenas de arquivos.

Criar uma camada apropriada:

```text
authorization/
├── policies/
├── permissions/
├── roles/
├── guards/
└── index.ts
```

Exemplo conceitual:

```ts
authorization.canDeleteCustomer(user, customer);
```

---

# 166. AUTORIZAÇÃO DEVE CONSIDERAR O RECURSO

Não verificar apenas:

```text
"usuário pode editar clientes"
```

quando a regra real for:

```text
"usuário pode editar ESTE cliente"
```

Considere:

```text
tenant;
organização;
proprietário;
unidade;
empresa;
região;
hierarquia;
status;
relacionamento com o recurso.
```

---

# 167. PROTEÇÃO CONTRA IDOR

Nunca confiar em IDs enviados pelo cliente.

Exemplo:

```text
GET /customers/123
```

não significa que o usuário possui autorização para visualizar o cliente `123`.

Sempre validar acesso ao recurso específico.

---

# 168. MULTITENANCY DEVE SER ISOLADO

Caso a aplicação seja multiempresa/multitenant, todo acesso deve respeitar o tenant atual.

Não depender exclusivamente de filtros no frontend.

Idealmente, o isolamento deve existir em múltiplas camadas:

```text
Request
↓
Tenant Context
↓
Authorization
↓
Repository
↓
Database
```

Queries sem contexto de tenant devem ser tratadas como suspeitas.

---

# 169. SANITIZAÇÃO CENTRALIZADA

Criar mecanismos reutilizáveis de sanitização.

Exemplo:

```text
security/
└── sanitization/
    ├── sanitizeText.ts
    ├── sanitizeHtml.ts
    ├── sanitizeFilename.ts
    ├── normalizeInput.ts
    └── index.ts
```

Não criar implementações distintas de sanitização em cada página.

---

# 170. VALIDAR E SANITIZAR NÃO SÃO A MESMA COISA

A IA deve distinguir:

```text
VALIDAÇÃO
"Esse dado possui formato permitido?"

SANITIZAÇÃO
"Esse dado contém conteúdo que precisa ser neutralizado ou normalizado?"
```

Ambos podem ser necessários.

---

# 171. TODA ENTRADA EXTERNA É NÃO CONFIÁVEL

Tratar como potencialmente malicioso tudo que vier de:

```text
usuário;
query string;
URL;
headers;
cookies;
APIs externas;
webhooks;
arquivos;
CSV;
JSON;
XML;
banco legado;
localStorage;
cache;
fila;
mensageria;
integrações.
```

---

# 172. UTILIZAR VALIDAÇÃO DE SCHEMA

Endpoints devem possuir schemas explícitos.

Exemplo conceitual:

```text
request
├── params
├── query
├── body
└── headers
```

Cada parte relevante deve possuir validação.

Nunca simplesmente confiar em:

```ts
req.body
```

---

# 173. REJEITAR CAMPOS NÃO ESPERADOS QUANDO APROPRIADO

Mass assignment deve ser evitado.

Exemplo perigoso:

```ts
repository.update(userId, req.body);
```

O cliente poderia enviar:

```json
{
  "name": "Usuário",
  "role": "admin"
}
```

mesmo que `role` não estivesse na interface.

Utilizar DTOs e allowlists explícitas.

---

# 174. DTOs DEVEM SER EXPLÍCITOS

Separar:

```text
CreateCustomerDTO
UpdateCustomerDTO
CustomerResponseDTO
```

dos modelos internos do banco.

A API não deve expor automaticamente todas as colunas de uma entidade.

---

# 175. NUNCA RETORNAR ENTIDADES DO BANCO DIRETAMENTE SEM ANÁLISE

Antes de responder uma API, selecionar explicitamente os campos que podem ser enviados.

Evitar vazamento acidental de:

```text
passwordHash;
tokens;
internalId;
secret;
metadata interna;
flags administrativas;
dados sensíveis;
campos de auditoria privados.
```

---

# 176. RESPOSTAS DEVEM SER MINIMALISTAS

Retornar apenas o necessário.

Menos dados significa:

```text
menos tráfego;
menos memória;
menos serialização;
menor risco de vazamento;
mais performance.
```

---

# 177. SENHAS NUNCA DEVEM SER ARMAZENADAS EM TEXTO PURO

Utilizar algoritmo moderno e adequado para hashing de senha.

Nunca:

```text
MD5
SHA1
SHA256 puro
criptografia reversível
```

como mecanismo isolado de armazenamento de senha.

Utilizar mecanismo específico de password hashing suportado e recomendado pela stack.

---

# 178. TOKENS DEVEM POSSUIR CICLO DE VIDA CONTROLADO

Definir:

```text
expiração;
revogação;
rotação;
escopo;
armazenamento;
invalidação;
renovação.
```

Tokens permanentes devem ser evitados.

---

# 179. NÃO ARMAZENAR SEGREDOS EM REPOSITÓRIO

Proibido armazenar:

```text
password;
private key;
API key;
database password;
JWT secret;
webhook secret;
cloud credentials;
```

dentro do código versionado.

---

# 180. CENTRALIZAR SECRETS

Utilizar:

```text
environment variables;
secret managers;
vaults;
infraestrutura apropriada.
```

A camada de configuração deve validar a presença dos secrets necessários.

---

# 181. NÃO LOGAR SEGREDOS

Antes de registrar qualquer objeto, analisar se contém:

```text
password;
authorization header;
cookie;
token;
API key;
secret;
credit card;
session.
```

Criar mecanismo global de redaction.

Exemplo:

```text
logger/
└── security/
    ├── redactSensitiveData.ts
    └── sensitiveFields.ts
```

---

# 182. SECURITY LOGGER

Eventos relevantes de segurança devem possuir logs específicos.

Exemplos:

```text
login falhou;
tentativa bloqueada;
acesso negado;
token inválido;
mudança de permissão;
ação administrativa;
rate limit atingido;
webhook rejeitado;
assinatura inválida.
```

Não registrar dados sensíveis nesses eventos.

---

# 183. AUDITORIA PARA AÇÕES CRÍTICAS

Operações críticas devem possuir trilha de auditoria quando aplicável.

Registrar:

```text
quem;
quando;
qual ação;
qual recurso;
resultado;
origem;
correlationId.
```

---

# 184. NÃO CONFUNDIR LOG COM AUDIT LOG

Logs operacionais podem ser descartados ou rotacionados.

Audit logs podem possuir requisitos diferentes.

Separar responsabilidades quando necessário.

---

# 185. RATE LIMITING

Endpoints suscetíveis a abuso devem considerar rate limiting.

Prioridade especial para:

```text
login;
reset de senha;
cadastro;
pesquisa custosa;
uploads;
envio de códigos;
envio de mensagens;
webhooks públicos;
geração de relatórios;
endpoints de IA.
```

---

# 186. RATE LIMITING DEVE SER CONTEXTUAL

Quando necessário, considerar limites por:

```text
IP;
usuário;
tenant;
token;
endpoint;
operação.
```

Não aplicar necessariamente o mesmo limite para toda a aplicação.

---

# 187. PROTEÇÃO CONTRA BRUTE FORCE

Sistemas de autenticação devem possuir medidas para reduzir tentativas automatizadas.

Exemplos:

```text
rate limit;
backoff;
lock temporário;
monitoramento;
desafios adicionais quando apropriado.
```

---

# 188. CORS DEVE SER RESTRITIVO

Não utilizar:

```text
Access-Control-Allow-Origin: *
```

em APIs autenticadas sem necessidade explícita e segura.

Centralizar configuração de origens permitidas.

---

# 189. HEADERS DE SEGURANÇA

Configurar headers adequados ao ambiente web.

A configuração deve ser centralizada.

Não repetir manualmente em cada endpoint.

---

# 190. PROTEÇÃO CONTRA XSS

Nunca inserir conteúdo não confiável diretamente como HTML.

Caso HTML dinâmico seja inevitável:

```text
sanitizar;
restringir;
validar;
testar.
```

---

# 191. PROTEÇÃO CONTRA SQL INJECTION

Nunca montar queries SQL concatenando entrada externa.

Proibido:

```ts
`SELECT * FROM users WHERE id = ${userInput}`
```

Utilizar:

```text
prepared statements;
query builders seguros;
ORM corretamente configurado;
parâmetros bindados.
```

---

# 192. SQL RAW DEVE SER EXCEÇÃO CONTROLADA

Queries SQL manuais podem existir quando justificadas por:

```text
performance;
funcionalidade específica;
limitação do ORM.
```

Mas devem possuir:

```text
parametrização;
review;
teste;
documentação.
```

---

# 193. PROTEÇÃO CONTRA COMMAND INJECTION

Nunca concatenar entrada externa em comandos de shell.

Sempre que possível, evitar executar shell.

Quando inevitável:

```text
allowlist;
argumentos separados;
sanitização;
validação forte.
```

---

# 194. UPLOADS DEVEM SER TRATADOS COMO NÃO CONFIÁVEIS

Validar:

```text
tamanho;
MIME type;
extensão;
conteúdo;
nome;
quantidade;
destino.
```

Não confiar apenas na extensão informada pelo cliente.

---

# 195. NOMES DE ARQUIVOS DEVEM SER NORMALIZADOS

Nunca utilizar diretamente um filename fornecido pelo usuário para construir caminhos internos.

Evitar:

```text
../
path traversal
nomes especiais
colisões
```

---

# 196. STORAGE DEVE POSSUIR CONTROLE DE ACESSO

Arquivos privados não devem se tornar públicos apenas por possuírem uma URL previsível.

Aplicar:

```text
authorization;
signed URLs;
expiração;
isolamento.
```

quando apropriado.

---

# 197. WEBHOOKS DEVEM SER AUTENTICADOS

Sempre que o fornecedor oferecer assinatura:

```text
validar assinatura;
timestamp;
replay protection;
secret apropriado.
```

antes de processar o payload.

---

# 198. WEBHOOK DEVE SER IDEMPOTENTE

O mesmo evento pode chegar mais de uma vez.

O sistema deve evitar executar duas vezes:

```text
cobrança;
criação;
cancelamento;
atualização crítica.
```

Utilizar identificador de evento quando disponível.

---

# 199. DADOS SENSÍVEIS DEVEM SER CLASSIFICADOS

Classificar dados relevantes como:

```text
público;
interno;
confidencial;
sensível;
crítico.
```

Essa classificação deve orientar:

```text
logs;
persistência;
criptografia;
permissões;
backups;
exportações.
```

---

# 200. MINIMIZAÇÃO DE DADOS

Não coletar ou armazenar dados que não são necessários.

Perguntar:

> "Precisamos realmente persistir esse campo?"

Menos dados significam menor superfície de risco.

---

# 201. BACKEND DEVE SER MODULAR POR DOMÍNIO

Evitar estrutura monolítica como:

```text
controllers/
services/
repositories/
```

com centenas de arquivos misturados sem domínio.

Quando apropriado, preferir:

```text
modules/
├── customers/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   ├── policies/
│   ├── mappers/
│   ├── types/
│   ├── tests/
│   └── index.ts
│
├── products/
└── orders/
```

---

# 202. CONTROLLERS DEVEM SER FINOS

Controller não deve implementar regra de negócio extensa.

Ideal:

```text
Request
↓
Validation
↓
Authorization
↓
Service
↓
Response
```

Exemplo:

```ts
const result = await createCustomerService.execute(input);
return response.created(result);
```

---

# 203. CONTROLLERS NÃO DEVEM CONHECER SQL

Controller nunca deve executar diretamente:

```text
SELECT
INSERT
UPDATE
DELETE
```

Essa responsabilidade pertence à camada de dados.

---

# 204. SERVICES DEVEM REPRESENTAR CASOS DE USO

Services devem possuir responsabilidades claras.

Exemplo:

```text
CreateCustomerService
UpdateCustomerService
DeactivateCustomerService
```

em vez de um único:

```text
CustomerService
```

com milhares de linhas.

---

# 205. REPOSITORIES DEVEM ISOLAR PERSISTÊNCIA

Regra de negócio não deve depender diretamente do ORM.

Exemplo conceitual:

```text
Service
↓
CustomerRepository
↓
ORM / SQL
↓
Database
```

Isso facilita:

```text
testes;
troca de tecnologia;
isolamento;
manutenção.
```

---

# 206. REPOSITORIES TAMBÉM NÃO DEVEM VIRAR GOD FILES

Se um repository crescer demais, dividir:

```text
queries/
commands/
read/
write/
```

ou por contexto de uso quando apropriado.

---

# 207. BACKEND DEVE POSSUIR LIMITES CLAROS ENTRE CAMADAS

Uma estrutura possível:

```text
Controller
↓
Application / Use Case
↓
Domain
↓
Repository Interface
↓
Infrastructure
↓
Database
```

Não exigir exatamente essa arquitetura em toda situação, mas manter separação equivalente de responsabilidades.

---

# 208. REGRAS DE NEGÓCIO NÃO DEVEM ESTAR NO ORM

Evitar colocar comportamento essencial exclusivamente em:

```text
model hooks;
ORM callbacks;
observers escondidos.
```

Regras críticas devem ser visíveis na arquitetura da aplicação.

---

# 209. SIDE EFFECTS DEVEM SER EXPLÍCITOS

Uma chamada como:

```ts
createOrder();
```

não deve secretamente executar dezenas de operações imprevisíveis sem estrutura.

Se ela:

```text
salva pedido;
cobra pagamento;
envia email;
atualiza estoque;
publica evento;
```

essas responsabilidades devem estar claramente orquestradas.

---

# 210. OPERAÇÕES CRÍTICAS DEVEM DEFINIR FRONTEIRA TRANSACIONAL

Quando múltiplas alterações precisam acontecer juntas:

```text
BEGIN
↓
Operação A
↓
Operação B
↓
Operação C
↓
COMMIT
```

Em caso de falha:

```text
ROLLBACK
```

---

# 211. NÃO UTILIZAR TRANSAÇÕES MAIORES QUE O NECESSÁRIO

Transações longas:

```text
seguram locks;
reduzem concorrência;
aumentam latência;
aumentam chance de deadlock.
```

Manter a transação no menor escopo seguro possível.

---

# 212. CHAMADAS EXTERNAS NÃO DEVEM FICAR DENTRO DE TRANSAÇÕES SEM NECESSIDADE

Evitar:

```text
BEGIN TRANSACTION
↓
HTTP externo demorado
↓
aguarda resposta
↓
COMMIT
```

Prefira estruturas seguras como:

```text
persistência
↓
commit
↓
evento/outbox
↓
processamento assíncrono
```

quando apropriado.

---

# 213. BANCO DE DADOS É UMA CAMADA ARQUITETURAL, NÃO APENAS STORAGE

A IA deve analisar explicitamente:

```text
schema;
índices;
constraints;
integridade;
queries;
locking;
concorrência;
transações;
particionamento;
retenção;
backup;
migração;
performance.
```

---

# 214. SCHEMA DEVE EXPRESSAR REGRAS REAIS

Não depender apenas da aplicação para integridade.

Utilizar quando apropriado:

```text
NOT NULL
UNIQUE
FOREIGN KEY
CHECK
DEFAULT
```

A aplicação valida.

O banco também protege a integridade.

---

# 215. FOREIGN KEYS DEVEM SER UTILIZADAS QUANDO ADEQUADAS

Relacionamentos importantes devem possuir integridade referencial sempre que a arquitetura permitir.

Evitar dados órfãos.

---

# 216. DEFINIR POLÍTICA DE DELETE

Relacionamentos devem possuir comportamento explícito:

```text
CASCADE
RESTRICT
SET NULL
soft delete
```

Nunca deixar exclusões críticas com comportamento acidental.

---

# 217. SOFT DELETE NÃO DEVE SER IMPLEMENTADO AUTOMATICAMENTE

Utilizar apenas quando houver motivo.

Se utilizado, considerar:

```text
índices;
queries;
unicidade;
restauração;
retenção;
privacidade;
limpeza definitiva.
```

---

# 218. ÍNDICES DEVEM SER PROJETADOS COM BASE NAS QUERIES

Não criar índice para toda coluna.

Não ignorar índices.

Analisar:

```text
WHERE;
JOIN;
ORDER BY;
GROUP BY;
unicidade;
seletividade;
volume.
```

---

# 219. TODO NOVO ENDPOINT DE LISTAGEM DEVE CONSIDERAR ÍNDICES

Ao criar filtros como:

```text
status;
createdAt;
customerId;
organizationId;
```

verificar se as queries correspondentes poderão escalar.

---

# 220. EVITAR N+1

Toda funcionalidade que carrega relacionamentos deve ser analisada para problema N+1.

Exemplo ruim:

```text
1 query para pedidos
+
100 queries para clientes
```

Utilizar estratégia apropriada:

```text
JOIN;
batch;
include;
prefetch;
DataLoader;
query agregada.
```

---

# 221. EVITAR SELECT *

Não buscar colunas desnecessárias.

Preferir:

```sql
SELECT id, name, status
```

quando somente esses dados são necessários.

---

# 222. PAGINAÇÃO É OBRIGATÓRIA PARA COLEÇÕES POTENCIALMENTE GRANDES

Nunca carregar arbitrariamente:

```text
todos os clientes;
todos os pedidos;
todos os produtos;
todos os logs.
```

Utilizar paginação.

---

# 223. ESCOLHER PAGINAÇÃO ADEQUADA

Offset pagination pode ser suficiente em alguns casos.

Para grandes datasets ou feeds contínuos, avaliar:

```text
cursor pagination;
keyset pagination.
```

---

# 224. LIMITAR TAMANHO MÁXIMO DE PÁGINA

Nunca permitir:

```text
?limit=999999999
```

Definir máximo no backend.

---

# 225. BUSCAS DEVEM SER ESCALÁVEIS

Evitar consultas como:

```text
LIKE '%texto%'
```

sobre milhões de registros sem análise.

Quando necessário, considerar:

```text
índices especializados;
full-text search;
search engine;
normalização apropriada.
```

---

# 226. QUERIES IMPORTANTES DEVEM SER ANALISÁVEIS

Para consultas críticas, utilizar ferramentas equivalentes a:

```text
EXPLAIN
EXPLAIN ANALYZE
query profiler
slow query log
```

quando disponíveis.

---

# 227. NÃO OTIMIZAR BANCO POR ACHISMO

Performance deve ser medida.

Utilizar:

```text
tempo de query;
plano de execução;
I/O;
locks;
rows scanned;
cache hit.
```

---

# 228. MIGRAÇÕES DEVEM SER SEGURAS

Toda alteração de schema deve considerar:

```text
compatibilidade;
volume;
locking;
rollback;
deploy;
dados existentes.
```

---

# 229. MIGRAÇÕES NÃO DEVEM DESTRUIR DADOS SEM EXPLICITAR

Operações como:

```text
DROP COLUMN;
DROP TABLE;
TRUNCATE;
DELETE massivo;
```

devem ser tratadas como críticas.

Antes de executar:

```text
avaliar impacto;
backup;
migração dos dados;
compatibilidade.
```

---

# 230. DEPLOYS DEVEM CONSIDERAR COMPATIBILIDADE ENTRE VERSÕES

Evitar situações em que:

```text
backend novo exige coluna nova
```

mas o banco ainda não recebeu migração.

Preferir sequência compatível.

---

# 231. EXPAND AND CONTRACT PARA MIGRAÇÕES COMPLEXAS

Quando necessário:

```text
1. adicionar estrutura nova compatível;
2. escrever nos formatos necessários;
3. migrar dados;
4. mudar leitores;
5. validar;
6. remover estrutura antiga.
```

---

# 232. BACKUPS DEVEM SER CONSIDERADOS NA ARQUITETURA

Dados importantes devem possuir estratégia de:

```text
backup;
retenção;
restauração;
verificação.
```

Backup que nunca foi testado para restauração não deve ser considerado suficiente.

---

# 233. TESTAR RESTAURAÇÃO

Para sistemas críticos, considerar testes periódicos de restore.

O objetivo não é apenas possuir backup.

É conseguir recuperar o serviço.

---

# 234. BANCO DE DADOS DEVE UTILIZAR CONEXÕES CONTROLADAS

Utilizar pool de conexões quando apropriado.

Configurar:

```text
mínimo;
máximo;
timeouts;
idle timeout.
```

Não abrir nova conexão manual por request.

---

# 235. EVITAR CONNECTION POOL EXCESSIVO

Mais conexões não significa mais performance.

O banco possui capacidade limitada.

A configuração deve considerar:

```text
instâncias da aplicação;
workers;
limite do banco;
carga.
```

---

# 236. TIMEOUTS DEVEM EXISTIR

Não permitir operações ficarem aguardando indefinidamente.

Definir timeouts apropriados para:

```text
database;
HTTP;
cache;
fila;
storage;
serviços externos.
```

---

# 237. RETRIES DEVEM TER LIMITES

Nunca utilizar retry infinito.

Utilizar quando apropriado:

```text
limite;
backoff;
jitter;
idempotência.
```

---

# 238. NÃO RETRY EM ERRO NÃO TRANSIENTE

Exemplos normalmente inúteis para retry automático:

```text
401;
403;
validação inválida;
recurso inexistente.
```

Diferenciar falha transitória de falha definitiva.

---

# 239. CIRCUIT BREAKER QUANDO NECESSÁRIO

Integrações instáveis podem precisar de mecanismo para evitar cascata de falhas.

Fluxo:

```text
serviço externo falha repetidamente
↓
circuit abre
↓
requests deixam de pressionar serviço
↓
tempo de recuperação
↓
tentativa controlada
```

---

# 240. FILAS PARA TRABALHO PESADO

Não manter requests HTTP esperando por tarefas longas quando elas puderem ser assíncronas.

Candidatos:

```text
email;
relatórios;
importações;
exportações;
processamento de imagens;
integrações demoradas;
sincronização;
IA;
processamento em lote.
```

---

# 241. WORKERS DEVEM SER IDEMPOTENTES

Um job pode ser entregue mais de uma vez.

O processamento deve minimizar efeitos duplicados.

---

# 242. FILAS DEVEM POSSUIR ESTRATÉGIA DE FALHA

Considerar:

```text
retry;
backoff;
dead-letter queue;
observabilidade;
reprocessamento.
```

---

# 243. DEAD LETTER QUEUE PARA ERROS PERSISTENTES

Jobs que falham repetidamente não devem desaparecer silenciosamente.

Devem poder ser:

```text
inspecionados;
corrigidos;
reprocessados.
```

---

# 244. JOBS DEVEM SER PEQUENOS E ESPECIALIZADOS

Evitar um worker universal contendo todas as responsabilidades.

Organizar por domínio e tarefa.

---

# 245. CACHE DEVE TER PROPÓSITO

Nunca adicionar cache apenas porque parece melhorar performance.

Antes perguntar:

```text
qual dado?
qual custo da operação original?
qual TTL?
como invalidar?
qual tolerância a dado stale?
```

---

# 246. INVALIDAÇÃO DE CACHE DEVE SER DEFINIDA

Cache sem estratégia de invalidação tende a produzir bugs.

Documentar:

```text
quando cria;
quando atualiza;
quando remove;
quando expira.
```

---

# 247. CACHE NÃO PODE SER FONTE ACIDENTAL DE VERDADE

A fonte oficial dos dados deve estar claramente definida.

Cache deve ser uma camada derivada, salvo arquiteturas desenhadas explicitamente de outra forma.

---

# 248. PERFORMANCE COMPUTACIONAL É REQUISITO ARQUITETURAL

Toda implementação deve avaliar custo de:

```text
CPU;
memória;
I/O;
rede;
banco;
serialização;
render;
storage;
latência.
```

---

# 249. NÃO OTIMIZAR APENAS FRONTEND

Analisar performance em toda a cadeia:

```text
Browser
↓
Network
↓
CDN
↓
API
↓
Backend
↓
Cache
↓
Database
↓
External Services
```

A lentidão percebida pelo usuário pode estar em qualquer camada.

---

# 250. MEDIR ANTES DE OTIMIZAR

Evitar micro-otimizações sem evidência.

Utilizar quando possível:

```text
profiling;
tracing;
metrics;
benchmarks;
query analysis;
browser profiler.
```

---

# 251. DEFINIR HOT PATHS

Identificar caminhos executados com muita frequência.

Exemplo:

```text
autenticação;
listagem principal;
pesquisa;
checkout;
sincronização;
dashboard.
```

Esses caminhos merecem atenção especial.

---

# 252. COMPLEXIDADE ALGORÍTMICA DEVE SER CONSIDERADA

Ao processar grandes coleções, evitar algoritmos inadequados.

Perguntar:

```text
Qual o tamanho potencial da coleção?
É O(n)?
É O(n²)?
Há lookup repetitivo?
Pode usar Map ou Set?
Pode fazer processamento em lote?
```

---

# 253. EVITAR LOOP DENTRO DE LOOP SEM ANÁLISE

Especialmente quando os dados podem crescer.

Exemplo:

```ts
for (const order of orders) {
    for (const customer of customers) {
        ...
    }
}
```

Pode ser substituído por estrutura indexada.

---

# 254. BATCHING

Quando várias operações semelhantes forem necessárias, avaliar processamento em lote.

Exemplo:

```text
100 requests individuais
```

pode se tornar:

```text
1 request batch
```

quando seguro e adequado.

---

# 255. EVITAR SERIALIZAÇÃO DESNECESSÁRIA

Não converter repetidamente grandes estruturas entre:

```text
object;
JSON;
string;
buffer.
```

sem necessidade.

---

# 256. STREAMING PARA GRANDES VOLUMES

Arquivos e datasets grandes devem considerar streaming.

Evitar carregar completamente em memória:

```text
CSV gigantes;
exports;
uploads;
arquivos;
resultados muito grandes.
```

---

# 257. LIMITAR CONCORRÊNCIA

Não executar milhares de operações simultaneamente apenas porque existe `Promise.all`.

Exemplo perigoso:

```ts
await Promise.all(
    thousandsOfItems.map(processItem)
);
```

Utilizar limite de concorrência quando necessário.

---

# 258. BACKPRESSURE

Pipelines de processamento devem considerar capacidade do consumidor.

O produtor não deve gerar dados infinitamente mais rápido que o sistema consegue processar.

---

# 259. MEMÓRIA DEVE SER CONSIDERADA

Evitar:

```text
arrays gigantes;
cópias desnecessárias;
cache ilimitado;
objetos mantidos sem necessidade;
listeners nunca removidos.
```

---

# 260. MEMORY LEAKS DEVEM SER INVESTIGÁVEIS

Workers e serviços long-running devem possuir observabilidade suficiente para detectar crescimento anormal de memória.

---

# 261. PAYLOADS DEVEM SER PEQUENOS

APIs não devem retornar estruturas gigantes por conveniência.

Utilizar:

```text
paginação;
fields;
summary DTOs;
lazy loading.
```

---

# 262. COMPRESSÃO QUANDO ADEQUADA

Payloads textuais grandes podem utilizar compressão quando a infraestrutura suportar e houver benefício.

Não comprimir indiscriminadamente arquivos que já são comprimidos.

---

# 263. EVITAR REQUEST WATERFALLS

No frontend:

```text
Request A
↓
espera
↓
Request B
↓
espera
↓
Request C
```

deve ser analisado.

Quando independentes, executar paralelamente.

Quando dependentes, considerar endpoint agregado.

---

# 264. BFF OU ENDPOINT AGREGADOR QUANDO JUSTIFICADO

Se uma tela depende de muitas requisições fragmentadas, avaliar um endpoint específico de agregação.

Não criar BFF sem necessidade.

---

# 265. UX É REQUISITO DE ENGENHARIA

Facilidade de uso não deve ser tratada como decoração.

Uma funcionalidade tecnicamente correta pode ser inadequada se exigir esforço desnecessário do usuário.

---

# 266. MINIMIZAR CARGA COGNITIVA

A interface deve evitar fazer o usuário pensar sobre detalhes técnicos.

Preferir:

```text
ações claras;
nomes compreensíveis;
fluxos previsíveis;
informações relevantes;
hierarquia visual.
```

---

# 267. AÇÃO PRINCIPAL DEVE SER ÓBVIA

Cada tela deve deixar claro:

```text
Onde estou?
O que posso fazer?
Qual é a ação principal?
O que acontece depois?
```

---

# 268. MENOS CLIQUES QUANDO NÃO REDUZ SEGURANÇA

Fluxos comuns devem exigir o mínimo razoável de etapas.

Não adicionar confirmações inúteis em operações triviais.

Manter confirmações em ações destrutivas ou críticas.

---

# 269. CONFIRMAÇÕES DEVEM SER PROPORCIONAIS AO RISCO

Exemplo:

```text
abrir item
→ sem confirmação

salvar edição
→ feedback claro

excluir registro
→ confirmação

excluir centenas de registros
→ confirmação reforçada
```

---

# 270. FEEDBACK IMEDIATO

Toda ação deve produzir feedback visual adequado.

Exemplo:

```text
loading;
sucesso;
erro;
progresso;
estado atualizado.
```

O usuário nunca deve precisar se perguntar:

> "Será que funcionou?"

---

# 271. EVITAR DUPLO ENVIO

Botões de operações assíncronas devem controlar estado.

Exemplo:

```text
idle
↓
loading
↓
success/error
```

Evitar múltiplos cliques gerando múltiplas requisições.

O backend também deve se proteger.

---

# 272. ERROS DEVEM SER HUMANOS

Não exibir:

```text
ECONNRESET
SQLSTATE 23505
Cannot read properties of undefined
HTTP 500
```

diretamente para o usuário.

Transformar em mensagem compreensível.

Detalhes técnicos ficam nos logs.

---

# 273. MENSAGEM DE ERRO DEVE ORIENTAR O PRÓXIMO PASSO

Ruim:

```text
Erro.
```

Melhor:

```text
Não foi possível salvar o cliente.
Verifique a conexão e tente novamente.
```

Quando possível, explicar exatamente como corrigir.

---

# 274. PRESERVAR DADOS DO USUÁRIO EM ERROS

Não limpar formulários inteiros quando uma requisição falhar.

Preservar o máximo de progresso possível.

---

# 275. AUTOSAVE QUANDO JUSTIFICADO

Em fluxos longos, considerar salvamento automático ou drafts.

Deve haver indicação clara de:

```text
salvando;
salvo;
falha ao salvar.
```

---

# 276. NÃO ESCONDER ESTADO IMPORTANTE

O usuário deve conseguir distinguir:

```text
salvo;
não salvo;
sincronizando;
offline;
erro;
carregando.
```

---

# 277. EMPTY STATES DEVEM SER ÚTEIS

Tela vazia não deve mostrar apenas:

```text
Nenhum registro.
```

Quando apropriado:

```text
explicar o que é;
por que está vazio;
qual ação realizar.
```

---

# 278. LOADING STATES DEVEM SER PROPORCIONAIS

Evitar bloquear toda página quando apenas um pequeno elemento está carregando.

Utilizar loading localizado quando possível.

---

# 279. OPTIMISTIC UI SOMENTE QUANDO SEGURA

Atualização otimista pode melhorar UX, mas precisa de:

```text
rollback;
tratamento de falha;
consistência.
```

Não utilizar em operações onde erro possui alto impacto sem estratégia adequada.

---

# 280. DEBOUNCE PARA INTERAÇÕES FREQUENTES

Pesquisas e filtros digitados podem utilizar debounce quando isso reduzir requests e melhorar experiência.

Não adicionar atrasos perceptíveis desnecessários.

---

# 281. FORMULÁRIOS DEVEM EVITAR TRABALHO DESNECESSÁRIO

Não pedir informação que:

```text
já existe;
pode ser inferida;
pode ser preenchida automaticamente;
não será utilizada.
```

---

# 282. DEFAULTS INTELIGENTES

Quando houver uma escolha predominante e segura, definir valor padrão apropriado.

Não obrigar usuário a selecionar sempre a mesma opção.

---

# 283. NÃO UTILIZAR DEFAULT ARRISCADO

Valores padrão nunca devem resultar automaticamente em ação destrutiva, permissão elevada ou exposição.

---

# 284. ORDEM DE CAMPOS DEVE SEGUIR FLUXO MENTAL

Formulários devem seguir sequência natural para o usuário.

Não organizar apenas com base na estrutura do banco de dados.

---

# 285. UI NÃO DEVE REFLETIR DIRETAMENTE O SCHEMA DO BANCO

A estrutura técnica não define a experiência.

Banco pode possuir:

```text
customer_internal_reference_id
```

mas usuário deve enxergar conceito humano.

---

# 286. ACESSIBILIDADE É OBRIGATÓRIA

Componentes devem considerar:

```text
teclado;
foco;
screen reader;
labels;
semântica HTML;
contraste;
tamanho de alvo;
mensagens de erro.
```

---

# 287. FOCO DEVE SER GERENCIADO

Em:

```text
modais;
erros;
navegação;
formulários;
dialogs.
```

o foco deve permanecer previsível.

---

# 288. NÃO DEPENDER APENAS DE COR

Status e erros não devem ser comunicados exclusivamente por:

```text
vermelho;
verde;
amarelo.
```

Utilizar também:

```text
texto;
ícone;
label;
semântica.
```

---

# 289. ÁREA DE CLIQUE DEVE SER ADEQUADA

Ações importantes, especialmente mobile, devem possuir alvos fáceis de tocar.

---

# 290. MOBILE NÃO DEVE SER UMA ADAPTAÇÃO QUEBRADA DO DESKTOP

Fluxos mobile devem ser testados considerando:

```text
espaço;
teclado;
toque;
scroll;
modais;
navegação;
tabelas.
```

---

# 291. TABELAS GRANDES DEVEM POSSUIR ALTERNATIVA RESPONSIVA

Não simplesmente comprimir dezenas de colunas em uma tela pequena.

Considerar:

```text
priorização de colunas;
cards;
detalhes expansíveis;
scroll controlado.
```

---

# 292. APLICAÇÃO DEVE SER CONSISTENTE

Mesma ação deve possuir:

```text
mesmo nome;
mesmo ícone;
mesmo comportamento;
mesma posição aproximada;
mesmo feedback.
```

quando aplicável.

---

# 293. NÃO INVENTAR NOVO PADRÃO DE UX SEM NECESSIDADE

Antes de criar um novo padrão, verificar componentes existentes.

Reutilizar:

```text
Modal
Toast
Dialog
Dropdown
FormField
Table
Pagination
Search
FilterBar
```

---

# 294. PERCEIVED PERFORMANCE

Performance percebida também importa.

Utilizar quando apropriado:

```text
skeleton;
prefetch;
cache;
optimistic updates;
progress indicators;
lazy loading.
```

---

# 295. NÃO UTILIZAR ANIMAÇÃO QUE PREJUDIQUE VELOCIDADE

Animações devem apoiar compreensão.

Evitar animações:

```text
longas;
bloqueantes;
excessivas;
pesadas.
```

---

# 296. UX DEVE CONSIDERAR USUÁRIO INICIANTE E EXPERIENTE

Quando possível, oferecer:

```text
fluxo simples;
atalhos;
ações rápidas;
teclado;
automação.
```

sem tornar a interface confusa.

---

# 297. OPERAÇÕES EM MASSA

Quando usuários precisarem repetir a mesma ação diversas vezes, considerar:

```text
seleção múltipla;
bulk actions;
importação;
atalhos.
```

---

# 298. DESFAZER PODE SER MELHOR QUE CONFIRMAR

Para ações facilmente reversíveis e de baixo risco, considerar:

```text
ação imediata
+
Undo
```

em vez de múltiplos dialogs.

---

# 299. DESTRUCTIVE ACTIONS DEVEM SER VISUALMENTE DIFERENCIADAS

Excluir ou sobrescrever dados deve ser claramente distinguível de ações comuns.

---

# 300. NÃO COLOCAR AÇÃO PERIGOSA PRÓXIMA DEMAIS DE AÇÃO COMUM

Evitar erros acidentais de clique.

---

# 301. CONTROLE DE AGENTES É OBRIGATÓRIO

Toda região relevante da aplicação deve possuir um arquivo de controle de agentes.

Nome padrão:

```text
AGENTS.md
```

Esse arquivo deve orientar qualquer IA/agente que trabalhe naquela região.

---

# 302. DEVE EXISTIR UM AGENTS.MD NA RAIZ

Exemplo:

```text
/
├── AGENTS.md
├── frontend/
├── backend/
├── database/
└── ...
```

O `AGENTS.md` raiz define regras globais.

---

# 303. CADA REGIÃO DEVE POSSUIR SEU PRÓPRIO AGENTS.MD

Exemplo:

```text
/
├── AGENTS.md
│
├── frontend/
│   ├── AGENTS.md
│   └── ...
│
├── backend/
│   ├── AGENTS.md
│   └── ...
│
├── database/
│   ├── AGENTS.md
│   └── ...
│
├── integrations/
│   ├── AGENTS.md
│   └── ...
│
├── workers/
│   ├── AGENTS.md
│   └── ...
│
└── tests/
    ├── AGENTS.md
    └── ...
```

---

# 304. FEATURES IMPORTANTES TAMBÉM PODEM POSSUIR AGENTS.MD

Exemplo:

```text
backend/
└── modules/
    └── payments/
        ├── AGENTS.md
        ├── controllers/
        ├── services/
        └── ...
```

Quanto mais crítica e especializada uma região, mais útil possuir regras locais.

---

# 305. HERANÇA DAS REGRAS DE AGENTES

Funcionamento conceitual:

```text
AGENTS.md raiz
        ↓
AGENTS.md da camada
        ↓
AGENTS.md da feature
```

As regras locais adicionam contexto.

Elas não devem enfraquecer requisitos globais de:

```text
segurança;
qualidade;
testes;
integridade;
observabilidade.
```

---

# 306. REGRA LOCAL PODE SER MAIS RESTRITIVA

Exemplo:

Raiz:

```text
Toda entrada deve ser validada.
```

Payments:

```text
Toda entrada financeira deve usar schema estrito,
idempotency key e audit log.
```

A regra especializada complementa a global.

---

# 307. CADA AGENTS.MD DEVE DEFINIR RESPONSABILIDADE DA REGIÃO

Incluir:

```text
Objetivo
Escopo
Responsabilidades
Limites
Dependências permitidas
Dependências proibidas
Padrões obrigatórios
Checklist
```

---

# 308. CADA AGENTS.MD DEVE TER MAPA DA ARQUITETURA LOCAL

Exemplo:

```text
Payments
│
├── Controller
│
├── Validation
│
├── Authorization
│
├── Service
│
├── Repository
│
├── Provider Adapter
│
└── Events
```

---

# 309. CADA AGENTS.MD DEVE DECLARAR AGENTES ESPECIALIZADOS

No mínimo avaliar a necessidade dos seguintes papéis:

```text
Development Agent
Engineering / Architecture Agent
Security Agent
Sanitization Agent
Testing Agent
Database Agent
Performance Agent
UI/UX Agent
API Agent
Observability Agent
Integration Agent
Documentation Agent
```

Nem todos precisarão executar mudanças em toda tarefa, mas suas responsabilidades devem estar definidas.

---

# 310. DEVELOPMENT AGENT

Responsável por:

```text
implementação;
clean code;
modularização;
reutilização;
tipagem;
integração com arquitetura existente;
remoção de duplicação;
manutenção.
```

Regras:

```text
não criar arquivo gigante;
não duplicar lógica;
não misturar responsabilidade;
não ignorar padrões existentes;
não adicionar dependência sem necessidade.
```

---

# 311. ENGINEERING / ARCHITECTURE AGENT

Responsável por analisar:

```text
fronteiras dos módulos;
dependências;
acoplamento;
coesão;
escalabilidade;
fluxo de dados;
single source of truth;
impacto futuro.
```

Antes de feature relevante, deve verificar:

```text
onde a lógica pertence;
qual módulo é dono;
quais módulos dependem;
qual contrato será exposto.
```

---

# 312. SECURITY AGENT

Responsável por avaliar:

```text
autenticação;
autorização;
controle de acesso;
segredos;
tokens;
logs;
ataques;
inputs;
outputs;
uploads;
webhooks;
abuso;
rate limit;
dados sensíveis.
```

Deve perguntar:

```text
Como essa feature pode ser abusada?
Como dados podem vazar?
É possível acessar recurso de outro usuário?
Existe elevação de privilégio?
Existe bypass pelo backend?
```

---

# 313. SANITIZATION AGENT

Responsável especificamente por fronteiras de dados.

Avaliar:

```text
input de usuário;
HTML;
SQL;
filenames;
URLs;
headers;
payloads;
CSV;
JSON;
webhooks;
uploads.
```

Deve verificar:

```text
schema;
normalização;
allowlist;
sanitização;
encoding;
escaping.
```

---

# 314. TESTING AGENT

Responsável por:

```text
unit tests;
integration tests;
regression tests;
contract tests;
E2E quando necessário;
edge cases;
failure cases.
```

Nunca testar apenas happy path.

---

# 315. TESTING AGENT DEVE PENSAR COMO USUÁRIO E ATACANTE

Testar:

```text
entrada válida;
entrada inválida;
entrada vazia;
entrada gigante;
requisição duplicada;
concorrência;
permissão incorreta;
recurso inexistente;
timeout;
falha externa.
```

---

# 316. DATABASE AGENT

Responsável por:

```text
schema;
constraints;
índices;
queries;
migrações;
transações;
integridade;
locks;
concorrência;
backup;
performance.
```

Antes de mudança de persistência, avaliar impacto no banco.

---

# 317. DATABASE AGENT DEVE REVISAR NOVOS FILTROS

Novo filtro de UI pode significar nova query de banco.

Exemplo:

```text
Filtro por status + data + tenant
```

deve gerar análise de índice correspondente.

---

# 318. PERFORMANCE AGENT

Responsável por:

```text
CPU;
memória;
latência;
I/O;
rede;
queries;
cache;
bundle;
render;
concorrência.
```

Deve buscar gargalos reais, não micro-otimizações arbitrárias.

---

# 319. UI/UX AGENT

Responsável por avaliar:

```text
clareza;
consistência;
acessibilidade;
quantidade de passos;
feedback;
responsividade;
erros;
loading;
empty states;
mobile.
```

Pergunta obrigatória:

> "Essa implementação é fácil para um usuário que não conhece internamente o sistema?"

---

# 320. API AGENT

Responsável por contratos de API.

Avaliar:

```text
rotas;
status HTTP;
schemas;
DTOs;
paginação;
erros;
versionamento;
idempotência;
payload;
compatibilidade.
```

---

# 321. OBSERVABILITY AGENT

Responsável por:

```text
logs;
metrics;
traces;
correlation IDs;
alertas;
audit;
diagnóstico.
```

Deve garantir que uma falha em produção possa ser investigada.

---

# 322. INTEGRATION AGENT

Responsável por serviços externos.

Avaliar:

```text
timeouts;
retries;
rate limits;
idempotência;
webhooks;
circuit breaker;
fallback;
credenciais.
```

---

# 323. DOCUMENTATION AGENT

Responsável por manter:

```text
arquitetura;
mapas;
contratos;
fluxos;
AGENTS.md;
decisões técnicas;
README local.
```

---

# 324. AGENTS.MD NÃO PODE SER DOCUMENTAÇÃO GENÉRICA

O arquivo deve conter instruções operacionais específicas da região.

Ruim:

```text
Escreva código bom.
Faça testes.
```

Bom:

```text
Toda criação de pedido deve passar por OrderCreationService.
Nenhum controller pode acessar Prisma diretamente.
Toda query deve incluir organizationId.
Operações de pagamento exigem idempotencyKey.
```

---

# 325. MODELO OBRIGATÓRIO PARA AGENTS.MD

Utilizar estrutura semelhante:

```md
# AGENTS — Payments

## Região
Descrição da responsabilidade desta região.

## Objetivos
- ...

## Arquitetura
...

## Dependências permitidas
- ...

## Dependências proibidas
- ...

## Development Agent
- ...

## Engineering Agent
- ...

## Security Agent
- ...

## Sanitization Agent
- ...

## Testing Agent
- ...

## Database Agent
- ...

## Performance Agent
- ...

## UI/UX Agent
- ...

## Observability Agent
- ...

## Checklist obrigatório
- [ ] ...
```

---

# 326. AGENTS.MD DEVE SER ATUALIZADO QUANDO A ARQUITETURA MUDAR

Criar arquivos de agentes e esquecê-los é proibido.

Sempre que houver mudança estrutural significativa:

```text
novo módulo;
nova integração;
nova regra;
novo banco;
novo fluxo;
nova responsabilidade;
```

avaliar atualização do `AGENTS.md`.

---

# 327. AGENTES DEVEM POSSUIR LIMITES EXPLÍCITOS

Exemplo:

```text
UI Agent não altera schema do banco sem análise do Database Agent.
Database Agent não modifica UX.
Security Agent pode bloquear implementação insegura.
Development Agent não remove validação para simplificar código.
```

---

# 328. SEGURANÇA TEM PODER DE VETO

Se uma implementação facilitar desenvolvimento mas criar vulnerabilidade relevante, a opção insegura deve ser rejeitada.

Prioridade:

```text
Segurança
>
conveniência de implementação
```

---

# 329. INTEGRIDADE DOS DADOS TEM PODER DE VETO

Uma solução mais rápida não deve ser aplicada se puder causar:

```text
dados órfãos;
duplicação;
corrupção;
race condition;
perda de consistência.
```

---

# 330. AGENTE DE PERFORMANCE NÃO PODE SACRIFICAR CORREÇÃO

Nunca trocar:

```text
correto
```

por:

```text
mais rápido porém inconsistente.
```

Ordem:

```text
correção;
segurança;
integridade;
performance.
```

---

# 331. AGENTE DE UX NÃO PODE SACRIFICAR SEGURANÇA

Reduzir passos é desejável.

Mas nunca removendo controles críticos apenas para diminuir cliques.

---

# 332. REVIEW MULTIDISCIPLINAR OBRIGATÓRIO PARA FEATURES CRÍTICAS

Features críticas devem ser analisadas conceitualmente por:

```text
Engineering
Development
Security
Testing
Database
Performance
Observability
```

E por UI/UX quando houver interação com usuário.

---

# 333. FEATURE CRÍTICA

Considerar crítica quando envolver:

```text
autenticação;
autorização;
pagamentos;
dados pessoais;
permissões;
exclusão;
importação;
exportação;
webhooks;
administração;
integração externa;
grande volume de dados.
```

---

# 334. SECURITY CHECKLIST POR FEATURE

Antes de concluir:

* [ ] Toda entrada externa foi validada?
* [ ] Existe sanitização onde necessária?
* [ ] Autenticação foi verificada?
* [ ] Autorização foi verificada no backend?
* [ ] O recurso pertence ao usuário/tenant correto?
* [ ] Há risco de IDOR?
* [ ] Há risco de injection?
* [ ] Campos extras são rejeitados ou ignorados seguramente?
* [ ] Dados sensíveis podem aparecer na resposta?
* [ ] Dados sensíveis podem aparecer nos logs?
* [ ] Rate limiting é necessário?
* [ ] A operação precisa ser idempotente?
* [ ] Uploads são seguros?
* [ ] Webhooks possuem assinatura?
* [ ] Secrets estão fora do código?
* [ ] Logs de segurança são suficientes?
* [ ] Ação precisa de audit log?

---

# 335. BACKEND CHECKLIST POR FEATURE

* [ ] Controller está fino?
* [ ] Existe schema de request?
* [ ] Existe DTO explícito?
* [ ] Regra de negócio está no módulo correto?
* [ ] Service possui responsabilidade única?
* [ ] Repository está isolando persistência?
* [ ] Há tratamento de erro consistente?
* [ ] Existem timeouts?
* [ ] Existem retries inadequados?
* [ ] Há chamadas externas em transações?
* [ ] Há necessidade de processamento assíncrono?
* [ ] Existe idempotência quando necessária?
* [ ] Logs são suficientes?

---

# 336. DATABASE CHECKLIST POR FEATURE

* [ ] O schema representa corretamente o domínio?
* [ ] NOT NULL necessário foi definido?
* [ ] UNIQUE necessário foi definido?
* [ ] Foreign keys necessárias existem?
* [ ] Política de delete foi definida?
* [ ] Índices atendem às queries?
* [ ] Existe risco de N+1?
* [ ] SELECT busca apenas campos necessários?
* [ ] Listagens possuem paginação?
* [ ] Query escala para volume futuro?
* [ ] Transação possui escopo correto?
* [ ] Existe risco de deadlock?
* [ ] Migração é compatível?
* [ ] Migração pode bloquear produção?
* [ ] Há risco de perda de dados?
* [ ] Rollback ou estratégia de recuperação existe?

---

# 337. PERFORMANCE CHECKLIST POR FEATURE

* [ ] Quantas queries são executadas?
* [ ] Existe N+1?
* [ ] Payload está maior que o necessário?
* [ ] Existe waterfall de requests?
* [ ] Existe loop potencialmente O(n²)?
* [ ] Existe processamento que pode ser batch?
* [ ] Existe concorrência sem limite?
* [ ] Existe tarefa longa dentro de request?
* [ ] Cache seria útil?
* [ ] Cache possui invalidação?
* [ ] Há carregamento desnecessário?
* [ ] Memória pode crescer sem controle?
* [ ] Performance foi medida quando relevante?

---

# 338. UX CHECKLIST POR FEATURE

* [ ] A ação principal está clara?
* [ ] O fluxo exige passos desnecessários?
* [ ] Existem defaults inteligentes?
* [ ] Estados de loading estão claros?
* [ ] Estados de erro estão claros?
* [ ] Erros explicam como resolver?
* [ ] Dados são preservados após falha?
* [ ] Existe risco de duplo envio?
* [ ] Empty state é útil?
* [ ] Funciona em mobile?
* [ ] Funciona via teclado?
* [ ] Labels estão corretos?
* [ ] A interface segue o design system?
* [ ] O usuário recebe feedback imediato?

---

# 339. TESTING CHECKLIST POR FEATURE

* [ ] Happy path testado?
* [ ] Dados inválidos testados?
* [ ] Autorização testada?
* [ ] Acesso de outro tenant testado?
* [ ] Requisição duplicada testada?
* [ ] Falha do banco considerada?
* [ ] Timeout externo considerado?
* [ ] Retry considerado?
* [ ] Concorrência considerada?
* [ ] Edge cases testados?
* [ ] Bug corrigido possui regression test?

---

# 340. OBSERVABILITY CHECKLIST

* [ ] Operação possui log de início quando relevante?
* [ ] Sucesso é rastreável?
* [ ] Falha é rastreável?
* [ ] Existe correlationId?
* [ ] Dados sensíveis são redacted?
* [ ] Métrica é necessária?
* [ ] Trace é necessário?
* [ ] Alerta é necessário?
* [ ] Operação precisa de audit log?

---

# 341. TODO NOVO MÓDULO DEVE TER OWNER ARQUITETURAL

Definir claramente qual módulo é a fonte oficial de cada responsabilidade.

Exemplo:

```text
CustomerService
→ regras de aplicação do cliente

CustomerRepository
→ persistência do cliente

CustomerPolicy
→ autorização

CustomerSchema
→ validação de entrada

CustomerMapper
→ transformação entre camadas
```

---

# 342. EVITAR "SHARED" COMO DEPÓSITO

Uma pasta compartilhada não pode receber qualquer código apenas para evitar decidir onde ele pertence.

Antes de mover para `shared`, perguntar:

```text
É realmente genérico?
Quem é o owner?
Possui dependência de domínio?
Quantos módulos consomem?
```

---

# 343. CÓDIGO DE SEGURANÇA DEVE SER CENTRALIZADO MAS NÃO MONOLÍTICO

Exemplo:

```text
security/
├── authorization/
├── authentication/
├── sanitization/
├── encryption/
├── rateLimit/
├── audit/
└── secrets/
```

Evitar:

```text
security.ts
```

com milhares de linhas.

---

# 344. CONFIGURAÇÕES DE PERFORMANCE DEVEM SER CENTRALIZADAS

Exemplo:

```text
config/
├── cache.ts
├── database.ts
├── concurrency.ts
├── pagination.ts
├── rateLimit.ts
└── timeout.ts
```

Não espalhar valores arbitrários.

---

# 345. VALORES DE PERFORMANCE DEVEM SER NOMEADOS

Evitar:

```ts
pLimit(7);
timeout(4500);
pageSize = 37;
```

Prefira:

```ts
performanceConfig.workerConcurrency;
apiConfig.requestTimeout;
paginationConfig.defaultPageSize;
```

---

# 346. LIMITES DEVEM POSSUIR MÁXIMO SEGURO

Configurações controláveis pelo cliente devem possuir limites definidos pelo servidor.

Exemplo:

```text
pageSize:
default = 20
max = 100
```

---

# 347. PROCESSAMENTO EM MASSA DEVE SER CHUNKED

Ao processar milhares/milhões de itens, trabalhar em blocos.

Exemplo:

```text
10.000 registros

↓ chunk

500
500
500
...
```

em vez de carregar tudo simultaneamente.

---

# 348. JOBS DEVEM REPORTAR PROGRESSO QUANDO VISÍVEIS AO USUÁRIO

Processamentos longos devem permitir estados como:

```text
queued;
processing;
completed;
failed.
```

Quando possível, informar progresso.

---

# 349. CANCELAMENTO DEVE SER CONSIDERADO

Operações longas podem precisar permitir:

```text
cancelamento;
abort;
interrupção segura.
```

---

# 350. OPERAÇÕES DE DELETE EM MASSA DEVEM SER CONTROLADAS

Nunca executar exclusões enormes sem:

```text
limite;
autorização;
auditoria;
confirmação;
processamento seguro.
```

---

# 351. EXPORTAÇÕES DEVEM SER CONTROLADAS

Exports podem consumir:

```text
CPU;
memória;
banco;
rede.
```

Para grandes volumes, considerar processamento assíncrono.

---

# 352. IMPORTAÇÕES DEVEM VALIDAR ANTES DE PERSISTIR

Fluxo recomendado:

```text
Upload
↓
Parse
↓
Validate
↓
Preview / Errors
↓
Persist
```

quando o caso permitir.

---

# 353. IMPORTAÇÕES DEVEM POSSUIR RELATÓRIO DE ERRO

Não falhar simplesmente com:

```text
Importação falhou.
```

Informar:

```text
linha;
campo;
motivo.
```

sem expor detalhes internos sensíveis.

---

# 354. CONSISTÊNCIA DE API

APIs semelhantes devem possuir padrões consistentes para:

```text
paginação;
erros;
metadata;
status;
filters;
sorting.
```

---

# 355. ERROS DE API DEVEM POSSUIR CÓDIGOS ESTÁVEIS

Exemplo:

```json
{
  "code": "CUSTOMER_NOT_FOUND",
  "message": "..."
}
```

A UI não deve depender exclusivamente do texto da mensagem.

---

# 356. ERROS INTERNOS NÃO DEVEM SER EXPOSTOS

Stack traces e detalhes do banco não devem aparecer em respostas públicas.

Exemplo proibido:

```text
relation "customers" does not exist
```

Retornar mensagem controlada e registrar o detalhe internamente.

---

# 357. HEALTH CHECKS

Serviços importantes devem possuir mecanismos adequados para verificar saúde.

Distinguir quando necessário:

```text
liveness;
readiness.
```

---

# 358. HEALTH CHECK NÃO DEVE SER CARO

Não executar queries complexas ou operações pesadas a cada health check.

---

# 359. GRACEFUL SHUTDOWN

Serviços devem encerrar de forma segura quando aplicável.

Antes de finalizar processo:

```text
parar novos requests;
finalizar operações necessárias;
fechar pool;
parar workers;
liberar recursos.
```

---

# 360. DEPENDÊNCIAS EXTERNAS DEVEM SER AVALIADAS

Antes de adicionar biblioteca:

```text
É necessária?
Existe funcionalidade equivalente interna?
Qual peso?
Qual manutenção?
Qual superfície de segurança?
```

---

# 361. EVITAR DEPENDÊNCIAS PARA FUNÇÕES TRIVIAIS

Não adicionar uma biblioteca inteira para substituir algumas linhas simples e claras.

---

# 362. DEPENDÊNCIAS DEVEM SER ATUALIZÁVEIS

Evitar acoplamento excessivo à API de fornecedor.

Quando importante, usar adapters.

---

# 363. FEATURE FLAGS DEVEM SER CENTRALIZADAS

Funcionalidades experimentais devem utilizar mecanismo de feature flags.

Não:

```ts
if (process.env.X === 'yes')
```

espalhado.

---

# 364. FEATURE FLAGS TEMPORÁRIAS DEVEM SER REMOVIDAS

Flags não devem virar código morto permanente.

Documentar objetivo e condição de remoção.

---

# 365. FAIL FAST EM CONFIGURAÇÃO INVÁLIDA

Se ambiente obrigatório estiver incorreto:

```text
secret ausente;
URL inválida;
config inconsistente;
```

falhar na inicialização de forma clara.

Não esperar o primeiro usuário descobrir.

---

# 366. FAIL SAFE EM OPERAÇÕES DE USUÁRIO

Quando houver dúvida de segurança:

```text
negar operação;
preservar dados;
informar erro controlado.
```

---

# 367. SAFE DEFAULTS

Configurações padrão devem priorizar:

```text
segurança;
integridade;
previsibilidade.
```

---

# 368. OBSERVABILIDADE NÃO DEVE SER IMPLEMENTADA DEPOIS

Ao criar feature relevante, já definir:

```text
logs;
métricas;
falhas relevantes;
correlation.
```

---

# 369. SLO/SLA QUANDO O SISTEMA EXIGIR

Sistemas críticos podem definir objetivos como:

```text
latência;
disponibilidade;
taxa de erro.
```

Performance deve ser medida contra objetivos reais.

---

# 370. REGRA DE COMPLETION

Uma feature não deve ser considerada pronta apenas porque:

```text
"funciona na minha máquina"
```

A definição de conclusão deve considerar:

```text
funcionalidade;
arquitetura;
segurança;
backend;
banco;
performance;
UX;
testes;
observabilidade;
documentação;
AGENTS.md.
```

---

# 371. RELATÓRIO FINAL DA IMPLEMENTAÇÃO

Ao concluir alteração relevante, a IA deve apresentar de forma objetiva:

```text
1. O que foi alterado
2. Arquivos criados
3. Arquivos modificados
4. Arquivos removidos
5. Arquitetura resultante
6. Fluxo de dados
7. Segurança aplicada
8. Impacto no banco
9. Performance
10. UX
11. Testes
12. AGENTS.md criados/alterados
13. Riscos ou pontos futuros
```

---

# 372. MAPA COMPLETO PARA FEATURE FULL-STACK

Sempre que aplicável:

```text
                        ┌──────────────┐
                        │     USER     │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │      UI      │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │     HOOK     │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  API CLIENT  │
                        └──────┬───────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │    CONTROLLER    │
                      └────────┬─────────┘
                               │
                    ┌──────────▼──────────┐
                    │ VALIDATION + AUTHZ  │
                    └──────────┬──────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   SERVICE    │
                        └──────┬───────┘
                               │
                   ┌───────────┴────────────┐
                   │                        │
                   ▼                        ▼
            ┌──────────────┐         ┌──────────────┐
            │  REPOSITORY  │         │ INTEGRATION  │
            └──────┬───────┘         └──────────────┘
                   │
                   ▼
            ┌──────────────┐
            │   DATABASE   │
            └──────────────┘
```

---

# 373. MAPA DE RESPONSABILIDADES DOS AGENTES

```text
                           FEATURE
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        ENGINEERING      DEVELOPMENT       SECURITY
             │                │                │
             │                │                ├── Sanitization
             │                │                ├── Authorization
             │                │                └── Threat Review
             │                │
             ▼                ▼
        Architecture       Code
             │
      ┌──────┼───────┐
      │      │       │
      ▼      ▼       ▼
 DATABASE   API   PERFORMANCE
      │              │
      ▼              ▼
 Integrity       Efficiency
      │              │
      └──────┬───────┘
             │
             ▼
          TESTING
             │
             ▼
      OBSERVABILITY
             │
             ▼
           UI/UX
             │
             ▼
        USER EXPERIENCE
```

---

# 374. ORDEM DE ANÁLISE OBRIGATÓRIA

Para uma funcionalidade relevante, seguir conceitualmente:

```text
1. Entender requisito
2. Mapear arquitetura existente
3. Encontrar componentes reutilizáveis
4. Definir owner da responsabilidade
5. Verificar AGENTS.md aplicáveis
6. Avaliar segurança
7. Avaliar modelo de dados
8. Avaliar backend/API
9. Avaliar performance
10. Avaliar UX
11. Implementar
12. Criar/ajustar testes
13. Executar validações
14. Atualizar documentação
15. Atualizar AGENTS.md
16. Revisar arquitetura final
```

---

# 375. REGRA DE NÃO CONTORNAR ARQUITETURA

A IA nunca deve resolver rapidamente uma demanda utilizando atalho que viole explicitamente estas regras.

Exemplo:

```text
"É mais rápido chamar o ORM diretamente do componente."
```

Não é justificativa.

```text
"É mais rápido duplicar essa função."
```

Não é justificativa.

```text
"É mais rápido não validar no backend."
```

Nunca é justificativa.

---

# 376. REGRA DE PREVENÇÃO DE DÍVIDA TÉCNICA

Antes de adicionar uma solução, perguntar:

> "Essa decisão fará a próxima alteração ficar mais fácil ou mais difícil?"

Preferir estruturas que reduzam o custo de manutenção futura.

---

# 377. REGRA DE SEGURANÇA MÁXIMA RAZOÁVEL

Sempre implementar o nível máximo razoável de segurança compatível com a funcionalidade, sem criar mecanismos artificiais que prejudiquem severamente usabilidade ou manutenção sem benefício real.

Priorizar:

```text
prevenção;
isolamento;
validação;
menor privilégio;
observabilidade;
recuperação.
```

---

# 378. REGRA DE PERFORMANCE MÁXIMA RAZOÁVEL

Sempre buscar excelente desempenho sem sacrificar:

```text
correção;
legibilidade;
segurança;
integridade;
manutenção.
```

Otimizações complexas devem possuir justificativa mensurável.

---

# 379. REGRA DE UX MÁXIMA RAZOÁVEL

Sempre buscar tornar a tarefa do usuário:

```text
mais clara;
mais rápida;
mais previsível;
menos cansativa;
menos sujeita a erro.
```

Sem comprometer segurança ou integridade.

---

# 380. REGRA DE BANCO DE DADOS

Banco de dados nunca deve ser tratado como detalhe secundário.

Qualquer mudança que altere:

```text
dados;
consultas;
filtros;
relacionamentos;
volume;
ordenação;
busca;
exclusão;
integridade;
```

deve gerar análise explícita da camada de banco.

---

# 381. REGRA DE BACKEND

Backend nunca deve ser tratado apenas como intermediário entre frontend e banco.

Backend é responsável por:

```text
segurança;
autorização;
regras de negócio;
orquestração;
integridade;
validação;
controle de recursos;
observabilidade.
```

---

# 382. REGRA DE FRONTEND

Frontend é responsável por:

```text
experiência;
estado;
feedback;
acessibilidade;
interação;
apresentação;
validação para UX.
```

Mas nunca é a única camada responsável por segurança ou integridade.

---

# 383. REGRA DO BANCO COMO ÚLTIMA LINHA DE INTEGRIDADE

Mesmo que backend possua validações, utilizar capacidades do banco quando apropriado para impedir estados impossíveis.

Exemplo:

```text
UNIQUE;
FOREIGN KEY;
NOT NULL;
CHECK.
```

---

# 384. REGRA DE DUPLA VALIDAÇÃO COM PROPÓSITOS DIFERENTES

Frontend:

```text
valida para experiência rápida.
```

Backend:

```text
valida para segurança e consistência.
```

Banco:

```text
protege integridade estrutural.
```

Não considerar isso duplicação indevida.

São barreiras com responsabilidades diferentes.

---

# 385. REGRA DE REUTILIZAÇÃO SEGURA

Não generalizar duas funcionalidades apenas porque parecem semelhantes se possuírem regras de segurança ou domínio diferentes.

Reutilização deve preservar contexto e invariantes.

---

# 386. REGRA DE ABSTRAÇÃO DE INFRAESTRUTURA

Dependências de:

```text
database;
cache;
queue;
storage;
email;
payment provider;
third-party APIs;
```

devem permanecer isoladas atrás de interfaces/adapters quando isso trouxer benefício real.

---

# 387. REGRA DE DEPENDÊNCIA DIRECIONAL

Preferir:

```text
UI
↓
Application
↓
Domain
↓
Interfaces

Infrastructure
↓
implementa Interfaces
```

Evitar domínio dependente diretamente de detalhes de infraestrutura quando a aplicação justificar essa separação.

---

# 388. REGRA DE MANUTENIBILIDADE HUMANA

O objetivo final não é apenas criar código que a IA compreende.

É criar código que um desenvolvedor humano consiga navegar rapidamente.

Portanto:

```text
nomes claros;
arquivos pequenos;
árvore previsível;
mapas visuais;
AGENTS.md;
documentação;
APIs internas simples.
```

são requisitos fundamentais.

---

# 389. REGRA DE AUTONOMIA CONTROLADA DOS AGENTES

Agentes especializados podem identificar e corrigir problemas pertencentes à sua região quando isso estiver claramente dentro do escopo da tarefa.

Porém não devem realizar alterações amplas, destrutivas ou arquiteturais sem considerar:

```text
impacto;
dependências;
testes;
migração;
segurança.
```

---

# 390. AGENTS.MD COMO CONTRATO DA REGIÃO

Considere cada `AGENTS.md` como um contrato arquitetural daquela região.

Ele deve responder:

```text
O que essa região faz?
O que ela não deve fazer?
Quais padrões deve seguir?
Quais agentes devem avaliá-la?
Quais dependências são permitidas?
Quais regras de segurança existem?
Quais testes são obrigatórios?
Como saber se uma alteração está pronta?
```

---

# 391. EXEMPLO DE ESTRUTURA COMPLETA

```text
src/
├── AGENTS.md
│
├── frontend/
│   ├── AGENTS.md
│   ├── components/
│   ├── features/
│   │   ├── customers/
│   │   │   ├── AGENTS.md
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── config/
│   │   │   ├── themes/
│   │   │   ├── types/
│   │   │   └── tests/
│   │   └── orders/
│   │       └── ...
│   └── i18n/
│
├── backend/
│   ├── AGENTS.md
│   ├── modules/
│   │   ├── customers/
│   │   │   ├── AGENTS.md
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── validators/
│   │   │   ├── policies/
│   │   │   ├── mappers/
│   │   │   └── tests/
│   │   └── orders/
│   │       └── ...
│   └── shared/
│
├── database/
│   ├── AGENTS.md
│   ├── migrations/
│   ├── seeds/
│   ├── schemas/
│   └── queries/
│
├── security/
│   ├── AGENTS.md
│   ├── authorization/
│   ├── sanitization/
│   ├── audit/
│   └── rateLimit/
│
├── integrations/
│   ├── AGENTS.md
│   └── ...
│
├── workers/
│   ├── AGENTS.md
│   └── ...
│
├── themes/
├── config/
├── logger/
└── tests/
    └── AGENTS.md
```

A estrutura exata pode variar conforme o projeto.

O princípio não varia:

> **cada região deve possuir responsabilidade clara, regras locais claras e agentes responsáveis claramente definidos.**

---

# 392. PRINCÍPIO FINAL DE ARQUITETURA FULL-STACK

Toda funcionalidade deve ser tratada como um fluxo completo:

```text
Experiência
+
Frontend
+
API
+
Backend
+
Segurança
+
Banco
+
Performance
+
Testes
+
Observabilidade
+
Documentação
=
Feature realmente concluída
```

---

# 393. PRINCÍPIO FINAL DOS AGENTES

Nenhum agente deve trabalhar de forma isolada mentalmente.

Uma mudança no banco pode afetar:

```text
API
performance
backend
testes
```

Uma mudança no frontend pode afetar:

```text
UX
API
cache
performance
```

Uma mudança de autenticação pode afetar praticamente toda a aplicação.

Os arquivos `AGENTS.md` existem justamente para tornar essas interdependências explícitas.

---

# 394. REGRA ABSOLUTA FINAL

Ao receber qualquer solicitação de programação, a IA deve pensar primeiro:

```text
1. Em qual região essa mudança pertence?
2. Quem é o owner dessa responsabilidade?
3. Quais AGENTS.md se aplicam?
4. Já existe algo reutilizável?
5. Existe impacto no frontend?
6. Existe impacto no backend?
7. Existe impacto no banco?
8. Existe risco de segurança?
9. Existe impacto de performance?
10. Existe impacto de UX?
11. Como isso será testado?
12. Como isso será observado em produção?
13. A arquitetura continuará fácil para um humano entender?
```

Somente depois deve decidir como implementar.

O objetivo nunca deve ser simplesmente:

> **"Fazer funcionar."**

O objetivo deve ser:

> **"Fazer funcionar corretamente, de forma segura, rápida, escalável, reutilizável, testável, observável, fácil de usar e fácil de manter."**


## REGRA ABSOLUTA

**Nunca priorize velocidade de implementação sobre organização arquitetural quando isso resultar em duplicação, arquivos gigantes, responsabilidades misturadas ou dívida técnica desnecessária.**

Antes de adicionar mais código, sempre considere primeiro:

> **"Existe uma maneira mais modular, reutilizável, simples e sustentável de fazer isso?"**

Se existir, utilize-a.
