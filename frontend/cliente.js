// =====================================================
// CONFIGURAÇÃO DA API
// =====================================================

const API_URL = "http://localhost:3000/api";

// Mapa: id do campo no formulário -> campo do model Prisma
const MAP_CLIENTE = {
    nome: "nomeCompleto",
    cpfCnpj: "cpf",
    telefone: "telefone",
    email: "email",
    endereco: "endereco",
    numero: "numero",
    complemento: "complemento",
    bairro: "bairro",
    cidade: "cidade",
    estado: "estado",
    cep: "cep"
};

const MAP_PET = {
    nomePet: "nome",
    tipoPet: "especie",
    raca: "raca",
    sexo: "sexo",
    porte: "tamanho",
    pesoAtual: "pesoAtual",
    tamanhoDoPelo: "tamanhoDoPelo",
    idade: "idade",
    tranquilidade: "tranquilidade",
    observacoes: "observacoes"
};

// Campos obrigatórios (id do formulário -> rótulo para a mensagem)
const OBRIGATORIOS_CLIENTE = {
    nome: "Nome completo", cpfCnpj: "CPF", telefone: "Telefone", email: "E-mail",
    endereco: "Endereço", numero: "Número", bairro: "Bairro",
    cidade: "Cidade", estado: "Estado", cep: "CEP"
};

const OBRIGATORIOS_PET = {
    nomePet: "Nome do pet", tipoPet: "Espécie", raca: "Raça", sexo: "Sexo",
    porte: "Tamanho", pesoAtual: "Peso atual", tamanhoDoPelo: "Tamanho do pelo",
    idade: "Idade", tranquilidade: "Tranquilidade"
};

// =====================================================
// HELPERS
// =====================================================

// Lê o valor de um campo (retorna "" se o campo não existir no HTML)
const val = id => (document.getElementById(id)?.value ?? "").trim();

// Preenche um campo (ignora se não existir no HTML)
function setVal(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
}

// Só considera os campos que existem no HTML
const existentes = ids => ids.filter(id => document.getElementById(id));

function paraApi(obj, mapa) {
    const saida = {};
    for (const [local, remoto] of Object.entries(mapa)) {
        const v = obj[local];
        if (v !== undefined && v !== "" && v !== null) saida[remoto] = v;
    }
    return saida;
}

function daApi(obj, mapa) {
    const saida = { id: obj.id, createdAt: obj.createdAt };
    for (const [local, remoto] of Object.entries(mapa)) {
        saida[local] = obj[remoto] ?? "";
    }
    return saida;
}

function validar(obj, obrigatorios) {
    const faltando = Object.entries(obrigatorios)
        .filter(([id]) => obj[id] === "" || obj[id] === undefined || Number.isNaN(obj[id]))
        .map(([, rotulo]) => rotulo);

    if (faltando.length) {
        alert("Preencha os campos obrigatórios:\n- " + faltando.join("\n- "));
        return false;
    }
    return true;
}

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

function extrairLista(dados) {
    if (Array.isArray(dados)) return dados;
    return dados?.data ?? dados?.items ?? dados?.results ?? [];
}

function extrairItem(dados) {
    return dados?.data ?? dados;
}

function esc(valor) {
    const div = document.createElement("div");
    div.textContent = valor ?? "";
    return div.innerHTML;
}

function formatarData(valor) {
    return valor ? new Date(valor).toLocaleDateString("pt-BR") : "";
}

// =====================================================
// ELEMENTOS
// =====================================================

const formClientePet = document.getElementById("formClientePet");
const buscaCliente = document.getElementById("buscaCliente");
const listaClientes = document.getElementById("listaClientes");
const listaPets = document.getElementById("listaPets");
const tabelaClientes = document.getElementById("tabelaClientes");
const tabelaPets = document.getElementById("tabelaPets");
const campoBusca = document.getElementById("campoBusca");

const tipoPet = document.getElementById("tipoPet");
const campoTipoOutro = document.getElementById("campoTipoOutro");
const tipoOutro = document.getElementById("tipoOutro");

const btnNovo = document.getElementById("btnNovo");
const btnBuscarCliente = document.getElementById("btnBuscarCliente");
const btnPesquisar = document.getElementById("btnPesquisar");
const btnSalvar = document.getElementById("btnSalvar");
const btnEditar = document.getElementById("btnEditar");
const btnSalvarAlteracoes = document.getElementById("btnSalvarAlteracoes");
const btnNovoPet = document.getElementById("btnNovoPet");
const btnExcluir = document.getElementById("btnExcluir");

