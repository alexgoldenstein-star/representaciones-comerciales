# Representaciones comerciales

Plataforma para representantes de comercio: cada vendedor tiene su sitio, una tienda por marca, pedidos, factura y remito, condiciones comerciales y comisiones por etapa. Vos (superadministrador) controlás las cuentas, los planes y los dominios.

**Tecnología:** React + Vite, Firebase (Authentication, Firestore, Storage y Hosting) y GitHub Actions para publicar automáticamente.

---

## Los tres perfiles

| Perfil | Cómo entra | Qué puede hacer |
|---|---|---|
| **Administrador** (vos) | `/ingresar` → `/admin` | Ve todas las cuentas, suspende o activa vendedores, cambia planes y días de prueba, conecta dominios, ve los interesados y **edita los precios** de la página de venta. |
| **Vendedor** | `/registro` o `/ingresar` → `/panel` | Carga sus marcas, condiciones, catálogo y clientes; toma pedidos; sube facturas y remitos; ve sus comisiones; configura su sitio y pide su dominio. |
| **Cliente** del vendedor | Desde el sitio del vendedor: `/v/su-nombre/registro` o su dominio propio | Se registra, espera la aprobación del vendedor, ve precios, arma pedidos por marca y sigue sus pedidos con los comprobantes. |

Cada perfil sólo ve lo suyo: las reglas de seguridad de Firebase lo controlan del lado del servidor, no sólo en pantalla.

---

## Qué incluye

| Dirección | Qué es | Quién la usa |
|---|---|---|
| `/` | Página de venta del servicio, con formulario de interesados | Público |
| `/registro` · `/ingresar` | Alta e ingreso. Primero pregunta “¿Quién sos?”: los representantes siguen; los comercios buscan a su representante y van a su tienda | Vendedores (y comercios perdidos) |
| `/panel` | Panel del vendedor: inicio, pedidos, marcas, catálogo, clientes, comisiones, mi sitio | Vendedores |
| `/admin` | Administración: vendedores, dominios, interesados y precios | Sólo vos |
| `/v/nombre-del-vendedor` | Sitio público del vendedor + tienda + registro de clientes + mis pedidos | Clientes del vendedor |
| `dominio-del-vendedor.com.ar` | El mismo sitio del vendedor, en su dominio propio | Clientes del vendedor |

---

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Firebase

1. Entrá a <https://console.firebase.google.com> → **Agregar proyecto**. Nombre sugerido: `representaciones-comerciales`.
2. **Plan:** pasalo a **Blaze** (pago por uso). Firebase lo exige para usar Storage (logos, fotos y facturas). Tiene un nivel gratis amplio: con pocos vendedores el costo suele ser cero. Te conviene poner una alerta de presupuesto.
3. **Authentication** → Comenzar → **Correo electrónico/contraseña** → Habilitar.
4. **Firestore Database** → Crear base de datos → modo **producción** → ubicación `southamerica-east1 (São Paulo)`.
5. **Storage** → Comenzar → misma ubicación.
6. **Configuración del proyecto** (el engranaje) → **Tus apps** → ícono `</>` (Web) → registrá la app y marcá **“Configurar Firebase Hosting”**. Copiá los datos de `firebaseConfig` que te muestra (apiKey, authDomain, etc.).

### 2. Crear la clave para que GitHub pueda publicar

1. Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada**. Se descarga un archivo `.json`.
2. Guardalo bien: es como una contraseña. **No lo subas al repositorio.**

### 3. Subir el código a GitHub (Windows, desde CMD)

