'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useFormik } from 'formik'
import { useState } from 'react'
import * as Yup from 'yup'

const schema = Yup.object({
  password: Yup.string().min(8, 'Mínimo 8 caracteres').required('La contraseña es requerida'),
})

export interface SetNewPasswordFormProps {
  title: string
  onSubmit: (password: string) => Promise<string | null>
  onSuccess: () => void
}

export function SetNewPasswordForm({ title, onSubmit, onSuccess }: SetNewPasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const formik = useFormik({
    initialValues: { password: '' },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      setFormError(null)
      const error = await onSubmit(values.password)
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
        name="password"
        label="Nueva contraseña"
        type="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={Boolean(formik.touched.password) && Boolean(formik.errors.password)}
        helperText={formik.touched.password ? formik.errors.password : undefined}
        autoComplete="new-password"
        fullWidth
      />
      <Button type="submit" variant="contained" disabled={formik.isSubmitting} fullWidth>
        {formik.isSubmitting ? 'Guardando…' : 'Guardar nueva contraseña'}
      </Button>
    </Box>
  )
}
