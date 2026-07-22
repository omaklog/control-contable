# Feature Specification: Cobranza

**Feature Branch**: `017-cobranza`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Cobranza — generación periódica de una única cobranza por cliente y periodo, con conceptos provenientes de servicios recurrentes y cargos extraordinarios, congelados históricamente al incorporarse; pagos totales/parciales sobre la cobranza; estado de pago (Pendiente/Pago Parcial/Pagada) y de vencimiento (Vigente/Vencida) evaluados de forma independiente; eliminación lógica solo sin pagos, cancelación/anulación cuando hay pagos; filtros de consulta; tarjeta de Dashboard de clientes sin servicios activos; auditoría completa."

## Clarifications

### Session 2026-07-22

- Q: "Por defecto, la consulta deberá mostrar: Clientes asignados al usuario" — ¿es una restricción dura de acceso a nivel de base de datos, o solo el filtro inicial de conveniencia en la vista, ampliable por el usuario? → A: Es solo el filtro inicial de conveniencia. Reutiliza el modelo de capacidades existente (`view_billing`/`manage_billing`) sin introducir ninguna restricción de acceso por cliente asignado — la primera de su tipo en el sistema no era necesaria. "Clientes asignados al usuario" únicamente preselecciona los valores iniciales del filtro de la pantalla de consulta; el usuario puede quitarlo para ver cualquier cobranza que su capacidad ya le permita consultar.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generar cobranzas del periodo (Priority: P1)

Al iniciar un nuevo mes, el sistema genera automáticamente una cobranza por cada cliente activo con al menos un servicio activo, concentrando en ella los conceptos de sus servicios vigentes; el Administrador también puede solicitar la generación manualmente en cualquier momento, con las mismas reglas.

**Why this priority**: Es el punto de partida de todo el módulo — sin cobranzas generadas no hay nada que consultar, pagar ni auditar.

**Independent Test**: Puede probarse ejecutando la generación (automática o manual) para un periodo con clientes activos con servicios activos, y verificando que se crea exactamente una cobranza por cliente con los conceptos de sus servicios y los montos vigentes en ese momento.

**Acceptance Scenarios**:

1. **Given** un cliente activo con dos servicios activos, **When** se genera la cobranza del periodo, **Then** se crea una única cobranza con un concepto por cada servicio, usando el precio acordado vigente de cada uno.
2. **Given** un cliente activo sin servicios activos (sin servicios registrados, o todos suspendidos/inactivos), **When** se genera la cobranza del periodo, **Then** no se crea ninguna cobranza para ese cliente.
3. **Given** una cobranza ya generada para un cliente y periodo, **When** el proceso de generación se ejecuta nuevamente para el mismo periodo (automática o manualmente, una o varias veces), **Then** no se crea ninguna cobranza adicional para ese cliente y periodo.
4. **Given** un servicio con precio acordado de $3,500 al generarse la cobranza de Junio, **When** el precio del servicio se actualiza a $4,000 en Julio, **Then** la cobranza de Junio conserva $3,500 y solo la cobranza de Julio en adelante usa $4,000.
5. **Given** el Administrador solicita la generación manual, **When** la operación concluye, **Then** queda un evento de auditoría registrando quién la ejecutó y cuántas cobranzas se generaron.

---

### User Story 2 - Registrar pagos y ver saldo/estado (Priority: P1)

El personal autorizado registra uno o varios pagos —totales o parciales— sobre una cobranza, y el sistema mantiene siempre visible el saldo pendiente y el estado de pago resultante.

**Why this priority**: Es el segundo pilar del valor de negocio — sin registrar pagos, el módulo no cumple su propósito de controlar la cobranza.

**Independent Test**: Puede probarse generando una cobranza, registrando un pago parcial y verificando el saldo/estado, y luego registrando un segundo pago que complete el total, verificando que el estado cambia a Pagada.

**Acceptance Scenarios**:

