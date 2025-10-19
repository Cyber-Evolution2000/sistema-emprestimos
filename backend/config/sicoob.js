// backend/config/sicoob.js
class SicoobPixAPI {
    constructor() {
        this.baseURL = 'https://api.sicoob.com.br/pix/api/v2';
        this.clientId = process.env.SICOOB_CLIENT_ID;
        this.certificatePath = process.env.SICOOB_CERT_PATH;
        this.privateKeyPath = process.env.SICOOB_KEY_PATH;
    }

    async generateAccessToken() {
        // Implementar autenticação OAuth2 com certificado digital
        // Requer certificado A1 (.pfx) ou A3 (token)
        const token = await this.authenticateWithCertificate();
        return token;
    }

    async createCobrancaImediata(txid, cobrancaData) {
        const token = await this.generateAccessToken();
        
        const response = await fetch(`${this.baseURL}/cob/${txid}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'client_id': this.clientId,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cobrancaData)
        });

        if (!response.ok) {
            throw new Error(`Erro Sicoob API: ${response.status}`);
        }

        return await response.json();
    }

    async consultarCobranca(txid) {
        const token = await this.generateAccessToken();
        
        const response = await fetch(`${this.baseURL}/cob/${txid}`, {
            method: 'GET',
            headers: {
                'client_id': this.clientId,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erro Sicoob API: ${response.status}`);
        }

        return await response.json();
    }

    async criarLocation(tipoCob = 'cob') {
        const token = await this.generateAccessToken();
        
        const response = await fetch(`${this.baseURL}/loc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client_id': this.clientId,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tipoCob })
        });

        if (!response.ok) {
            throw new Error(`Erro Sicoob API: ${response.status}`);
        }

        return await response.json();
    }

    async consultarPixRecebidos(inicio, fim) {
        const token = await this.generateAccessToken();
        
        const response = await fetch(`${this.baseURL}/pix?inicio=${inicio}&fim=${fim}`, {
            method: 'GET',
            headers: {
                'client_id': this.clientId,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erro Sicoob API: ${response.status}`);
        }

        return await response.json();
    }
}

module.exports = new SicoobPixAPI();