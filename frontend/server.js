import express from 'express';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./src/public"));
// Conecta ou cria o arquivo do banco de dados na sua pasta
const db = new sqlite3.Database('./banco.db', (err) => {
    if (err) {
        console.error('Erro ao abrir o banco:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite com sucesso!');
    }
});

// Cria a tabela de CLIENTES caso ela ainda não exista
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            telefone TEXT,
            endereco TEXT,
            cpfCnpj TEXT,
            dataRegistro TEXT
        )
    `);

    db.run(`ALTER TABLE clientes ADD COLUMN endereco TEXT`, err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Erro ao adicionar endereço:", err.message);
        }
    });

    db.run(`ALTER TABLE clientes ADD COLUMN cpfCnpj TEXT`, err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Erro ao adicionar CPF/CNPJ:", err.message);
        }
    });

    db.run(`ALTER TABLE clientes ADD COLUMN dataRegistro TEXT`, err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Erro ao adicionar data de registro:", err.message);
        }
    });
});

// ROTA 1: Buscar clientes
app.get('/clientes', (req, res) => {
    const busca = req.query.busca?.trim() || "";

    const sql = `
        SELECT * FROM clientes
        WHERE nome LIKE ?
           OR telefone LIKE ?
           OR cpfCnpj LIKE ?
        ORDER BY nome
    `;

    const termo = `%${busca}%`;

    db.all(sql, [termo, termo, termo], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});
// ROTA: Buscar pets de um cliente

app.get('/pets/:idCliente', (req, res) => {
    const { idCliente } = req.params;

    const sql = `
        SELECT * FROM pets
        WHERE idCliente = ?
        ORDER BY nomePet
    `;

    db.all(sql, [idCliente], (err, rows) => {
        if (err) {
            return res.status(500).json({ erro: err.message });
        }

        res.json(rows);
    });
});
// ROTA 2: Cadastrar um novo cliente

app.post('/clientes', (req, res) => {
    const { nome, email, telefone, endereco, cpfCnpj, dataRegistro } = req.body;

    if (!nome || !email) {
        return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });
    }

    const sql = `
        INSERT INTO clientes (nome, email, telefone, endereco, cpfCnpj, dataRegistro)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [nome, email, telefone, endereco, cpfCnpj, dataRegistro], function (err) {
        if (err) return res.status(400).json({ erro: "E-mail de cliente já cadastrado!" });

        res.status(201).json({
            id: this.lastID,
            nome,
            email,
            telefone,
            endereco,
            cpfCnpj,
            dataRegistro
        });
    });
});

// ROTA: Editar cliente

app.put('/clientes/:id', (req, res) => {
    const { id } = req.params;

    const {
        nome,
        email,
        telefone,
        endereco,
        cpfCnpj,
        dataRegistro
    } = req.body;

    if (!nome || !email) {
        return res.status(400).json({
            erro: "Nome e e-mail são obrigatórios."
        });
    }

    const sql = `
        UPDATE clientes
        SET nome = ?,
            email = ?,
            telefone = ?,
            endereco = ?,
            cpfCnpj = ?,
            dataRegistro = ?
        WHERE id = ?
    `;

    db.run(sql, [
        nome,
        email,
        telefone,
        endereco,
        cpfCnpj,
        dataRegistro,
        id
    ], function(err) {
        if (err) {
            return res.status(400).json({
                erro: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        res.json({
            mensagem: "Cliente atualizado com sucesso!"
        });
    });
});

// ROTA: Excluir pet

app.delete('/pets/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM pets WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(400).json({
                erro: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                erro: "Pet não encontrado."
            });
        }

        res.json({
            mensagem: "Pet excluído com sucesso!"
        });
    });
});

// ROTA: Excluir cliente

app.delete('/clientes/:id', (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT COUNT(*) AS quantidade FROM pets WHERE idCliente = ?`,
        [id],
        (err, resultado) => {
            if (err) {
                return res.status(400).json({
                    erro: err.message
                });
            }

            if (resultado.quantidade > 0) {
                return res.status(400).json({
                    erro: "Não é possível excluir o cliente enquanto ele possuir pets cadastrados."
                });
            }

            db.run(`DELETE FROM clientes WHERE id = ?`, [id], function(err) {
                if (err) {
                    return res.status(400).json({
                        erro: err.message
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({
                        erro: "Cliente não encontrado."
                    });
                }

                res.json({
                    mensagem: "Cliente excluído com sucesso!"
                });
            });
        }
    );
});

// ROTA 3: Cadastrar um novo pet

app.post('/pets', (req, res) => {
    const {
        idCliente,
        nomePet,
        sexo,
        tipoPet,
        raca,
        porte,
        tipoOutro,
        caracteristicasPet,
        detalhesServico,
        observacoes
    } = req.body;

    if (!idCliente || !nomePet) {
        return res.status(400).json({ erro: "Cliente e nome do pet são obrigatórios." });
    }

    const sql = `
        INSERT INTO pets (
            idCliente,
            nomePet,
            sexo,
            tipoPet,
            raca,
            porte,
            tipoOutro,
            caracteristicasPet,
            detalhesServico,
            observacoes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        idCliente,
        nomePet,
        sexo,
        tipoPet,
        raca,
        porte,
        tipoOutro,
        caracteristicasPet,
        detalhesServico,
        observacoes
    ], function(err) {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }

        res.status(201).json({
            id: this.lastID,
            idCliente,
            nomePet,
            sexo,
            tipoPet,
            raca,
            porte,
            tipoOutro,
            caracteristicasPet,
            detalhesServico,
            observacoes
        });
    });
});
// ROTA: Editar pet

app.put('/pets/:id', (req, res) => {
    const { id } = req.params;

    const {
        nomePet,
        sexo,
        tipoPet,
        raca,
        porte,
        tipoOutro,
        caracteristicasPet,
        detalhesServico,
        observacoes
    } = req.body;

    if (!nomePet) {
        return res.status(400).json({
            erro: "Nome do pet é obrigatório."
        });
    }

    const sql = `
        UPDATE pets
        SET nomePet = ?,
            sexo = ?,
            tipoPet = ?,
            raca = ?,
            porte = ?,
            tipoOutro = ?,
            caracteristicasPet = ?,
            detalhesServico = ?,
            observacoes = ?
        WHERE id = ?
    `;

    db.run(sql, [
        nomePet,
        sexo,
        tipoPet,
        raca,
        porte,
        tipoOutro,
        caracteristicasPet,
        detalhesServico,
        observacoes,
        id
    ], function(err) {
        if (err) {
            return res.status(400).json({
                erro: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                erro: "Pet não encontrado."
            });
        }

        res.json({
            mensagem: "Pet atualizado com sucesso!"
        });
    });
});

app.get('/teste', (req, res) => {
    res.send('ROTA FUNCIONANDO');
});
// LIGA O SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
