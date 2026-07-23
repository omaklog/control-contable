# Feature Specification: Gestión de Pagos

**Feature Branch**: `018-gestion-pagos`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Gestión de Pagos — extiende los pagos de Cobranza (017) con estado del pago (Activo/Revertido/Eliminado), modificación con auditoría campo por campo, eliminación lógica y reversión con motivo obligatorio como operaciones distintas, comprobantes de pago adjuntos (uno o varios, eliminables de forma independiente), vista global de pagos con filtros combinables, historial de pagos en el detalle de cobranza actualizado en tiempo real, y preparación del modelo de datos para una futura generación de recibos de pago formal."

## Clarifications

### Session 2026-07-23

- Q: 018 §14 dice que al eliminar una cobranza con pagos, estos se marcan como eliminados en cascada. Pero 017 ya implementado bloquea por completo la eliminación de una cobranza con pagos (solo permite cancelar/anular, conservando pagos intactos). ¿Cómo concilio esto? → A: Mantener la regla de 017 — una cobranza con pagos sigue sin poder eliminarse jamás, solo cancelarse/anularse. 018 no introduce un nuevo camino de eliminación a nivel de cobranza; únicamente aporta eliminación lógica/reversión a nivel de pago individual, independiente de la cobranza.
- Q: 018 declara "fuera de alcance" la generación automática de recibos de pago. Pero 017 ya genera automáticamente un recibo por cada pago registrado (tabla recibos, vía trigger). ¿Qué hago con ese comportamiento ya existente? → A: Conservar sin cambios. El "fuera de alcance" de 018 se refiere únicamente a un futuro documento de recibo formateado/imprimible (el módulo "Recibos de Pago" mencionado como trabajo futuro); el registro de respaldo que 017 ya genera automáticamente en la tabla `recibos` por cada pago continúa funcionando sin cambios.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Modificar un pago registrado (Priority: P1)

El personal autorizado corrige datos de un pago ya registrado (fecha del pago, método de pago, monto, referencia, comentario), y el sistema conserva un rastro campo por campo de qué cambió, quién lo cambió y cuándo.

**Why this priority**: Los errores de captura (fecha, monto, método) son la corrección más frecuente y de mayor impacto financiero — sin ella, un error de captura queda congelado permanentemente o exige eliminar y volver a registrar, perdiendo trazabilidad.

**Independent Test**: Puede probarse registrando un pago, modificando su monto y su fecha, y verificando que (a) el saldo de la cobranza se recalcula con el nuevo monto y (b) el historial de auditoría muestra el valor anterior y el nuevo de cada campo modificado.

**Acceptance Scenarios**:

1. **Given** un pago de $2,000 registrado sobre una cobranza con saldo pendiente de $5,000, **When** el usuario modifica el monto a $3,000, **Then** el saldo pendiente de la cobranza se recalcula a $4,000 y el estado de pago se actualiza si corresponde.
2. **Given** un pago con fecha de pago 15/06/2026, **When** el usuario la corrige a 10/06/2026, **Then** el sistema conserva el valor anterior y el nuevo en el historial de auditoría, junto con el usuario y la fecha/hora del cambio.
3. **Given** una modificación de monto que dejaría la suma de pagos activos por encima del total de la cobranza, **When** el usuario intenta guardarla, **Then** el sistema la rechaza indicando el saldo máximo disponible.

---

### User Story 2 - Revertir un pago con motivo (Priority: P1)

El personal autorizado revierte un pago cuyo efecto financiero dejó de ser válido (por ejemplo, una transferencia rechazada), indicando un motivo obligatorio; el pago conserva su registro histórico visible, pero deja de contarse en el saldo.

**Why this priority**: Es el mecanismo central para invalidar un pago sin destruir evidencia — distingue a este módulo de un simple borrado y es indispensable para el control financiero del despacho.

