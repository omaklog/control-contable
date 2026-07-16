'use client'

import type { CurrentProfile } from '@control-contable/auth'
import { createBrowserSupabaseClient } from '@control-contable/supabase-client/browser'
import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type MouseEvent, type ReactNode, useState } from 'react'

import { visibleMenuItems, MENU_ITEMS } from './navigation'

const DRAWER_WIDTH = 240

/** Iniciales del avatar: de fullName si existe, si no la primera letra del correo (FR-002, research.md #4). */
function getInitials(profile: CurrentProfile): string {
  if (profile.fullName) {
    const parts = profile.fullName.trim().split(/\s+/).filter(Boolean)
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }
  return profile.email ? profile.email[0]!.toUpperCase() : '?'
}

export function MainLayoutClient({
  profile,
  children,
}: {
  profile: CurrentProfile
  children: ReactNode
}) {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarAnchor, setAvatarAnchor] = useState<HTMLElement | null>(null)
  const router = useRouter()

  const items = visibleMenuItems(MENU_ITEMS, profile.capabilities)

  /** Cierra la sesión de Supabase y redirige a /login (FR-003/FR-004, research.md #5). */
  async function handleLogout() {
    setAvatarAnchor(null)
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const drawerContent = (
    <List>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <ListItemButton
            key={item.href}
            component={item.implemented ? Link : 'div'}
            href={item.implemented ? item.href : undefined}
            disabled={!item.implemented}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>
              <Icon />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.implemented ? undefined : 'Próximamente'}
            />
          </ListItemButton>
        )
      })}
    </List>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', gap: 2 }}>
          {isSmallScreen ? (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Abrir menú de navegación"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Portal de Control Contable
          </Typography>
          <IconButton
            onClick={(event: MouseEvent<HTMLElement>) => setAvatarAnchor(event.currentTarget)}
            aria-label="Abrir menú de perfil"
          >
            <Avatar sx={{ width: 32, height: 32 }}>{getInitials(profile)}</Avatar>
          </IconButton>
          <Menu
            anchorEl={avatarAnchor}
            open={Boolean(avatarAnchor)}
            onClose={() => setAvatarAnchor(null)}
          >
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="subtitle2">{profile.fullName ?? profile.email}</Typography>
              <Chip label={profile.role} size="small" sx={{ mt: 0.5 }} />
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isSmallScreen ? 'temporary' : 'permanent'}
        open={isSmallScreen ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}
