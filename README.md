# PIX Sicoob - Exemplo de integração (Recebimentos)

**Aviso importante de segurança:** não compartilhe certificados privados, senhas ou Client IDs em canais públicos. Se você já compartilhou credenciais, considere rotacioná-las. Este projeto é um **exemplo** e deve ser adaptado e auditado antes de uso em produção.

## Estrutura
```
pix-sicoob/
├─ server.js
├─ package.json
├─ .env.example
├─ README.md
├─ public/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
└─ htdocs/cert/
   ├─ chave_privada.pem    # **COLOQUE AQUI** sua chave privada
   └─ ChavePública.pem     # **COLOQUE AQUI** seu certificado público
```

## O que este projeto faz
- Faz a troca de token com o endpoint de autenticação do Sicoob usando **mTLS** (cliente TLS) com o certificado e chave privados.
- Cria cobranças imediatas (endpoint `/api/cob`) chamando a API Pix Recebimentos do Sicoob.
- Gera um QR Code no frontend com os dados retornados (quando disponível).
- Recebe notificações de webhook em `/api/webhook` (exemplo).

## Configuração
1. Copie ` .env.example` para `.env` e preencha as variáveis (caminhos, CLIENT_ID, PIX_KEY, etc.).
2. Coloque seus arquivos `chave_privada.pem` e `ChavePública.pem` em `htdocs/cert/`.
3. `npm install`
4. `npm start`
5. Abra `http://localhost:3000` e teste o envio de cobrança.

## Variáveis importantes (.env)
- `AUTH_URL` - URL do token (ex: https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token)
- `SICOOB_BASE_URL` - Base da API Pix (ex: https://api.sicoob.com.br/pix/api/v2)
- `CLIENT_ID` - seu Client ID
- `CERT_PATH` e `KEY_PATH` - caminhos para certificado público e chave privada
- `CERT_PASSPHRASE` - senha da chave (opcional)
- `PIX_KEY` - sua chave pix (CNPJ)

## Observações finais
- Este exemplo não cobre todos os detalhes de segurança e validação que um sistema em produção exige.
- Teste em ambiente sandbox antes de ir para produção.
- Recomenda-se registrar logs, monitoramento e tratamento de erros robusto.

