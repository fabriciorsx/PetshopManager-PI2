// CONVERTE TEXTO PARA MAIÚSCULAS

document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(function(campo) {
    campo.addEventListener("input", function() {
        this.value = this.value.toUpperCase();
    });
});

// CAMPO OUTROS - TIPO PET

const tipoPet = document.getElementById("tipoPet");
const campoTipoOutro = document.getElementById("campoTipoOutro");
const tipoOutro = document.getElementById("tipoOutro");

tipoPet.addEventListener("change", function() {
    if (tipoPet.value === "outros") {
        campoTipoOutro.hidden = false;
        tipoOutro.focus();
    } else {
        campoTipoOutro.hidden = true;
        tipoOutro.value = "";
    }
});


// BOTÃO NOVO - LIMPA A TELA

const btnNovo = document.getElementById("btnNovo");
const formClientePet = document.getElementById("formClientePet");
const buscaCliente = document.getElementById("buscaCliente");
const listaPets = document.getElementById("listaPets");
const listaClientes = document.getElementById("listaClientes");
const nome = document.getElementById("nome");

btnNovo.addEventListener("click", function() {
    btnSalvar.disabled = false;
    formClientePet.reset();

    liberarCamposCliente();
    liberarCamposPet();
   
    document.getElementById("idCliente").value = "";
    document.getElementById("idPet").value = "";
    buscaCliente.hidden = true;
    listaClientes.hidden = true;
    listaPets.hidden = true;
    campoTipoOutro.hidden = true;
    tipoOutro.value = "";
    nome.focus();
});


// BOTÃO BUSCAR CLIENTE

const btnBuscarCliente = document.getElementById("btnBuscarCliente");
const campoBusca = document.getElementById("campoBusca");

btnBuscarCliente.addEventListener("click", function() {
    btnSalvar.disabled = true;
    formClientePet.reset();
    document.getElementById("idCliente").value = "";
    document.getElementById("idPet").value = "";
    listaPets.hidden = true;
    listaClientes.hidden = true;
    campoTipoOutro.hidden = true;
    tipoOutro.value = "";
    buscaCliente.hidden = false;
    campoBusca.value = "";
    campoBusca.focus();
});



// PESQUISAR CLIENTE

const btnPesquisar = document.getElementById("btnPesquisar");
const tabelaClientes = document.getElementById("tabelaClientes");

