const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// Dados de exemplo
const defaultData = [
    {
        "cpf": "07220135319",
        "nome": "Patricia da Silva Oliveira",
        "email": "patricia.silva@email.com",
        "endereco": "Edificio Ipanema, Emperatriz - MA",
        "telefone": "98984894575",
        "emprestimos": [
            {
                "valorTotal": 7866.0,
                "parcelas": 5,
                "boletos": [
                    {
                        "parcela": 1,
                        "valor": 1573.20,
                        "vencimento": "10-01-2024",
                        "status": "Pago"
                    },
                    {
                        "parcela": 2,
                        "valor": 1573.20,
                        "vencimento": "10-02-2024",
                        "status": "Pago"
                    },
                    {
                        "parcela": 3,
                        "valor": 1573.20,
                        "vencimento": "10-03-2024", 
                        "status": "Pendente"
                    },
                    {
                        "parcela": 4,
                        "valor": 1573.20,
                        "vencimento": "10-04-2024",
                        "status": "Pendente"
                    },
                    {
                        "parcela": 5,
                        "valor": 1573.20,
                        "vencimento": "10-05-2024",
                        "status": "Pendente"
                    }
                ]
            }
        ]
    },
    {
        "cpf": "70277930162", 
        "nome": "Wylck Lorrhan Nascimento dos Santos",
        "email": "wylck.lorrhan@email.com",
        "endereco": "Rua das Macieiras Nº 219, Centro - Bom Jesus das Selvas/MA",
        "telefone": "98985417436",
        "emprestimos": [
            {
                "valorTotal": 5000.0,
                "parcelas": 3,
                "boletos": [
                    {
                        "parcela": 1,
                        "valor": 1666.67,
                        "vencimento": "15-12-2023",
                        "status": "Atrasado"
                    },
                    {
                        "parcela": 2,
                        "valor": 1666.67,
                        "vencimento": "15-01-2024",
                        "status": "Pendente"
                    },
                    {
                        "parcela": 3,
                        "valor": 1666.66,
                        "vencimento": "15-02-2024",
                        "status": "Pendente"
                    }
                ]
            }
        ]
    },
    {
        "cpf": "12345678909",
        "nome": "João da Silva Santos",
        "email": "joao.silva@email.com", 
        "endereco": "Av. Paulista, 1000, São Paulo - SP",
        "telefone": "11987654321",
        "emprestimos": [
            {
                "valorTotal": 10000.0,
                "parcelas": 4,
                "boletos": [
                    {
                        "parcela": 1,
                        "valor": 2500.00,
                        "vencimento": "05-11-2023",
                        "status": "Atrasado"
                    },
                    {
                        "parcela": 2,
                        "valor": 2500.00,
                        "vencimento": "05-12-2023", 
                        "status": "Atrasado"
                    },
                    {
                        "parcela": 3,
                        "valor": 2500.00,
                        "vencimento": "05-01-2024",
                        "status": "Pendente"
                    },
                    {
                        "parcela": 4,
                        "valor": 2500.00,
                        "vencimento": "05-02-2024",
                        "status": "Pendente"
                    }
                ]
            }
        ]
    }
];

class Database {
    constructor() {
        this.ensureDatabaseExists();
    }

    ensureDatabaseExists() {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
        }
    }

    read() {
        try {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao ler banco de dados:', error);
            return defaultData;
        }
    }

    write(data) {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Erro ao escrever no banco de dados:', error);
            return false;
        }
    }

    findClientByCPF(cpf) {
        const data = this.read();
        return data.find(client => client.cpf === cpf);
    }

    updateClient(updatedClient) {
        const data = this.read();
        const index = data.findIndex(client => client.cpf === updatedClient.cpf);
        
        if (index !== -1) {
            data[index] = updatedClient;
            return this.write(data);
        }
        return false;
    }
}

module.exports = new Database();