'use client'

import {
  servicioContratadoFormSchema,
  type ServicioContratadoFormValues,
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

export interface ServicioOption {
  id: string
  nombre: string
}

const VALORES_VACIOS: ServicioContratadoFormValues = {
  servicioId: '',
  precioAcordado: '',
  fechaInicio: new Date().toISOString().slice(0, 10),
  observaciones: '',
}

/**
 * Formulario compartido de Servicio Contratado (011-gestion-servicios):
 * en modo "agregar" (Historia 2) captura servicio/precio/fecha de
 * inicio/observaciones; en modo "cambiarPrecio" (Historia 3) solo el nuevo
 * precio, sobre un servicio contratado ya existente.
 */
export function ServicioContratadoForm({
  open,
  mode,
  servicioNombre,
  serviciosDisponibles,
  precioActual,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'agregar' | 'cambiarPrecio'
  /** Solo relevante en modo "cambiarPrecio": nombre del servicio ya contratado, de solo lectura. */
  servicioNombre?: string | undefined
  serviciosDisponibles: readonly ServicioOption[]
  /** Solo relevante en modo "cambiarPrecio": precio acordado actual, como valor inicial. */
  precioActual?: number | undefined
  error: string | null
  onClose: () => void
  onSubmit: (values: ServicioContratadoFormValues, helpers: { resetForm: () => void }) => void
}) {
  const valoresIniciales: ServicioContratadoFormValues =
    mode === 'cambiarPrecio'
      ? {
          ...VALORES_VACIOS,
          precioAcordado: precioActual !== undefined ? String(precioActual) : '',
        }
      : VALORES_VACIOS

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Formik
        initialValues={valoresIniciales}
        validationSchema={servicioContratadoFormSchema}
        enableReinitialize
        onSubmit={(values, helpers) => onSubmit(values, { resetForm: () => helpers.resetForm() })}
      >
        {({ values, errors, touched, handleChange, isSubmitting }) => (
          <Form>
            <DialogTitle>{mode === 'agregar' ? 'Agregar servicio' : 'Cambiar precio'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}

              {mode === 'agregar' ? (
                <Select
                  name="servicioId"
                  value={values.servicioId}
                  onChange={handleChange}
                  displayEmpty
                  error={Boolean(touched.servicioId) && Boolean(errors.servicioId)}
                >
                  <MenuItem value="" disabled>
                    Selecciona un servicio
                  </MenuItem>
                  {serviciosDisponibles.map((servicio) => (
                    <MenuItem key={servicio.id} value={servicio.id}>
                      {servicio.nombre}
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                <TextField label="Servicio" value={servicioNombre ?? ''} fullWidth disabled />
              )}

              <TextField
                name="precioAcordado"
                label="Precio acordado"
                type="number"
                value={values.precioAcordado}
                onChange={handleChange}
                error={Boolean(touched.precioAcordado) && Boolean(errors.precioAcordado)}
                helperText={touched.precioAcordado ? errors.precioAcordado : undefined}
                fullWidth
              />

              {mode === 'agregar' ? (
                <>
                  <TextField
                    name="fechaInicio"
                    label="Fecha de inicio"
                    type="date"
                    value={values.fechaInicio}
                    onChange={handleChange}
                    error={Boolean(touched.fechaInicio) && Boolean(errors.fechaInicio)}
                    helperText={touched.fechaInicio ? errors.fechaInicio : undefined}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                  <TextField
                    name="observaciones"
                    label="Observaciones"
                    value={values.observaciones}
                    onChange={handleChange}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                </>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  )
}
