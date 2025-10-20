const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'Conectado' });
  } catch (error) {
    res.json({ status: 'ERROR', error: error.message });
  }
});

app.post('/api/admin/clientes', async (req, res) => {
  try {
    const { cpf, nome, telefone } = req.body;
    const result = await pool.query(
      'INSERT INTO clientes (cpf, nome, telefone) VALUES ($1, $2, $3) RETURNING *',
      [cpf, nome, telefone]
    );
    res.json({ success: true, message: '✅ Cliente salvo no banco!', cliente: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});