btnPesquisar.addEventListener("click", async function() {
    const textoBusca = campoBusca.value.trim();

    if (textoBusca === "") {
        alert("Digite o nome, telefone ou CPF/CNPJ do cliente.");
        campoBusca.focus();
        return;
    }

    try {
        const resposta = await fetch(
            `http://localhost:3000/clientes?busca=${encodeURIComponent(textoBusca)}`
        );

        const clientes = await resposta.json();

        if (!resposta.ok) {
            alert(clientes.erro);
            return;
        }

        tabelaClientes.innerHTML = "";

        if (clientes.length === 0) {
            tabelaClientes.innerHTML = `
                <tr>
                    <td colspan="5">Nenhum cliente encontrado.</td>
                </tr>
            `;
        } else {
            clientes.forEach(cliente => {
                tabelaClientes.innerHTML += `
                    <tr>
                        <td>${cliente.nome}</td>
                        <td>${cliente.telefone || ""}</td>
                        <td>${cliente.cpfCnpj || ""}</td>
                        <td>${cliente.dataRegistro || ""}</td>
                        <td>
                            <button type="button"
                                    class="btnSelecionarCliente"
                                    data-id="${cliente.id}">
                                Selecionar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        listaClientes.hidden = false;


        // SELECIONAR CLIENTE

        document.querySelectorAll(".btnSelecionarCliente").forEach(function(botao) {
            botao.addEventListener("click", async function() {
                const id = this.dataset.id;
                const cliente = clientes.find(cliente => cliente.id == id);

                document.getElementById("idCliente").value = cliente.id;
                btnNovoPet.disabled = false;
                document.getElementById("nome").value = cliente.nome;
                document.getElementById("email").value = cliente.email || "";
                document.getElementById("telefone").value = cliente.telefone || "";
                document.getElementById("endereco").value = cliente.endereco || "";
                document.getElementById("cpfCnpj").value = cliente.cpfCnpj || "";
                document.getElementById("dataRegistro").value = cliente.dataRegistro || "";

                bloquearCamposCliente();
                bloquearCamposPet();

                buscaCliente.hidden = true;
                listaClientes.hidden = true;


// PETS DO CLIENTE SELECIONADO

listaPets.hidden = false;

const tabelaPets = document.getElementById("tabelaPets");

try {
    const respostaPets = await fetch(`http://localhost:3000/pets/${id}`);
    const pets = await respostaPets.json();

    tabelaPets.innerHTML = "";

    if (pets.length === 0) {
        tabelaPets.innerHTML = `
            <tr>
                <td colspan="5">Nenhum pet cadastrado.</td>
            </tr>
        `;
    } else {
        pets.forEach(pet => {
            tabelaPets.innerHTML += `
                <tr>
                    <td>${pet.nomePet}</td>
                    <td>${pet.raca || ""}</td>
                    <td>${pet.sexo || ""}</td>
                    <td>${pet.porte || ""}</td>
                    <td>
                        <button type="button"
                                class="btnSelecionarPet"
                                data-id="${pet.id}">
                            Selecionar
                        </button>
                    </td>
                </tr>
            `;
        });
    }

// SELECIONAR PET

     document.querySelectorAll(".btnSelecionarPet").forEach(function(botaoPet) {
        botaoPet.addEventListener("click", function() {
            const idPetSelecionado = this.dataset.id;
            const pet = pets.find(pet => pet.id == idPetSelecionado);

                 if (!pet) {
                    alert("Pet não encontrado.");
                    return;
                }

                document.getElementById("idPet").value = pet.id;
                document.getElementById("nomePet").value = pet.nomePet || "";
                document.getElementById("sexo").value = pet.sexo || "";
                document.getElementById("tipoPet").value = pet.tipoPet || "";
                document.getElementById("raca").value = pet.raca || "";
                document.getElementById("porte").value = pet.porte || "";
                document.getElementById("tipoOutro").value = pet.tipoOutro || "";
                document.getElementById("caracteristicasPet").value = pet.caracteristicasPet || "";
                document.getElementById("detalhesServico").value = pet.detalhesServico || "";
                document.getElementById("observacoes").value = pet.observacoes || "";

                if (pet.tipoPet === "outros") {
                    campoTipoOutro.hidden = false;
                    } else {
                    campoTipoOutro.hidden = true;
                    }
                bloquearCamposPet();
                });
            });

    } catch (erro) {
        console.error("Erro ao carregar pets:", erro);

        tabelaPets.innerHTML = `
            <tr>
                <td colspan="5">Erro ao carregar os pets.</td>
            </tr>
        `;
    }
    });
});

    } catch (erro) {
        console.error("Erro ao buscar clientes:", erro);
        alert("Erro ao conectar com o servidor.");
    }
});
// SALVAR CLIENTE OU PET

const btnSalvar = document.getElementById("btnSalvar");

