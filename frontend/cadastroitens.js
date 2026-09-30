const API = 'http://localhost:3000/api';

const $ = (id) => document.getElementById(id);
const tipoAtual = () => document.querySelector('input[name="tipoItem"]:checked').value;
const rotaDoTipo = (tipo) => (tipo === 'produto' ? 'products' : 'services');

let itemAtual = null; // registro carregado da API (null = novo cadastro)

/* ---------- utilitários ---------- */

async function api(caminho, opcoes = {}) {
    const resposta = await fetch(`${API}${caminho}`, {
        headers: { 'Content-Type': 'application/json' },
        ...opcoes
    });

    if (resposta.status === 204) return null;

    let corpo = null;
    try { corpo = await resposta.json(); } catch { /* sem corpo */ }

    if (!resposta.ok) {
        throw new Error(
            corpo?.error?.message || corpo?.message ||
            (typeof corpo?.error === 'string' ? corpo.error : null) ||
            `Erro ${resposta.status}`
        );
    }
    return corpo;
}

// Aceita [..], { data: [..] } ou { items: [..] }
const extrairLista = (r) => (Array.isArray(r) ? r : r?.data ?? r?.items ?? []);
const extrairItem = (r) => r?.data ?? r;

function mostrarMensagem(texto, tipo = 'sucesso') {
    const el = $('mensagem');
    el.textContent = texto;
    el.className = tipo;
    el.hidden = false;
}

const limparMensagem = () => { $('mensagem').hidden = true; };

// Só uma das duas telas aparece por vez: busca OU formulário
function mostrarFormulario() {
    $('buscaItens').hidden = true;
    $('formItem').hidden = false;
}

function mostrarBusca() {
    $('formItem').hidden = true;
    $('buscaItens').hidden = false;
    $('campoBuscaItem').focus();
}

const moeda = (v) =>
    Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR') : '');

function celula(tr, texto) {
    const td = document.createElement('td');
    td.textContent = texto ?? '';
    tr.appendChild(td);
    return td;
}

function linhaVazia(tbody, colunas, texto) {
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = celula(tr, texto);
    td.colSpan = colunas;
    tbody.appendChild(tr);
}

/* ---------- estado da tela ---------- */

function alternarTipo() {
    const produto = tipoAtual() === 'produto';
    $('dadosProduto').hidden = !produto;
    $('dadosServico').hidden = produto;
    $('movimentacaoEstoque').hidden = !(produto && itemAtual);
}

function setEditavel(editavel) {
    const campos = $('formItem').querySelectorAll(
        '#dadosTipo input, #dadosTipo select, #dadosGerais input, #dadosProduto input, #dadosProduto select, #dadosServico input'
    );
    campos.forEach((c) => { c.disabled = !editavel; });

    $('btnNovaCategoria').disabled = !editavel;
    $('btnSalvarItem').disabled = !editavel;
    $('btnEditarItem').disabled = editavel || !itemAtual;
    $('btnExcluirItem').disabled = !itemAtual;

    // Tipo não muda depois de criado; estoque só via movimentação
    if (itemAtual) {
        document.querySelectorAll('input[name="tipoItem"]').forEach((r) => { r.disabled = true; });
        $('estoqueAtual').disabled = true;
        $('estoqueAtual').title = 'Para alterar o estoque, use Movimentação de Estoque abaixo';
    } else {
        $('estoqueAtual').title = '';
    }

    $('campoMotivoPreco').hidden = !(editavel && itemAtual);
}

function novoCadastro() {
    itemAtual = null;
    $('formItem').reset();
    $('idItem').value = '';
    $('historicoPreco').hidden = true;
    $('tabelaHistoricoPreco').innerHTML = '';
    $('tabelaMovimentos').innerHTML = '';
    limparMensagem();
    mostrarFormulario();
    alternarTipo();
    setEditavel(true);
    $('nomeItem').focus();
}

function preencherFormulario(tipo, item) {
    itemAtual = item;
    document.querySelector(`input[name="tipoItem"][value="${tipo}"]`).checked = true;

    $('idItem').value = item.id;
    $('nomeItem').value = item.nome ?? '';
    $('descricaoItem').value = item.descricao ?? '';
    $('precoItem').value = item.precoAtual ?? '';
    $('statusItem').value = String(item.ativo ?? true);
    $('motivoPreco').value = '';

    if (tipo === 'produto') {
        $('categoriaItem').value = item.categoryId ?? '';
        $('skuItem').value = item.SKU ?? '';
        $('estoqueAtual').value = item.estoqueAtual ?? 0;
        $('estoqueMinimo').value = item.estoqueMinimo ?? 5;
    } else {
        $('duracaoItem').value = item.duracaoEmMinutos ?? 30;
    }

    alternarTipo();
    setEditavel(false);
}

/* ---------- categorias ---------- */