1. **Given** una cobranza de $7,000 sin pagos, **When** se registra un pago de $2,000, **Then** el saldo pendiente muestra $5,000 y el estado de pago es "Pago Parcial".
2. **Given** una cobranza con saldo pendiente de $5,000, **When** se registran pagos adicionales que suman exactamente $5,000, **Then** el estado de pago cambia a "Pagada" y el saldo queda en $0.
3. **Given** una cobranza con saldo pendiente de $1,000, **When** se intenta registrar un pago de $1,500, **Then** el sistema rechaza el registro porque excede el saldo pendiente.
4. **Given** una cobranza pagada en su totalidad después de la fecha límite configurada, **When** se consulta su estado, **Then** se muestra como "Pagada", sin importar que el pago haya ocurrido después del vencimiento.

---

### User Story 3 - Registrar e incorporar cargos extraordinarios (Priority: P2)

El personal autorizado registra un cargo extraordinario para un cliente indicando el periodo objetivo, y ese cargo se incorpora como un concepto adicional a la cobranza de ese periodo.

**Why this priority**: Extiende el valor de negocio central (US1) a cobros puntuales, pero el despacho puede operar la generación y los pagos de servicios recurrentes sin esta historia.

**Independent Test**: Puede probarse registrando un cargo extraordinario con un periodo objetivo, generando o usando la cobranza de ese periodo, y verificando que el cargo aparece como concepto adicional con el monto correcto.

**Acceptance Scenarios**:

1. **Given** un cargo extraordinario pendiente con periodo objetivo Junio 2026, **When** se genera o ya existe la cobranza de Junio 2026 de ese cliente, **Then** el cargo se incorpora como un concepto adicional y su estado cambia a "Incorporado".
2. **Given** un cargo extraordinario pendiente (no incorporado), **When** el usuario intenta eliminarlo, **Then** la eliminación se permite.
3. **Given** un cargo extraordinario ya incorporado a una cobranza, **When** el usuario intenta eliminarlo, **Then** el sistema lo rechaza — el concepto ya incorporado solo puede administrarse desde la cobranza.
4. **Given** un cargo extraordinario incorporado con monto $2,000, **When** el cargo original se modificara posteriormente (si el sistema lo permitiera antes de incorporarse), **Then** el concepto ya incorporado a la cobranza conserva los $2,000 sin cambio.

---

### User Story 4 - Consultar cobranzas con filtros (Priority: P2)

El personal autorizado busca cobranzas combinando filtros de RFC, nombre de cliente, mes, año, estado de pago y estado de vencimiento.

**Why this priority**: Da visibilidad operativa sobre lo ya generado (US1) y pagado (US2), necesaria para el seguimiento diario del despacho.

**Independent Test**: Puede probarse generando cobranzas para varios clientes y periodos con distintos estados, y verificando que cada combinación de filtros devuelve exactamente el subconjunto esperado.

**Acceptance Scenarios**:

1. **Given** cobranzas de distintos clientes y meses, **When** el usuario filtra por mes "Junio 2026" y estado de vencimiento "Vencida", **Then** solo se muestran las cobranzas de ese mes con saldo pendiente fuera del plazo.
2. **Given** un usuario Contador o Auxiliar, **When** abre la consulta de cobranzas sin aplicar filtros, **Then** ve por defecto sus clientes asignados con cobranzas pendientes de pago, pudiendo quitar ese filtro para ver cualquier cobranza que su rol le permita consultar (Clarifications).
3. **Given** un Administrador, **When** consulta cobranzas sin filtros, **Then** puede ver las de todos los clientes.

---

### User Story 5 - Eliminar, cancelar o anular una cobranza (Priority: P3)

El Administrador elimina lógicamente una cobranza que no tiene pagos registrados, o la cancela/anula cuando ya tiene pagos, conservando en ambos casos la trazabilidad.

**Why this priority**: Es una operación de mantenimiento excepcional — el módulo entrega valor completo (generar, pagar, consultar) sin ella, pero se necesita para corregir errores.

**Independent Test**: Puede probarse eliminando una cobranza sin pagos (verificando que desaparece de las consultas operativas) y cancelando una cobranza con pagos (verificando que la cobranza, sus conceptos y sus pagos permanecen consultables como historial).

**Acceptance Scenarios**:

