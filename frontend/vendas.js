// =====================================================
// CONFIGURAÇÃO DA API
// =====================================================

const API_URL = "http://localhost:3000/api";

// O model Sale exige customerId. Para "Venda Externa" informe aqui o id de um
// cliente genérico (ex.: "CONSUMIDOR FINAL") cadastrado no banco.
// Enquanto for null, a venda externa é bloqueada com um aviso.
const CLIENTE_AVULSO_ID = null;

async function api(caminho, opcoes = {}) {
    const resposta = await fetch(API_URL + caminho, {
        headers: { "Content-Type": "application/json" },
        ...opcoes
    });

    let dados = null;
    if (resposta.status !== 204) {
        const texto = await resposta.text();
        if (texto) {
            try { dados = JSON.parse(texto); } catch { dados = texto; }
        }
    }

    if (!resposta.ok) {
        const msg = (dados && (dados.message || dados.erro || dados.error)) || `Erro ${resposta.status}`;
        throw new Error(msg);
    }
    return dados;
}

const extrairLista = d => Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.results ?? []);
const extrairItem = d => d?.data ?? d;

function esc(valor) {
    const div = document.createElement("div");
    div.textContent = valor ?? "";
    return div.innerHTML;
}

const $ = id => document.getElementById(id);
const moeda = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = v => Number(String(v ?? "").replace(",", ".")) || 0;
const dataBR = v => v ? new Date(v).toLocaleDateString("pt-BR") : "";
const codigoVenda = id => String(id ?? "").slice(0, 8).toUpperCase();
const foiCancelada = v => String(v?.status ?? "").toUpperCase().startsWith("CANCEL");

// =====================================================
// ELEMENTOS
// =====================================================

const formVenda = $("formVenda");
const buscaCliente = $("buscaClienteVenda");
const dadosCliente = $("dadosClienteSelecionado");
const dadosPet = $("dadosPet");
const tiposVenda = document.querySelectorAll('input[name="tipoVenda"]');

const listaClientesVenda = $("listaClientesVenda");
const tabelaClientesVenda = $("tabelaClientesVenda");
const listaVendas = $("listaVendas");
const tabelaVendas = $("tabelaVendas");
const tabelaItens = $("tabelaItensVenda");

// =====================================================
// ESTADO
// =====================================================

let clientesEncontrados = [];
let clienteAtual = null;
let vendasEncontradas = [];
let historicoPet = [];
let produtos = [];
let servicos = [];
let itens = [];            // { tipo, itemId, nome, quantidade, precoUnitario, desconto }
let modoConsulta = false;  // true = venda já registrada (somente leitura)
let vendaAberta = null;

const novoItem = () => ({ tipo: "produto", itemId: "", nome: "", quantidade: 1, precoUnitario: 0, desconto: 0 });

const vendaComCliente = () =>
    (document.querySelector('input[name="tipoVenda"]:checked')?.value ?? "cliente") === "cliente";

// =====================================================
// BLOQUEIO DO FORMULÁRIO
// =====================================================

const camposEditaveis = [
    "dataVenda", "campoBuscaCliente", "btnPesquisarCliente", "formaPagamento",
    "valorRecebido", "descontoVenda", "taxaPagamento", "observacoes",
    "petSelecionado", "btnAdicionarItem", "btnSalvarVenda"
];

function bloquearVenda(bloquear) {
    camposEditaveis.forEach(id => { $(id).disabled = bloquear; });
    tiposVenda.forEach(r => { r.disabled = bloquear; });
}

// =====================================================
// NOVA VENDA
// =====================================================

function novaVenda() {
    formVenda.reset();
    modoConsulta = false;
    vendaAberta = null;
    clienteAtual = null;
    clientesEncontrados = [];
    historicoPet = [];
    itens = [];

    $("idVenda").value = "";
    bloquearVenda(false);
    $("btnExcluirVenda").disabled = false;

    buscaCliente.hidden = false;
    listaClientesVenda.hidden = true;
    listaVendas.hidden = true;
    dadosCliente.hidden = true;
    dadosPet.hidden = true;

    $("dataVenda").value = new Date().toISOString().split("T")[0];
    renderItens();
}

$("btnNovaVenda").addEventListener("click", novaVenda);

// =====================================================
// TIPO DE VENDA
// =====================================================

tiposVenda.forEach(tipo => {
    tipo.addEventListener("change", () => {
        const vendaCliente = tipo.value === "cliente";
        buscaCliente.hidden = !vendaCliente;
        listaClientesVenda.hidden = true;
        dadosCliente.hidden = true;
        dadosPet.hidden = true;
        clienteAtual = null;
    });
});