**Independent Test**: Puede probarse registrando un pago que deja una cobranza en "Pagada", revirtiendo ese pago con un motivo, y verificando que el estado de pago de la cobranza vuelve a "Pendiente" o "Pago Parcial" según corresponda, mientras el pago revertido sigue siendo visible con su motivo.

**Acceptance Scenarios**:

1. **Given** un pago activo de $2,000 sobre una cobranza pagada en su totalidad, **When** el usuario lo revierte indicando el motivo "Transferencia rechazada", **Then** el pago cambia a estado "Revertido", el saldo pendiente de la cobranza vuelve a incluir los $2,000, y el estado de pago se recalcula.
2. **Given** el usuario intenta revertir un pago sin capturar un motivo, **When** confirma la operación, **Then** el sistema la rechaza y exige el motivo.
3. **Given** un pago ya revertido, **When** el usuario consulta el historial de pagos de la cobranza, **Then** el pago sigue visible con su información original, su estado "Revertido" y el motivo registrado.

---

### User Story 3 - Eliminar lógicamente un pago (Priority: P1)

El personal autorizado elimina lógicamente un pago que fue registrado por error, retirándolo de la operación normal y del cálculo de saldo, sin borrar el registro de la base de datos.

**Why this priority**: Junto con la reversión (US2), completa el par de operaciones que 018 exige distinguir con claridad; sin ella no hay forma de retirar un pago mal capturado que nunca debió existir.

**Independent Test**: Puede probarse registrando un pago, eliminándolo lógicamente, y verificando que desaparece de las consultas operativas normales y del cálculo de saldo, pero permanece accesible como historial para auditoría.

**Acceptance Scenarios**:

1. **Given** un pago activo registrado por error, **When** el usuario lo elimina lógicamente, **Then** el pago deja de contarse en el importe pagado de la cobranza y el saldo pendiente se recalcula.
2. **Given** un pago eliminado lógicamente, **When** se consulta la vista global de pagos con sus filtros por defecto, **Then** el pago eliminado no aparece entre los resultados operativos normales.
3. **Given** un pago eliminado lógicamente, **When** se genera el evento de auditoría correspondiente, **Then** queda registrado el usuario, la fecha/hora y el pago afectado.

---

### User Story 4 - Adjuntar y eliminar comprobantes de pago (Priority: P2)

El personal autorizado adjunta uno o varios archivos de comprobante a un pago (opcional, sin límite de cantidad ni validación de duplicados) y puede eliminar un comprobante de forma independiente sin afectar el pago.

**Why this priority**: Añade evidencia documental al pago, pero el módulo ya entrega valor central (registrar, modificar, revertir, eliminar pagos) sin ella.

**Independent Test**: Puede probarse adjuntando dos comprobantes distintos a un mismo pago, verificando que ambos quedan asociados con su metadata completa, y luego eliminando uno de ellos, verificando que el archivo se retira del almacenamiento y el pago permanece sin cambios.

**Acceptance Scenarios**:

1. **Given** un pago sin comprobantes, **When** el usuario adjunta dos archivos, **Then** ambos quedan asociados al pago con nombre original, tipo, tamaño, fecha de carga y usuario que los cargó.
2. **Given** un pago con un comprobante adjunto, **When** el usuario elimina ese comprobante, **Then** el archivo se retira físicamente del almacenamiento, queda un evento de auditoría, y el pago al que pertenecía permanece intacto.
3. **Given** un archivo ya adjuntado a un pago, **When** el usuario adjunta el mismo archivo a otro pago distinto, **Then** el sistema lo permite sin validar duplicidad.

---

### User Story 5 - Consultar pagos desde una vista global (Priority: P2)

El personal autorizado busca pagos de cualquier cliente y cobranza desde una pantalla independiente, combinando filtros de cliente, RFC, rango de fecha de pago, método de pago, estado, cobranza y usuario que registró el pago.

**Why this priority**: Da visibilidad operativa transversal (por ejemplo, "todos los pagos en efectivo de la semana pasada") que el historial dentro de cada cobranza no puede ofrecer por sí solo.