1. **Given** una cobranza sin pagos registrados, **When** el Administrador la elimina, **Then** deja de aparecer en las consultas operativas normales, pero el registro se conserva para auditoría.
2. **Given** una cobranza con al menos un pago registrado, **When** el Administrador intenta eliminarla, **Then** el sistema lo rechaza e indica que debe cancelarse o anularse.
3. **Given** una cobranza con pagos registrados, **When** el Administrador la cancela o anula, **Then** la cobranza, sus conceptos y sus pagos permanecen consultables como historial, y la cobranza deja de considerarse vigente.

---

### User Story 6 - Configurar generación/vencimiento y ver clientes sin servicios activos (Priority: P3)

El Administrador ajusta el día del mes en que se generan las cobranzas y el día límite de pago, y consulta desde el Dashboard cuántos clientes activos no tienen servicios activos (por lo que no reciben cobranza).

**Why this priority**: Es configuración y visibilidad complementaria — los valores por defecto (día 1 de generación, día límite 20) permiten operar el módulo sin tocar esta historia de inmediato.

**Independent Test**: Puede probarse cambiando el día límite configurado, generando cobranzas antes y después del cambio, y verificando que solo las cobranzas generadas después usan el nuevo valor; y consultando la tarjeta del Dashboard con al menos un cliente activo sin servicios activos.

**Acceptance Scenarios**:

1. **Given** el día límite configurado en 20, **When** el Administrador lo cambia a 15, **Then** las cobranzas ya generadas conservan su fecha límite original y solo las que se generen después usan el nuevo valor.
2. **Given** al menos un cliente activo sin servicios activos, **When** el Administrador abre el Dashboard, **Then** ve una tarjeta "Clientes sin servicios activos" con la cantidad correcta, con acceso al listado correspondiente.

---

### Edge Cases