// =====================================================
// CATÁLOGO   GET /products  |  GET /services
// =====================================================

async function carregarCatalogo() {
    try {
        const [dp, ds] = await Promise.all([
            api("/products?page=1&limit=100"),
            api("/services?page=1&limit=100")
        ]);
        produtos = extrairLista(dp).filter(p => p.ativo !== false);
        servicos = extrairLista(ds).filter(s => s.ativo !== false);
        if (!modoConsulta) renderItens();
    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);
        alert("Erro ao carregar produtos e serviços: " + erro.message);
    }
}

const catalogoDoTipo = tipo => tipo === "servico" ? servicos : produtos;

// =====================================================
// ITENS DA VENDA
// =====================================================

const totalItem = i => Math.max(i.quantidade * i.precoUnitario - i.desconto, 0);

function renderItens() {
    if (itens.length === 0) {
        tabelaItens.innerHTML = `<tr><td colspan="7">Nenhum item adicionado.</td></tr>`;
        atualizarTotais();
        return;
    }

    tabelaItens.innerHTML = itens.map((i, idx) => {
        if (modoConsulta) {
            return `
                <tr>
                    <td>${i.tipo === "servico" ? "Serviço" : "Produto"}</td>
                    <td>${esc(i.nome)}</td>
                    <td>${i.quantidade}</td>
                    <td>${moeda(i.precoUnitario)}</td>
                    <td>${moeda(i.desconto)}</td>
                    <td>${moeda(totalItem(i))}</td>
                    <td></td>
                </tr>`;
        }

        const opcoes = catalogoDoTipo(i.tipo).map(c => {
            const extra = i.tipo === "servico" ? "" : ` (estoque: ${c.estoqueAtual})`;
            const sel = String(c.id) === String(i.itemId) ? " selected" : "";
            return `<option value="${esc(c.id)}"${sel}>${esc(c.nome)}${extra}</option>`;
        }).join("");

        return `
            <tr data-index="${idx}">
                <td>
                    <select class="itemTipo">
                        <option value="produto"${i.tipo === "produto" ? " selected" : ""}>Produto</option>
                        <option value="servico"${i.tipo === "servico" ? " selected" : ""}>Serviço</option>
                    </select>
                </td>
                <td>
                    <select class="itemSelect">
                        <option value="">Selecione</option>${opcoes}
                    </select>
                </td>
                <td><input type="number" class="itemQtd" min="1" step="1" value="${i.quantidade}"></td>
                <td class="itemUnit">${moeda(i.precoUnitario)}</td>
                <td><input type="number" class="itemDesc" min="0" step="0.01" value="${i.desconto}"></td>
                <td class="itemTotal">${moeda(totalItem(i))}</td>
                <td><button type="button" class="btnRemoverItem">Remover</button></td>
            </tr>`;
    }).join("");

    atualizarTotais();
}

$("btnAdicionarItem").addEventListener("click", () => {
    if (modoConsulta) return;
    itens.push(novoItem());
    renderItens();
});

tabelaItens.addEventListener("change", e => {
    const linha = e.target.closest("tr[data-index]");
    if (!linha) return;
    const item = itens[Number(linha.dataset.index)];

    if (e.target.classList.contains("itemTipo")) {
        item.tipo = e.target.value;
        item.itemId = "";
        item.nome = "";
        item.precoUnitario = 0;
        renderItens();
    } else if (e.target.classList.contains("itemSelect")) {
        const produtoOuServico = catalogoDoTipo(item.tipo).find(c => String(c.id) === e.target.value);
        item.itemId = e.target.value;
        item.nome = produtoOuServico?.nome ?? "";
        item.precoUnitario = Number(produtoOuServico?.precoAtual ?? 0);
        renderItens();
    }
});

tabelaItens.addEventListener("input", e => {
    const linha = e.target.closest("tr[data-index]");
    if (!linha) return;
    const item = itens[Number(linha.dataset.index)];

    if (e.target.classList.contains("itemQtd")) item.quantidade = parseInt(e.target.value, 10) || 0;
    else if (e.target.classList.contains("itemDesc")) item.desconto = num(e.target.value);
    else return;

    linha.querySelector(".itemTotal").textContent = moeda(totalItem(item));
    atualizarTotais();
});

