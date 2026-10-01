# Requerimientos: Microsoft Entra ID y Microsoft Graph

**Sistema:** Orden del Día (Pleno)

Aplicación web para preparar, conducir y documentar las sesiones del Pleno. Cubre el orden del día por secciones y puntos, el calendario de sesiones, el quórum, las votaciones, las actas, el resguardo de documentos y los avisos por correo.

**Componentes:**

- **Front:** SPA en React con MSAL (`@azure/msal-browser`).
- **API y base de datos:** propios, en la infraestructura que se solicita. Persisten la información de forma centralizada y aplican los permisos granulares.

---

## 1. Microsoft Entra ID: autenticación y roles

### Alcance

- MSAL se usa **únicamente para el inicio de sesión**. El front no llama a Graph ni solicita permisos de Graph.
- El acceso se restringe al **tenant institucional** (single-tenant). Solo ingresan quienes forman parte del directorio. No hay cuentas locales ni contraseñas propias en el sistema.
- Los usuarios sin rol asignado no pueden ingresar.

### Roles de aplicación (App Roles)

| Rol | Descripción |
|---|---|
| `Administrador` | Ingresa al sistema con capacidad de operar. Sus permisos finos los define el API. |
| `Lector` | Ingresa en modo consulta. |

Los roles se asignan en Entra ID (Enterprise Application, Users and groups).

### Scopes del front

- `openid`, `profile`, `email`
- Scope propio del API: `api://<id-del-api>/access_as_user`

### Validación en el API

El API valida cada token antes de atender la petición:

- Firma
- Tenant (`tid`)
- Audiencia (`aud`)
- Claim `roles`

Los **permisos granulares** dentro del sistema los asigna y controla el API en su propia base de datos, no Entra ID. Ejemplos: qué administrador puede subir archivos, enviar avisos o gestionar usuarios.

---

## 2. Microsoft Graph: permisos de aplicación (solo en el API)

El API usa su propia identidad (client credentials) para operar sobre cuentas institucionales designadas. El usuario final nunca recibe ni usa tokens de Graph. Antes de cada operación, el API verifica que el usuario esté autenticado y tenga el permiso granular correspondiente.

| Permiso (aplicación) | Uso | Recurso afectado |
|---|---|---|
| `Sites.Selected` (preferente) o `Files.ReadWrite.All` | Crear la estructura `Sesiones {año}/{proyecto}/{punto}` y subir los documentos de cada sesión (actas, anexos, expedientes). | Un único OneDrive o biblioteca institucional designada, no el OneDrive de cada usuario. |
| `Mail.Send` | Enviar desde Outlook los avisos, actualizaciones del orden del día y convocatorias, con un solo clic desde el sistema. | Un buzón institucional designado. |

---

## 3. Mínimo privilegio y controles

- **Sin permisos delegados de Graph.** Los usuarios no consienten ni usan Graph directamente.
- **Envío de correo acotado.** Se solicita configurar una Application Access Policy de Exchange Online para que `Mail.Send` solo pueda enviar desde el buzón designado.
- **Archivos acotados.** Con `Sites.Selected` el acceso se limita al sitio o biblioteca destino, no a todo el tenant.
- **Credenciales del API.** Se guardan en un almacén seguro (Key Vault o variables protegidas del servidor), nunca en el front. Se prefiere certificado sobre secreto, con rotación periódica.
- **Bitácora de auditoría.** Cada subida y cada envío se registra en la base de datos con el usuario que lo disparó, la fecha, el destino y el resultado.
- **Sin acceso a datos ajenos.** No se leen buzones, calendarios, directorio ni archivos de otros usuarios.

---

## 4. Resumen para el registro de aplicaciones

| Componente | Configuración | Tipo |
|---|---|---|
| SPA (front) | Redirect URIs institucionales. Scopes `openid profile email` y `access_as_user`. | Delegado (solo login) |
| API (back) | App Roles `Administrador` y `Lector`. | Roles de aplicación |
| API (back) | Graph: `Mail.Send` y `Sites.Selected` (o `Files.ReadWrite.All`). | Aplicación (requiere consentimiento de administrador) |

---

## 5. Datos que se requieren de TI

| Dato | Detalle |
|---|---|
| Registro de la SPA | Application (client) ID, Directory (tenant) ID. |
| Registro del API | Application ID URI, scope `access_as_user`, App Roles creados. |
| Credencial del API | Certificado o secreto para client credentials. |
| Consentimiento de administrador | Para los permisos de aplicación de Graph. |
| Destino de archivos | Sitio o biblioteca (o cuenta de OneDrive) donde se guardarán los documentos. |
| Buzón remitente | Cuenta institucional desde la que se envían los avisos, y su Application Access Policy. |
| Redirect URIs | Dominios institucionales de producción y pruebas del front. |
| Asignación de roles | Usuarios o grupos con `Administrador` y con `Lector`. |

---

## 6. Puntos por definir

1. **Almacenamiento de archivos.** Con permisos de aplicación, `Files.ReadWrite.All` da acceso a todos los drives del tenant. `Sites.Selected` sobre un sitio de SharePoint es más fácil de aprobar. Se propone esta segunda opción. Si debe ser el OneDrive de una cuenta específica, TI debe valorar el riesgo.
2. **Buzón remitente.** Definir si es un buzón compartido, de servicio o de una persona.
3. **Cambios en el front.** Hoy el front pide `User.Read`, `Mail.Send` y `Files.ReadWrite` delegados, y llama a Graph desde el navegador. Esa lógica pasará al API. Los scopes del front se reducirán al login y al scope del API.
