'use client'

import {
  obligacionFiscalClienteFormSchema,
  type ObligacionFiscalClienteFormValues,
} from '@control-contable/utils'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { Form, Formik } from 'formik'

export interface ObligacionFiscalOption {
  id: string
  nombre: string
}

export interface PeriodicidadOption {
  id: string
  nombre: string
}

const VALORES_VACIOS: ObligacionFiscalClienteFormValues = {
  obligacionFiscalId: '',
  periodicidadId: '',
  orden: '',
  observaciones: '',
}

/**
 * Formulario compartido de Obligación Fiscal del Cliente
 * (014-obligaciones-fiscales-cliente): en modo "agregar" (Historia 1) captura
 * obligación/periodicidad/orden/observaciones; en modo "editar" la obligación
 * fiscal es de solo lectura (FR-003 — la identidad cliente+obligación no
 * cambia), pero periodicidad/orden/observaciones sí (FR-007).
 */
export function ObligacionFiscalClienteForm({
  open,
  mode,
  obligacionFiscalNombre,
  valoresIniciales: valoresIniciales_,
  obligacionesFiscalesDisponibles,
  periodicidadesDisponibles,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'agregar' | 'editar'
  /** Solo relevante en modo "editar": nombre de la obligación ya asignada, de solo lectura. */
  obligacionFiscalNombre?: string | undefined
  valoresIniciales?: ObligacionFiscalClienteFormValues | undefined
  obligacionesFiscalesDisponibles: readonly ObligacionFiscalOption[]
  periodicidadesDisponibles: readonly PeriodicidadOption[]
  error: string | null
  onClose: () => void
  onSubmit: (values: ObligacionFiscalClienteFormValues, helpers: { resetForm: () => void }) => void
}) {
  const valoresIniciales = valoresIniciales_ ?? VALORES_VACIOS

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Formik
        initialValues={valoresIniciales}
        validationSchema={obligacionFiscalClienteFormSchema}
        enableReinitialize
        onSubmit={(values, helpers) => onSubmit(values, { resetForm: () => helpers.resetForm() })}
      >
        {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogTitle>
              {mode === 'agregar' ? 'Agregar obligación fiscal' : 'Editar obligación fiscal'}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}

              {mode === 'agregar' ? (
                <Autocomplete
                  options={obligacionesFiscalesDisponibles}
                  getOptionLabel={(option) => option.nombre}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={
                    obligacionesFiscalesDisponibles.find(
                      (option) => option.id === values.obligacionFiscalId,
                    ) ?? null
                  }
                  onChange={(_event, value) => setFieldValue('obligacionFiscalId', value?.id ?? '')}
                  renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                    <TextField
                      {...rest}
                      slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                      label="Obligación fiscal"
                      error={
                        Boolean(touched.obligacionFiscalId) && Boolean(errors.obligacionFiscalId)
                      }
                      helperText={
                        touched.obligacionFiscalId ? errors.obligacionFiscalId : undefined
                      }
                      fullWidth
                    />
                  )}
                />
              ) : (
                <TextField
                  label="Obligación fiscal"
                  value={obligacionFiscalNombre ?? ''}
                  fullWidth
                  disabled
                />
              )}

              <Autocomplete
                options={periodicidadesDisponibles}
                getOptionLabel={(option) => option.nombre}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  periodicidadesDisponibles.find((option) => option.id === values.periodicidadId) ??
                  null
                }
                onChange={(_event, value) => setFieldValue('periodicidadId', value?.id ?? '')}
                renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                  <TextField
                    {...rest}
                    slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                    label="Periodicidad"
                    error={Boolean(touched.periodicidadId) && Boolean(errors.periodicidadId)}
                    helperText={touched.periodicidadId ? errors.periodicidadId : undefined}
                    fullWidth
                  />
                )}
              />

              <TextField
                name="orden"
                label="Orden"
                type="number"
                value={values.orden}
                onChange={handleChange}
                error={Boolean(touched.orden) && Boolean(errors.orden)}
                helperText={touched.orden ? errors.orden : undefined}
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