const idClienteEl = document.getElementById("idCliente");
const idPetEl = document.getElementById("idPet");

let clientesEncontrados = [];
let petsDoCliente = [];

btnNovoPet.disabled = true;

// =====================================================
// MAIÚSCULAS (e-mail fica em minúsculas)
// =====================================================

document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(function(campo) {
    campo.addEventListener("input", function() {
        this.value = this.id === "email" ? this.value.toLowerCase() : this.value.toUpperCase();
    });
});

// =====================================================
// BLOQUEIO / LIBERAÇÃO DE CAMPOS
// =====================================================

const camposPet = existentes([...Object.keys(MAP_PET), "tipoOutro"]);
const camposCliente = existentes(Object.keys(MAP_CLIENTE));

const setDisabled = (ids, valor) =>
    ids.forEach(id => { document.getElementById(id).disabled = valor; });

const bloquearCamposPet = () => setDisabled(camposPet, true);
const liberarCamposPet = () => setDisabled(camposPet, false);
const bloquearCamposCliente = () => setDisabled(camposCliente, true);
const liberarCamposCliente = () => setDisabled(camposCliente, false);

// =====================================================
// LEITURA DO FORMULÁRIO
// =====================================================

function lerCliente() {
    const c = {};
    Object.keys(MAP_CLIENTE).forEach(id => { c[id] = val(id); });
    return c;
}

function lerPet() {
    const p = {};
    Object.keys(MAP_PET).forEach(id => { p[id] = val(id); });

    // "outros": a espécie é o texto digitado
    if (p.tipoPet === "outros") p.tipoPet = val("tipoOutro");

    p.pesoAtual = p.pesoAtual === "" ? "" : Number(p.pesoAtual.replace(",", "."));
    p.idade = p.idade === "" ? "" : parseInt(p.idade, 10);
    return p;
}

function preencherPet(pet) {
    Object.keys(MAP_PET).forEach(id => setVal(id, pet[id]));

    // Se a espécie não existe na lista, vira "outros" + texto
    const select = document.getElementById("tipoPet");
    const especie = String(pet.tipoPet ?? "");
    const existeNaLista = [...select.options].some(o => o.value.toUpperCase() === especie.toUpperCase());

    if (especie && !existeNaLista) {
        select.value = "outros";
        setVal("tipoOutro", especie);
        campoTipoOutro.hidden = false;
    } else {
        if (especie) {
            const opt = [...select.options].find(o => o.value.toUpperCase() === especie.toUpperCase());
            select.value = opt.value;
        }
        setVal("tipoOutro", "");
        campoTipoOutro.hidden = true;
    }
}

function limparPet() {
    idPetEl.value = "";
    camposPet.forEach(id => { document.getElementById(id).value = ""; });
    campoTipoOutro.hidden = true;
}

// =====================================================
// CAMPO OUTROS - TIPO PET
// =====================================================

tipoPet.addEventListener("change", function() {
    if (tipoPet.value === "outros") {
        campoTipoOutro.hidden = false;
        tipoOutro.focus();
    } else {
        campoTipoOutro.hidden = true;
        tipoOutro.value = "";
    }
});

// =====================================================
// BOTÃO NOVO
// =====================================================

btnNovo.addEventListener("click", function() {
    btnSalvar.disabled = false;
    btnSalvarAlteracoes.disabled = true;
    btnNovoPet.disabled = true;
    formClientePet.reset();

    liberarCamposCliente();
    liberarCamposPet();

    idClienteEl.value = "";
    idPetEl.value = "";
    buscaCliente.hidden = true;
    listaClientes.hidden = true;
    listaPets.hidden = true;
    campoTipoOutro.hidden = true;
    tipoOutro.value = "";
    document.getElementById("nome").focus();
});

// =====================================================
// BOTÃO BUSCAR CLIENTE
// =====================================================

btnBuscarCliente.addEventListener("click", function() {
    btnSalvar.disabled = true;
    btnNovoPet.disabled = true;
    formClientePet.reset();
    idClienteEl.value = "";
    idPetEl.value = "";
    listaPets.hidden = true;
    listaClientes.hidden = true;
    campoTipoOutro.hidden = true;
    tipoOutro.value = "";
    buscaCliente.hidden = false;
    campoBusca.value = "";
    campoBusca.focus();
});

