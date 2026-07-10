# ViralCaption

SaaS que gera hooks, legendas, emojis e hashtags virais para TikTok, Instagram Reels e YouTube Shorts.

## Integração com Stripe (plano Pro)

O plano Pro é uma assinatura mensal cobrada via Stripe. Para funcionar, as
seguintes variáveis de ambiente precisam ser configuradas **no ambiente do
projeto (server-side apenas — nunca com prefixo `VITE_`)**:

| Variável | Descrição |
| --- | --- |
| `STRIPE_SECRET_KEY` | Chave secreta da API do Stripe (`sk_live_...` / `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do endpoint de webhook (`whsec_...`). |
| `STRIPE_PRICE_ID_PRO` | ID do preço da assinatura mensal do plano Pro (`price_...`). |

Um modelo está disponível em [`.env.example`](./.env.example).

### Endpoint de webhook

Configure no painel do Stripe um webhook apontando para:

```
https://<seu-dominio>/api/public/stripe-webhook
```

Eventos necessários:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

O handler valida o header `Stripe-Signature` com `STRIPE_WEBHOOK_SECRET`
antes de processar qualquer evento.