btnSalvar.addEventListener("click", async function() {
    const idCliente = document.getElementById("idCliente").value;

    try {

        // CADASTRAR CLIENTE

        if (!idCliente) {
            const cliente = {
                nome: document.getElementById("nome").value.trim(),
                email: document.getElementById("email").value.trim(),
                telefone: document.getElementById("telefone").value.trim(),
                endereco: document.getElementById("endereco").value.trim(),
                cpfCnpj: document.getElementById("cpfCnpj").value.trim(),
                dataRegistro: document.getElementById("dataRegistro").value
            };

            if (!cliente.nome || !cliente.email) {
                alert("Nome e e-mail são obrigatórios.");
                return;
            }

            const resposta = await fetch("http://localhost:3000/clientes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cliente)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.erro);
                return;
            }

            document.getElementById("idCliente").value = dados.id;

            alert("Cliente cadastrado com sucesso!");
            return;
        }


        // CADASTRAR PET

        const pet = {
            idCliente: idCliente,
            nomePet: document.getElementById("nomePet").value.trim(),
            sexo: document.getElementById("sexo").value,
            tipoPet: document.getElementById("tipoPet").value,
            raca: document.getElementById("raca").value.trim(),
            porte: document.getElementById("porte").value,
            tipoOutro: document.getElementById("tipoOutro").value.trim(),
            caracteristicasPet: document.getElementById("caracteristicasPet").value.trim(),
            detalhesServico: document.getElementById("detalhesServico").value.trim(),
            observacoes: document.getElementById("observacoes").value.trim()
        };

        if (!pet.nomePet) {
            alert("Nome do pet é obrigatório.");
            return;
        }

        const resposta = await fetch("http://localhost:3000/pets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pet)
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro);
            return;
        }

        document.getElementById("idPet").value = dados.id;

        alert("Pet cadastrado com sucesso!");

    } catch (erro) {
    console.error("ERRO REAL:", erro);
    alert("Erro: " + erro.message);
    }
});
// EDITAR CLIENTE OU PET

btnEditar.addEventListener("click", function() {
    const idPet = document.getElementById("idPet").value;
    const idCliente = document.getElementById("idCliente").value;

    if (idPet) {
        liberarCamposPet();
        btnSalvarAlteracoes.disabled = false;
        return;
    }

    if (idCliente) {
        liberarCamposCliente();
        btnSalvarAlteracoes.disabled = false;
        return;
    }

    alert("Selecione um cliente ou pet para editar.");
});

// SALVAR ALTERAÇÕES

btnSalvarAlteracoes.addEventListener("click", async function() {
    const idPet = document.getElementById("idPet").value;
    const idCliente = document.getElementById("idCliente").value;

    if (idPet) {

        const pet = {
            nomePet: document.getElementById("nomePet").value.trim(),
            sexo: document.getElementById("sexo").value,
            tipoPet: document.getElementById("tipoPet").value,
            raca: document.getElementById("raca").value.trim(),
            porte: document.getElementById("porte").value,
            tipoOutro: document.getElementById("tipoOutro").value.trim(),
            caracteristicasPet: document.getElementById("caracteristicasPet").value.trim(),
            detalhesServico: document.getElementById("detalhesServico").value.trim(),
            observacoes: document.getElementById("observacoes").value.trim()
        };

        if (!pet.nomePet) {
            alert("Nome do pet é obrigatório.");
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/pets/${idPet}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(pet)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.erro);
                return;
            }

            alert("Pet atualizado com sucesso!");

            const botaoPet = document.querySelector(
                `.btnSelecionarPet[data-id="${idPet}"]`
            );

            if (botaoPet) {
                const linha = botaoPet.closest("tr");

                linha.cells[0].textContent = pet.nomePet;
                linha.cells[1].textContent = pet.raca;
                linha.cells[2].textContent = pet.sexo;
                linha.cells[3].textContent = pet.porte;
            }

            bloquearCamposPet();
            btnSalvarAlteracoes.disabled = true;
            return;

        } catch (erro) {
            console.error("Erro ao salvar alterações:", erro);
            alert("Erro ao conectar com o servidor.");
            return;
        }
    }

    if (idCliente) {

        const cliente = {
            nome: document.getElementById("nome").value.trim(),
            telefone: document.getElementById("telefone").value.trim(),
            email: document.getElementById("email").value.trim(),
            endereco: document.getElementById("endereco").value.trim(),
            cpfCnpj: document.getElementById("cpfCnpj").value.trim(),
            dataRegistro: document.getElementById("dataRegistro").value
        };

        if (!cliente.nome || !cliente.email) {
            alert("Nome e e-mail são obrigatórios.");
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/clientes/${idCliente}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cliente)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.erro);
                return;
            }

            alert("Cliente atualizado com sucesso!");

            bloquearCamposCliente();
            btnSalvarAlteracoes.disabled = true;

        } catch (erro) {
            console.error("Erro ao salvar alterações:", erro);
            alert("Erro ao conectar com o servidor.");
        }

        return;
    }

    alert("Selecione um cliente ou pet para editar.");
});

