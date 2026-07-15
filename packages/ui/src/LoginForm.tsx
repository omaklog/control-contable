'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useFormik } from 'formik'
import { useState } from 'react'
import * as Yup from 'yup'

const loginSchema = Yup.object({
  email: Yup.string().email('Correo inválido').required('El correo es requerido'),
  password: Yup.string().required('La contraseña es requerida'),
})

export interface LoginFormValues {
  email: string
  password: string
}

export interface LoginFormProps {
  title: string
  /**
   * Debe devolver un mensaje de error genérico (FR-012: nunca revelar si el
   * correo existe) o `null` si el login fue exitoso.
   */
  onSubmit: (values: LoginFormValues) => Promise<string | null>
  onSuccess: () => void
}

export function LoginForm({ title, onSubmit, onSuccess }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const formik = useFormik<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setFormError(null)
      const error = await onSubmit(values)
      setSubmitting(false)
      if (error) {
        setFormError(error)
        return
      }
      onSuccess()
    },
  })

  return (
    <Box
      component="form"
      onSubmit={formik.handleSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 360, mx: 'auto', mt: 8 }}
    >
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
      {formError ? <Alert severity="error">{formError}</Alert> : null}
      <TextField
        name="email"
        label="Correo electrónico"
        type="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={Boolean(formik.touched.email) && Boolean(formik.errors.email)}
        helperText={formik.touched.email ? formik.errors.email : undefined}
        autoComplete="email"
        fullWidth
      />
      <TextField
        name="password"
        label="Contraseña"
        type="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={Boolean(formik.touched.password) && Boolean(formik.errors.password)}
        helperText={formik.touched.password ? formik.errors.password : undefined}
        autoComplete="current-password"
        fullWidth
      />
      <Button type="submit" variant="contained" disabled={formik.isSubmitting} fullWidth>
        {formik.isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </Box>
  )
}