**Independent Test**: Puede probarse registrando pagos con distintos clientes, métodos, fechas y estados, y verificando que cada combinación de filtros en la vista global devuelve exactamente el subconjunto esperado.

**Acceptance Scenarios**:

1. **Given** pagos de distintos clientes y métodos, **When** el usuario filtra por método de pago "Efectivo" y un rango de fecha de pago, **Then** solo se muestran los pagos de ese método dentro del rango.
2. **Given** pagos activos, revertidos y eliminados, **When** el usuario no aplica un filtro de estado, **Then** la vista muestra por defecto solo los pagos activos, permitiendo ampliar el filtro para incluir revertidos o eliminados.
3. **Given** un usuario que desea ubicar los pagos que él mismo registró, **When** filtra por "usuario que registró", **Then** el resultado se limita a esos pagos.

---

### User Story 6 - Ver historial de pagos actualizado en el detalle de cobranza (Priority: P3)

Desde el detalle de una cobranza, el personal autorizado consulta el historial de pagos junto con el total, el total pagado y el saldo pendiente, y esa información se refresca automáticamente al registrar, modificar, eliminar o revertir un pago.

**Why this priority**: Es una mejora de visibilidad sobre datos que ya existen (017 ya muestra el historial de pagos); 018 solo añade que refleje los nuevos estados y se mantenga sincronizado tras las nuevas operaciones (modificar/eliminar/revertir).

**Independent Test**: Puede probarse revirtiendo un pago desde el detalle de una cobranza y verificando, sin recargar manualmente ninguna otra pantalla, que el saldo pendiente y el estado de pago mostrados se actualizan de inmediato.

**Acceptance Scenarios**:

1. **Given** el detalle de una cobranza con pagos activos, **When** el usuario elimina lógicamente uno de ellos, **Then** el total pagado y el saldo pendiente mostrados se actualizan de inmediato sin necesidad de una acción adicional.
2. **Given** un pago revertido, **When** se consulta el historial de pagos de su cobranza, **Then** aparece marcado visualmente como "Revertido" junto con su motivo.

---

### Edge Cases

