'use client'

import { useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/src/lib/supabase/client'

export default function SignUpPage() {
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.href = '/'
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <Auth
      supabaseClient={supabase}
      view="sign_up"
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: '#A78BFA',
              brandAccent: '#8B5CF6',
              brandButtonText: 'white',
              defaultButtonBackground: '#27272A',
              defaultButtonBackgroundHover: '#3F3F46',
              defaultButtonBorder: '#3F3F46',
              defaultButtonText: '#FAFAFA',
              dividerBackground: '#3F3F46',
              inputBackground: '#18181B',
              inputBorder: '#3F3F46',
              inputBorderHover: '#A78BFA',
              inputBorderFocus: '#A78BFA',
              inputText: '#FAFAFA',
              inputLabelText: '#A1A1AA',
              inputPlaceholder: '#71717A',
              messageText: '#A1A1AA',
              messageTextDanger: '#F87171',
              anchorTextColor: '#A78BFA',
              anchorTextHoverColor: '#C4B5FD',
            },
            space: {
              buttonPadding: '10px 16px',
              inputPadding: '10px 12px',
            },
            fonts: {
              bodyFontFamily: 'Inter, sans-serif',
              buttonFontFamily: 'Inter, sans-serif',
              inputFontFamily: 'Inter, sans-serif',
              labelFontFamily: 'Inter, sans-serif',
            },
            fontSizes: {
              baseBodySize: '14px',
              baseInputSize: '14px',
              baseLabelSize: '13px',
              baseButtonSize: '14px',
            },
            radii: {
              borderRadiusButton: '12px',
              buttonBorderRadius: '12px',
              inputBorderRadius: '12px',
            },
          },
        },
      }}
      providers={['google', 'github']}
      redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
      showLinks
    />
  )
}