async function carregarCategorias(selecionada) {
    try {
        const resp = await api('/categories?page=1&limit=100');
        const select = $('categoriaItem');
        select.innerHTML = '<option value="">Selecione a categoria</option>';
        extrairLista(resp).forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            select.appendChild(opt);
        });
        if (selecionada) select.value = selecionada;
    } catch (e) {
        mostrarMensagem(`Não foi possível carregar as categorias: ${e.message}`, 'erro');
    }
}

async function novaCategoria() {
    const nome = prompt('Nome da nova categoria:');
    if (!nome || !nome.trim()) return;

    try {
        const criada = extrairItem(await api('/categories', {
            method: 'POST',
            body: JSON.stringify({ nome: nome.trim() })
        }));
        await carregarCategorias(criada?.id);
        mostrarMensagem('Categoria cadastrada.');
    } catch (e) {
        mostrarMensagem(`Erro ao cadastrar categoria: ${e.message}`, 'erro');
    }
}

/* ---------- busca ---------- */

async function pesquisar() {
    limparMensagem();
    const filtro = $('filtroTipo').value;
    const termo = $('campoBuscaItem').value.trim();
    const consulta = `?page=1&limit=100${termo ? `&search=${encodeURIComponent(termo)}` : ''}`;

    const tipos = filtro === 'todos' ? ['produto', 'servico'] : [filtro];

    try {
        const resultados = await Promise.all(
            tipos.map(async (t) => {
                const lista = extrairLista(await api(`/${rotaDoTipo(t)}${consulta}`));
                return lista.map((item) => ({ tipo: t, item }));
            })
        );

        // A API pode ignorar "search"; filtra também no cliente
        const t = termo.toLowerCase();
        const linhas = resultados.flat().filter(({ item }) =>
            !t || item.nome?.toLowerCase().includes(t) || item.SKU?.toLowerCase().includes(t)
        );

        renderizarLista(linhas);
    } catch (e) {
        mostrarMensagem(`Erro na busca: ${e.message}`, 'erro');
    }
}

function renderizarLista(linhas) {
    $('listaItens').hidden = false;
    const tbody = $('tabelaItens');

    if (!linhas.length) return linhaVazia(tbody, 6, 'Nenhum cadastro encontrado.');

    tbody.innerHTML = '';
    linhas.forEach(({ tipo, item }) => {
        const tr = document.createElement('tr');
        celula(tr, tipo === 'produto' ? 'Produto' : 'Serviço');
        celula(tr, item.nome);
        celula(tr, tipo === 'produto' ? item.SKU : `${item.duracaoEmMinutos} min`);
        celula(tr, moeda(item.precoAtual));
        const status = celula(tr, item.ativo ? 'Ativo' : 'Inativo');
        if (!item.ativo) status.className = 'status-inativo';

        const acao = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Selecionar';
        btn.addEventListener('click', () => abrirItem(tipo, item.id));
        acao.appendChild(btn);
        tr.appendChild(acao);

        tbody.appendChild(tr);
    });
}

async function abrirItem(tipo, id) {
    try {
        limparMensagem();
        const item = extrairItem(await api(`/${rotaDoTipo(tipo)}/${id}`));
        if (tipo === 'produto') await carregarCategorias(item.categoryId);
        preencherFormulario(tipo, item);
        mostrarFormulario();

        if (tipo === 'produto') {
            $('historicoPreco').hidden = false;
            await Promise.all([carregarHistoricoPreco(id), carregarMovimentos(id)]);
        } else {
            $('historicoPreco').hidden = true;
        }
    } catch (e) {
        mostrarMensagem(`Erro ao carregar o cadastro: ${e.message}`, 'erro');
    }
}

/* ---------- salvar / excluir ---------- */

function montarPayload() {
    const tipo = tipoAtual();
    const nome = $('nomeItem').value.trim();
    const preco = Number($('precoItem').value);

    if (!nome) throw new Error('Informe o nome.');
    if ($('precoItem').value === '' || Number.isNaN(preco) || preco < 0) {
        throw new Error('Informe um preço válido.');
    }

    const base = {
        nome,
        descricao: $('descricaoItem').value.trim() || null,
        precoAtual: preco,
        ativo: $('statusItem').value === 'true'
    };

    if (tipo === 'produto') {
        const sku = $('skuItem').value.trim();
        if (!$('categoriaItem').value) throw new Error('Selecione a categoria.');
        if (!sku) throw new Error('Informe o SKU.');

        const payload = {
            ...base,
            categoryId: $('categoriaItem').value,
            SKU: sku,
            estoqueMinimo: parseInt($('estoqueMinimo').value, 10) || 0
        };

        if (!itemAtual) payload.estoqueAtual = parseInt($('estoqueAtual').value, 10) || 0;

        const motivo = $('motivoPreco').value.trim();
        if (itemAtual && motivo) payload.reason = motivo;

        return payload;
    }

    const duracao = parseInt($('duracaoItem').value, 10);
    if (!duracao || duracao < 1) throw new Error('Informe a duração em minutos.');
    return { ...base, duracaoEmMinutos: duracao };
}

