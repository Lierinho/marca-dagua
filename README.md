# Marca d'Água 💧

Lembrete de água para o **Amazfit Bip Max** (Zepp OS 5, tela quadrada 432×514).

Você escolhe um intervalo (ex.: 1 h) e o relógio avisa, vibra e **recomeça o timer sozinho**, sem precisar tocar em nada e sem criar alarmes.

<img src="assets/gt.s/icon.png" width="96" alt="Ícone">

## Como funciona

- **Tela principal:** um círculo com água que vai **esvaziando** conforme o tempo passa (sem animação, atualiza a cada segundo), uma gota no centro e a contagem regressiva embaixo.
- **Deslize para cima** e os ajustes sobem por baixo da tela (deslize para baixo para voltar):
  - **Intervalo:** de 5 min a 4 h, o mesmo para todos os perfis.
  - **Dias e horários:** uma caixa que abre a lista de perfis.
  - **Ligar/desligar** os avisos.
  - **Salva sozinho**, cerca de 1,5 s depois do último toque.
- **Perfis de dias e horários:** até 3 perfis, cada um com seus dias da semana e horário de início e fim (passos de 30 min).
  - O primeiro é o **padrão** e não pode ser excluído. Use **+ Novo perfil** para criar outros (ex.: um para Seg a Sex e outro para Sáb e Dom).
  - O nome é automático pelos dias escolhidos, como "Seg a Sex" ou "Ter e Qui".
  - **Cada dia fica em um só perfil:** ao ativar um dia que pertence a outro perfil (botão cinza), ele passa para o perfil atual.
- **Aviso:** uma notificação "Hora de beber água!" com vibração. O próximo ciclo começa na hora, mesmo que você não veja o aviso.
- **O cronômetro segue o horário do perfil:** os avisos caem sempre em início + intervalo, início + 2 × intervalo e assim por diante (ex.: 09:00, 10:00, 11:00 para início às 08:00 e intervalo de 1 h). Mudar dias ou horários não zera a contagem. Mudar o intervalo recalcula a grade a partir do início.

### Por dentro

| Arquivo | Função |
|---|---|
| `utils/schedule.js` | Lógica pura: calcula o próximo aviso pelos perfis (dias, janela de horário, intervalo). Tem testes. |
| `utils/alarm.js` | Agenda um alarme único (`@zos/alarm`) que acorda o serviço. A configuração vai no `param` do alarme. |
| `app-service/reminder.js` | Serviço sem tela: envia a notificação e agenda o próximo alarme (encadeado). |
| `page/index.js` | Tela com o círculo de água e, deslizando para cima, o painel de ajustes (swiper vertical). |
| `page/profiles.js` / `page/profile.js` | Lista de perfis e edição de um perfil. |
| `utils/draft.js` | Cópia dos ajustes em edição, compartilhada entre as telas e salva automaticamente. |
| `utils/ui.js` | Botões, linhas "- valor +" e caixas reaproveitados nas telas. |
| `scripts/gen-icons.mjs` | Gera o ícone e a gota em PNG, sem dependências. |

Ao abrir o app, o alarme é sempre reagendado. Se a corrente de alarmes quebrar por algum motivo (por exemplo, relógio desligado), abrir o app conserta.

## Limitações

- O desenho da água só é atualizado com o app aberto. Em segundo plano roda apenas o alarme, o que economiza bateria.
- Nos modos **Não Perturbe** e **sono**, o sistema pode silenciar a vibração.
- Os horários de início e fim são do mesmo dia (não atravessam a meia-noite).

## Rodar e instalar

Pré-requisitos: Node.js 18 ou mais novo e o [Zeus CLI](https://docs.zepp.com/docs/guides/tools/cli/).

```bash
npm install -g @zeppos/zeus-cli
```

```bash
npm install
```

Testes da lógica de agendamento:

```bash
npm test
```

Simulador (instale o [Zepp OS Simulator](https://docs.zepp.com/docs/guides/tools/simulator/) e escolha o Bip Max):

```bash
zeus dev
```

**No relógio de verdade:**

1. Crie uma conta gratuita em [console.zepp.com](https://console.zepp.com).
2. No app Zepp do celular, ative o Modo Desenvolvedor: Perfil → Configurações → Sobre → toque 7× no ícone do Zepp.
3. Faça login no Zeus e gere o QR code:

   ```bash
   zeus login
   ```

   ```bash
   zeus preview
   ```

4. No app Zepp, vá em **Dispositivos** → role até o final → **Geral** → **Modo desenvolvedor** → **+** → **Scan** e leia o QR code.

> Se o `zeus preview` reclamar do `appId`, crie um app no console da Zepp e troque o `appId` em `app.json` pelo número gerado.

Para testar rápido, configure o intervalo de 5 min, feche o app e espere a notificação.

## Ícones

```bash
npm run icons
```

Isso regenera `assets/gt.s` (tela quadrada) e `assets/gt.r` (tela redonda).

## Licença

MIT
