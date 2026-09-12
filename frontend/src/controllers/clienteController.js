export const listarClientes = (req, res) => {
    res.json([
        {
            id: 1,
            nome: "CLIENTE TESTE",
            telefone: "(11) 99999-9999",
            cpfCnpj: "123.456.789-00"
        }
    ]);
};