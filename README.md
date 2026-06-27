# 📊 Local Activity Tracker (Monitor de Uso Pessoal)

Monitor de produtividade pessoal que roda **localmente**, de forma **totalmente privada**, **modular** e **sem necessidade de privilégios de administrador**.

O sistema captura a janela ativa em segundo plano a cada segundo, mapeia processos obscuros para nomes comerciais (ex.: `msedge.exe` → Microsoft Edge) e extrai o nome do documento ou aba em foco de maneira limpa (ex.: separando corretamente arquivos como `prompts.docx` e `acts.docx`).

---

## 🚀 Funcionalidades

### ✅ 1. Rastreamento Contínuo em Segundo Plano

- Captura da janela ativa a cada 1 segundo.
- Mapeamento automático de nomes de processos para nomes comerciais (ex.: `chrome.exe` → Google Chrome).
- Extração limpa do título da janela (documento, aba ou aplicação).

### ✅ 2. Painel Web Interativo

- **Gráfico de barras** com distribuição de uso por aplicativo.
- Clique em qualquer barra para **filtrar** a tabela e ver apenas os registros daquele programa.
- **Filtros laterais** por aplicação (clique nos cartões para ativar/desativar).
- **Seletor de período** (personalizado com datas de início e fim).
- **Tabela detalhada** com data/hora, aplicativo e título da janela.

### ✅ 3. Interface Adaptável

- **Modo escuro/claro** persistente via LocalStorage.
- Design responsivo, compatível com diferentes tamanhos de tela.
- Scrollbars personalizadas para melhor usabilidade.

### ✅ 4. Banco de Dados Local

- Armazenamento em **SQLite** (`monitor_atividade.db`).
- Criado automaticamente na primeira execução.
- Nenhum dado é enviado para a internet — **privacidade total**.

---

## 📁 Estrutura do Projeto

App_monitoramento/
├── .gitignore # Regras de exclusão do Git (ignora caches e o banco .db local)
├── requirements.txt # Dependências do Python
├── README.md # Guia de instalação e uso
├── app.py # Servidor Flask + Thread de rastreamento
├── db/
│       └── monitor_atividade.db # Banco SQLite (gerado automaticamente no primeiro início)
└── web/
        ├── index.html # Estrutura visual do painel
        ├── style.css # Estilos e scrollbars personalizadas
        └── dashboard.js # Lógica do painel, gráficos e filtros

---

## ▶️ Como Executar Localmente

### 1️⃣ Certifique-se de ter o Python instalado
- Baixe em [python.org](https://www.python.org/downloads/) e marque **"Add Python to PATH"** durante a instalação.

### 2️⃣ Abra o terminal na pasta do projeto
---
cd "C:\Caminho\Para\Sua\Pasta\App_monitoramento"

3️⃣ Instalar dependências (sem necessidade de privilégios de administrador)
---
pip install --user -r requirements.txt

4️⃣ Iniciar o rastreador e o servidor local
---
python app.py
O servidor Flask estará disponível em:

http://127.0.0.1:5005
Acesse no navegador e comece a monitorar!

🧰 Tecnologias Utilizadas

Python 3.12+
Flask (servidor web leve)
SQLite (banco de dados local)
HTML5 / CSS3 (com suporte a temas claro/escuro)
JavaScript puro (Chart.js para gráficos interativos)
Arquitetura modular (separação entre backend, frontend e banco)

🎯 Objetivo do Projeto

Oferecer uma ferramenta de autoconsciência digital que permita:
Identificar padrões de uso do computador.
Melhorar a gestão do tempo e foco.
Manter total controle sobre os dados, sem dependência de serviços externos.
Ser fácil de instalar e usar em ambientes corporativos restritos.

📄 Licença

Uso pessoal e educacional — sinta-se livre para adaptar e compartilhar.