tabelaItens.addEventListener("click", e => {
    const botao = e.target.closest(".btnRemoverItem");
    if (!botao) return;
    itens.splice(Number(botao.closest("tr").dataset.index), 1);
    renderItens();
});

// =====================================================
// VALORES DA VENDA
// =====================================================

// Obs.: "Taxa da Forma de Pagamento" é tratada como PERCENTUAL (%).
// Taxa, valor líquido, valor recebido e troco são só de tela: o banco não guarda.
function atualizarTotais() {
    const bruto = itens.reduce((soma, i) => soma + totalItem(i), 0);
    const desconto = Math.min(num($("descontoVenda").value), bruto);
    const valorVenda = bruto - desconto;
    const taxa = num($("taxaPagamento").value);
    const liquido = valorVenda * (1 - taxa / 100);
    const recebido = num($("valorRecebido").value);
    const troco = $("formaPagamento").value === "dinheiro" ? Math.max(recebido - valorVenda, 0) : 0;

    $("valorBruto").value = bruto.toFixed(2);
    $("valorVenda").value = valorVenda.toFixed(2);
    $("valorLiquido").value = liquido.toFixed(2);
    $("troco").value = troco.toFixed(2);
}

["descontoVenda", "taxaPagamento", "valorRecebido", "formaPagamento"].forEach(id => {
    $(id).addEventListener("input", atualizarTotais);
    $(id).addEventListener("change", atualizarTotais);
});

// =====================================================
// BUSCAR CLIENTE   GET /customers?search=
// =====================================================

$("btnPesquisarCliente").addEventListener("click", async () => {
    const texto = $("campoBuscaCliente").value.trim();

    if (!texto) {
        alert("Digite o nome, telefone, e-mail ou CPF do cliente.");
        $("campoBuscaCliente").focus();
        return;
    }

    try {
        const dados = await api(`/customers?search=${encodeURIComponent(texto)}&page=1&limit=50`);
        clientesEncontrados = extrairLista(dados);

        tabelaClientesVenda.innerHTML = clientesEncontrados.length === 0
            ? `<tr><td colspan="4">Nenhum cliente encontrado.</td></tr>`
            : clientesEncontrados.map(c => `
                <tr>
                    <td>${esc(c.nomeCompleto)}</td>
                    <td>${esc(c.telefone)}</td>
                    <td>${esc(c.cpf)}</td>
                    <td>
                        <button type="button" class="btnSelecionarClienteVenda" data-id="${esc(c.id)}">
                            Selecionar
                        </button>
                    </td>
                </tr>`).join("");

        listaClientesVenda.hidden = false;
    } catch (erro) {
        console.error("Erro ao buscar clientes:", erro);
        alert("Erro ao buscar clientes: " + erro.message);
    }
});

$("campoBuscaCliente").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        $("btnPesquisarCliente").click();
    }
});

function mostrarCliente(cliente) {
    $("clienteSelecionado").value = cliente?.nomeCompleto ?? "";
    $("telefoneCliente").value = cliente?.telefone ?? "";
    $("cpfCnpjCliente").value = cliente?.cpf ?? "";
    dadosCliente.hidden = false;
}

tabelaClientesVenda.addEventListener("click", async e => {
    const botao = e.target.closest(".btnSelecionarClienteVenda");
    if (!botao) return;

    const cliente = clientesEncontrados.find(c => String(c.id) === botao.dataset.id);
    if (!cliente) return;

    clienteAtual = cliente;
    mostrarCliente(cliente);

    buscaCliente.hidden = true;
    listaClientesVenda.hidden = true;

    await carregarPets(cliente.id);
});

// =====================================================
// PETS E HISTÓRICO
// =====================================================

