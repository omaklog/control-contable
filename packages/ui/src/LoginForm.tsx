'use client'

import Login from '@mui/icons-material/Login'
import LockOutlined from '@mui/icons-material/LockOutlined'
import MailOutline from '@mui/icons-material/MailOutline'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useFormik } from 'formik'
import { useState } from 'react'
import * as Yup from 'yup'

import { Logo } from './Logo'

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

/**
 * Panel de marca/valor institucional (010-login-screen-redesign: FR-001,
 * FR-002, FR-003). Construido exclusivamente con tokens del Theme compartido
 * (`theme.palette`/`theme.typography`) — sin fotografía ni cifras o
 * estadísticas, inventadas o reales. Oculto en pantallas angostas (< `sm`,
 * mismo punto de corte que `MainLayoutClient`) para que el panel de
 * formulario permanezca completo y sin scroll horizontal (FR-004).
 */
function LoginBrandPanel() {
  return (
    <Box
      sx={{
        display: { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
        flex: 1,
        p: 6,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Logo size={64} />
      <Typography variant="h4" component="p" sx={{ fontWeight: 700, maxWidth: 420 }}>
        Gestión contable, sin fricciones.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
        Plataforma interna para administrar clientes, cobranza y expedientes fiscales del despacho,
        en un mismo lugar.
      </Typography>
    </Box>
  )
}

export function LoginForm({ title, onSubmit, onSuccess }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <LoginBrandPanel />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box
          component="form"
          method="post"
          onSubmit={formik.handleSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 360 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Logo size={56} />
          </Box>
          <Typography variant="h5" component="h1" textAlign="center">
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
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutline fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            name="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={Boolean(formik.touched.password) && Boolean(formik.errors.password)}
            helperText={formik.touched.password ? formik.errors.password : undefined}
            autoComplete="current-password"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((value) => !value)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={formik.isSubmitting}
            endIcon={<Login />}
            fullWidth
          >
            {formik.isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
