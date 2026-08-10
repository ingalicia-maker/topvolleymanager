/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Img,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://www.topvolleymanager.com/__l5e/assets-v1/0cf6ac33-4ab5-4ee2-a321-c637e79542bf/tvm-logo.png" alt="Top Volley Manager" width="200" style={logoStyle} />
        <Heading style={h1}>Tu enlace de acceso</Heading>
        <Text style={text}>
          Pulsa el botón para acceder a <strong>{siteName}</strong>. Este
          enlace caducará en breve.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Acceder
        </Button>
        <Text style={footer}>
          Si no solicitaste este enlace, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: '0 0 25px' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '30px 0 0' }

const logoStyle = { display: 'block', margin: '0 0 24px', height: 'auto' }