Necesitás tener Git instalado (<https://git-scm.com/download/win>). Con el repositorio ya creado en GitHub y el zip en Descargas:

```bat
cd %USERPROFILE%\Downloads
tar -xf representaciones-comerciales.zip
cd representaciones-comerciales
git remote add origin https://github.com/alexgoldenstein-star/representaciones-comerciales.git
git push -u origin main
```

La primera vez se abre el navegador para iniciar sesión en GitHub. La carpeta ya trae los commits hechos.

Para subir cambios más adelante:

```bat
cd %USERPROFILE%\Downloads\representaciones-comerciales
git add -A
git commit -m "Descripción del cambio"
git push
```

### 4. Cargar los datos secretos en GitHub

En el repositorio: **Settings → Secrets and variables → Actions**.

**Secrets** (pestaña *Secrets* → *New repository secret*):

| Nombre | Valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` de la configuración |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `FIREBASE_SERVICE_ACCOUNT` | Todo el contenido del archivo `.json` del paso 2 |

**Variables** (pestaña *Variables*):

| Nombre | Valor |
|---|---|
| `VITE_MAIN_HOSTS` | Tu dominio principal, por ejemplo `representacionescomerciales.com.ar,www.representacionescomerciales.com.ar` |
| `VITE_CONTACT_WHATSAPP` | Tu WhatsApp con código de país, sin `+`. Ej.: `5491155551234` |

También cambiá `TU-PROYECTO-FIREBASE` por tu `projectId` en el archivo `.firebaserc`.

### 5. Publicar

Cada vez que subas un cambio a la rama `main`, GitHub publica solo (pestaña **Actions** para ver el avance). Para publicar la primera vez sin cambiar nada: **Actions → Publicar en Firebase → Run workflow**.

El sitio queda en `https://TU-PROYECTO.web.app`.

### 6. Hacerte superadministrador

1. Entrá a `https://TU-PROYECTO.web.app/registro` y creá tu cuenta (podés usarla también como vendedor de prueba).
2. En la consola de Firebase → **Authentication → Usuarios**, copiá tu **UID de usuario**.
3. En **Firestore** → **Iniciar colección** → ID de colección: `admins` → ID del documento: **tu UID** → agregá un campo `email` con tu email → Guardar.
4. Volvé a entrar: vas a ver el botón **Administración** y la sección `/admin`.

> Sólo quien tenga un documento en `admins` puede suspender cuentas, cambiar planes o conectar dominios. Ese documento se crea únicamente desde la consola.

### 7. Cuenta de ejemplo para la página de venta

El botón “Ver un ejemplo” de la página principal lleva a `/v/ejemplo`. Creá una cuenta de vendedor con la dirección `ejemplo`, entrá al panel y tocá **“Cargar datos de ejemplo”**.

### 8. Tu dominio principal

Firebase → **Hosting → Agregar dominio personalizado** → `representacionescomerciales.com.ar` (y `www`). Cargá los registros que te da Firebase en tu proveedor de dominio (NIC Argentina, DonWeb, etc.). Asegurate de que el dominio esté en la variable `VITE_MAIN_HOSTS`.

---

## Cómo se conecta el dominio de un vendedor (con Vercel)

**Opción A: lo pide el vendedor**
1. El vendedor entra a **Mi sitio → Dominio propio**, escribe su dominio y toca **“Pedir que conecten mi dominio”**.
2. Te aparece en **Administración → Dominios**.
3. En **Vercel → tu proyecto → Settings → Domains → Add**, agregás el dominio (y la versión con `www`).
4. Revisás los registros DNS (ya vienen precargados: A `76.76.21.21` y CNAME `cname.vercel-dns.com`) y tocás **“Enviar datos al vendedor”**. El vendedor los ve en su panel para cargarlos donde compró el dominio.
5. Cuando Vercel muestre **Valid Configuration**, tocás **“Marcar como conectado”**.

**Opción B: lo conectás vos directo**
En **Administración → Vendedores** → abrís al vendedor → **Dominio propio** → escribís el dominio → **Conectar este dominio** (antes agregalo en Vercel).

Para cortarlo: **Desconectar** (y quitalo también en Vercel). Si suspendés una cuenta, su sitio y su panel dejan de estar disponibles sin borrar datos.

---

## Cómo está organizada la información (Firestore)

```
admins/{uid}                     → superadministradores (se crea a mano)
users/{uid}                      → rol de cada usuario: vendedor o cliente
slugs/{direccion}                → dirección /v/... de cada vendedor
domains/{dominio}                → dominio propio → vendedor (sólo lo escribe el admin)
leads/{id}                       → interesados de la página de venta
config/pricing                   → precios y días de prueba (se editan en Administración → Precios)
vendors/{uid}                    → datos del vendedor, plan, estado y dominio
  ├─ brands/{id}                 → marcas, condiciones y comisión
  ├─ products/{id}               → artículos (sólo los ven clientes aprobados)
  ├─ clients/{id}                → clientes (los registrados usan su UID)
  ├─ orders/{id}                 → pedidos, comprobantes y comisión
  └─ counters/orders             → numeración de pedidos
```

Las reglas de seguridad están en `firestore.rules` y `storage.rules`, y se publican junto con el sitio.

---

## Trabajar en tu computadora

```bash
npm install
cp .env.example .env.local    # completá con los datos de Firebase
npm run dev                   # abre http://localhost:5173
```

Para probar sin tocar los datos reales, usá los emuladores (necesitás Java y `npm i -g firebase-tools`):

```bash
npm run emuladores            # en una terminal
VITE_USE_EMULATORS=true npm run dev   # en otra
```

Si no completás `.env.local`, la app se conecta sola a los emuladores.

---

## Pendientes sugeridos

- Cobro automático de los planes con suscripciones de Mercado Pago.
- Aviso por email o WhatsApp al vendedor cuando entra un pedido (Cloud Functions).
- Conectar los dominios automáticamente con la API de Firebase Hosting.
- Exportar pedidos y comisiones a Excel.