- ¿Qué pasa si se intenta revertir un pago que ya está eliminado lógicamente, o eliminar uno que ya está revertido? El sistema lo rechaza — "Revertido" y "Eliminado" son estados finales; una vez alcanzado cualquiera de los dos, el pago no puede transicionar a otro estado ni volver a "Activo".
- ¿Qué pasa si la suma de pagos activos, tras revertir o eliminar uno de ellos, deja saldo pendiente en una cobranza que antes estaba "Pagada"? El estado de pago de la cobranza se recalcula de inmediato a "Pendiente" o "Pago Parcial" según corresponda.
- ¿Qué pasa si se modifica el monto de un pago y la nueva suma de pagos activos excede el total de la cobranza? El sistema rechaza la modificación, igual que rechazaría un pago nuevo que excediera el saldo.
- ¿Qué pasa si un método de pago usado históricamente se desactiva en el catálogo? Los pagos ya registrados con ese método lo conservan visible sin cambio; solo deja de ofrecerse para pagos nuevos.
- ¿Qué pasa si se intenta eliminar un comprobante de un pago que ya está eliminado lógicamente o revertido? Se permite — la eliminación de comprobantes es independiente del estado del pago al que pertenecen.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST exigir que todo pago esté asociado a una cobranza existente al momento de su registro, sin permitir pagos independientes.
- **FR-002**: El sistema MUST permitir registrar múltiples pagos parciales sobre una misma cobranza mientras mantenga saldo pendiente, y MUST rechazar cualquier pago (nuevo o modificado) cuyo monto, sumado a los demás pagos activos de la cobranza, exceda su total.
- **FR-003**: Cada pago MUST conservar de forma independiente su fecha real de pago (`fecha_pago`) y su fecha/hora de registro en el sistema (`created_at`); la fecha de pago MUST poder ser anterior a la fecha de registro.
- **FR-004**: El sistema MUST permitir modificar los campos de un pago existente (fecha de pago, método de pago, monto, referencia, comentario) a los usuarios con los permisos correspondientes, y cada modificación MUST volver a validar las reglas de saldo de la cobranza cuando afecte al monto.
- **FR-005**: Toda modificación de un pago MUST generar un evento de auditoría que conserve el campo modificado, su valor anterior, su nuevo valor, el usuario y la fecha/hora del cambio.
- **FR-006**: El sistema MUST permitir eliminar lógicamente un pago, marcándolo en estado "Eliminado", excluyéndolo de las consultas operativas normales y del cálculo del importe pagado, y MUST recalcular de inmediato el saldo pendiente y el estado de pago de la cobranza afectada.
- **FR-007**: El sistema MUST permitir revertir un pago, marcándolo en estado "Revertido", excluyéndolo del cálculo del importe pagado sin eliminar su registro, y MUST exigir un motivo obligatorio para toda reversión.
- **FR-008**: El sistema MUST distinguir la eliminación lógica de la reversión como dos operaciones independientes con su propio evento de auditoría, y ambas MUST recalcular de inmediato el saldo pendiente y el estado de pago de la cobranza afectada.
- **FR-009**: Un pago en estado "Eliminado" o "Revertido" MUST considerarse un estado final — el sistema NO MUST permitir que transicione a ningún otro estado, incluyendo de vuelta a "Activo" o de uno a otro entre sí.
- **FR-010**: El sistema MUST permitir adjuntar cero, uno o varios comprobantes a un pago, conservando de cada uno como mínimo: nombre original, tipo de archivo, tamaño, ubicación en el almacenamiento, fecha de carga y usuario que realizó la carga.
- **FR-011**: El sistema NO MUST validar duplicidad de archivos entre comprobantes, permitiendo que el mismo archivo se adjunte a distintos pagos o repetidamente al mismo pago.
- **FR-012**: El sistema MUST permitir eliminar un comprobante de forma independiente del pago al que pertenece — la eliminación MUST retirar físicamente el archivo del almacenamiento configurado, generar un evento de auditoría, y NO MUST modificar ni eliminar el pago asociado.
- **FR-013**: El sistema MUST proveer una vista global de pagos, independiente de la navegación por cobranza, que muestre como mínimo cliente, RFC, cobranza asociada, fecha del pago, método de pago, monto, referencia, estado y usuario que registró el pago.
- **FR-014**: La vista global de pagos MUST permitir filtrar por cliente, RFC, fecha de pago inicial, fecha de pago final, método de pago, estado, cobranza y usuario que registró el pago, con filtros combinables entre sí.
- **FR-015**: El detalle de una cobranza MUST mostrar su historial de pagos junto con el total, el total pagado y el saldo pendiente, y esa información MUST reflejarse de inmediato al registrarse, modificarse, eliminarse lógicamente o revertirse un pago.
- **FR-016**: El cálculo del importe pagado y del saldo pendiente de una cobranza MUST considerar únicamente los pagos en estado "Activo"; los pagos "Eliminado" o "Revertido" NO MUST participar en dicho cálculo.
- **FR-017**: El método de pago utilizado en un pago ya registrado MUST permanecer visible en ese pago aunque el método se desactive posteriormente en el catálogo general de métodos de pago.
- **FR-018**: El sistema MUST conservar la información necesaria (cliente, RFC, cobranza asociada, conceptos cobrados, fecha del pago, monto, método de pago, referencia y usuario que registró el pago) para permitir la futura generación de un recibo de pago formal, sin que este spec defina su formato ni su emisión.
- **FR-019**: Una cobranza con al menos un pago registrado (en cualquier estado) NO MUST poder eliminarse — se mantiene la regla ya vigente de solo poder cancelarse o anularse (Clarifications); la eliminación lógica, modificación y reversión de pagos individuales son operaciones independientes del ciclo de vida de la cobranza que los contiene.
- **FR-020**: El sistema MUST registrar en el sistema de auditoría existente, como mínimo: creación, modificación, eliminación lógica y reversión de pagos, y carga y eliminación de comprobantes — cada evento con usuario, fecha y hora, tipo de operación, entidad afectada, identificador del registro, valores anteriores y nuevos cuando aplique, y motivo cuando aplique.
- **FR-021**: El acceso a registrar, consultar, modificar, eliminar y revertir pagos, y a gestionar comprobantes, MUST controlarse mediante el sistema general de permisos existente, sin asumir en ningún momento la existencia de un rol o usuario de tipo Cliente.