async function carregarPets(idCliente) {
    const select = $("petSelecionado");
    select.innerHTML = `<option value="">Selecione o pet</option>`;
    $("ultimaVisita").value = "";
    historicoPet = [];

    try {
        // O Swagger não documenta filtro por cliente em /pets: filtramos também no front.
        const dados = await api(`/pets?customerId=${encodeURIComponent(idCliente)}&page=1&limit=100`);
        const pets = extrairLista(dados)
            .filter(p => !p.customerId || String(p.customerId) === String(idCliente));

        select.innerHTML += pets
            .map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`)
            .join("");

        dadosPet.hidden = pets.length === 0;
    } catch (erro) {
        console.error("Erro ao carregar pets:", erro);
        dadosPet.hidden = true;
    }
}

$("petSelecionado").addEventListener("change", async function() {
    $("ultimaVisita").value = "";
    historicoPet = [];
    if (!this.value) return;

    try {
        const dados = await api(`/pets/${this.value}/history?page=1&limit=100`);
        historicoPet = extrairLista(dados)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (historicoPet.length) {
            $("ultimaVisita").value = String(historicoPet[0].createdAt).slice(0, 10);
        }
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
    }
});

$("btnHistoricoVisitas").addEventListener("click", () => {
    if (!$("petSelecionado").value) {
        alert("Selecione um pet.");
        return;
    }

    if (historicoPet.length === 0) {
        alert("Este pet não possui histórico de visitas.");
        return;
    }

    const linhas = historicoPet.slice(0, 10)
        .map(h => `${dataBR(h.createdAt)} - ${h.tipo}: ${h.descricao}`);
    alert("Últimas visitas:\n\n" + linhas.join("\n"));
});

// =====================================================
// SALVAR VENDA   POST /sales
// =====================================================

$("btnSalvarVenda").addEventListener("click", async () => {
    if ($("idVenda").value) {
        alert("Esta venda já foi registrada. Use 'Nova Venda' para iniciar outra.");
        return;
    }

    let customerId;

    if (vendaComCliente()) {
        if (!clienteAtual) {
            alert("Selecione um cliente.");
            return;
        }
        customerId = clienteAtual.id;
    } else {
        if (!CLIENTE_AVULSO_ID) {
            alert("Venda externa não configurada: o banco exige um cliente. Defina CLIENTE_AVULSO_ID no vendas.js.");
            return;
        }
        customerId = CLIENTE_AVULSO_ID;
    }

    if (itens.length === 0) {
        alert("Adicione ao menos um item à venda.");
        return;
    }

    if (itens.some(i => !i.itemId || i.quantidade < 1)) {
        alert("Todos os itens precisam ter produto/serviço e quantidade válida.");
        return;
    }

    // Confere estoque (somando o mesmo produto em linhas diferentes)
    const porProduto = {};
    itens.filter(i => i.tipo === "produto").forEach(i => {
        porProduto[i.itemId] = (porProduto[i.itemId] || 0) + i.quantidade;
    });
    for (const [id, qtd] of Object.entries(porProduto)) {
        const p = produtos.find(x => String(x.id) === String(id));
        if (p && qtd > p.estoqueAtual) {
            alert(`Estoque insuficiente para "${p.nome}". Disponível: ${p.estoqueAtual}`);
            return;
        }
    }

    const metodoDePagamento = $("formaPagamento").value;
    if (!metodoDePagamento) {
        alert("Selecione a forma de pagamento.");
        return;
    }

    const bruto = itens.reduce((soma, i) => soma + totalItem(i), 0);
    const desconto = Math.min(num($("descontoVenda").value), bruto);

    let observacoes = $("observacoes").value.trim();
    const petSelect = $("petSelecionado");
    if (petSelect.value) {
        const nomePet = petSelect.options[petSelect.selectedIndex].text;
        observacoes = `PET: ${nomePet}${observacoes ? " | " + observacoes : ""}`;
    }

    const corpo = {
        customerId,
        metodoDePagamento,
        desconto,
        items: itens.map(i => ({
            [i.tipo === "servico" ? "serviceId" : "productId"]: i.itemId,
            nome: i.nome,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            desconto: i.desconto
        }))
    };

    if (observacoes) corpo.observacoes = observacoes;
    if ($("dataVenda").value) {
        // Prisma exige DateTime completo (ISO-8601), não só a data
        corpo.dataDaVenda = new Date(`${$("dataVenda").value}T12:00:00`).toISOString();
    }

    try {
        const dados = await api("/sales", { method: "POST", body: JSON.stringify(corpo) });
        const venda = extrairItem(dados);

        alert("Venda registrada com sucesso!");

        await carregarCatalogo(); // atualiza estoque exibido
        await abrirVenda(venda.id);
    } catch (erro) {
        console.error("Erro ao registrar venda:", erro);
        alert("Erro ao registrar venda: " + erro.message);
    }
});

// =====================================================
// BUSCAR VENDA   GET /sales  |  GET /sales/{id}
// =====================================================

$("btnBuscarVenda").addEventListener("click", async () => {
    try {
        const dados = await api("/sales?page=1&limit=50");
        vendasEncontradas = extrairLista(dados);

        tabelaVendas.innerHTML = vendasEncontradas.length === 0
            ? `<tr><td colspan="6">Nenhuma venda encontrada.</td></tr>`
            : vendasEncontradas.map(v => `
                <tr>
                    <td>${esc(codigoVenda(v.id))}</td>
                    <td>${esc(dataBR(v.dataDaVenda))}</td>
                    <td>${esc(v.customer?.nomeCompleto ?? "")}</td>
                    <td>${esc(moeda(v.total))}</td>
                    <td>${esc(v.status ?? "")}</td>
                    <td>
                        <button type="button" class="btnSelecionarVenda" data-id="${esc(v.id)}">
                            Selecionar
                        </button>
                    </td>
                </tr>`).join("");

        listaVendas.hidden = false;
        formVenda.hidden = true;
    } catch (erro) {
        console.error("Erro ao buscar vendas:", erro);
        alert("Erro ao buscar vendas: " + erro.message);
    }
});

tabelaVendas.addEventListener("click", async e => {
    const botao = e.target.closest(".btnSelecionarVenda");
    if (!botao) return;
    await abrirVenda(botao.dataset.id);
});

async function abrirVenda(id) {
    try {
        const venda = extrairItem(await api(`/sales/${id}`));
        let cliente = venda.customer;

        if (!cliente && venda.customerId) {
            try { cliente = extrairItem(await api(`/customers/${venda.customerId}`)); } catch { /* segue sem cliente */ }
        }

        mostrarVenda(venda, cliente);
    } catch (erro) {
        console.error("Erro ao abrir venda:", erro);
        alert("Erro ao abrir venda: " + erro.message);
    }
}

function mostrarVenda(venda, cliente) {
    formVenda.reset();
    vendaAberta = venda;
    modoConsulta = true;

    $("idVenda").value = venda.id;
    $("numeroVenda").value = codigoVenda(venda.id) + (venda.status ? ` - ${venda.status}` : "");
    $("dataVenda").value = String(venda.dataDaVenda ?? "").slice(0, 10);

    const externa = CLIENTE_AVULSO_ID && venda.customerId === CLIENTE_AVULSO_ID;
    document.querySelector(`input[name="tipoVenda"][value="${externa ? "externa" : "cliente"}"]`).checked = true;

    buscaCliente.hidden = true;
    listaClientesVenda.hidden = true;
    listaVendas.hidden = true;
    dadosPet.hidden = true;

    if (externa) {
        dadosCliente.hidden = true;
    } else {
        mostrarCliente(cliente);
    }

    itens = (venda.items ?? []).map(it => ({
        tipo: it.serviceId ? "servico" : "produto",
        itemId: it.productId ?? it.serviceId ?? "",
        nome: it.nome,
        quantidade: it.quantidade,
        precoUnitario: Number(it.precoUnitario),
        desconto: Number(it.desconto ?? 0)
    }));

    $("descontoVenda").value = Number(venda.desconto ?? 0);
    $("observacoes").value = venda.observacoes ?? "";

    const forma = String(venda.metodoDePagamento ?? "");
    $("formaPagamento").value = forma;
    if ($("formaPagamento").value === "") $("formaPagamento").value = forma.toLowerCase();

    bloquearVenda(true);
    $("btnExcluirVenda").disabled = foiCancelada(venda);
    renderItens();
}

// =====================================================
// EDITAR / EXCLUIR
// A API não possui PUT /sales/{id}; "Excluir" cancela a venda
// (POST /sales/{id}/cancel) e devolve os itens ao estoque.
// =====================================================

$("btnEditarVenda").addEventListener("click", () => {
    if (!$("idVenda").value) {
        alert("Selecione uma venda para editar.");
        return;
    }
    alert("Vendas registradas não podem ser editadas. Cancele a venda (Excluir) e lance uma nova.");
});

$("btnExcluirVenda").addEventListener("click", async () => {
    const id = $("idVenda").value;

    if (!id) {
        alert("Selecione uma venda para cancelar.");
        return;
    }

    if (foiCancelada(vendaAberta)) {
        alert("Esta venda já está cancelada.");
        return;
    }

    if (!confirm("Deseja realmente cancelar esta venda? Os itens voltarão ao estoque.")) return;

    try {
        await api(`/sales/${id}/cancel`, { method: "POST" });
        alert("Venda cancelada com sucesso!");

        await carregarCatalogo();
        await abrirVenda(id);
    } catch (erro) {
        console.error("Erro ao cancelar venda:", erro);
        alert("Erro ao cancelar venda: " + erro.message);
    }
});

// =====================================================
// INICIALIZAÇÃO
// =====================================================

novaVenda();
carregarCatalogo();