async function salvar() {
    limparMensagem();
    const tipo = tipoAtual();

    try {
        const payload = montarPayload();
        const editando = Boolean(itemAtual);
        const caminho = `/${rotaDoTipo(tipo)}${editando ? `/${itemAtual.id}` : ''}`;

        const salvo = extrairItem(await api(caminho, {
            method: editando ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        }));

        await abrirItem(tipo, salvo?.id ?? itemAtual.id);
        mostrarMensagem(editando ? 'Cadastro atualizado.' : 'Cadastro criado.');
    } catch (e) {
        mostrarMensagem(e.message, 'erro');
    }
}

async function excluir() {
    if (!itemAtual) return;
    if (!confirm(`Excluir "${itemAtual.nome}"? O registro será removido da listagem (exclusão lógica).`)) return;

    try {
        await api(`/${rotaDoTipo(tipoAtual())}/${itemAtual.id}`, { method: 'DELETE' });
        novoCadastro();
        mostrarMensagem('Cadastro excluído.');
    } catch (e) {
        mostrarMensagem(`Erro ao excluir: ${e.message}`, 'erro');
    }
}

/* ---------- históricos (produto) ---------- */

async function carregarHistoricoPreco(id) {
    const tbody = $('tabelaHistoricoPreco');
    try {
        const lista = extrairLista(await api(`/products/${id}/price-history?page=1&limit=20`));
        if (!lista.length) return linhaVazia(tbody, 4, 'Nenhuma alteração de preço registrada.');

        tbody.innerHTML = '';
        lista.forEach((h) => {
            const tr = document.createElement('tr');
            celula(tr, dataHora(h.changedAt));
            celula(tr, moeda(h.previousPrice));
            celula(tr, moeda(h.price));
            celula(tr, h.reason);
            tbody.appendChild(tr);
        });
    } catch (e) {
        linhaVazia(tbody, 4, `Erro ao carregar histórico: ${e.message}`);
    }
}

async function carregarMovimentos(id) {
    const tbody = $('tabelaMovimentos');
    try {
        const lista = extrairLista(await api(`/products/${id}/stock?page=1&limit=20`));
        if (!lista.length) return linhaVazia(tbody, 6, 'Nenhuma movimentação registrada.');

        tbody.innerHTML = '';
        lista.forEach((m) => {
            const tr = document.createElement('tr');
            celula(tr, dataHora(m.createdAt));
            celula(tr, m.tipo);
            celula(tr, m.quantidade);
            celula(tr, m.estoqueAnterior);
            celula(tr, m.estoquePosterior);
            celula(tr, m.motivo);
            tbody.appendChild(tr);
        });
    } catch (e) {
        linhaVazia(tbody, 6, `Erro ao carregar movimentações: ${e.message}`);
    }
}

async function registrarMovimento() {
    if (!itemAtual) return;
    limparMensagem();

    const quantidade = parseInt($('quantidadeMovimento').value, 10);
    const motivo = $('motivoMovimento').value.trim();

    if (!quantidade || quantidade < 1) return mostrarMensagem('Informe a quantidade.', 'erro');
    if (!motivo) return mostrarMensagem('Informe o motivo da movimentação.', 'erro');

    try {
        await api(`/products/${itemAtual.id}/stock`, {
            method: 'POST',
            body: JSON.stringify({ tipo: $('tipoMovimento').value, quantidade, motivo })
        });

        $('quantidadeMovimento').value = '';
        $('motivoMovimento').value = '';

        const atualizado = extrairItem(await api(`/products/${itemAtual.id}`));
        itemAtual = atualizado;
        $('estoqueAtual').value = atualizado.estoqueAtual ?? 0;
        await carregarMovimentos(itemAtual.id);
        mostrarMensagem('Movimentação registrada.');
    } catch (e) {
        mostrarMensagem(`Erro ao registrar movimentação: ${e.message}`, 'erro');
    }
}

/* ---------- eventos ---------- */

$('btnNovoItem').addEventListener('click', novoCadastro);
$('btnBuscarItem').addEventListener('click', () => { limparMensagem(); mostrarBusca(); });
$('btnPesquisarItem').addEventListener('click', pesquisar);
$('campoBuscaItem').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); pesquisar(); }
});

document.querySelectorAll('input[name="tipoItem"]').forEach((r) =>
    r.addEventListener('change', alternarTipo)
);

$('btnNovaCategoria').addEventListener('click', novaCategoria);
$('btnSalvarItem').addEventListener('click', salvar);
$('btnEditarItem').addEventListener('click', () => { limparMensagem(); setEditavel(true); });
$('btnExcluirItem').addEventListener('click', excluir);
$('btnRegistrarMovimento').addEventListener('click', registrarMovimento);
$('formItem').addEventListener('submit', (e) => e.preventDefault());

/* ---------- inicialização ---------- */

carregarCategorias();
novoCadastro();