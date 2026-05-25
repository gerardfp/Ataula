# Guía de Publicación en el VS Code Marketplace 🚀

Esta guía detalla los pasos para empaquetar y publicar la extensión **EnTaula** bajo tu perfil de editor en el Marketplace de Visual Studio Code.

---

## 📋 Requisitos Previos (Solo la primera vez)

1. **Crear una cuenta de Microsoft**: Necesitas una cuenta de Microsoft activa o vinculada a GitHub.
2. **Crear un perfil de Editor (Publisher)**:
   - Ve al portal de **[Visual Studio Marketplace Publisher](https://marketplace.visualstudio.com/manage)**.
   - Crea un **Publisher ID** con el nombre exacto: **`gerardfp`** (debe coincidir con la propiedad `"publisher"` de tu [`package.json`](./packages/vscode-extension-table/package.json)).
3. **Crear un Personal Access Token (PAT) en Azure DevOps**:
   - Inicia sesión en **[Azure DevOps](https://dev.azure.com/)**.
   - Haz clic en tu perfil arriba a la derecha y selecciona **Personal Access Tokens**.
   - Crea un nuevo token con:
     - **Organization**: `All accessible organizations`.
     - **Scopes**: Selecciona **Custom defined** e indica los permisos de **Marketplace** -> **Acquire** y **Manage**.
   - Copia y guarda a buen recaudo el token PAT generado (no se volverá a mostrar).

---

## 🛠️ Empaquetado de la Extensión (`.vsix`)

El formato de distribución oficial de las extensiones de VS Code es un archivo `.vsix`. Sigue estos comandos en la terminal desde el directorio raíz:

1. **Compilar todo el monorepo**:
   ```bash
   npm run build
   ```
2. **Navegar a la carpeta de la extensión**:
   ```bash
   cd packages/vscode-extension-table
   ```
3. **Generar el paquete `.vsix`**:
   ```bash
   npx @vscode/vsce package
   ```
   *Esto compilará el paquete y creará el archivo de distribución `entaula-1.0.0.vsix` en esa misma carpeta.*

---

## 🚢 Métodos de Publicación

### Opción A: Publicación Web (Recomendada y Visual)
1. Entra en el panel de control de editores: **[Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)**.
2. Haz clic sobre tu perfil **`gerardfp`**.
3. Haz clic en **New Extension** -> **Visual Studio Code**.
4. Arrastra y suelta el archivo `.vsix` recién generado (`packages/vscode-extension-table/entaula-1.0.2.vsix`).
5. Tras unos breves minutos de verificación de seguridad, la extensión estará en línea.

### Opción B: Publicación por Consola (CLI)
1. Desde la carpeta de la extensión (`packages/vscode-extension-table`), inicia sesión introduciendo tu token PAT:
   ```bash
   npx @vscode/vsce login gerardfp
   ```
2. Sube y publica la extensión directamente:
   ```bash
   npx @vscode/vsce publish
   ```

---

## 💡 Flujo de Actualización en el Futuro
Para subir una nueva versión de la extensión en el futuro:
1. Incrementa la versión en el [`package.json`](./packages/vscode-extension-table/package.json) (por ejemplo, a `"1.0.1"`).
2. Compila el monorepo: `npm run build`.
3. Ve a `packages/vscode-extension-table` y ejecuta `npx @vscode/vsce publish` (o arrastra el nuevo `.vsix` en el portal web).
