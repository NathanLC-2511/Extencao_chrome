# 🎵 yt-dlp YouTube Audio Downloader - Extensão para Google Chrome

![Versão](https://img.shields.io/badge/Versão-2.0.0-blueviolet?style=flat-square)
![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue?logo=googlechrome&logoColor=white&style=flat-square)
![yt-dlp](https://img.shields.io/badge/Engine-yt--dlp-red?style=flat-square)
![FFmpeg](https://img.shields.io/badge/Audio-FFmpeg-green?logo=ffmpeg&logoColor=white&style=flat-square)
![Windows](https://img.shields.io/badge/OS-Windows-0078D6?logo=windows&logoColor=white&style=flat-square)

Uma extensão moderna para **Google Chrome** (Manifest V3) que adiciona um botão integrado diretamente à interface do YouTube para extração e download de áudio em altíssima qualidade utilizando o poder do **yt-dlp** e **FFmpeg**.

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Novidades da Versão 2.0 (v2)](#-novidades-da-versão-20-instalador-de-músicas-v2)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura do Projeto](#-arquitetura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação Passo a Passo](#-instalação-passo-a-passo)
  - [1. Carregar a Extensão no Chrome](#1-carregar-a-extensão-no-chrome)
  - [2. Configurar o Conector Nativo (Native Messaging Host)](#2-configurar-o-conector-nativo-native-messaging-host)
- [Como Usar](#-como-usar)
  - [Opções de Execução](#opções-de-execução)
  - [Formatos de Áudio Suportados](#formatos-de-áudio-suportados)
- [Painel de Configurações (Popup)](#-painel-de-configurações-popup)
- [Solução de Problemas (FAQ)](#-solução-de-problemas-faq)
- [Licença](#-licença)

---

## 🌟 Visão Geral

O **yt-dlp YouTube Audio Downloader** elimina a necessidade de sites de conversão de terceiros cheios de anúncios e lentos. Ele combina:
1. **Injeção Nativa na UI do YouTube:** Um botão visualmente integrado ao tema escuro/claro do YouTube e no diálogo de compartilhamento.
2. **Conector Nativo (Native Messaging):** Comunicação segura entre a extensão do navegador e um script no Windows que dispara diretamente o `yt-dlp` local.
3. **Flexibilidade Total:** Escolha o formato de saída, o caminho de destino no disco e acompanhe a conversão em uma janela de terminal em tempo real.

---

## ✨ Novidades da Versão 2.0 (Instalador de Músicas v2)

A versão 2.0 traz melhorias substanciais de arquitetura, segurança, experiência de instalação e robustez na execução:

- 🔄 **Módulo Centralizado (`shared/constants.js`):**
  - Unificação de constantes, lista de formatos permitidos e geração de comandos compartilhados entre Content Script, Service Worker e Popup.
- 🛡️ **Segurança e Sanitização Reforçadas:**
  - Validação estrita de URLs (esquema `https?://` e bloqueio de caracteres perigosos).
  - Sanitização de caminhos e parâmetros para evitar vulnerabilidades de injeção de comandos.
  - Prevenção de XSS na modal através de manipulação segura do DOM via `DocumentFragment` e `textContent`.
- 🚀 **Instalador Nativo Inteligente (`install_host.bat`):**
  - **Memorização de ID:** Reconhece instalações anteriores e permite reutilizar o ID existente apenas pressionando `ENTER`.
  - **Limpeza Automática:** Remove prefixos como `chrome-extension://`, barras e aspas coladas por engano.
  - **Validação Regex:** Confirma se o ID possui exatamente 32 caracteres alfabéticos válidos do Chrome (`[a-p]{32}`).
  - **Template Seguro:** Criação do modelo `com.ytdlp.downloader.example.json`, mantendo o arquivo de configuração local fora do controle de versão (`.gitignore`).
- 🌐 **Suporte Completo a UTF-8:**
  - Scripts de execução gerados em UTF-8 com `chcp 65001`, garantindo compatibilidade total com títulos contendo acentos, emojis e caracteres especiais.
  - Tratamento de escape do símbolo `%` (`%%(title)s.%%(ext)s`) para preservar tokens do yt-dlp sem conflito com variáveis de ambiente do Windows.
- 🧹 **Autolimpeza de Arquivos Temporários:**
  - O script `.bat` temporário gerado no `%TEMP%` se autoexclui logo após o término da execução do download.
- 🛠️ **Diagnóstico e Teste de Conexão:**
  - O conector nativo agora suporta a ação dedicada `test`, validando em tempo real se o `yt-dlp` e o `ffmpeg` estão devidamente instalados no sistema e acessíveis pelo Chrome.
- ⚡ **Otimização de Performance:**
  - `MutationObserver` com técnica de debounce (200ms) para evitar sobrecarga no DOM do YouTube durante transições SPA.

---

## 🚀 Funcionalidades Principais

- **Integração Nativa no YouTube:** O botão `🎵 Baixar Áudio` é injetado automaticamente na barra de ações abaixo do player de vídeo e atualizado dinamicamente em navegações SPA.
- **Botão Rápido no Diálogo de Compartilhar:** Opção de download direto com 1 clique ao abrir a janela de compartilhamento do YouTube.
- **Cópia Automática da URL:** Ao abrir a modal, a URL limpa de compartilhamento (`https://youtu.be/...`) é copiada instantaneamente para a área de transferência.
- **Três Modos de Download:**
  - ⚡ **Modo Direto (Recomendado):** Dispara o download imediatamente em uma janela de terminal visível com barra de progresso em tempo real.
  - 📋 **Copiar Comando:** Copia o comando completo formatado para execução manual no CMD ou PowerShell.
  - 💾 **Baixar Script (.bat):** Gera e faz o download de um arquivo executável `.bat` de um clique.
- **Seleção de Formatos de Áudio:** Suporte a múltiplos codecs com extração via FFmpeg (`mp3`, `m4a`, `opus`, `flac`, `wav`, `aac`).
- **Personalização de Caminhos e Nomes:** Suporte a máscaras de renomeação do yt-dlp (ex: `%USERPROFILE%\Downloads\%(title)s.%(ext)s`).
- **Popup de Configurações e Diagnóstico:** Interface no ícone da barra de ferramentas para salvar preferências e testar a comunicação com o conector nativo.

---

## 🏗️ Arquitetura do Projeto

A estrutura de arquivos do projeto está organizada da seguinte maneira:

```text
Extencao_chrome/
├── manifest.json              # Manifesto V3 da extensão Chrome (v2.0.0)
├── icons/                     # Ícones em diferentes resoluções (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── service_worker.js      # Background worker que intermedia mensagens nativas
├── content/
│   ├── content.js             # Monitora o DOM do YouTube e injeta botões
│   ├── modal.js               # Gerencia a janela modal interativa de download
│   └── style.css              # Estilos visuais e animações da modal e botão
├── popup/
│   ├── popup.html             # Interface do popup da barra de ferramentas
│   ├── popup.js               # Lógica de preferências e teste de conexão
│   └── popup.css              # Estilos do popup
├── shared/
│   └── constants.js           # Constantes compartilhadas, validação e utilitários
└── native_host/
    ├── com.ytdlp.downloader.example.json  # Modelo de manifesto do Native Messaging Host
    ├── host.bat               # Ponto de entrada chamado pelo Chrome
    ├── host.ps1               # Script PowerShell que processa mensagens e executa o yt-dlp
    ├── install_host.bat       # Instalador inteligente do conector com validação
    └── uninstall_host.bat     # Script de remoção do registro e limpeza local
```

### Fluxo de Comunicação:
1. **YouTube (Content Script)** ➡️ O usuário clica no botão e confirma os parâmetros na modal.
2. **Service Worker** ➡️ Recebe a mensagem e a encaminha através da API `chrome.runtime.sendNativeMessage`.
3. **Native Host (`host.bat` + `host.ps1`)** ➡️ Chrome inicia o conector via `stdio`, o script valida os dados, localiza o `yt-dlp` e `ffmpeg` e inicia o download em uma janela de terminal visível com barra de progresso.

---

## 📋 Pré-requisitos

Para que o **Modo Direto** funcione corretamente, seu computador Windows deve ter:

1. **Google Chrome** (ou navegador baseado em Chromium como Brave, Edge, Opera).
2. **yt-dlp:** O utilitário de download.
3. **FFmpeg:** Necessário para conversão e extração de áudio para os formatos selecionados.

### Como instalar os pré-requisitos via WinGet (PowerShell):

Abra o PowerShell como Administrador e execute:

```powershell
# Instalar yt-dlp
winget install yt-dlp.yt-dlp

# Instalar FFmpeg
winget install Gyan.FFmpeg
```

> **Dica:** Feche e reabra seus navegadores e terminais após a instalação para que as variáveis de ambiente `PATH` sejam atualizadas.

---

## 🛠️ Instalação Passo a Passo

### 1. Carregar a Extensão no Chrome

1. Abra o Google Chrome e navegue até `chrome://extensions/`.
2. No canto superior direito, ative a opção **Modo do desenvolvedor**.
3. Clique no botão **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz deste projeto:
   ```text
   C:\caminho\para\Extencao_chrome
   ```
5. A extensão aparecerá na lista. **Copie o ID gerado** (uma sequência de 32 letras, ex: `lmhindcobmakbimhfioifcnbpgbhhkpo`).

---

### 2. Configurar o Conector Nativo (Native Messaging Host)

1. Navegue até a subpasta `native_host`:
   ```text
   C:\caminho\para\Extencao_chrome\native_host
   ```
2. Dê um duplo-clique no arquivo **`install_host.bat`**.
3. O instalador inteligente solicitará o **ID da extensão**:
   - Se estiver instalando pela primeira vez, cole o ID copiado no passo anterior (prefixos como `chrome-extension://` serão removidos automaticamente).
   - Se já tiver instalado anteriormente, apenas pressione `ENTER` para manter o ID atual.
4. O script valida o formato do ID, gera o arquivo local `com.ytdlp.downloader.json` com os caminhos absolutos corretos e registra o host no Registro do Windows:
   ```text
   HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.downloader
   ```
5. Para testar, clique no ícone da extensão no Chrome e verifique se o status exibe **"Conector Ativo"** (círculo verde).

---

## 🎧 Como Usar

1. Acesse qualquer vídeo no [YouTube](https://www.youtube.com/).
2. Abaixo do título do vídeo, na barra de botões (ao lado de *Curtir*, *Compartilhar*, etc.), clique no botão **🎵 Baixar Áudio** (ou no botão rápido no diálogo de compartilhamento).
3. A janela modal de configuração será exibida na tela.
4. Escolha o formato desejado e ajuste a pasta de destino (se necessário).
5. Escolha o modo de execução:
   - **Executar com yt-dlp (Modo Direto):** O terminal abrirá automaticamente e fará o download em tempo real.
   - **Copiar Comando:** Cole no seu terminal favorito.
   - **Baixar .bat:** Salve um arquivo executável para rodar quando quiser.

### Formatos de Áudio Suportados

| Formato | Descrição |
| :--- | :--- |
| **MP3** | Formato mais compatível, taxa dinâmica de 192kbps a 320kbps. |
| **M4A** | Codec AAC de alta qualidade com tamanho de arquivo compacto. |
| **OPUS** | Codec padrão do YouTube, melhor eficiência e fidelidade sonora. |
| **FLAC** | Áudio sem perdas (*lossless*) para máxima fidelidade. |
| **WAV** | Áudio não comprimido (*raw*). |
| **AAC** | Formato padrão de transmissão e reprodução universal. |

---

## ⚙️ Painel de Configurações (Popup)

Clicando no ícone da extensão na barra superior do navegador:
- **Status do Conector:** Teste instantâneo e diagnóstico de conexão com o script nativo (`yt-dlp` e `ffmpeg`).
- **Formato Padrão:** Defina qual formato deve vir pré-selecionado na modal.
- **Caminho Padrão:** Configure o diretório de download padrão (ex: `%USERPROFILE%\Downloads\%(title)s.%(ext)s`).

---

## ❓ Solução de Problemas (FAQ)

### O botão "🎵 Baixar Áudio" não aparece no YouTube
- Recarregue a página (`F5` ou `Ctrl + Shift + R`).
- Verifique se a extensão está ativada em `chrome://extensions/`.
- Caso esteja em uma playlist ou YouTube Shorts, certifique-se de estar na página principal de reprodução do vídeo.

### Erro: "yt-dlp não foi encontrado no sistema"
- Certifique-se de que o `yt-dlp` está instalado e presente no `PATH` do Windows.
- No terminal PowerShell, execute `yt-dlp --version` para testar se ele é reconhecido.
- Se instalou recentemente, reinicie o Chrome para recarregar as variáveis de ambiente.

### Conector aparece como "Não Conectado" no Popup
- Execute novamente o arquivo `native_host/install_host.bat` e garanta que informou o ID exato exibido em `chrome://extensions/`.
- Verifique se a política de execução de scripts do PowerShell permite a execução (`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`).

### Como desinstalar o conector nativo?
- Basta executar o arquivo `native_host/uninstall_host.bat`. Ele removerá a chave do registro do Windows e manterá o sistema limpo.

---

## 📄 Licença

Este projeto é disponibilizado para fins educacionais e de uso pessoal sob a licença [MIT](LICENSE).
