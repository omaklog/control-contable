# Control contable Constitution

    El sistema tiene como objetivo administrar la operación interna de un despacho contable mediante una plataforma web que permita:
        Administración de clientes.
        Control de cobranza mensual.
        Administración de expedientes fiscales digitales.
        Generación de documentos administrativos.
        Consulta rápida del historial de cada cliente.

El sistema debe priorizar la seguridad, confiabilidad y facilidad de mantenimiento.  
[//]: # (Proyecto para administrar despacho contable con el que administraremos clientes, cobranza, expedientes fiscales.)

## Core Principles

### Technology Stack

    Frontend
        Next.js
        React
        TypeScript
        Material UI
        Formik
        Yup para validaciones
        TanStack Query para manejo de datos
    Backend
        Supabase
        PostgreSQL
        Storage de Supabase
        Edge Functions cuando sean necesarias
    Infraestructura
        Docker
        Docker Compose
        Servidor local del despacho
        Administración remota segura (VPN o Tailscale, evitando exponer servicios directamente a Internet)

### Architecture

    La aplicación seguirá una arquitectura basada en capas:
        Presentación
        Casos de uso
        Servicios
        Persistencia

    Las reglas de negocio no deberán implementarse dentro de componentes React.
    Toda lógica reutilizable deberá vivir fuera de la interfaz.

### Arquitectura del Repositorio

    El proyecto se organizará como un monorepo para facilitar el mantenimiento, la reutilización de código y el despliegue coordinado de las aplicaciones.

    Aplicaciones

    El monorepo contendrá, como mínimo, las siguientes aplicaciones:

        Portal: Aplicación principal utilizada por el personal del despacho para la gestión diaria de clientes, expedientes, cobranza y reportes.
        Panel Administrativo: Aplicación independiente destinada exclusivamente a la administración del sistema, configuración global, gestión de usuarios, roles, permisos, catálogos y auditoría.

    Ambas aplicaciones compartirán una única base de datos y los mismos servicios backend, diferenciando el acceso mediante autenticación y autorización basada en roles.

    Código Compartido

    Todo código reutilizable deberá ubicarse en paquetes compartidos dentro del monorepo, incluyendo:

    Componentes de interfaz (UI)
    Tipos TypeScript
    Validaciones
    Utilidades
    Configuración
    Cliente de Supabase
    Servicios comunes

    Se evitará la duplicación de código entre aplicaciones.

    Arquitectura de la Aplicación

    La lógica del sistema deberá organizarse por módulos de negocio, favoreciendo un diseño desacoplado y escalable.

    Los módulos principales serán:

    Clientes
    Cobranza
    Expedientes Digitales
    Recibos de Honorarios
    Reportes
    Usuarios
    Auditoría
    Configuración

    Cada módulo deberá encapsular sus componentes, lógica de negocio, validaciones y acceso a datos, promoviendo un bajo acoplamiento y una alta cohesión.

    La lógica de negocio nunca deberá implementarse directamente en los componentes de React y deberá permanecer desacoplada de la interfaz de usuario.

### Security

    Este punto debería ser una prioridad absoluta.

    Nunca
        guardar contraseñas en texto plano;
        almacenar información fiscal fuera del servidor autorizado;
        exponer el servidor directamente a Internet;
        confiar únicamente en validaciones del frontend.

    Siempre
        HTTPS
        Autenticación obligatoria.
        Control de permisos por usuario.
        Registro de acciones importantes (auditoría).
        Backups automáticos.
        Cifrado de credenciales.
        Validación tanto en frontend como backend.

### Documentos Digitales

    El expediente fiscal constituye uno de los módulos principales.

    Reglas:

    únicamente archivos PDF;
    documentos clasificados por categorías y fecha;
    posibilidad de múltiples documentos por categoría;
    historial de carga;
    conservación del nombre original;
    tamaño máximo configurable;
    posibilidad de reemplazar versiones conservando historial cuando aplique.
    Nunca deberán eliminarse físicamente documentos sin autorización explícita.

### Base de Datos

    Todas las modificaciones importantes deberán ser trazables.
    Las tablas críticas deberán incluir:

    fecha de creación;
    fecha de modificación;
    usuario creador;
    usuario que realizó la última modificación;
    Evitar eliminaciones físicas.
    Preferir "soft delete".

### Calidad del código

    TypeScript Strict.
    Prohibido utilizar any salvo justificación documentada.
    ESLint sin errores.
    Prettier obligatorio.
    Componentes pequeños y reutilizables.
    Evitar duplicación de código.
    Nombre de variables, carpetas y funciones consistente y descriptivo y en inglés.

### UI

    Material UI.
    Responsive.
    Accesibilidad.
    Formularios consistentes.
    Confirmaciones para operaciones críticas.

### Reportes

    Todos los reportes deberán poder exportarse a PDF.
    Los formatos deberán mantenerse desacoplados de la lógica de negocio.

## Cobranza

    La cobranza constituye una funcionalidad principal.

    El sistema deberá permitir conocer en cualquier momento:

    clientes al corriente;
    clientes con adeudos;
    historial de pagos;
    mensualidades pendientes;
    recibos emitidos.

### Auditoría

    Las siguientes acciones deberán registrarse:

    Inicio de sesión;
    carga de documentos;
    eliminación de documentos;
    modificaciones de clientes;
    cambios en pagos;
    generación de recibos.

### Catálogos

    Las documentos del expediente tendrán una categoria definida en el administrador.

### Multi-Usuario

    Tendrémos roles definidos de la siguiente manera:

        Administrador
        Contador
        Auxiliar

### Principio de Evolución

    La arquitectura deberá favorecer la incorporación de nuevos módulos de negocio sin requerir modificaciones significativas en los módulos existentes.
    Las nuevas funcionalidades deberán integrarse mediante componentes reutilizables y siguiendo las convenciones definidas en esta Constitución.

### Backups automáticos

    respaldo diario de la base de datos;
    respaldo diario del almacenamiento de documentos;
    retención de al menos 30 días;
    posibilidad de restaurar un respaldo completo.

### Rendimiento

    Priorizar:

    paginación;
    consultas eficientes;
    evitar cargas innecesarias;
    lazy loading cuando sea conveniente.

### Testing

    Toda funcionalidad importante deberá contar con pruebas.

    Como mínimo:

    pruebas unitarias para reglas de negocio;
    pruebas de integración para procesos críticos.
