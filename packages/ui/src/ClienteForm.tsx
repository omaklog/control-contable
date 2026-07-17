'use client'

import {
  clienteFormSchema,
  filtrarRegimenesPorTipoPersona,
  type ClienteFormValues,
  type RegimenFiscalOption,
} from '@control-contable/utils'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import { Form, Formik } from 'formik'

const VALORES_VACIOS: ClienteFormValues = {
  nombre: '',
  tipoPersona: 'moral',
  rfc: '',
  regimenFiscalCodigo: '',
  correo: '',
  telefono: '',
  direccionFiscal: '',
}

/**
 * Formulario de Cliente compartido por apps/admin (edición,
 * 006-crud-clientes-admin) y apps/portal (alta, 007-alta-cliente-portal): la
 * prop `cliente` es opcional — `undefined` = modo alta (valores vacíos),
 * definido = modo edición (prellenado). Ver research.md Decisión 2 de
 * 007-alta-cliente-portal (revierte la restricción "solo edición" que tenía
 * sentido en 006 porque en ese momento solo existía un consumidor).
 */
export function ClienteForm({
  open,
  cliente,
  regimenesFiscales,
  error,
  onClose,
  onSubmit,
  title = cliente ? 'Editar cliente' : 'Agregar cliente',
  submitLabel = 'Guardar',
}: {
  open: boolean
  cliente?: ClienteFormValues | undefined
  regimenesFiscales: readonly RegimenFiscalOption[]
  error: string | null
  onClose: () => void
  onSubmit: (values: ClienteFormValues, helpers: { resetForm: () => void }) => void
  title?: string
  submitLabel?: string
}) {
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Formik
        initialValues={cliente ?? VALORES_VACIOS}
        validationSchema={clienteFormSchema}
        enableReinitialize
        onSubmit={(values, helpers) => onSubmit(values, { resetForm: () => helpers.resetForm() })}
      >
        {({ values, errors, touched, handleChange, isSubmitting }) => {
          const opciones = filtrarRegimenesPorTipoPersona(
            regimenesFiscales,
            values.tipoPersona,
            hoy,
          )
          const regimenSeleccionadoSigueVisible = opciones.some(
            (opcion) => opcion.codigo === values.regimenFiscalCodigo,
          )

          return (
            <Form>
              <DialogTitle>{title}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {error ? <Alert severity="error">{error}</Alert> : null}

                <TextField
                  name="nombre"
                  label="Nombre o razón social"
                  value={values.nombre}
                  onChange={handleChange}
                  error={Boolean(touched.nombre && errors.nombre)}
                  helperText={touched.nombre ? errors.nombre : undefined}
                  required
                  fullWidth
                />

                <Select
                  name="tipoPersona"
                  value={values.tipoPersona}
                  onChange={handleChange}
                  fullWidth
                >
                  <MenuItem value="fisica">Persona física</MenuItem>
                  <MenuItem value="moral">Persona moral</MenuItem>
                </Select>

                <TextField
                  name="rfc"
                  label="RFC"
                  value={values.rfc}
                  onChange={handleChange}
                  error={Boolean(touched.rfc && errors.rfc)}
                  helperText={touched.rfc ? errors.rfc : undefined}
                  required
                  fullWidth
                />

                <Select
                  name="regimenFiscalCodigo"
                  label="Régimen fiscal"
                  value={values.regimenFiscalCodigo}
                  onChange={handleChange}
                  fullWidth
                >
                  {!regimenSeleccionadoSigueVisible && values.regimenFiscalCodigo ? (
                    <MenuItem value={values.regimenFiscalCodigo}>
                      {values.regimenFiscalCodigo} (ya no vigente o incompatible)
                    </MenuItem>
                  ) : null}
                  {opciones.map((opcion) => (
                    <MenuItem key={opcion.codigo} value={opcion.codigo}>
                      {opcion.codigo} — {opcion.descripcion}
                    </MenuItem>
                  ))}
                </Select>

                <TextField
                  name="correo"
                  label="Correo electrónico"
                  type="email"
                  value={values.correo}
                  onChange={handleChange}
                  error={Boolean(touched.correo && errors.correo)}
                  helperText={touched.correo ? errors.correo : undefined}
                  required
                  fullWidth
                />

                <TextField
                  name="telefono"
                  label="Teléfono"
                  value={values.telefono}
                  onChange={handleChange}
                  fullWidth
                />

                <TextField
                  name="direccionFiscal"
                  label="Dirección fiscal"
                  value={values.direccionFiscal}
                  onChange={handleChange}
                  multiline
                  minRows={2}
                  fullWidth
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {submitLabel}
                </Button>
              </DialogActions>
            </Form>
          )
        }}
      </Formik>
    </Dialog>
  )
}