// BOTÃO NOVO PET

const btnNovoPet = document.getElementById("btnNovoPet");
btnNovoPet.disabled = true;

btnNovoPet.addEventListener("click", function() {
    document.getElementById("idPet").value = "";
    document.getElementById("nomePet").value = "";
    document.getElementById("sexo").value = "";
    document.getElementById("tipoPet").value = "";
    document.getElementById("raca").value = "";
    document.getElementById("porte").value = "";
    document.getElementById("tipoOutro").value = "";
    document.getElementById("caracteristicasPet").value = "";
    document.getElementById("detalhesServico").value = "";
    document.getElementById("observacoes").value = "";
    liberarCamposPet();

    campoTipoOutro.hidden = true;

    document.getElementById("nomePet").focus();
});

// CAMPOS DO PET - BLOQUEIO

const camposPet = [
    "nomePet",
    "sexo",
    "tipoPet",
    "raca",
    "porte",
    "tipoOutro",
    "caracteristicasPet",
    "detalhesServico",
    "observacoes"
];

function bloquearCamposPet() {
    camposPet.forEach(id => {
        document.getElementById(id).disabled = true;
    });
}

function liberarCamposPet() {
    camposPet.forEach(id => {
        document.getElementById(id).disabled = false;
    });
}

// CAMPOS DO CLIENTE - BLOQUEIO

const camposCliente = [
    "nome",
    "telefone",
    "email",
    "endereco",
    "cpfCnpj",
    "dataRegistro"
];

function bloquearCamposCliente() {
    camposCliente.forEach(id => {
        document.getElementById(id).disabled = true;
    });
}

function liberarCamposCliente() {
    camposCliente.forEach(id => {
        document.getElementById(id).disabled = false;
    });
}

// EXCLUIR CLIENTE OU PET

const btnExcluir = document.getElementById("btnExcluir");

btnExcluir.addEventListener("click", async function() {
    const idPet = document.getElementById("idPet").value;
    const idCliente = document.getElementById("idCliente").value;

    if (!idPet && !idCliente) {
        alert("Selecione um cliente ou pet para excluir.");
        return;
    }

    if (idPet) {
        if (!confirm("Deseja realmente excluir este pet?")) {
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/pets/${idPet}`, {
                method: "DELETE"
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.erro);
                return;
            }

            alert("Pet excluído com sucesso!");

            const botaoPet = document.querySelector(
                `.btnSelecionarPet[data-id="${idPet}"]`
            );

            if (botaoPet) {
                botaoPet.closest("tr").remove();
            }

            document.getElementById("idPet").value = "";
            bloquearCamposPet();
            btnSalvarAlteracoes.disabled = true;

        } catch (erro) {
            console.error("Erro ao excluir pet:", erro);
            alert("Erro ao conectar com o servidor.");
        }

        return;
    }

    if (idCliente) {
        if (!confirm("Deseja realmente excluir este cliente?")) {
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/clientes/${idCliente}`, {
                method: "DELETE"
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.erro);
                return;
            }

            alert("Cliente excluído com sucesso!");

            document.getElementById("idCliente").value = "";
            document.getElementById("idPet").value = "";

            formClientePet.reset();
            bloquearCamposCliente();
            bloquearCamposPet();
            btnSalvarAlteracoes.disabled = true;
            listaPets.hidden = true;

        } catch (erro) {
            console.error("Erro ao excluir cliente:", erro);
            alert("Erro ao conectar com o servidor.");
        }
    }
});
campoBusca.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        btnPesquisar.click();
    }
});
            