- ¿Qué pasa si un cliente se desactiva después de que ya se generó su cobranza del periodo? La cobranza ya generada permanece sin cambios; el cliente inactivo simplemente no genera cobranzas en periodos futuros.
- ¿Qué pasa si se registra un cargo extraordinario con periodo objetivo ya pasado, cuya cobranza ya fue generada? El cargo queda pendiente hasta que un Administrador lo incorpore manualmente a la cobranza de ese periodo — la generación automática solo incorpora cargos pendientes al momento de crear la cobranza.
- ¿Qué pasa si la suma de pagos alcanza exactamente el total de la cobranza? El estado cambia a "Pagada" y el saldo queda en $0.
- ¿Qué pasa si se intenta registrar un pago sobre una cobranza cancelada o anulada? El sistema lo rechaza — una cobranza cancelada/anulada no admite nuevos pagos.
- ¿Qué pasa si se cancela/anula una cobranza y llega un nuevo periodo? El periodo cancelado permanece como historial; el sistema no genera automáticamente una cobranza de reemplazo para ese mismo cliente y periodo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST garantizar como máximo una cobranza por combinación de cliente y periodo.
- **FR-002**: El sistema MUST generar automáticamente, en el día del mes configurado (por defecto el día 1), una cobranza para cada cliente activo que tenga al menos un servicio activo, incorporando un concepto por cada servicio activo con el precio acordado vigente en ese momento.
- **FR-003**: El sistema MUST permitir al Administrador solicitar manualmente la generación de cobranzas del periodo, aplicando exactamente las mismas reglas que la generación automática (incluyendo la garantía de no duplicados), y MUST registrar un evento de auditoría por cada ejecución manual.
- **FR-004**: La generación (automática o manual) MUST ser idempotente: ejecutarla más de una vez para el mismo periodo no MUST producir cobranzas ni conceptos duplicados.
- **FR-005**: El sistema NO MUST generar una cobranza para un cliente activo que no tenga ningún servicio activo (sin servicios registrados, o todos suspendidos/inactivos/finalizados).
- **FR-006**: El monto de un concepto de servicio recurrente MUST fijarse al precio acordado vigente en el momento de incorporarse a la cobranza, y ese monto MUST permanecer sin cambios aunque el precio del servicio cambie después.
- **FR-007**: La suspensión, finalización o eliminación de un servicio después de generada una cobranza NO MUST modificar los conceptos ya incorporados en cobranzas previas; solo MUST afectar la generación de cobranzas futuras.
- **FR-008**: El sistema MUST permitir registrar un cargo extraordinario para un cliente, indicando descripción, monto y el periodo objetivo de cobranza al que está destinado, quedando inicialmente en estado "Pendiente".
- **FR-009**: El sistema MUST incorporar los cargos extraordinarios pendientes de un cliente como conceptos adicionales de la cobranza de su periodo objetivo, al momento de generarse esa cobranza, cambiando el estado del cargo a "Incorporado".
- **FR-010**: Un cargo extraordinario en estado "Pendiente" MUST poder eliminarse; un cargo extraordinario ya "Incorporado" a una cobranza NO MUST poder eliminarse de forma independiente — a partir de ese momento se administra como parte de la cobranza.
- **FR-011**: El monto de un concepto originado en un cargo extraordinario MUST quedar congelado al incorporarse, sin verse afectado por cambios posteriores en el cargo extraordinario original.
- **FR-012**: Cada concepto de una cobranza MUST conservar su descripción, monto congelado, tipo de origen (servicio recurrente o cargo extraordinario), referencia a su origen cuando aplique, y fecha de incorporación.
- **FR-013**: El Administrador MUST poder modificar una cobranza ya generada (agregar conceptos, incorporar cargos extraordinarios, eliminar conceptos, y cancelar/anular la cobranza), y cada modificación MUST quedar registrada en auditoría sin alterar el historial del servicio o cargo extraordinario de origen.
- **FR-014**: El sistema MUST permitir registrar uno o varios pagos —totales o parciales— sobre una cobranza, y MUST rechazar cualquier pago cuyo monto, sumado a los pagos ya registrados, exceda el total de la cobranza.
- **FR-015**: El sistema MUST calcular y mostrar el estado de pago de una cobranza como "Pendiente" (sin pagos), "Pago Parcial" (al menos un pago, suma inferior al total) o "Pagada" (suma de pagos igual al total).
- **FR-016**: El sistema MUST calcular y mostrar el estado de vencimiento de una cobranza —"Vigente" o "Vencida"— de forma independiente al estado de pago, usando el día límite configurado (por defecto el día 20): vigente hasta ese día del periodo, vencida a partir del día siguiente si aún tiene saldo pendiente.
- **FR-017**: Una cobranza completamente pagada MUST mostrarse siempre como "Pagada", sin importar si el pago ocurrió antes o después del día límite.
- **FR-018**: El Administrador MUST poder configurar el día del mes de generación automática y el día límite de pago; los cambios MUST aplicar solo a generaciones y cobranzas futuras, sin alterar cobranzas ya generadas.
- **FR-019**: Una cobranza sin pagos registrados MUST poder eliminarse mediante eliminación lógica (oculta de las consultas operativas normales, conservada para auditoría); una cobranza con al menos un pago registrado NO MUST poder eliminarse.
- **FR-020**: El Administrador MUST poder cancelar o anular una cobranza con pagos registrados, conservando la cobranza, sus conceptos, sus pagos y su historial de auditoría; una cobranza cancelada/anulada NO MUST admitir nuevos pagos ni contarse como vigente.
- **FR-021**: El sistema MUST proveer una consulta de cobranzas filtrable por RFC, nombre de cliente, mes, año, estado de pago y estado de vencimiento, con filtros combinables.
- **FR-022**: Por defecto, la consulta de cobranzas para Contador y Auxiliar MUST preseleccionar sus clientes asignados con cobranzas pendientes de pago como filtro inicial de conveniencia, ampliable por el usuario a cualquier cobranza que su capacidad (`view_billing`/`manage_billing`) ya le permita consultar (Clarifications) — sin introducir ninguna restricción de acceso a nivel de base de datos; el Administrador MUST poder consultar todas las cobranzas sin restricción.
- **FR-023**: El Dashboard MUST mostrar una tarjeta "Clientes sin servicios activos" con la cantidad de clientes activos sin ningún servicio activo, con acceso al listado correspondiente.
- **FR-024**: El sistema MUST registrar en el sistema de auditoría existente, como mínimo: generación automática y manual de cobranzas, modificación/eliminación/cancelación/anulación de cobranzas, creación/incorporación/modificación/eliminación de conceptos y cargos extraordinarios, y registro de pagos — cada evento con usuario, fecha y hora, acción, registro afectado, e información anterior/nueva cuando aplique.