### Key Entities

- **Pago** (extiende la entidad definida en 017-cobranza): registro asociado obligatoriamente a una cobranza, con fecha de pago, fecha de registro, método de pago, monto, referencia opcional, comentario opcional, usuario que lo registró y un estado (Activo, Revertido, Eliminado). Un pago en estado Revertido conserva un motivo obligatorio de reversión.
- **Comprobante de Pago**: archivo adjunto a un pago, con nombre original, tipo, tamaño, ubicación de almacenamiento, fecha de carga y usuario que lo cargó. Un pago puede tener cero, uno o varios comprobantes; un comprobante se elimina de forma independiente sin afectar el pago.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El personal autorizado puede corregir cualquier campo de un pago existente y el saldo/estado de la cobranza asociada se refleja correctamente de inmediato, en el 100% de los casos.
- **SC-002**: El 100% de las modificaciones, eliminaciones lógicas y reversiones de pagos quedan registradas en auditoría con el valor anterior y el nuevo cuando aplica.
- **SC-003**: Un pago revertido o eliminado lógicamente nunca se contabiliza en el saldo pendiente de su cobranza — verificado en el 100% de los casos.
- **SC-004**: El personal autorizado puede ubicar, en una sola búsqueda con filtros combinados desde la vista global, el conjunto de pagos que cumple criterios de cliente, fecha, método y estado simultáneamente.
- **SC-005**: El personal autorizado puede adjuntar y eliminar comprobantes de un pago sin afectar el registro del pago ni su historial, en el 100% de los casos.
- **SC-006**: Toda reversión de pago queda acompañada de un motivo obligatorio — 0% de reversiones sin motivo registrado.

## Assumptions

- Se mantiene sin cambios la regla ya vigente en 017: una cobranza con al menos un pago registrado nunca puede eliminarse, solo cancelarse/anularse; 018 no introduce un camino adicional de eliminación a nivel de cobranza (Clarifications).
- La generación automática del registro de respaldo en la tabla `recibos` por cada pago, ya implementada en 017, continúa sin cambios; el "fuera de alcance" de 018 sobre "generación automática de recibos" se refiere únicamente a un futuro documento de recibo formal/imprimible, no a este registro de respaldo (Clarifications).
- El acceso a registrar, modificar, eliminar, revertir pagos y gestionar comprobantes reutiliza las capacidades `manage_billing`/`view_billing` ya existentes, sin introducir nuevas capacidades granulares por operación — consistente con el patrón ya seguido en 016 y 017, donde restricciones más finas (cuando existen) se aplican mediante reglas de negocio explícitas y no mediante nuevas capacidades.
- Un pago en estado "Revertido" o "Eliminado" es un estado final: no existe en el alcance de este spec una operación de "reactivación" o "restauración" hacia "Activo" (FR-014 del documento fuente lo deja fuera de alcance explícitamente para eliminados, y se extiende el mismo criterio a revertidos por consistencia).
- Los comprobantes de pago se almacenan en el sistema de almacenamiento de archivos ya configurado para la aplicación (mismo mecanismo usado por 016-expediente-fiscal), sin que este spec requiera un proveedor de almacenamiento distinto.
- El catálogo de métodos de pago ya definido y administrado por Administración de Catálogos se reutiliza sin cambios; este spec no modifica su estructura ni sus reglas de alta/baja.