// =====================================================
// PESQUISAR CLIENTE   GET /customers?search=
// =====================================================

btnPesquisar.addEventListener("click", async function() {
    const textoBusca = campoBusca.value.trim();

    if (textoBusca === "") {
        alert("Digite o nome, telefone, e-mail ou CPF do cliente.");
        campoBusca.focus();
        return;
    }

    try {
        const dados = await api(`/customers?search=${encodeURIComponent(textoBusca)}&page=1&limit=50`);
        clientesEncontrados = extrairLista(dados).map(c => daApi(c, MAP_CLIENTE));

        if (clientesEncontrados.length === 0) {
            tabelaClientes.innerHTML = `<tr><td colspan="5">Nenhum cliente encontrado.</td></tr>`;
        } else {
            tabelaClientes.innerHTML = clientesEncontrados.map(c => `
                <tr>
                    <td>${esc(c.nome)}</td>
                    <td>${esc(c.telefone)}</td>
                    <td>${esc(c.cpfCnpj)}</td>
                    <td>${esc(formatarData(c.createdAt))}</td>
                    <td>
                        <button type="button" class="btnSelecionarCliente" data-id="${esc(c.id)}">
                            Selecionar
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        listaClientes.hidden = false;
    } catch (erro) {
        console.error("Erro ao buscar clientes:", erro);
        alert("Erro ao buscar clientes: " + erro.message);
    }
});

campoBusca.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        btnPesquisar.click();
    }
});

// =====================================================
// SELECIONAR CLIENTE
// =====================================================

tabelaClientes.addEventListener("click", async function(event) {
    const botao = event.target.closest(".btnSelecionarCliente");
    if (!botao) return;

    const cliente = clientesEncontrados.find(c => String(c.id) === botao.dataset.id);
    if (!cliente) return;

    idClienteEl.value = cliente.id;
    idPetEl.value = "";
    limparPet();
    btnNovoPet.disabled = false;
    btnSalvar.disabled = true;

    Object.keys(MAP_CLIENTE).forEach(id => setVal(id, cliente[id]));
    setVal("dataRegistro", cliente.createdAt ? String(cliente.createdAt).slice(0, 10) : "");

    bloquearCamposCliente();
    bloquearCamposPet();

    buscaCliente.hidden = true;
    listaClientes.hidden = true;

    await carregarPets(cliente.id);
});

// =====================================================
// PETS DO CLIENTE   GET /pets?customerId=
// =====================================================

async function carregarPets(idCliente) {
    listaPets.hidden = false;

    try {
        // OBS: o Swagger não documenta filtro por cliente em /pets.
        // Enviamos ?customerId= e filtramos também no front.
        const dados = await api(`/pets?customerId=${encodeURIComponent(idCliente)}&page=1&limit=100`);

        petsDoCliente = extrairLista(dados)
            .filter(p => !p.customerId || String(p.customerId) === String(idCliente))
            .map(p => daApi(p, MAP_PET));

        if (petsDoCliente.length === 0) {
            tabelaPets.innerHTML = `<tr><td colspan="5">Nenhum pet cadastrado.</td></tr>`;
            return;
        }

        tabelaPets.innerHTML = petsDoCliente.map(p => `
            <tr>
                <td>${esc(p.nomePet)}</td>
                <td>${esc(p.raca)}</td>
                <td>${esc(p.sexo)}</td>
                <td>${esc(p.porte)}</td>
                <td>
                    <button type="button" class="btnSelecionarPet" data-id="${esc(p.id)}">
                        Selecionar
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (erro) {
        console.error("Erro ao carregar pets:", erro);
        tabelaPets.innerHTML = `<tr><td colspan="5">Erro ao carregar os pets.</td></tr>`;
    }
}

// SELECIONAR PET

tabelaPets.addEventListener("click", function(event) {
    const botao = event.target.closest(".btnSelecionarPet");
    if (!botao) return;

    const pet = petsDoCliente.find(p => String(p.id) === botao.dataset.id);
    if (!pet) {
        alert("Pet não encontrado.");
        return;
    }

    idPetEl.value = pet.id;
    preencherPet(pet);
    bloquearCamposPet();
});

// =====================================================
// SALVAR CLIENTE OU PET   POST /customers  |  POST /pets
// =====================================================

btnSalvar.addEventListener("click", async function() {
    const idCliente = idClienteEl.value;

    try {
        // CADASTRAR CLIENTE
        if (!idCliente) {
            const cliente = lerCliente();
            if (!validar(cliente, OBRIGATORIOS_CLIENTE)) return;

            const dados = await api("/customers", {
                method: "POST",
                body: JSON.stringify(paraApi(cliente, MAP_CLIENTE))
            });

            idClienteEl.value = extrairItem(dados).id;
            btnNovoPet.disabled = false;

            alert("Cliente cadastrado com sucesso!");
            return;
        }

        // CADASTRAR PET
        const pet = lerPet();
        if (!validar(pet, OBRIGATORIOS_PET)) return;

        const corpo = paraApi(pet, MAP_PET);
        corpo.customerId = idCliente;

        const dados = await api("/pets", {
            method: "POST",
            body: JSON.stringify(corpo)
        });

        idPetEl.value = extrairItem(dados).id;

        alert("Pet cadastrado com sucesso!");

        bloquearCamposPet();
        await carregarPets(idCliente);

    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro: " + erro.message);
    }
});

// =====================================================
// EDITAR
// =====================================================

btnEditar.addEventListener("click", function() {
    if (idPetEl.value) {
        liberarCamposPet();
        btnSalvarAlteracoes.disabled = false;
        return;
    }

    if (idClienteEl.value) {
        liberarCamposCliente();
        btnSalvarAlteracoes.disabled = false;
        return;
    }

    alert("Selecione um cliente ou pet para editar.");
});

// =====================================================
// SALVAR ALTERAÇÕES   PUT /pets/{id}  |  PUT /customers/{id}
// =====================================================

btnSalvarAlteracoes.addEventListener("click", async function() {
    const idPet = idPetEl.value;
    const idCliente = idClienteEl.value;

    try {
        if (idPet) {
            const pet = lerPet();
            if (!validar(pet, OBRIGATORIOS_PET)) return;

            await api(`/pets/${idPet}`, {
                method: "PUT",
                body: JSON.stringify(paraApi(pet, MAP_PET))
            });

            alert("Pet atualizado com sucesso!");

            bloquearCamposPet();
            btnSalvarAlteracoes.disabled = true;
            await carregarPets(idCliente);
            return;
        }

        if (idCliente) {
            const cliente = lerCliente();
            if (!validar(cliente, OBRIGATORIOS_CLIENTE)) return;

            await api(`/customers/${idCliente}`, {
                method: "PUT",
                body: JSON.stringify(paraApi(cliente, MAP_CLIENTE))
            });

            alert("Cliente atualizado com sucesso!");

            bloquearCamposCliente();
            btnSalvarAlteracoes.disabled = true;
            return;
        }

        alert("Selecione um cliente ou pet para editar.");

    } catch (erro) {
        console.error("Erro ao salvar alterações:", erro);
        alert("Erro: " + erro.message);
    }
});

// =====================================================
// BOTÃO NOVO PET
// =====================================================

btnNovoPet.addEventListener("click", function() {
    limparPet();
    liberarCamposPet();
    btnSalvar.disabled = false;
    btnSalvarAlteracoes.disabled = true;
    document.getElementById("nomePet").focus();
});

// =====================================================
// EXCLUIR   DELETE (soft delete, retorna 204)
// =====================================================

btnExcluir.addEventListener("click", async function() {
    const idPet = idPetEl.value;
    const idCliente = idClienteEl.value;

    if (!idPet && !idCliente) {
        alert("Selecione um cliente ou pet para excluir.");
        return;
    }

    try {
        if (idPet) {
            if (!confirm("Deseja realmente excluir este pet?")) return;

            await api(`/pets/${idPet}`, { method: "DELETE" });

            alert("Pet excluído com sucesso!");

            limparPet();
            bloquearCamposPet();
            btnSalvarAlteracoes.disabled = true;
            await carregarPets(idCliente);
            return;
        }

        if (!confirm("Deseja realmente excluir este cliente?")) return;

        await api(`/customers/${idCliente}`, { method: "DELETE" });

        alert("Cliente excluído com sucesso!");

        idClienteEl.value = "";
        idPetEl.value = "";

        formClientePet.reset();
        bloquearCamposCliente();
        bloquearCamposPet();
        btnSalvarAlteracoes.disabled = true;
        btnNovoPet.disabled = true;
        listaPets.hidden = true;

    } catch (erro) {
        console.error("Erro ao excluir:", erro);
        alert("Erro: " + erro.message);
    }
});