### Key Entities

- **Cobranza**: Registro único por cliente y periodo que concentra el importe total a cobrar. Tiene un estado de pago (derivado de sus pagos) y un estado de vencimiento (derivado de la fecha límite configurada al generarse), además de un estado propio de ciclo de vida (vigente, eliminada lógicamente, cancelada/anulada).
- **Concepto de Cobranza**: Línea dentro de una cobranza con descripción, monto congelado, tipo de origen (servicio recurrente o cargo extraordinario) y referencia a ese origen. Su monto no cambia aunque el origen cambie después.
- **Cargo Extraordinario**: Importe puntual registrado para un cliente con un periodo objetivo de cobranza; pasa de "Pendiente" a "Incorporado" cuando se convierte en concepto de una cobranza.
- **Pago**: Registro independiente asociado a una cobranza, con fecha, método de pago (del catálogo existente), monto y comentario. Varios pagos pueden acumularse sobre la misma cobranza sin exceder su total.
- **Configuración de Cobranza**: Valores administrables por el Administrador — día del mes de generación automática (por defecto 1) y día límite de pago (por defecto 20) — que aplican solo hacia adelante.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El despacho genera las cobranzas de todos sus clientes activos con servicios activos para un periodo en una sola operación, sin captura manual por cliente.
- **SC-002**: Ejecutar la generación de cobranzas varias veces para el mismo periodo produce siempre el mismo conjunto de cobranzas — cero duplicados en el 100% de los casos.
- **SC-003**: Un cambio de precio en un servicio nunca modifica el monto de una cobranza ya generada — verificado en el 100% de los casos tras el cambio.
- **SC-004**: El personal autorizado puede registrar un pago y ver el saldo pendiente y el estado actualizado de la cobranza inmediatamente, sin cálculos manuales.
- **SC-005**: El 100% de las cobranzas con al menos un pago registrado quedan protegidas contra eliminación directa, quedando disponible únicamente la cancelación/anulación.
- **SC-006**: El personal autorizado puede obtener, en una sola búsqueda con filtros combinados, el conjunto de cobranzas vencidas de un mes específico.
- **SC-007**: El Administrador puede identificar desde el Dashboard, sin revisar cliente por cliente, la cantidad de clientes activos sin servicios activos.

## Assumptions

- El catálogo de métodos de pago, las capacidades `manage_billing`/`view_billing` y su asignación actual por rol (Administrador y Contador con `manage_billing`; los tres roles con `view_billing`) ya existen y se reutilizan sin cambios — 017 no modifica el modelo de permisos existente.
- "Cancelar" y "anular" una cobranza se tratan como una misma operación de negocio (un estado terminal que preserva todo el historial) — el spec fuente los usa de forma intercambiable sin distinguir dos flujos distintos.
- Una cobranza cancelada/anulada conserva su lugar en la restricción de unicidad cliente+periodo — el sistema no genera automáticamente una cobranza de reemplazo para ese mismo periodo tras la cancelación; un Administrador decide manualmente si corresponde un ajuste.
- Un cargo extraordinario con periodo objetivo ya vencido cuya cobranza ya existía se incorpora manualmente por el Administrador (vía modificación de cobranza) — la generación automática/manual solo incorpora cargos pendientes en el momento de crear la cobranza, no revisa cobranzas ya existentes en busca de cargos nuevos.
- El día de generación y el día límite de pago son valores únicos y globales para todo el despacho (no configurables por cliente).
- Los servicios recurrentes considerados son los ya definidos en `Servicios Contratados` (011-gestion-servicios); este spec no introduce un concepto distinto de "servicio".
