'use client'

import { contactoFormSchema, type ContactoFormValues } from '@control-contable/utils'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { Form, Formik } from 'formik'

const VALORES_VACIOS: ContactoFormValues = {
  nombre: '',
  telefono: '',
  email: '',
}

/**
 * Formulario de Contacto compartido por apps/admin y apps/portal desde el
 * día uno (008-contactos-y-detalle-cliente, research.md Decisión 1): la prop
 * `contacto` es opcional — `undefined` = modo alta, definido = modo edición
 * (mismo patrón que ClienteForm).
 */
export function ContactoForm({
  open,
  contacto,
  error,
  onClose,
  onSubmit,
  title = contacto ? 'Editar contacto' : 'Agregar contacto',
  submitLabel = 'Guardar',
}: {
  open: boolean
  contacto?: ContactoFormValues | undefined
  error: string | null
  onClose: () => void
  onSubmit: (values: ContactoFormValues, helpers: { resetForm: () => void }) => void
  title?: string
  submitLabel?: string
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Formik
        initialValues={contacto ?? VALORES_VACIOS}
        validationSchema={contactoFormSchema}
        enableReinitialize
        onSubmit={(values, helpers) => onSubmit(values, { resetForm: () => helpers.resetForm() })}
      >
        {({ values, errors, touched, handleChange, isSubmitting }) => (
          <Form>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}

              <TextField
                name="nombre"
                label="Nombre"
                value={values.nombre}
                onChange={handleChange}
                error={Boolean(touched.nombre && errors.nombre)}
                helperText={touched.nombre ? errors.nombre : undefined}
                required
                fullWidth
              />

              <TextField
                name="telefono"
                label="Teléfono"
                value={values.telefono}
                onChange={handleChange}
                error={Boolean(touched.telefono && errors.telefono)}
                helperText={touched.telefono ? errors.telefono : undefined}
                required
                fullWidth
              />

              <TextField
                name="email"
                label="Correo electrónico"
                type="email"
                value={values.email}
                onChange={handleChange}
                error={Boolean(touched.email && errors.email)}
                helperText={touched.email ? errors.email : undefined}
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
        )}
      </Formik>
    </Dialog>
  )
}
