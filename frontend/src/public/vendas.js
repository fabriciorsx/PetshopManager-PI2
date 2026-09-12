const formVenda = document.getElementById("formVenda");
const buscaCliente = document.getElementById("buscaClienteVenda");
const dadosCliente = document.getElementById("dadosClienteSelecionado");
const dadosPet = document.getElementById("dadosPet");
const tiposVenda = document.querySelectorAll('input[name="tipoVenda"]');

/* NOVA VENDA */

document.getElementById("btnNovaVenda").addEventListener("click", () => {
    formVenda.reset();
    buscaCliente.hidden = false;
    dadosCliente.hidden = true;
    dadosPet.hidden = true;
    document.getElementById("dataVenda").value = new Date().toISOString().split("T")[0];
});

/* TIPO DE VENDA */

tiposVenda.forEach(tipo => {
    tipo.addEventListener("change", () => {
        const vendaCliente = tipo.value === "cliente";
        buscaCliente.hidden = !vendaCliente;
        dadosCliente.hidden = true;
        dadosPet.hidden = true;
    });
});